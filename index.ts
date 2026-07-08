-- Correctif FRD : droits de lecture et de modification des profils.
-- Peut être exécuté plusieurs fois sans supprimer les profils existants.

alter table public.pilotes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.pilotes to anon, authenticated;
grant update on table public.pilotes to authenticated;
revoke insert, delete on table public.pilotes from anon, authenticated;

drop policy if exists "Profils visibles publiquement" on public.pilotes;
create policy "Profils visibles publiquement"
on public.pilotes for select to anon, authenticated
using (
  paddock_approved = true
  or id = (select auth.uid())
  or (select public.is_frd_admin())
);

drop policy if exists "Le pilote modifie son profil" on public.pilotes;
create policy "Le pilote modifie son profil"
on public.pilotes for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant execute on function public.is_frd_admin() to anon, authenticated;
