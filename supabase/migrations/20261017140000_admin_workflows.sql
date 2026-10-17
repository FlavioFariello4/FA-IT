alter table public.job_applications
  add column if not exists status text not null default 'received'
  check (status in ('received', 'reviewing', 'interview', 'rejected', 'hired'));

alter table public.contact_inquiries
  add column if not exists status text not null default 'new'
  check (status in ('new', 'in_progress', 'replied', 'archived'));

revoke update on public.job_applications from authenticated;
grant update (status) on public.job_applications to authenticated;

revoke update on public.contact_inquiries from authenticated;
grant update (status) on public.contact_inquiries to authenticated;

drop policy if exists "HR staff can update application status"
on public.job_applications;
create policy "HR staff can update application status"
on public.job_applications for update to authenticated
using (public.user_has_permission('applications.read'))
with check (public.user_has_permission('applications.read'));

drop policy if exists "Admins can update contact inquiry status"
on public.contact_inquiries;
create policy "Admins can update contact inquiry status"
on public.contact_inquiries for update to authenticated
using (public.user_has_permission('inquiries.read'))
with check (public.user_has_permission('inquiries.read'));
