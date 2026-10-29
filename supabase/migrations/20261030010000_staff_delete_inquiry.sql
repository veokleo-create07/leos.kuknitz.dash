-- Allow the authenticated staff dashboard server to permanently delete one
-- inquiry without granting DELETE access on the inquiry table to browser roles.
begin;

create or replace function public.staff_delete_inquiry(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_id is null then
    raise exception using errcode = '22023', message = 'invalid_inquiry_id';
  end if;

  delete from public.reservation_inquiries
  where id = p_id;

  return found;
end;
$function$;

revoke all on function public.staff_delete_inquiry(uuid) from public, anon, authenticated;
grant execute on function public.staff_delete_inquiry(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
