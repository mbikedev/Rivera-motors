-- Storage bucket for vehicle photos and short videos.
-- The bucket is public-read so images can be served through the CDN / Next.js image optimisation.
-- Object names are random UUIDs ("<vehicle_id>/<uuid>.webp"), and the vehicle_media rows that
-- reference them are only visible for published vehicles (see RLS). Only admins may write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-media',
  'vehicle-media',
  true,
  52428800, -- 50 MB (videos); images are limited to 10 MB by the admin UI and re-encoded to WebP
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins list vehicle media objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-media' and public.is_admin());

create policy "Admins upload vehicle media objects" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-media'
    and public.is_admin()
    -- First folder must be a UUID (the vehicle id)
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

create policy "Admins update vehicle media objects" on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-media' and public.is_admin())
  with check (bucket_id = 'vehicle-media' and public.is_admin());

create policy "Admins delete vehicle media objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-media' and public.is_admin());
