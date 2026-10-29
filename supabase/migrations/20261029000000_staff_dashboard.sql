-- Additive staff dashboard support for the existing restaurant schema.
-- Does not recreate or rename reservations or reservation_inquiries.
begin;

alter table public.reservations
  add column if not exists source text not null default 'Website',
  add column if not exists staff_status text not null default 'confirmed';
update public.reservations set staff_status='cancelled' where status='cancelled' and staff_status='confirmed';
alter table public.reservations drop constraint if exists reservations_staff_status_check;
alter table public.reservations add constraint reservations_staff_status_check
  check (staff_status in ('confirmed','arrived','completed','cancelled','no_show'));
alter table public.reservations drop constraint if exists reservations_source_check;
alter table public.reservations add constraint reservations_source_check
  check (source in ('Website','Phone','Instagram','Walk-in'));

alter table public.reservation_inquiries
  add column if not exists preferred_date date,
  add column if not exists preferred_time time,
  add column if not exists party_size integer,
  add column if not exists source text not null default 'Website',
  add column if not exists is_read boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists converted_reservation_id uuid references public.reservations(id);
alter table public.reservation_inquiries drop constraint if exists reservation_inquiries_party_size_check;
alter table public.reservation_inquiries add constraint reservation_inquiries_party_size_check
  check (party_size is null or party_size between 1 and 10);
create unique index if not exists reservation_inquiries_converted_reservation_uidx
  on public.reservation_inquiries(converted_reservation_id) where converted_reservation_id is not null;
create index if not exists reservation_inquiries_created_at_idx
  on public.reservation_inquiries(created_at desc) where archived_at is null;

-- New private columns/tables remain inaccessible to browser roles. The app uses
-- a server-only service-role client after validating its existing staff session.
alter table public.reservations enable row level security;
alter table public.reservation_inquiries enable row level security;
revoke all on public.reservations, public.reservation_inquiries from anon, authenticated;
grant select, insert, update on public.reservations, public.reservation_inquiries to service_role;

create or replace function public.staff_create_reservation(
  p_date date, p_time time, p_guests integer, p_name text, p_email text,
  p_phone text, p_notes text, p_source text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_source not in ('Phone','Instagram','Walk-in','Website') then
    raise exception using errcode='22023', message='invalid_source';
  end if;
  select id into v_id from public.create_reservation(
    p_date,p_time,p_guests,p_name,p_email,p_phone,
    case when nullif(trim(p_notes),'') is null then '[]'::jsonb
      else jsonb_build_array(trim(p_notes)) end,'Europe/Berlin'
  );
  update public.reservations set source=p_source where id=v_id;
  return v_id;
end $$;

create or replace function public.staff_convert_inquiry(
  p_inquiry_id uuid, p_date date, p_time time, p_guests integer
) returns table(reservation_id uuid, already_converted boolean)
language plpgsql security definer set search_path = public as $$
declare v public.reservation_inquiries%rowtype; v_reservation_id uuid;
begin
  select * into v from public.reservation_inquiries where id=p_inquiry_id for update;
  if not found then raise exception using errcode='P0002', message='inquiry_not_found'; end if;
  if v.converted_reservation_id is not null then
    return query select v.converted_reservation_id,true; return;
  end if;
  select id into v_reservation_id from public.create_reservation(
    p_date,p_time,coalesce(p_guests,v.party_size,2),v.guest_name,v.guest_email,
    v.guest_phone,jsonb_build_array('Converted inquiry: '||v.message),'Europe/Berlin'
  );
  update public.reservations set source='Website' where id=v_reservation_id;
  update public.reservation_inquiries set converted_reservation_id=v_reservation_id,
    status='closed', is_read=true, updated_at=now() where id=p_inquiry_id;
  return query select v_reservation_id,false;
end $$;

create or replace function public.staff_update_reservation(
  p_id uuid, p_date date, p_time time, p_guests integer, p_name text,
  p_email text, p_phone text, p_notes text, p_source text, p_staff_status text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_existing public.reservations%rowtype; v_end time; v_duration integer;
  v_open time; v_close time; v_capacity integer; v_reserved integer;
begin
  if p_guests not between 1 and 10 or p_name is null or char_length(trim(p_name))<2
    or p_phone is null or char_length(trim(p_phone))<5 or p_email is null
    or position('@' in p_email)<2 then
    raise exception using errcode='22023', message='invalid_guest_details';
  end if;
  if p_source not in ('Website','Phone','Instagram','Walk-in') or
    p_staff_status not in ('confirmed','arrived','completed','cancelled','no_show') then
    raise exception using errcode='22023', message='invalid_reservation_value';
  end if;
  if extract(minute from p_time) not in (0,30) then
    raise exception using errcode='22023', message='invalid_time_interval';
  end if;
  select * into v_existing from public.reservations where id=p_id for update;
  if not found then raise exception using errcode='P0002',message='reservation_not_found'; end if;
  v_duration:=public.reservation_duration(p_guests);
  v_end:=p_time+make_interval(mins=>v_duration);
  select opens_at,closes_at into v_open,v_close from public.reservation_window(p_date);
  if p_time<v_open or p_time>time '19:45' or v_end>v_close then
    raise exception using errcode='22023',message='outside_hours';
  end if;
  if p_date=(now() at time zone 'Europe/Berlin')::date and p_time<=(now() at time zone 'Europe/Berlin')::time then
    raise exception using errcode='22023',message='outside_hours';
  end if;
  perform pg_advisory_xact_lock(hashtext('leo-reservations:'||p_date::text));
  select capacity into v_capacity from public.reservation_settings where id=true for update;
  select coalesce(sum(r.guests),0) into v_reserved from public.reservations r
    where r.id<>p_id and r.reservation_date=p_date and r.status in ('pending','confirmed')
      and r.start_time<v_end and r.end_time>p_time;
  if v_reserved+p_guests>v_capacity then
    raise exception using errcode='P0001',message='capacity_exceeded';
  end if;
  update public.reservations set reservation_date=p_date,start_time=p_time,end_time=v_end,
    guests=p_guests,duration_minutes=v_duration,guest_name=trim(p_name),
    guest_email=lower(trim(p_email)),guest_phone=trim(p_phone),
    special_requests=case when nullif(trim(p_notes),'') is null then '[]'::jsonb else jsonb_build_array(trim(p_notes)) end,
    source=p_source,staff_status=p_staff_status,
    status=case when p_staff_status in ('cancelled','no_show') then 'cancelled' else 'confirmed' end
    where id=p_id;
  return p_id;
end $$;

revoke all on function public.staff_create_reservation(date,time,integer,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.staff_convert_inquiry(uuid,date,time,integer) from public,anon,authenticated;
revoke all on function public.staff_update_reservation(uuid,date,time,integer,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.staff_create_reservation(date,time,integer,text,text,text,text,text) to service_role;
grant execute on function public.staff_convert_inquiry(uuid,date,time,integer) to service_role;
grant execute on function public.staff_update_reservation(uuid,date,time,integer,text,text,text,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
