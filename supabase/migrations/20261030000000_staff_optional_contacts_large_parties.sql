-- Permit staff reservations without contact details and with party sizes above 10.
-- The public create_reservation RPC retains its 1..10 validation. Capacity,
-- business hours, date/time validation, and idempotency remain enforced.
begin;

-- Fail closed if production's guest-count constraint differs from the schema
-- inspected for this migration. Keep a positive-count integrity constraint.
do $$
declare
  v_definition text;
  v_normalized text;
begin
  select pg_get_constraintdef(c.oid)
    into v_definition
  from pg_constraint c
  where c.conrelid = 'public.reservations'::regclass
    and c.conname = 'reservations_guests_check'
    and c.contype = 'c';

  if v_definition is null then
    raise exception 'Expected public.reservations.reservations_guests_check was not found';
  end if;

  v_normalized := regexp_replace(lower(v_definition), '\s+', '', 'g');
  if position('guests>=1' in v_normalized) = 0 then
    raise exception 'Guest-count constraint does not enforce guests >= 1: %', v_definition;
  end if;

  if position('guests<=10' in v_normalized) > 0 then
    alter table public.reservations drop constraint reservations_guests_check;
    alter table public.reservations
      add constraint reservations_guests_check check (guests >= 1);
  elsif position('guests<=' in v_normalized) > 0
    or position('guests<' in v_normalized) > 0 then
    raise exception 'Guest-count constraint contains an unexpected upper bound: %', v_definition;
  else
    -- Already migrated (or a different positive-only constraint); leave it intact.
    null;
  end if;
end;
$$;

-- These column constraints are the only changes needed for optional staff
-- contacts. Existing email/phone CHECK constraints remain in place; SQL CHECK
-- constraints accept NULL unless explicitly written to reject it.
alter table public.reservations
  alter column guest_email drop not null,
  alter column guest_phone drop not null;

do $$
declare
  v_constraint record;
  v_definition text;
begin
  for v_constraint in
    select c.conname, pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    where c.conrelid = 'public.reservations'::regclass
      and c.contype = 'c'
      and (pg_get_constraintdef(c.oid) ilike '%guest_email%'
        or pg_get_constraintdef(c.oid) ilike '%guest_phone%')
  loop
    v_definition := regexp_replace(lower(v_constraint.definition), '\s+', '', 'g');
    if position('isnotnull' in v_definition) > 0 then
      raise exception 'Contact constraint % explicitly rejects NULL: %',
        v_constraint.conname, v_constraint.definition;
    end if;
  end loop;
end;
$$;

-- The public create_reservation function still rejects p_guests > 10 before it
-- calls this helper. Staff RPCs can now use the existing 90-minute duration
-- rule for parties larger than 10 without changing public booking limits.
create or replace function public.reservation_duration(p_guests integer)
returns integer
language plpgsql
immutable
as $function$
begin
  if p_guests between 1 and 2 then
    return 60;
  end if;

  if p_guests >= 3 then
    return 90;
  end if;

  raise exception using errcode = '22023', message = 'invalid_guests';
end;
$function$;

create or replace function public.staff_create_reservation_idempotent(
  p_request_id uuid,
  p_date date,
  p_time time without time zone,
  p_guests integer,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_source text
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
  v_end time;
  v_duration integer;
  v_open time;
  v_close time;
  v_capacity integer;
  v_reserved integer;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'invalid_booking_request';
  end if;

  perform pg_advisory_xact_lock(hashtext('leo-staff-booking:' || p_request_id::text));
  select reservation_id into v_id
    from public.staff_reservation_requests
    where request_id = p_request_id;
  if v_id is not null then
    return v_id;
  end if;

  if p_date is null or p_time is null or p_guests is null or p_guests < 1
    or p_name is null or char_length(trim(p_name)) < 2
    or (nullif(trim(p_email), '') is not null and position('@' in p_email) < 2)
    or (nullif(trim(p_phone), '') is not null and char_length(trim(p_phone)) < 5) then
    raise exception using errcode = '22023', message = 'invalid_guest_details';
  end if;

  if p_source is null or p_source not in ('Phone', 'Instagram', 'Walk-in', 'Website') then
    raise exception using errcode = '22023', message = 'invalid_source';
  end if;

  if extract(minute from p_time) not in (0, 30)
    or extract(second from p_time) <> 0 then
    raise exception using errcode = '22023', message = 'invalid_time_interval';
  end if;

  if p_date < (now() at time zone 'Europe/Berlin')::date then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;

  v_duration := public.reservation_duration(p_guests);
  v_end := p_time + make_interval(mins => v_duration);
  select opens_at, closes_at into v_open, v_close
    from public.reservation_window(p_date);

  if p_time < v_open or p_time > time '19:45' or v_end > v_close then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;
  if p_date = (now() at time zone 'Europe/Berlin')::date
    and p_time <= (now() at time zone 'Europe/Berlin')::time then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;

  perform pg_advisory_xact_lock(hashtext('leo-reservations:' || p_date::text));
  select capacity into v_capacity
    from public.reservation_settings
    where id = true
    for update;

  select coalesce(sum(r.guests), 0) into v_reserved
    from public.reservations r
    where r.reservation_date = p_date
      and r.status in ('pending', 'confirmed')
      and r.start_time < v_end
      and r.end_time > p_time;

  if v_reserved + p_guests > v_capacity then
    raise exception using errcode = 'P0001', message = 'capacity_exceeded';
  end if;

  insert into public.reservations (
    reservation_date, start_time, end_time, guests, duration_minutes,
    guest_name, guest_email, guest_phone, special_requests,
    status, staff_status, source
  ) values (
    p_date, p_time, v_end, p_guests, v_duration,
    trim(p_name), lower(nullif(trim(p_email), '')), nullif(trim(p_phone), ''),
    case when nullif(trim(p_notes), '') is null then '[]'::jsonb
      else jsonb_build_array(trim(p_notes)) end,
    'confirmed', 'confirmed', p_source
  ) returning id into v_id;

  insert into public.staff_reservation_requests(request_id, reservation_id)
    values (p_request_id, v_id);
  return v_id;
end;
$function$;

create or replace function public.staff_update_reservation(
  p_id uuid,
  p_date date,
  p_time time without time zone,
  p_guests integer,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_source text,
  p_staff_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_existing public.reservations%rowtype;
  v_end time;
  v_duration integer;
  v_open time;
  v_close time;
  v_capacity integer;
  v_reserved integer;
begin
  if p_id is null or p_date is null or p_time is null
    or p_guests is null or p_guests < 1
    or p_name is null or char_length(trim(p_name)) < 2
    or (nullif(trim(p_phone), '') is not null and char_length(trim(p_phone)) < 5)
    or (nullif(trim(p_email), '') is not null and position('@' in p_email) < 2) then
    raise exception using errcode = '22023', message = 'invalid_guest_details';
  end if;

  if p_source is null or p_source not in ('Website', 'Phone', 'Instagram', 'Walk-in')
    or p_staff_status is null
    or p_staff_status not in ('confirmed', 'arrived', 'completed', 'cancelled', 'no_show') then
    raise exception using errcode = '22023', message = 'invalid_reservation_value';
  end if;

  if extract(minute from p_time) not in (0, 30)
    or extract(second from p_time) <> 0 then
    raise exception using errcode = '22023', message = 'invalid_time_interval';
  end if;
  if p_date < (now() at time zone 'Europe/Berlin')::date then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;

  select * into v_existing
    from public.reservations
    where id = p_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'reservation_not_found';
  end if;

  v_duration := public.reservation_duration(p_guests);
  v_end := p_time + make_interval(mins => v_duration);
  select opens_at, closes_at into v_open, v_close
    from public.reservation_window(p_date);

  if p_time < v_open or p_time > time '19:45' or v_end > v_close then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;
  if p_date = (now() at time zone 'Europe/Berlin')::date
    and p_time <= (now() at time zone 'Europe/Berlin')::time then
    raise exception using errcode = '22023', message = 'outside_hours';
  end if;

  perform pg_advisory_xact_lock(hashtext('leo-reservations:' || p_date::text));
  select capacity into v_capacity
    from public.reservation_settings
    where id = true
    for update;

  select coalesce(sum(r.guests), 0) into v_reserved
    from public.reservations r
    where r.id <> p_id
      and r.reservation_date = p_date
      and r.status in ('pending', 'confirmed')
      and r.start_time < v_end
      and r.end_time > p_time;

  if v_reserved + p_guests > v_capacity then
    raise exception using errcode = 'P0001', message = 'capacity_exceeded';
  end if;

  update public.reservations
    set reservation_date = p_date,
        start_time = p_time,
        end_time = v_end,
        guests = p_guests,
        duration_minutes = v_duration,
        guest_name = trim(p_name),
        guest_email = lower(nullif(trim(p_email), '')),
        guest_phone = nullif(trim(p_phone), ''),
        special_requests = case
          when nullif(trim(p_notes), '') is null then '[]'::jsonb
          else jsonb_build_array(trim(p_notes))
        end,
        source = p_source,
        staff_status = p_staff_status,
        status = case
          when p_staff_status in ('cancelled', 'no_show') then 'cancelled'
          else 'confirmed'
        end
    where id = p_id;

  return p_id;
end;
$function$;

-- Retain the existing server-only execute policy on both staff RPCs.
revoke all on function public.staff_create_reservation_idempotent(uuid, date, time without time zone, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.staff_create_reservation_idempotent(uuid, date, time without time zone, integer, text, text, text, text, text) to service_role;
revoke all on function public.staff_update_reservation(uuid, date, time without time zone, integer, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.staff_update_reservation(uuid, date, time without time zone, integer, text, text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
commit;
