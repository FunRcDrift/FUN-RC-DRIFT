# Mise en service Supabase — FRD Fun RC Drift

Le site est déjà construit. Ces étapes branchent les comptes, profils et photos.

1. Créez un projet gratuit sur https://supabase.com.
2. Dans **SQL Editor**, collez puis exécutez tout le fichier `supabase/schema.sql`.
3. Dans **Project Settings > API**, copiez l’URL du projet et la clé **Publishable** (ou `anon`). Remplacez les deux valeurs dans `js/config.js`. La clé publique peut être exposée ; ne mettez jamais la `service_role` dans le site.
4. Dans **Authentication > URL Configuration** :
   - Site URL : `https://funrcdrift.github.io/FUN-RC-DRIFT`
   - Redirect URLs : `https://funrcdrift.github.io/FUN-RC-DRIFT/**`
5. Publiez à nouveau tous les fichiers sur GitHub Pages.
6. Créez votre compte depuis le site. Dans SQL Editor, exécutez la dernière commande commentée de `schema.sql` avec votre email pour vous attribuer le rôle admin.
7. Déployez la fonction `supabase/functions/delete-account` avec le CLI Supabase :
   `supabase functions deploy delete-account`

Pour les emails en production, configurez un SMTP dans **Authentication > Email**. Le service email de test Supabase est limité.

## Sécurité incluse

- RLS active et profils publiquement lisibles.
- Un pilote ne peut modifier que sa propre ligne.
- Le rôle et le badge validé sont protégés par un trigger serveur.
- Chaque pilote n’écrit que dans son dossier Storage.
- La clé `service_role` reste uniquement dans l’Edge Function.
- La suppression Auth est autorisée au propriétaire ou à un admin après vérification serveur.
