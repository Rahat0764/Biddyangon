-- =========================================================
-- BIDDYANGON — Storage buckets & policies
-- Run AFTER schema.sql. Storage → these buckets are created via SQL
-- here for repeatability, but you can also create them in the
-- Dashboard (Storage → New bucket) with the same names.
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('institute-logos', 'institute-logos', true),
  ('student-photos', 'student-photos', true),
  ('notice-attachments', 'notice-attachments', true)
on conflict (id) do nothing;

-- Path convention (enforced by the app, not the DB):
--   institute-logos/{institute_id}/logo.png
--   student-photos/{institute_id}/{profile_id}.jpg
--   notice-attachments/{institute_id}/{notice_id}.pdf
-- Storing institute_id as the first path segment lets policies below
-- check tenant membership using storage.foldername(name).

-- Public read for all three buckets (logos/photos/PDF notices are
-- meant to be viewable — e.g. on a public marksheet verification page).
create policy "public read institute-logos" on storage.objects
  for select using (bucket_id = 'institute-logos');
create policy "public read student-photos" on storage.objects
  for select using (bucket_id = 'student-photos');
create policy "public read notice-attachments" on storage.objects
  for select using (bucket_id = 'notice-attachments');

-- Uploads: only signed-in members of the matching institute can upload,
-- and only into a folder named after their own institute_id.
create policy "institute members upload logo" on storage.objects
  for insert with check (
    bucket_id = 'institute-logos'
    and (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('institute_head','super_admin')
  );

create policy "institute members upload student photo" on storage.objects
  for insert with check (
    bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('institute_head','account','class_teacher','super_admin')
  );

create policy "institute members upload notice pdf" on storage.objects
  for insert with check (
    bucket_id = 'notice-attachments'
    and (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('institute_head','account','exam_head','super_admin')
  );

-- Allow the uploader's institute to replace/delete their own files
create policy "institute members manage own files" on storage.objects
  for update using ((storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid()));
create policy "institute members delete own files" on storage.objects
  for delete using ((storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid()));
