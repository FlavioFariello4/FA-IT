alter table public.contact_inquiries
  add column if not exists assigned_to uuid references auth.users (id) on delete set null;

create index if not exists contact_inquiries_assignment_created_idx
  on public.contact_inquiries (assigned_to, created_at desc);

insert into public.role_permissions (role, permission)
values ('support', 'inquiries.manage')
on conflict do nothing;

create table if not exists public.support_assignment_rotation (
  singleton boolean primary key default true check (singleton),
  last_assigned_user_id uuid,
  updated_at timestamptz not null default now()
);

insert into public.support_assignment_rotation (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.support_assignment_rotation enable row level security;
revoke all on public.support_assignment_rotation from anon, authenticated;

create or replace function public.next_support_assignee()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  last_user_id uuid;
  next_user_id uuid;
begin
  perform pg_advisory_xact_lock(617204117);

  select last_assigned_user_id
  into last_user_id
  from public.support_assignment_rotation
  where singleton = true
  for update;

  select user_id
  into next_user_id
  from public.user_roles
  where role = 'support'
    and user_id > coalesce(last_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  order by user_id
  limit 1;

  if next_user_id is null then
    select user_id
    into next_user_id
    from public.user_roles
    where role = 'support'
    order by user_id
    limit 1;
  end if;

  if next_user_id is not null then
    update public.support_assignment_rotation
    set last_assigned_user_id = next_user_id,
        updated_at = now()
    where singleton = true;
  end if;

  return next_user_id;
end;
$$;

create or replace function public.assign_new_contact_inquiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.assigned_to := public.next_support_assignee();
  return new;
end;
$$;

revoke all on function public.next_support_assignee() from public, anon, authenticated;
revoke all on function public.assign_new_contact_inquiry() from public, anon, authenticated;

drop trigger if exists assign_contact_inquiry_to_support
on public.contact_inquiries;
create trigger assign_contact_inquiry_to_support
before insert on public.contact_inquiries
for each row execute function public.assign_new_contact_inquiry();

create or replace function public.redistribute_support_inquiries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inquiry_id uuid;
  next_user_id uuid;
begin
  if tg_op = 'INSERT' and new.role = 'support' then
    for inquiry_id in
      select id
      from public.contact_inquiries
      where assigned_to is null
      order by created_at, id
    loop
      next_user_id := public.next_support_assignee();
      exit when next_user_id is null;

      update public.contact_inquiries
      set assigned_to = next_user_id
      where id = inquiry_id;
    end loop;
  elsif tg_op = 'DELETE' and old.role = 'support' then
    for inquiry_id in
      select id
      from public.contact_inquiries
      where assigned_to = old.user_id
      order by created_at, id
    loop
      next_user_id := public.next_support_assignee();

      update public.contact_inquiries
      set assigned_to = next_user_id
      where id = inquiry_id;
    end loop;
  end if;

  return null;
end;
$$;

revoke all on function public.redistribute_support_inquiries() from public, anon, authenticated;

drop trigger if exists redistribute_contact_inquiries_for_support_role
on public.user_roles;
create trigger redistribute_contact_inquiries_for_support_role
after insert or delete on public.user_roles
for each row execute function public.redistribute_support_inquiries();

do $$
declare
  inquiry_id uuid;
  next_user_id uuid;
begin
  for inquiry_id in
    select id
    from public.contact_inquiries
    where assigned_to is null
    order by created_at, id
  loop
    next_user_id := public.next_support_assignee();
    exit when next_user_id is null;

    update public.contact_inquiries
    set assigned_to = next_user_id
    where id = inquiry_id;
  end loop;
end;
$$;

create table if not exists public.contact_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  inquiry_id uuid not null references public.contact_inquiries (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_email text not null,
  body text not null check (char_length(body) between 1 and 10000),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists contact_inquiry_replies_thread_created_idx
  on public.contact_inquiry_replies (inquiry_id, created_at);

alter table public.contact_inquiry_replies enable row level security;
revoke all on public.contact_inquiry_replies from anon, authenticated;
grant select on public.contact_inquiry_replies to authenticated;

drop policy if exists "Support staff can read inquiry replies"
on public.contact_inquiry_replies;
create policy "Support staff can read inquiry replies"
on public.contact_inquiry_replies for select to authenticated
using (public.user_has_permission('inquiries.read'));

drop policy if exists "Admins can update contact inquiry status"
on public.contact_inquiries;
drop policy if exists "Staff can update permitted contact inquiries"
on public.contact_inquiries;
create policy "Staff can update permitted contact inquiries"
on public.contact_inquiries for update to authenticated
using (
  public.user_has_permission('inquiries.manage')
  and (
    public.user_has_permission('users.manage')
    or assigned_to = auth.uid()
  )
)
with check (
  public.user_has_permission('inquiries.manage')
  and (
    public.user_has_permission('users.manage')
    or assigned_to = auth.uid()
  )
);
