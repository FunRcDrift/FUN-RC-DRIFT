-- Correctif admin FRD définitif
-- À coller dans Supabase > SQL Editor > Run
--
-- Objectif :
-- 1. Ton email Gmail est reconnu admin par Supabase.
-- 2. L'admin peut accepter/refuser les cartes du paddock.
-- 3. Le champ role peut rester "pilote" sans bloquer l'accès admin.

create or replace function public.is_frd_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt() ->> 'email') = 'alexandrelion364@gmail.com', false)
    or exists (
      select 1
      from public.pilotes
      where id = (select auth.uid())
      and role = 'admin'
    );
$$;

grant execute on function public.is_frd_admin() to anon, authenticated;

-- Crée/répare la ligne pilote de ton compte Gmail si elle manque.
do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'protect_pilote_moderation'
  ) then
    alter table public.pilotes disable trigger protect_pilote_moderation;
  end if;
end $$;

insert into public.pilotes (id, prenom, nom, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'prenom', 'Alexandre'),
  coalesce(raw_user_meta_data ->> 'nom', 'Chabert'),
  case
    when email = 'alexandrelion364@gmail.com' then 'admin'
    else 'pilote'
  end
from auth.users
where email = 'alexandrelion364@gmail.com'
on conflict (id) do update
set role = 'admin';

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'protect_pilote_moderation'
  ) then
    alter table public.pilotes enable trigger protect_pilote_moderation;
  end if;
end $$;

-- Droits de lecture/modification propres.
alter table public.pilotes enable row level security;

grant select on table public.pilotes to anon, authenticated;
grant update on table public.pilotes to authenticated;
revoke insert, delete on table public.pilotes from anon, authenticated;

drop policy if exists "Profils visibles publiquement" on public.pilotes;
create policy "Profils visibles publiquement"
on public.pilotes
for select
to anon, authenticated
using (
  paddock_approved = true
  or (select auth.uid()) = id
  or (select public.is_frd_admin())
);

drop policy if exists "Le pilote modifie son profil" on public.pilotes;
create policy "Le pilote modifie son profil"
on public.pilotes
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Admin modifie les profils" on public.pilotes;
create policy "Admin modifie les profils"
on public.pilotes
for update
to authenticated
using ((select public.is_frd_admin()))
with check ((select public.is_frd_admin()));

-- Vérification finale : cette ligne doit afficher admin.
select
  u.email,
  p.prenom,
  p.nom,
  p.role
from public.pilotes p
join auth.users u on u.id = p.id
where u.email = 'alexandrelion364@gmail.com';
