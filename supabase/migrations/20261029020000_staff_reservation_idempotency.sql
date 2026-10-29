-- Prevent rapid repeated submissions and server retries from creating duplicate
-- staff reservations. One request UUID maps to exactly one reservation.
begin;

create table if not exists public.staff_reservation_requests (
  request_id uuid primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.staff_reservation_requests enable row level security;
revoke all on public.staff_reservation_requests from public, anon, authenticated;
grant select, insert, update, delete on public.staff_reservation_requests to service_role;

create or replace function public.staff_create_reservation_idempotent(
  p_request_id uuid, p_date date, p_time time, p_guests integer, p_name text,
  p_email text, p_phone text, p_notes text, p_source text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_request_id is null then
    raise exception using errcode='22023', message='invalid_booking_request';
  end if;

  perform pg_advisory_xact_lock(hashtext('leo-staff-booking:' || p_request_id::text));
  select reservation_id into v_id
    from public.staff_reservation_requests where request_id=p_request_id;
  if v_id is not null then
    return v_id;
  end if;

  if p_source not in ('Phone','Instagram','Walk-in','Website') then
    raise exception using errcode='22023', message='invalid_source';
  end if;

  select id into v_id from public.create_reservation(
    p_date,p_time,p_guests,p_name,p_email,p_phone,
    case when nullif(trim(p_notes),'') is null then '[]'::jsonb
      else jsonb_build_array(trim(p_notes)) end,'Europe/Berlin'
  );
  update public.reservations set source=p_source where id=v_id;
  insert into public.staff_reservation_requests(request_id,reservation_id)
    values (p_request_id,v_id);
  return v_id;
end;
$$;

revoke all on function public.staff_create_reservation_idempotent(uuid,date,time,integer,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.staff_create_reservation_idempotent(uuid,date,time,integer,text,text,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
