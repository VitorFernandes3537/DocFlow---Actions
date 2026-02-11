
-- DocFlow Actions - DB Schema (Supabase Postgres)
-- Includes: tables, indexes, updated_at trigger, RLS + policies

-- 0) Extensions (usually enabled by default in Supabase, but safe)
create extension if not exists "pgcrypto";

-- 1) Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Tables
-- 2.1 documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  source_type text not null check (source_type in ('pdf', 'pasted')),
  storage_path text null,

  base_date date null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- 2.2 extracted_items
create table if not exists public.extracted_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,

  type text not null check (type in ('task', 'deadline', 'required_doc', 'warning')),
  title text not null,
  description text null,

  due_date date null,
  due_date_raw text null,

  conditional boolean not null default false,
  -- dependencies can store ["Anexo IV", "retificação"] etc.
  dependencies jsonb not null default '[]'::jsonb,

  evidence_snippet text not null,
  evidence_ref text null,

  confidence text not null check (confidence in ('high','medium','low','uncertain')),

  created_at timestamptz not null default now()
);

-- 2.3 item_status (per user, per item)
create table if not exists public.item_status (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.extracted_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null check (status in ('pending','done')),
  updated_at timestamptz not null default now(),

  -- avoid duplicates per user/item
  unique (item_id, user_id)
);

create trigger trg_item_status_updated_at
before update on public.item_status
for each row execute function public.set_updated_at();

-- 2.4 raw_extractions (optional but recommended for audit/debug)
create table if not exists public.raw_extractions (
  document_id uuid primary key references public.documents(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- 3) Indexes
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_extracted_items_document_id on public.extracted_items(document_id);
create index if not exists idx_extracted_items_due_date on public.extracted_items(due_date);
create index if not exists idx_item_status_user_item on public.item_status(user_id, item_id);

-- 4) RLS Enable
alter table public.documents enable row level security;
alter table public.extracted_items enable row level security;
alter table public.item_status enable row level security;
alter table public.raw_extractions enable row level security;

-- 5) Policies
-- Helper note: In Supabase, auth.uid() returns the logged-in user UUID.

-- 5.1 documents policies
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own"
on public.documents
for select
using (user_id = auth.uid());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
on public.documents
for insert
with check (user_id = auth.uid());

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own"
on public.documents
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
on public.documents
for delete
using (user_id = auth.uid());

-- 5.2 extracted_items policies (scoped through documents ownership)
drop policy if exists "items_select_own_doc" on public.extracted_items;
create policy "items_select_own_doc"
on public.extracted_items
for select
using (
  exists (
    select 1
    from public.documents d
    where d.id = extracted_items.document_id
      and d.user_id = auth.uid()
  )
);

-- Insert items only if document belongs to user
drop policy if exists "items_insert_own_doc" on public.extracted_items;
create policy "items_insert_own_doc"
on public.extracted_items
for insert
with check (
  exists (
    select 1
    from public.documents d
    where d.id = extracted_items.document_id
      and d.user_id = auth.uid()
  )
);

-- Update/delete items only if doc belongs to user
drop policy if exists "items_update_own_doc" on public.extracted_items;
create policy "items_update_own_doc"
on public.extracted_items
for update
using (
  exists (
    select 1
    from public.documents d
    where d.id = extracted_items.document_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.documents d
    where d.id = extracted_items.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "items_delete_own_doc" on public.extracted_items;
create policy "items_delete_own_doc"
on public.extracted_items
for delete
using (
  exists (
    select 1
    from public.documents d
    where d.id = extracted_items.document_id
      and d.user_id = auth.uid()
  )
);

-- 5.3 item_status policies
-- Only the user can read/write their own status rows.
-- Also ensure the item belongs to a document owned by the user (extra safety).
drop policy if exists "status_select_own" on public.item_status;
create policy "status_select_own"
on public.item_status
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.extracted_items i
    join public.documents d on d.id = i.document_id
    where i.id = item_status.item_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "status_insert_own" on public.item_status;
create policy "status_insert_own"
on public.item_status
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.extracted_items i
    join public.documents d on d.id = i.document_id
    where i.id = item_status.item_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "status_update_own" on public.item_status;
create policy "status_update_own"
on public.item_status
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.extracted_items i
    join public.documents d on d.id = i.document_id
    where i.id = item_status.item_id
      and d.user_id = auth.uid()
  )
)
with check (user_id = auth.uid());

drop policy if exists "status_delete_own" on public.item_status;
create policy "status_delete_own"
on public.item_status
for delete
using (user_id = auth.uid());

-- 5.4 raw_extractions policies (scoped through documents ownership)
drop policy if exists "raw_select_own_doc" on public.raw_extractions;
create policy "raw_select_own_doc"
on public.raw_extractions
for select
using (
  exists (
    select 1
    from public.documents d
    where d.id = raw_extractions.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "raw_upsert_own_doc" on public.raw_extractions;
create policy "raw_upsert_own_doc"
on public.raw_extractions
for insert
with check (
  exists (
    select 1
    from public.documents d
    where d.id = raw_extractions.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "raw_update_own_doc" on public.raw_extractions;
create policy "raw_update_own_doc"
on public.raw_extractions
for update
using (
  exists (
    select 1
    from public.documents d
    where d.id = raw_extractions.document_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.documents d
    where d.id = raw_extractions.document_id
      and d.user_id = auth.uid()
  )
);
