# Guide de déploiement – Supabase + Netlify

Ce guide décrit la mise en ligne. **Rien de tout cela n’a été exécuté par l’auteur du code** : aucun projet
Supabase ni site Netlify n’a été créé. Chaque étape est à réaliser par le propriétaire des comptes.

## 1. Créer le projet Supabase

1. Sur <https://supabase.com/dashboard>, créer un projet (région UE conseillée, par ex. Frankfurt `eu-central-1`).
2. Noter dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - clé `anon` / `publishable` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - la clé `service_role` **n’est pas nécessaire** : ne la copiez nulle part.

## 2. Appliquer les migrations

Option A – Supabase CLI (recommandée) :

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push          # applique supabase/migrations/*.sql dans l’ordre
```

Option B – SQL Editor du dashboard : exécuter dans l’ordre le contenu de
`20261014000001_schema.sql`, `20261014000002_security_and_functions.sql`, `20261014000003_storage.sql`.

La migration de stockage crée le bucket **public** `vehicle-media` (50 Mo max, images et vidéos uniquement).
Public signifie que les fichiers sont lisibles par URL, ce qui est voulu pour les photos du catalogue ; seuls
les administrateurs peuvent envoyer, modifier ou supprimer des fichiers. Les photos d’un brouillon sont donc
accessibles à qui connaît leur URL (UUID aléatoire, non listé) : ne téléversez rien de confidentiel.

**Ne chargez pas `supabase/seed.sql` en production** : il contient des véhicules fictifs. Il sert au
développement local (`supabase start` / `supabase db reset`) et aux tests.

## 3. Configurer l’authentification

Dans **Authentication** :

1. **Sign In / Providers → Email** : laisser Email activé, **désactiver « Allow new users to sign up »**.
2. **URL Configuration** :
   - Site URL : `https://votre-domaine.tld`
   - Redirect URLs : `https://votre-domaine.tld/admin/auth/callback`
     (ajouter aussi l’URL Netlify `https://<site>.netlify.app/admin/auth/callback` si besoin)
3. Mot de passe : longueur minimale 12 caractères recommandée.
4. Pour des emails fiables (réinitialisation du mot de passe), configurer un SMTP personnalisé
   (**Authentication → Emails → SMTP Settings**).

## 4. Créer les administrateurs

Il n’existe pas d’inscription publique. Pour chaque administrateur :

1. **Authentication → Users → Add user → Create new user** (email + mot de passe, « Auto confirm user »).
2. Dans le **SQL Editor** :

```sql
insert into public.admin_profiles (user_id, role, display_name)
select id, 'owner', 'Prénom Nom' from auth.users where email = 'admin@votre-domaine.tld';
```

`role` vaut `owner` ou `editor` (même droits dans cette version). Pour retirer l’accès :
`delete from public.admin_profiles where user_id = '…';` (et éventuellement supprimer l’utilisateur).

## 5. Créer le site Netlify

1. **Add new project → Import an existing project** → GitHub → ce dépôt, branche `main`.
2. Netlify détecte Next.js : commande `npm run build`, Node 22 (déjà dans `netlify.toml`).
3. **Site configuration → Environment variables** :

   | Variable                        | Valeur                      | Contextes  |
   | ------------------------------- | --------------------------- | ---------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase      | Tous       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon / publishable      | Tous       |
   | `NEXT_PUBLIC_SITE_URL`          | `https://votre-domaine.tld` | Production |

   Dans `netlify.toml`, `REQUIRE_SUPABASE` vaut pour l’instant `false` en production (démo sans Supabase).
   **Repassez-le à `true`** avant la vraie mise en ligne : un build de production sans Supabase échouera alors
   au lieu d’afficher les données de démo.
   Les variables `NEXT_PUBLIC_*` sont intégrées **au moment du build** (y compris la Content-Security-Policy) :
   après toute modification, relancer un déploiement.

4. Déployer, puis ajouter le domaine personnalisé (**Domain management**) ; HTTPS est automatique.

## 6. Après le premier déploiement

1. Se connecter sur `https://votre-domaine.tld/admin/login`.
2. **Paramètres** : saisir les vraies coordonnées, horaires, informations de visite et mentions légales,
   puis **décocher « Afficher la mention démo »**. Tant que les paramètres ne sont pas enregistrés, le site
   affiche les valeurs fictives par défaut avec le bandeau démo.
3. Faire relire l’**Impressum** et la **Datenschutzerklärung** par un professionnel : les textes fournis sont
   des modèles.
4. Créer un premier véhicule, ajouter les photos, prévisualiser (de/en/fr), puis **Publier**.
5. Vérifier `https://votre-domaine.tld/sitemap.xml` et `robots.txt`, puis déclarer le sitemap dans Google
   Search Console.

## 7. Exploitation

- **Sauvegardes** : les sauvegardes quotidiennes Supabase dépendent du plan ; pour un export manuel :
  `npx supabase db dump --data-only > backup.sql` et sauvegarde du bucket `vehicle-media`.
- **Messages de contact** : conservation maximale de 12 mois. Bouton « Supprimer les messages de plus de
  12 mois » dans l’admin, ou planification via `pg_cron` :
  `select cron.schedule('purge-contact', '0 3 * * *', $$select public.purge_old_contact_messages()$$);`
  (la fonction exige un administrateur quand elle est appelée depuis l’application ; via `pg_cron` elle
  s’exécute avec les droits du propriétaire).
- **Journal d’activité** : visible dans l’admin (`/admin/audit`).
- **Mises à jour du contenu** : les pages publiques sont régénérées automatiquement après chaque
  enregistrement dans l’admin (ISR, revalidation immédiate) et au plus tard toutes les 5 minutes.

## 8. Tests de la RLS

`npm run test:db` applique les migrations sur un **PostgreSQL vide et jetable** (cluster temporaire local
par défaut, ou `DATABASE_URL` en CI) après un fichier qui simule les schémas `auth` et `storage` de
Supabase. Il ne doit **jamais** viser le projet Supabase de production. Sur le projet réel, contrôler la RLS
avec **Advisors → Security Advisor** du dashboard et en ouvrant, déconnecté, une URL de brouillon
(elle doit renvoyer 404).
