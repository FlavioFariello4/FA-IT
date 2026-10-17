create table if not exists public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'portfolio_editor', 'hr_manager')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.role_permissions (
  role text not null check (role in ('admin', 'portfolio_editor', 'hr_manager')),
  permission text not null,
  primary key (role, permission)
);

create or replace function public.guard_last_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' then
    if tg_op = 'DELETE' or new.role <> 'admin' then
      perform pg_advisory_xact_lock(48152973);
      if not exists (
        select 1
        from public.user_roles
        where role = 'admin'
          and user_id <> old.user_id
      ) then
        raise exception 'Cannot remove the last admin role'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger protect_last_admin_role
before delete or update on public.user_roles
for each row execute function public.guard_last_admin_role();

insert into public.role_permissions (role, permission)
values
  ('admin', 'portfolio.manage'),
  ('admin', 'jobs.manage'),
  ('admin', 'applications.read'),
  ('admin', 'inquiries.read'),
  ('admin', 'users.manage'),
  ('portfolio_editor', 'portfolio.manage'),
  ('hr_manager', 'jobs.manage'),
  ('hr_manager', 'applications.read')
on conflict do nothing;

create or replace function public.user_has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid()
      and (ur.role = 'admin' or rp.permission = required_permission)
  );
$$;

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null check (char_length(category) between 2 and 80),
  description text not null check (char_length(description) between 10 and 3000),
  project_url text not null check (project_url ~ '^https://'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null check (char_length(summary) between 10 and 500),
  location text not null check (char_length(location) between 2 and 120),
  employment_type text not null check (char_length(employment_type) between 2 and 100),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  company text check (company is null or char_length(company) <= 160),
  message text not null check (char_length(message) between 10 and 5000),
  privacy_consent boolean not null check (privacy_consent),
  created_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid references public.job_postings (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  education text not null check (char_length(education) between 1 and 180),
  message text check (message is null or char_length(message) <= 2500),
  privacy_consent boolean not null check (privacy_consent),
  resume_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.job_postings enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.job_applications enable row level security;

revoke all on public.role_permissions from anon, authenticated;

create policy "Users can read their own roles or admins can read all"
on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.user_has_permission('users.manage'));

create policy "Admins can assign and revoke roles"
on public.user_roles for all to authenticated
using (public.user_has_permission('users.manage'))
with check (public.user_has_permission('users.manage'));

create policy "Published projects are public"
on public.portfolio_projects for select to anon, authenticated
using (published or public.user_has_permission('portfolio.manage'));

create policy "Portfolio editors can create projects"
on public.portfolio_projects for insert to authenticated
with check (public.user_has_permission('portfolio.manage'));

create policy "Portfolio editors can update projects"
on public.portfolio_projects for update to authenticated
using (public.user_has_permission('portfolio.manage'))
with check (public.user_has_permission('portfolio.manage'));

create policy "Portfolio editors can delete projects"
on public.portfolio_projects for delete to authenticated
using (public.user_has_permission('portfolio.manage'));

create policy "Published jobs are public"
on public.job_postings for select to anon, authenticated
using (published or public.user_has_permission('jobs.manage'));

create policy "HR managers can create job postings"
on public.job_postings for insert to authenticated
with check (public.user_has_permission('jobs.manage'));

create policy "HR managers can update job postings"
on public.job_postings for update to authenticated
using (public.user_has_permission('jobs.manage'))
with check (public.user_has_permission('jobs.manage'));

create policy "HR managers can delete job postings"
on public.job_postings for delete to authenticated
using (public.user_has_permission('jobs.manage'));

create policy "Authorized staff can read contact inquiries"
on public.contact_inquiries for select to authenticated
using (public.user_has_permission('inquiries.read'));

create policy "HR managers can read job applications"
on public.job_applications for select to authenticated
using (public.user_has_permission('applications.read'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Only authorized HR staff can read CVs"
on storage.objects for select to authenticated
using (
  bucket_id = 'resumes'
  and public.user_has_permission('applications.read')
);
