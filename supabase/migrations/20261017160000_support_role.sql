alter table public.user_roles
  drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('admin', 'portfolio_editor', 'hr_manager', 'support'));

alter table public.role_permissions
  drop constraint if exists role_permissions_role_check;
alter table public.role_permissions
  add constraint role_permissions_role_check
  check (role in ('admin', 'portfolio_editor', 'hr_manager', 'support'));

insert into public.role_permissions (role, permission)
values ('support', 'inquiries.read')
on conflict do nothing;

drop policy if exists "Admins can update contact inquiry status"
on public.contact_inquiries;
create policy "Admins can update contact inquiry status"
on public.contact_inquiries for update to authenticated
using (public.user_has_permission('inquiries.manage'))
with check (public.user_has_permission('inquiries.manage'));
