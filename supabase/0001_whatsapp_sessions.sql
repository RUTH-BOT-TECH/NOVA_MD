-- Run this in the Supabase SQL editor if SESSION_BACKEND=supabase.
-- Two tables, no RLS exposure to clients: the bot uses the service-role key.

create table if not exists public.wa_creds (
  session_id  text primary key,
  creds       text not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.wa_signal_keys (
  session_id  text not null,
  type        text not null,
  id          text not null,
  value       text,
  primary key (session_id, type, id)
);

create index if not exists wa_signal_keys_lookup on public.wa_signal_keys (session_id, type);

alter table public.wa_creds enable row level security;
alter table public.wa_signal_keys enable row level security;
-- no policies = no access for anon/authenticated; service-role bypasses RLS.
