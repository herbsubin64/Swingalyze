-- ========================================================
-- Supabase SQL — Auth/DB schema + RLS + Storage policies
-- (Run in Supabase SQL Editor as an admin / service role)
-- ========================================================

-- Extensions (safe if already enabled)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Users table mirrors auth.users; keep minimal profile + subscription
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  subscription_status text not null default 'free',
  created_at timestamptz default now()
);

-- Analyses table (persist results)
create table if not exists public.analyses (
  id text primary key,
  user_id uuid references public.users(id) on delete set null,
  video_url text,
  sport text not null default 'golf',
  summary jsonb not null,
  key_frames jsonb not null,
  tips jsonb not null,
  handedness text,
  club text,
  created_at timestamptz default now(),
  is_public boolean default true
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.analyses enable row level security;

-- RLS policies: users (owner read/update), analyses (public read if is_public; owner full)
drop policy if exists users_owner_read on public.users;
create policy users_owner_read on public.users
for select using (auth.uid() = id);

drop policy if exists users_owner_update on public.users;
create policy users_owner_update on public.users
for update using (auth.uid() = id);

drop policy if exists analyses_public_read on public.analyses;
create policy analyses_public_read on public.analyses
for select using (is_public = true);

drop policy if exists analyses_owner_full on public.analyses;
create policy analyses_owner_full on public.analyses
for all using (auth.uid() = user_id);

-- Storage bucket for video files
-- You may also create this via Dashboard → Storage → New bucket
insert into storage.buckets (id, name, public)
values ('swings','swings', false)
on conflict (id) do nothing;

-- Storage RLS is defined on storage.objects
-- Rule: authenticated users can PUT/GET their own folder: swings/<auth.uid()>/*
-- Public read is OFF by default (keeps videos private)
drop policy if exists "Allow user uploads to their folder" on storage.objects;
create policy "Allow user uploads to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'swings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Allow user read of their files" on storage.objects;
create policy "Allow user read of their files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'swings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Allow user update/delete of their files" on storage.objects;
create policy "Allow user update/delete of their files"
on storage.objects for update using (
  bucket_id = 'swings'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'swings'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Allow user delete of their files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'swings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Helper: upsert profile row on first login (optional; can be done in app code)
-- insert into public.users (id, email)
-- select id, email from auth.users where id not in (select id from public.users);