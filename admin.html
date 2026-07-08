-- Correctif ciblé pour l'erreur : new row violates row-level security policy
-- À exécuter dans Supabase > SQL Editor > New query.

drop policy if exists "Pilote consulte ses fichiers" on storage.objects;
create policy "Pilote consulte ses fichiers"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_frd_admin())
  )
);

drop policy if exists "Pilote ajoute sa photo" on storage.objects;
create policy "Pilote ajoute sa photo"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Pilote remplace sa photo" on storage.objects;
create policy "Pilote remplace sa photo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_frd_admin())
  )
)
with check (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_frd_admin())
  )
);

drop policy if exists "Pilote supprime sa photo" on storage.objects;
create policy "Pilote supprime sa photo"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_frd_admin())
  )
);
