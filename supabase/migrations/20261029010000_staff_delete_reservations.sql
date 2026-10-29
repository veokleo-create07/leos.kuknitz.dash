-- Staff-only permanent reservation deletion.
-- Keep inquiry records when deleting a reservation created from an inquiry.
begin;

create or replace function public.staff_delete_reservations(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;

  update public.reservation_inquiries
    set converted_reservation_id = null, updated_at = now()
    where converted_reservation_id = any(p_ids);

  delete from public.reservations where id = any(p_ids);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.staff_delete_reservations(uuid[]) from public, anon, authenticated;
grant execute on function public.staff_delete_reservations(uuid[]) to service_role;
notify pgrst, 'reload schema';
commit;
