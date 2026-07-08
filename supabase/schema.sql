-- FRD Fun RC Drift — schéma complet à exécuter dans Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.pilotes (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null default '' check (char_length(nom) <= 60),
  prenom text not null default '' check (char_length(prenom) <= 60),
  pseudo text check (char_length(pseudo) <= 60),
  chassis text check (char_length(chassis) <= 100),
  moteur text check (char_length(moteur) <= 100),
  esc text check (char_length(esc) <= 100),
  servo text check (char_length(servo) <= 100),
  gyro text check (char_length(gyro) <= 100),
  radio text check (char_length(radio) <= 100),
  batterie text check (char_length(batterie) <= 100),
  pneus text check (char_length(pneus) <= 100),
  carrosserie text check (char_length(carrosserie) <= 100),
  style_pilotage text check (char_length(style_pilotage) <= 500),
  objectifs text check (char_length(objectifs) <= 500),
  date_debut_rc_drift date check (date_debut_rc_drift <= current_date),
  photo_url text,
  photo_path text,
  carrosserie_url text,
  carrosserie_path text,
  chassis_url text,
  chassis_path text,
  gz_requested boolean not null default false,
  gz_approved boolean not null default false,
  role text not null default 'pilote' check (role in ('pilote','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration sûre si la première version de la table existe déjà.
alter table public.pilotes add column if not exists pseudo text;
alter table public.pilotes add column if not exists esc text;
alter table public.pilotes add column if not exists batterie text;
alter table public.pilotes add column if not exists pneus text;
alter table public.pilotes add column if not exists carrosserie text;
alter table public.pilotes add column if not exists style_pilotage text;
alter table public.pilotes add column if not exists objectifs text;
alter table public.pilotes add column if not exists carrosserie_url text;
alter table public.pilotes add column if not exists carrosserie_path text;
alter table public.pilotes add column if not exists chassis_url text;
alter table public.pilotes add column if not exists chassis_path text;

alter table public.pilotes enable row level security;

create or replace function public.is_frd_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.pilotes where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.protect_pilote_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_frd_admin() then
    new.role := old.role;
    new.gz_approved := old.gz_approved;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_pilote_moderation on public.pilotes;
create trigger protect_pilote_moderation before update on public.pilotes for each row execute function public.protect_pilote_moderation();

create or replace function public.create_pilote_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pilotes(id, nom, prenom)
  values(new.id, coalesce(new.raw_user_meta_data->>'nom',''), coalesce(new.raw_user_meta_data->>'prenom',''));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_pilote_profile();

drop policy if exists "Profils visibles publiquement" on public.pilotes;
create policy "Profils visibles publiquement" on public.pilotes for select to anon, authenticated using (true);
drop policy if exists "Le pilote modifie son profil" on public.pilotes;
create policy "Le pilote modifie son profil" on public.pilotes for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Admin modifie les profils" on public.pilotes;
create policy "Admin modifie les profils" on public.pilotes for update to authenticated using ((select public.is_frd_admin())) with check ((select public.is_frd_admin()));

grant select on public.pilotes to anon, authenticated;
grant update on public.pilotes to authenticated;
revoke insert, delete on public.pilotes from anon, authenticated;
grant execute on function public.is_frd_admin() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=3145728,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Pilote consulte ses fichiers" on storage.objects;
create policy "Pilote consulte ses fichiers" on storage.objects for select to authenticated
using (bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_frd_admin())));
drop policy if exists "Pilote ajoute sa photo" on storage.objects;
create policy "Pilote ajoute sa photo" on storage.objects for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Pilote remplace sa photo" on storage.objects;
create policy "Pilote remplace sa photo" on storage.objects for update to authenticated using (bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_frd_admin()))) with check (bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_frd_admin())));
drop policy if exists "Pilote supprime sa photo" on storage.objects;
create policy "Pilote supprime sa photo" on storage.objects for delete to authenticated using (bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_frd_admin())));

-- Après avoir créé votre premier compte, remplacez l'email puis exécutez UNE fois :
-- update public.pilotes set role='admin' where id=(select id from auth.users where email='VOTRE-EMAIL');
