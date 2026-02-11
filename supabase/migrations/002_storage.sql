-- DocFlow Actions - Storage bucket and policies
-- Requires authenticated uploads scoped to each user's folder prefix: <user_id>/...

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Read own files
drop policy if exists "documents_bucket_select_own" on storage.objects;
create policy "documents_bucket_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Upload to own folder
drop policy if exists "documents_bucket_insert_own" on storage.objects;
create policy "documents_bucket_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update own files
drop policy if exists "documents_bucket_update_own" on storage.objects;
create policy "documents_bucket_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete own files
drop policy if exists "documents_bucket_delete_own" on storage.objects;
create policy "documents_bucket_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
