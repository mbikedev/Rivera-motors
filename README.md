# Rivera Motors – catalogue de véhicules endommagés

Site vitrine multilingue (allemand par défaut, anglais, français) pour présenter des véhicules endommagés
et inviter les visiteurs à une **visite sur place**. Il n’y a volontairement **ni compte client, ni panier,
ni paiement, ni enchère, ni financement, ni marketplace**.

> « Rivera Motors GmbH », l’adresse, le téléphone et tous les véhicules livrés avec le projet sont
> **fictifs** (données de démonstration clairement signalées par un bandeau « Demo »). Les photos de
> `public/demo` sont générées par IA, ne montrent pas de véhicules réels et portent la mention « DEMO · KI-Bild ».

## Stack

- Next.js 16 (App Router, TypeScript strict, Turbopack) – rendu statique + ISR pour les pages publiques
- next-intl 4 – URLs localisées (`/de/fahrzeuge`, `/en/vehicles`, `/fr/vehicules`, …)
- Supabase – PostgreSQL, Row Level Security, Auth (administrateurs uniquement), Storage (photos)
- Tailwind CSS v4, composants Radix UI, lucide-react, yet-another-react-lightbox
- zod + react-hook-form pour toutes les validations (client **et** serveur)
- Vitest (unitaires + RLS), Playwright (E2E)
- Hébergement prévu : Netlify

## Démarrage rapide

```bash
npm ci
cp .env.example .env.local   # optionnel : sans variables Supabase, le site tourne sur les données de démo
npm run dev                  # http://localhost:3000 → redirige vers /de
```

Sans `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, le site public utilise les données de
démonstration de `src/lib/data/demo/` et l’administration affiche « Supabase n’est pas configuré ».
Avec `REQUIRE_SUPABASE=true`, le build échoue si Supabase manque. Pour l’instant `netlify.toml` le met à
`false` en production pour servir la démo ; repassez-le à `true` une fois Supabase configuré.

## Commandes

| Commande                   | Rôle                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `npm run dev`              | Serveur de développement                                             |
| `npm run build` / `start`  | Build et serveur de production                                       |
| `npm run lint`             | ESLint (règles Next.js core-web-vitals + TypeScript)                 |
| `npm run typecheck`        | Génère les types de routes puis `tsc --noEmit`                       |
| `npm test`                 | Tests unitaires (filtres, traductions, validations, âge, VIN, slug…) |
| `npm run test:db`          | Applique les migrations sur un PostgreSQL jetable et teste la RLS    |
| `npm run test:e2e`         | Tests Playwright sur le build de production (desktop + mobile)       |
| `npm run check`            | lint + typecheck + tests + build                                     |
| `npm run format`           | Prettier                                                             |
| `npm run db:seed:generate` | Régénère `supabase/seed.sql` depuis les JSON de démo                 |

`npm run test:db` utilise `DATABASE_URL` si elle est définie (**base jetable uniquement**), sinon il démarre
un cluster PostgreSQL temporaire local (`initdb`/`pg_ctl` requis).
`npm run test:e2e` attend un build existant (`npm run build`).

## Structure

```
src/
  app/[locale]/…          pages publiques (accueil, catalogue, fiche, visite, à propos, contact, légal)
  app/admin/…             administration privée (connexion, tableau de bord, véhicules, médias,
                          paramètres, messages, journal d’activité)
  app/api/contact         formulaire de contact (validation, honeypot, limitation de débit)
  components/             UI, layout, véhicules, galerie, filtres, admin
  i18n/                   routing next-intl, chemins localisés
  messages/{de,en,fr}.json
  lib/data/               modèle, mappers (repli vers l’allemand), filtres, sources Supabase/démo
  lib/admin/              authentification admin, requêtes, server actions
  lib/validation/         schémas zod (véhicule, contact, paramètres)
supabase/
  migrations/             schéma, RLS, fonctions, triggers d’audit, bucket de stockage
  seed.sql                données de démonstration (fictives)
tests/unit, tests/db, tests/e2e
docs/DEPLOYMENT.md        guide de déploiement Supabase + Netlify
```

## Sécurité – points clés

- RLS active sur toutes les tables. Les visiteurs ne lisent que les véhicules `available`, `pending`, `sold`
  et leurs traductions, dégâts et médias. Brouillons et véhicules retirés restent invisibles.
- Le VIN complet et les notes internes sont dans `vehicle_private_data`, jamais lisible par `anon`.
- Seuls les comptes présents dans `admin_profiles` peuvent écrire. Il n’existe aucune inscription publique.
- La clé `service_role` n’est utilisée nulle part dans l’application.
- Les photos sont redimensionnées et réencodées en WebP dans le navigateur avant l’envoi (suppression EXIF/GPS).
- Publication, modifications, changements de statut et suppressions sont tracés dans `audit_logs`.
- En-têtes de sécurité (CSP, HSTS, X-Frame-Options…) dans `next.config.ts` ; `/admin` est en `noindex`.

Le déploiement complet est décrit dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
