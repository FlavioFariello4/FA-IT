alter table public.contact_inquiries
  add column if not exists reply_token uuid not null default gen_random_uuid() unique;

alter table public.contact_inquiry_replies
  add column if not exists direction text not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  add column if not exists provider_email_id text,
  add column if not exists email_message_id text,
  add column if not exists in_reply_to text,
  add column if not exists email_subject text;

create unique index if not exists contact_inquiry_replies_provider_email_idx
  on public.contact_inquiry_replies (provider_email_id)
  where provider_email_id is not null;

alter table public.contact_inquiry_replies
  drop constraint if exists contact_inquiry_replies_body_check;
alter table public.contact_inquiry_replies
  add constraint contact_inquiry_replies_body_check
  check (char_length(body) between 1 and 100000);

alter table public.contact_inquiry_replies
  drop constraint if exists contact_inquiry_replies_delivery_status_check;
alter table public.contact_inquiry_replies
  add constraint contact_inquiry_replies_delivery_status_check
  check (delivery_status in ('pending', 'sent', 'failed', 'received'));
