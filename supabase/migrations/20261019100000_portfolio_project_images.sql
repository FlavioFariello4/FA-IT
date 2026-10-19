create table if not exists public.portfolio_project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portfolio_projects (id) on delete cascade,
  object_path text not null unique,
  alt_text text not null default '',
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists portfolio_project_images_project_order_idx
  on public.portfolio_project_images (project_id, display_order, created_at);

alter table public.portfolio_project_images enable row level security;
revoke all on public.portfolio_project_images from anon, authenticated;
grant select, insert, update, delete on public.portfolio_project_images to authenticated;

drop policy if exists "Public can read published project images"
on public.portfolio_project_images;
create policy "Public can read published project images"
on public.portfolio_project_images for select to anon, authenticated
using (
  public.user_has_permission('portfolio.manage')
  or exists (
    select 1
    from public.portfolio_projects project
    where project.id = project_id
      and project.published
  )
);

drop policy if exists "Portfolio editors can add project images"
on public.portfolio_project_images;
create policy "Portfolio editors can add project images"
on public.portfolio_project_images for insert to authenticated
with check (
  public.user_has_permission('portfolio.manage')
  and exists (
    select 1
    from public.portfolio_projects project
    where project.id = project_id
  )
);

drop policy if exists "Portfolio editors can update project images"
on public.portfolio_project_images;
create policy "Portfolio editors can update project images"
on public.portfolio_project_images for update to authenticated
using (public.user_has_permission('portfolio.manage'))
with check (public.user_has_permission('portfolio.manage'));

drop policy if exists "Portfolio editors can delete project images"
on public.portfolio_project_images;
create policy "Portfolio editors can delete project images"
on public.portfolio_project_images for delete to authenticated
using (public.user_has_permission('portfolio.manage'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-project-images',
  'portfolio-project-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio editors can read project image files"
on storage.objects;
create policy "Portfolio editors can read project image files"
on storage.objects for select to authenticated
using (
  bucket_id = 'portfolio-project-images'
  and public.user_has_permission('portfolio.manage')
);

drop policy if exists "Portfolio editors can upload project image files"
on storage.objects;
create policy "Portfolio editors can upload project image files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio-project-images'
  and public.user_has_permission('portfolio.manage')
  and exists (
    select 1
    from public.portfolio_projects project
    where project.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Portfolio editors can update project image files"
on storage.objects;
create policy "Portfolio editors can update project image files"
on storage.objects for update to authenticated
using (
  bucket_id = 'portfolio-project-images'
  and public.user_has_permission('portfolio.manage')
)
with check (
  bucket_id = 'portfolio-project-images'
  and public.user_has_permission('portfolio.manage')
);

drop policy if exists "Portfolio editors can delete project image files"
on storage.objects;
create policy "Portfolio editors can delete project image files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'portfolio-project-images'
  and public.user_has_permission('portfolio.manage')
);
