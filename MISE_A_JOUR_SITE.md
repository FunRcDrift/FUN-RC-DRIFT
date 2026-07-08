# Mise à jour complète du site FRD

## 1. Décompresser le paquet

Décompressez `FRD-site-complet.zip`. Ne déposez pas le fichier ZIP directement dans GitHub.

## 2. Mettre GitHub à jour

Dans le dépôt GitHub `FUN-RC-DRIFT` :

1. Ouvrez **Add file > Upload files**.
2. Glissez tout le contenu du dossier décompressé.
3. Vérifiez que `index.html` est à la racine.
4. Validez avec **Commit changes**.

Les fichiers portant le même nom remplacent les anciennes versions. Les dossiers `assets`, `js` et `supabase` doivent conserver leur structure.

## 3. Mettre Supabase à jour

Dans **Supabase > SQL Editor > New query** :

1. Ouvrez `supabase/schema.sql`.
2. Copiez tout son contenu dans la nouvelle requête.
3. Cliquez sur **Run**.

Le script utilise `if not exists` et remplace uniquement les règles prévues. Il ne supprime pas les comptes pilotes existants.

Si l'envoi d'une photo affiche encore une erreur RLS, exécutez ensuite `supabase/fix-storage-rls.sql` dans une nouvelle requête.

## 4. Vérifier Supabase Auth

Dans **Authentication > URL Configuration** :

- Site URL : `https://funrcdrift.github.io/FUN-RC-DRIFT`
- Redirect URLs : `https://funrcdrift.github.io/FUN-RC-DRIFT/**`

## 5. Créer le compte administrateur

Après avoir créé votre compte sur le site, exécutez dans SQL Editor :

```sql
update public.pilotes
set role = 'admin'
where id = (
  select id from auth.users where email = 'VOTRE-EMAIL'
);
```

Déconnectez-vous puis reconnectez-vous. Le lien **Administration** apparaîtra.

## 6. Fonction de suppression des comptes

La suppression complète d'un compte nécessite le déploiement de l'Edge Function présente dans `supabase/functions/delete-account`.

Cette étape peut être faite plus tard : le reste du site fonctionne sans elle.
