# Contexte projet — nicolas-cornut.com

Document de référence pour Claude. À donner en début de session pour reprendre le travail.

*Mis à jour le 4 octobre 2026.*

---

## Vue d'ensemble

Site vitrine pour **Nicolas Cornut** (psychopraticien en Gestalt-thérapie, formateur, superviseur).
- **URL** : https://nicolas-cornut.com et https://www.nicolas-cornut.com
- **Repo GitHub** : https://github.com/miroirduclown-crypto/nicolas-cornut-site
- **Dossier local** : `/Users/nicolascornut/Sites/nicolas-cornut-site/`
- **Stack** : Astro 6 (`output: 'server'`) + Tailwind CSS v4 + adaptateur **Cloudflare Workers**
- **Back office** : https://www.nicolas-cornut.com/admin — custom (gestion des dates uniquement)
- **Déploiement** : automatique à chaque `git push` via Cloudflare Workers Builds (~1-2 min)

> Site « frère » de **clown-gestalt.fr** : même identité visuelle, mêmes polices, mais **architecture différente** (ici Worker SSR + back office custom, là Pages statique + Sveltia CMS). Ne pas confondre les deux workflows.

---

## Workflow git — IMPORTANT

Le back office crée des **commits automatiques** sur `main` (quand on enregistre des dates, via l'API GitHub). Le dossier local est donc souvent en retard. Avant de pousser :

```bash
# Working tree propre :
git pull --rebase && git push

# Avec modifications en cours :
git stash && git pull --rebase && git stash pop && git push
```

**Ne jamais faire `git push --force`.** En cas de conflit sur `src/data/dates.json` pendant un rebase, garder la version distante (le back office fait foi) sauf si on corrige volontairement le fichier.

---

## Architecture technique

### Générateur
- **Astro 6** avec `output: 'server'` (SSR) et l'adaptateur `@astrojs/cloudflare`.
- Déployé en tant que **Cloudflare Worker** nommé `nicolas-cornut-site` (⚠️ Worker, PAS Pages — ne pas remettre de `wrangler.toml`, Cloudflare Workers Builds gère tout).
- Toutes les pages sont dans `src/pages/` (fichiers `.astro`). Contenu en dur dans chaque `.astro` (pas de CMS markdown).
- Les **dates** des sessions sont le seul contenu dynamique : stockées dans `src/data/dates.json`, lues par les pages et éditées par le back office.

### Accès aux variables d'environnement (piège Astro v6)
- ⚠️ `Astro.locals.runtime.env` a été **supprimé en Astro v6**. L'env se lit via le module `cloudflare:workers`.
- Helper centralisé : **`src/lib/env.ts`** → `getEnv('CLE')`. Import dynamique de `cloudflare:workers` (prod) avec repli sur `import.meta.env` (dev local).
- **Ne jamais** faire `import.meta.env[cléDynamique]` (plante sur Cloudflare — accès dynamique non supporté par Vite).

### Secrets Cloudflare
Définis comme **secrets chiffrés** (persistent aux déploiements, contrairement aux variables « plaintext » qui sont effacées à chaque deploy) :
```bash
cd /Users/nicolascornut/Sites/nicolas-cornut-site
printf '%s' "VALEUR" | npx wrangler secret put GITHUB_TOKEN --name nicolas-cornut-site
printf '%s' "VALEUR" | npx wrangler secret put BREVO_API_KEY --name nicolas-cornut-site
npx wrangler secret list --name nicolas-cornut-site   # vérifier
```
- `GITHUB_TOKEN` : PAT classic, scope `repo`, écrit `src/data/dates.json`. **Secret.**
- `BREVO_API_KEY` : clé API Brevo. **Secret.**
- `GITHUB_REPO` (`miroirduclown-crypto/nicolas-cornut-site`), `GITHUB_BRANCH` (`main`), `BREVO_LIST_ID` (`28`) : ont des **valeurs par défaut dans le code**, pas besoin de les définir.
- Valeurs locales dans `.env` (gitignoré, jamais commité).

---

## Back office — gestion des dates

- **URL** : https://www.nicolas-cornut.com/admin
- **Protégé par Cloudflare Access** : seul `nicolas.cornut@gmail.com` peut se connecter (code OTP par email, session 24 h). Voir section Sécurité.
- **Fonctionnement** : la page `/admin` (`src/pages/admin/index.astro`) affiche un formulaire par section. « Enregistrer » POST vers `/api/update-dates` (`src/pages/api/update-dates.ts`), qui **commit `src/data/dates.json` via l'API GitHub** → redéploiement auto → dates à jour en ~1 min.
- **Encodage UTF-8** : `update-dates.ts` utilise `b64ToUtf8` / `utf8ToB64` (TextEncoder/TextDecoder). ⚠️ **Ne jamais revenir à `atob`/`btoa` seuls** → corrompt les accents français.
- Sécurités de l'endpoint : vérifie `GITHUB_TOKEN`, ignore les commits si contenu identique, retourne les erreurs GitHub en clair.

### Structure de `src/data/dates.json`
```json
{
  "groupe_continu":            { "titre": "...", "dates": [...] },
  "groupe_ponctuel":           { "titre": "...", "dates": [] },
  "scene_interieure_formation":{ "titre": "...", "dates": [...] },
  "supervision":               { "titre": "...", "dates": [...] },
  "journee_decouverte":        { "titre": "...", "dates": [...] }
}
```
- Le champ `titre` n'apparaît que dans l'interface du back office (libellé de section), pas sur le site public.
- Le back office édite **uniquement** les tableaux `dates`.

### Sections du back office (ordre dans `admin/index.astro`)
1. Groupe Continu Psychothérapeutique → `/particuliers/groupe-continu-de-psychotherapie/`
2. Groupe de supervision → `/groupe-de-supervision-initiatique/`
3. La Scène intérieure – Journée découverte → `/la-scene-interieure-journees-decouverte/`
4. La Scène intérieure – Formation → `/la-scene-interieure-formation/`

### Pages qui lisent `dates.json`
`import datesData from '../data/dates.json'` puis `datesData.<clé>.dates`. Concernées :
`particuliers/groupe-continu-de-psychotherapie`, `groupe-de-supervision-initiatique`, `la-scene-interieure-formation`, `la-scene-interieure-journees-decouverte`, `la-scene-interieure` (affiche les dates de `journee_decouverte`).

---

## Pages et navigation

### Menus (src/components/layout/Header.astro)
Tableau `nav` en haut du fichier. `href: null` = parent non cliquable (dropdown seul).
- **La Scène intérieure** (`/la-scene-interieure/`) : C'est quoi ?, La formation
- **Particuliers** (non cliquable) : Journées découverte, Groupe Continu de Gestalt, Miroir du Clown, Accompagnement individuel
- **Professionnels** (non cliquable) : Groupe de supervision initiatique, La Scène intérieure – formation
- **Qui suis-je ?** (`/qui-suis-je/`) : La Gestalt-thérapie, Ma déontologie, Mon parcours, Contenus en ligne

### Liste des pages (`src/pages/`)
| Page | Fichier |
|---|---|
| Accueil | `index.astro` |
| La Scène intérieure | `la-scene-interieure.astro` |
| LSI – Journées découverte | `la-scene-interieure-journees-decouverte.astro` |
| LSI – Formation | `la-scene-interieure-formation.astro` |
| Groupe Continu Psychothérapeutique | `particuliers/groupe-continu-de-psychotherapie.astro` |
| Accompagnement individuel | `particuliers/accompagnement-individuel.astro` |
| Groupe de supervision initiatique | `groupe-de-supervision-initiatique.astro` |
| Qui suis-je ? / Mon parcours | `qui-suis-je.astro` |
| La Gestalt-thérapie | `la-gestalt-therapie.astro` |
| Ma déontologie | `ma-deontologie.astro` |
| Contenus en ligne | `contenus-en-ligne.astro` |
| Miroir du Clown (→ clown-gestalt.fr) | `clown.astro` |
| Mentions légales & CGV | `mentions-legales.astro` |

### Redirections 301 (anciennes URL WordPress conservées)
| Ancienne URL | → |
|---|---|
| `/supervision/` | `/groupe-de-supervision-initiatique/` |
| `/particuliers/` | `/la-scene-interieure/` |
| `/groupe-therapeutique-ponctuel/` | `/la-scene-interieure-journees-decouverte/` |
| `/la-scene-interieure-groupes-ponctuels-de-pratique/` | `/la-scene-interieure-journees-decouverte/` |

---

## Identité visuelle (src/styles/global.css)

| Variable | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#C0392B` | Rouge brique — H1/H2/H3, liens, boutons, nav active |
| `--color-accent` | `#c6d027` | Vert-citron — fond du footer |
| `--font-display` | Ribeye Marrow | H1, H2, H3 (police décorative, en `public/fonts/`) |
| `--font-nav` / `--font-heading` | Raleway | Navigation + labels |
| `--font-body` | Open Sans | Corps de texte (16px / line-height 1.6) |

- Polices locales dans `public/fonts/` (Ribeye Marrow) + Google Fonts (Open Sans, Raleway) chargées dans `Layout.astro`. (Avenir n'est plus utilisé.)
- H2/H3 : Ribeye Marrow, couleur primaire, soulignés (comme les titres rouges de clown-gestalt.fr).
- Classe `.info-box` = encadré grisé avec bordure gauche rouge (utilisé pour les blocs de dates).
- Classe `.dates-ul` = liste de dates sans puce, une par ligne.

---

## Composants layout (src/components/layout/)

| Fichier | Rôle |
|---|---|
| `Layout.astro` | Gabarit commun : `<head>`, SEO/OpenGraph, Google Fonts, favicon, JSON-LD Person. Insère Header + slot + PreFooter + Footer. |
| `Header.astro` | Navigation desktop (dropdowns au survol) + burger mobile. Tableau `nav` éditable en haut. |
| `PreFooter.astro` | Fond vert : formulaire newsletter Brevo (gauche) + lecteur podcast Spotify (droite). |
| `Footer.astro` | Fond vert-citron + barre copyright noire. Logo en cercle. |

---

## Newsletter Brevo

- **Endpoint** : `src/pages/subscribe.ts` (POST). Lit `BREVO_API_KEY` + `BREVO_LIST_ID` (défaut 28) via `getEnv`.
- **Liste Brevo** : #28 (« ajout LSI 2026 »).
- Formulaire dans `PreFooter.astro` → `fetch('/subscribe', { email, prenom, website })`.
- **Anti-abus** : vérifie l'en-tête `Origin`/`Referer` (seuls `nicolas-cornut.com` et `www.nicolas-cornut.com` acceptés, sinon 403) + champ honeypot `website` (caché) + validation email stricte.

---

## Sécurité en place

| Composant | Protection |
|---|---|
| `/admin` + `/api/update-dates` | **Cloudflare Access** — application self-hosted, policy « Admin Nicolas » (Allow email = `nicolas.cornut@gmail.com`). 4 destinations : `admin` et `api/update-dates` sur www et apex. |
| `src/middleware.ts` | En-têtes de sécurité sur toutes les réponses : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. |
| CSP | Autorise : Spotify (`open.spotify.com`), Brevo (`9b68bf88.sibforms.com`), Google Fonts. Scripts/styles inline autorisés (`'unsafe-inline'`). ⚠️ Ajouter toute nouvelle source d'iframe/script ici sinon elle sera bloquée. |
| `subscribe.ts` | Vérification d'origine + honeypot (voir Newsletter). |
| Secrets | Chiffrés dans Cloudflare (wrangler secret), jamais dans le repo. `.env` gitignoré. |

**Cloudflare Access** : dashboard → Zero Trust (équipe `lively-night-f977`) → Access controls → Applications / Policies.

---

## Structure des fichiers clés

```
src/
├── pages/
│   ├── index.astro              ← accueil (hero + 3 cartes + podcast)
│   ├── *.astro                  ← pages de contenu (contenu en dur)
│   ├── particuliers/            ← sous-pages Particuliers
│   ├── admin/index.astro        ← BACK OFFICE (protégé Access)
│   ├── api/update-dates.ts      ← écrit dates.json via API GitHub (protégé Access)
│   └── subscribe.ts             ← inscription newsletter Brevo (public, anti-abus)
├── data/
│   └── dates.json               ← SEUL contenu dynamique (édité par le back office)
├── lib/
│   └── env.ts                   ← getEnv() : lecture env via cloudflare:workers
├── components/layout/           ← Layout, Header, Footer, PreFooter
├── middleware.ts                ← en-têtes de sécurité (toutes les réponses)
└── styles/global.css            ← design tokens + styles globaux

public/
├── fonts/                       ← Ribeye Marrow, (Avenir inutilisé)
└── images/                      ← photos (téléchargées de l'ancien WP)

astro.config.mjs                 ← output: server + adaptateur Cloudflare
.env                             ← secrets locaux (gitignoré)
```

---

## Commandes utiles

```bash
cd /Users/nicolascornut/Sites/nicolas-cornut-site

# Dev local
npm run dev                      # → http://localhost:4321 (ou 4322)

# Build
npm run build

# Pousser (avec sync git obligatoire)
git add <fichiers>
git commit -m "Description"
git pull --rebase && git push

# Gérer les secrets Cloudflare
printf '%s' "VALEUR" | npx wrangler secret put <NOM> --name nicolas-cornut-site
npx wrangler secret list --name nicolas-cornut-site
npx wrangler whoami

# Déploiement / logs
# → Cloudflare Dashboard → Workers & Pages → nicolas-cornut-site
```

---

## Notes importantes

1. **Worker, pas Pages.** Ne pas ajouter de `wrangler.toml` (conflit `ASSETS` réservé). Cloudflare Workers Builds déploie via `npx wrangler deploy` en CI.
2. **Env via `getEnv()`** (`src/lib/env.ts`) — jamais `locals.runtime.env` (supprimé en Astro v6) ni `import.meta.env[cléDynamique]`.
3. **Secrets = secrets chiffrés** (`wrangler secret put`), jamais variables plaintext (effacées à chaque deploy).
4. **UTF-8 dans update-dates.ts** : toujours `b64ToUtf8`/`utf8ToB64`, jamais `atob`/`btoa` seuls (corrompt les accents).
5. **CSP** (`src/middleware.ts`) : toute nouvelle iframe/script tiers doit y être ajoutée, sinon bloquée.
6. **Dossier local souvent en retard** à cause des commits du back office : toujours `git pull --rebase` avant de modifier.
7. **Dates = seul contenu dynamique.** Le reste est en dur dans les `.astro`.
8. **Emails OVH** : les enregistrements MX restent chez OVH (DNS gérés par Cloudflare). Ne pas toucher aux MX/CNAME mail dans la zone DNS Cloudflare.
9. **Attribution des commits** : finir par `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Historique de la mise en ligne (résumé)

Site WordPress (OVH) refait à neuf en Astro + Cloudflare, calqué sur clown-gestalt.fr.
- Domaine : nameservers OVH → Cloudflare (DNS Anycast OVH résilié, A records web supprimés, custom domains du Worker créés pour www + apex, MX OVH préservés).
- Bugs résolus en chemin : User-Agent GitHub manquant, secrets plaintext effacés aux deploys, `locals.runtime.env` supprimé (Astro v6), encodage UTF-8 des accents.
- Documentation utilisateur (non technique) : `~/Desktop/Site-nicolas-cornut_Documentation.pdf`.
