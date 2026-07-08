-- Ajoute la validation administrateur avant publication dans le paddock.
-- À exécuter dans Supabase > SQL Editor > New query.

alter table public.pilotes
add column if not exists paddock_approved boolean not null default false;

create or replace function public.protect_pilote_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_frd_admin() then
    new.role := old.role;
    new.gz_approved := old.gz_approved;
    new.paddock_approved := old.paddock_approved;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists "Profils visibles publiquement" on public.pilotes;
create policy "Profils visibles publiquement"
on public.pilotes
for select
to anon, authenticated
using (
  paddock_approved = true
  or id = (select auth.uid())
  or (select public.is_frd_admin())
);

grant execute on function public.is_frd_admin() to anon, authenticated;
