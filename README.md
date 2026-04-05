# Easy Packing — Optimisation Chargement Camions

Application web d'optimisation de chargement de palettes en camion. Calcule le placement optimal des palettes pour minimiser les mètres plancher utilisés grâce à l'algorithme MAXRECTS combiné au Simulated Annealing.

![Easy Packing](https://img.shields.io/badge/version-1.2.0-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-private-lightgrey)

## Fonctionnalités

- **Calcul optimisé** — Algorithme MAXRECTS avec 5 heuristiques + Simulated Annealing déterministe (seeded PRNG)
- **Multi-camions** — Répartition automatique sur plusieurs camions si nécessaire
- **Vue 2D** — Visualisation canvas avec drag & drop, sélection multiple, déplacement de groupes
- **Vue 3D** — Rendu Three.js interactif avec contrôles orbitaux et zoom
- **Regroupement** — Les palettes de même dimension sont placées de manière contiguë
- **Projets** — Sauvegarde/chargement de configurations avec chargement automatique du dernier projet
- **Historique** — Sauvegarde automatique de chaque calcul avec rechargement possible
- **Configuration palettes** — Modèles prédéfinis personnalisables (formats EUR, industriels, etc.)
- **Préférences utilisateur** — Heuristique, mode de calcul, marqueur, et plus
- **Export / Import** — Export JSON du projet actif, de tous les projets ou de la configuration ; import universel
- **Impression** — Export optimisé de tous les camions pour impression (plan de chargement complet)
- **Multi-utilisateurs** — Authentification JWT, préférences et entité par utilisateur, avatar
- **Internationalisation** — Interface disponible en 9 langues : 🇫🇷 Français, 🇬🇧 English, 🇪🇸 Español, 🇩🇪 Deutsch, 🇮🇹 Italiano, 🇳🇱 Nederlands, 🇵🇹 Português, 🇨🇳 中文, 🇷🇺 Русский
- **Thème sombre / clair** — Bascule dark/light mode persistante par utilisateur ; fond du canvas 2D/3D adaptatif
- **Responsive** — Interface adaptée mobile et desktop
- **Visualisation essieux & CdG** — King pin, bogie et centre de gravité affichés sur la vue 2D avec répartition des poids pivot/bogie
- **Indicateur d'équilibre** — CdG colorisé en vert / orange / rouge selon la qualité de l'équilibre de charge

## Prérequis

- [Node.js](https://nodejs.org/) >= 18
- npm

## Installation

```bash
git clone https://github.com/eletec/trans.git
cd trans
npm install
```

## Utilisation

### Développement

```bash
npm run dev
```

Lance le serveur Express (port 3001) et le client Vite (port 5173) en parallèle avec hot-reload.

### Production

```bash
npm run build
npm start
```

Le client est compilé dans `dist/` et servi directement par Express sur `http://localhost:3001`.

### Docker

```bash
docker compose up -d
```

L'appli est accessible sur `http://localhost:3001`. Les données SQLite sont persistées dans un volume Docker (`easypacking-data`).

> **Important** : modifiez `JWT_SECRET` dans `docker-compose.yml` avant de déployer en production.

## Architecture

```
www/
├── server/
│   ├── index.js              # Serveur Express + static files
│   ├── db.js                 # SQLite (better-sqlite3)
│   ├── auth.js               # Middleware JWT (30 jours)
│   ├── routes/
│   │   ├── auth.js           # Login / Register / Préférences / Profil
│   │   ├── projects.js       # CRUD projets + export/import
│   │   ├── history.js        # Historique des calculs
│   │   ├── palettes.js       # Configuration palettes
│   │   └── calculate.js      # Lancement calcul + cache
│   └── algorithm/
│       ├── solver.js          # Orchestrateur (SA + hill-climb + regroupement)
│       ├── maxrects.js        # Implémentation MAXRECTS bin packing
│       └── grouping.js        # Regroupement palettes identiques
├── client/
│   └── src/
│       ├── App.jsx            # Composant principal + AppContext + state management
│       ├── i18n.js            # Dictionnaires 9 langues + hook useT()
│       ├── api/client.js      # Client API (fetch + auto-logout 401)
│       └── components/
│           ├── Canvas2D.jsx         # Vue 2D canvas (drag, multi-select, groupes)
│           ├── View3D.jsx           # Vue 3D Three.js
│           ├── TruckConfig.jsx      # Configuration camion
│           ├── PaletteGrid.jsx      # Grille de saisie des palettes
│           ├── ResultsPanel.jsx     # Résultats + journal détaillé
│           ├── ProjectManager.jsx   # Gestion des projets
│           ├── HistoryDialog.jsx    # Historique des calculs
│           ├── ExportDialog.jsx     # Export / Import JSON
│           ├── PreferencesDialog.jsx
│           ├── PaletteConfigDialog.jsx
│           ├── UserProfileMenu.jsx  # Menu utilisateur (profil, langue, thème)
│           ├── LoginForm.jsx
│           └── Layout.jsx
└── package.json
```

## Algorithme

Le solveur fonctionne en 4 phases :

1. **Phase 1 — Tri déterministe** : 7 stratégies de tri × 5 heuristiques MAXRECTS = 35 combinaisons évaluées
2. **Phase 2 — Simulated Annealing** : 100 000 itérations par heuristique avec PRNG déterministe (mulberry32), permutations par swap
3. **Phase 3 — Hill-climb** : Polish final par échanges exhaustifs depuis le meilleur résultat SA
4. **Phase 4 — Regroupement** : Post-traitement pour consolider les palettes de même taille en blocs contigus sans dégrader le résultat

### Heuristiques MAXRECTS

| Heuristique | Description |
|---|---|
| BestShortSideFit | Minimise le plus petit côté restant |
| BestLongSideFit | Minimise le plus grand côté restant |
| BestAreaFit | Minimise l'aire restante |
| BottomLeftRule | Place en bas à gauche |
| ContactPointRule | Maximise le contact avec les bords |

## Drag & Drop (Vue 2D)

- **Clic** → Sélectionne une palette
- **Ctrl+Clic** → Ajoute/retire de la sélection
- **Double-clic** → Sélectionne toutes les palettes de même taille
- **Glisser** → Déplace toutes les palettes sélectionnées ensemble
- **Relâcher** → Résolution de collisions (palettes déplacées replacées en blocs contigus)

### Indicateurs de chargement (Vue 2D)

| Symbole | Description |
|---|---|
| ▲ amber (x=0) | King pin (axe de pivot de la semi-remorque) |
| ▲ amber (essieu arrière) | Bogie (position configurable dans TruckConfig) |
| ▼ colorisé | Centre de gravité (CdG) de la charge |

La couleur du CdG indique la qualité de l'équilibre :

| Couleur | Ratio CdG/Bogie | Signification |
|---|---|---|
| 🟢 Vert | 0.30 – 0.55 | Équilibre optimal |
| 🟠 Orange | 0.20 – 0.30 ou 0.55 – 0.70 | Acceptable, attention |
| 🔴 Rouge | < 0.20 ou > 0.70 | Déséquilibre dangereux |

## Internationalisation

L'interface est intégralement traduite via `client/src/i18n.js` — un système de clé/valeur léger sans dépendance externe.

| Code | Langue |
|---|---|
| `fr` | Français (défaut) |
| `en` | English |
| `es` | Español |
| `de` | Deutsch |
| `it` | Italiano |
| `nl` | Nederlands |
| `pt` | Português |
| `zh` | 中文 (Simplifié) |
| `ru` | Русский |

La langue est sélectionnable par utilisateur dans le menu de profil. Elle est mémorisée dans le contexte React (state `language`).

## Configuration par défaut

| Paramètre | Valeur |
|---|---|
| Semi-remorque | 1360 × 245 cm |
| Hauteur | 270 cm |
| Poids max | 24 000 kg |
| Palettes | Dimensions en mm, converties en cm |

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | Node.js + Express 4.21 |
| Base de données | SQLite (better-sqlite3) |
| Authentification | JWT (jsonwebtoken + bcryptjs) |
| Frontend | React 18 + Vite 5 |
| CSS | TailwindCSS 3.4 |
| 3D | Three.js + @react-three/fiber + drei |
| Icônes | Lucide React |
| i18n | Système maison (pas de bibliothèque externe) |

## API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| GET | `/api/auth/preferences` | Préférences utilisateur |
| PUT | `/api/auth/preferences` | Modifier préférences |
| PUT | `/api/auth/profile` | Modifier profil (email, entité, avatar) |
| GET | `/api/projects` | Liste des projets |
| POST | `/api/projects` | Créer un projet |
| PUT | `/api/projects/:id` | Modifier un projet |
| DELETE | `/api/projects/:id` | Supprimer un projet |
| GET | `/api/projects/:id/export` | Exporter un projet en JSON |
| GET | `/api/projects/export/all` | Exporter tous les projets |
| POST | `/api/projects/import` | Importer des projets ou une configuration |
| GET | `/api/history` | Historique des calculs |
| DELETE | `/api/history/:id` | Supprimer une entrée d'historique |
| GET | `/api/palettes/config` | Configuration palettes |
| PUT | `/api/palettes/config` | Modifier configuration |
| POST | `/api/calculate` | Lancer le calcul d'optimisation |
| POST | `/api/calculate/clear-cache` | Vider le cache de calcul |


## Fonctionnalités

- **Calcul optimisé** — Algorithme MAXRECTS avec 5 heuristiques + Simulated Annealing déterministe (seeded PRNG)
- **Multi-camions** — Répartition automatique sur plusieurs camions si nécessaire
- **Vue 2D** — Visualisation canvas avec drag & drop, sélection multiple, déplacement de groupes
- **Vue 3D** — Rendu Three.js interactif avec contrôles orbitaux et zoom
- **Regroupement** — Les palettes de même dimension sont placées de manière contiguë
- **Projets** — Sauvegarde/chargement de configurations avec chargement automatique du dernier projet
- **Configuration palettes** — Modèles prédéfinis personnalisables (formats EUR, industriels, etc.)
- **Préférences utilisateur** — Heuristique, mode de calcul, marqueur, et plus
- **Impression** — Export optimisé de tous les camions pour impression
- **Multi-utilisateurs** — Authentification JWT, préférences par utilisateur

## Prérequis

- [Node.js](https://nodejs.org/) >= 18
- npm

## Installation

```bash
git clone https://github.com/eletec/trans.git
cd trans
npm install
```

## Utilisation

### Développement

```bash
npm run dev
```

Lance le serveur Express (port 3001) et le client Vite (port 5173) en parallèle avec hot-reload.

### Production

```bash
npm run build
npm start
```

Le client est compilé dans `dist/` et servi directement par Express sur `http://localhost:3001`.

### Docker

```bash
docker compose up -d
```

L'appli est accessible sur `http://localhost:3001`. Les données SQLite sont persistées dans un volume Docker (`easypacking-data`).

> **Important** : modifiez `JWT_SECRET` dans `docker-compose.yml` avant de déployer en production.

## Architecture

```
www/
├── server/
│   ├── index.js              # Serveur Express + static files
│   ├── db.js                 # SQLite (better-sqlite3)
│   ├── auth.js               # Middleware JWT (30 jours)
│   ├── routes/
│   │   ├── auth.js           # Login / Register / Préférences
│   │   ├── projects.js       # CRUD projets
│   │   ├── palettes.js       # Configuration palettes
│   │   └── calculate.js      # Lancement calcul
│   └── algorithm/
│       ├── solver.js          # Orchestrateur (SA + hill-climb + regroupement)
│       ├── maxrects.js        # Implémentation MAXRECTS bin packing
│       └── grouping.js        # Regroupement palettes identiques
├── client/
│   └── src/
│       ├── App.jsx            # Composant principal + state management
│       ├── api/client.js      # Client API (fetch + auto-logout 401)
│       └── components/
│           ├── Canvas2D.jsx   # Vue 2D canvas (drag, multi-select, groupes)
│           ├── View3D.jsx     # Vue 3D Three.js
│           ├── TruckConfig.jsx
│           ├── PaletteGrid.jsx
│           ├── ResultsPanel.jsx
│           ├── ProjectManager.jsx
│           ├── PreferencesDialog.jsx
│           ├── PaletteConfigDialog.jsx
│           ├── LoginForm.jsx
│           └── Layout.jsx
└── package.json
```

## Algorithme

Le solveur fonctionne en 4 phases :

1. **Phase 1 — Tri déterministe** : 7 stratégies de tri × 5 heuristiques MAXRECTS = 35 combinaisons évaluées
2. **Phase 2 — Simulated Annealing** : 100 000 itérations par heuristique avec PRNG déterministe (mulberry32), permutations par swap
3. **Phase 3 — Hill-climb** : Polish final par échanges exhaustifs depuis le meilleur résultat SA
4. **Phase 4 — Regroupement** : Post-traitement pour consolider les palettes de même taille en blocs contigus sans dégrader le résultat

### Heuristiques MAXRECTS

| Heuristique | Description |
|---|---|
| BestShortSideFit | Minimise le plus petit côté restant |
| BestLongSideFit | Minimise le plus grand côté restant |
| BestAreaFit | Minimise l'aire restante |
| BottomLeftRule | Place en bas à gauche |
| ContactPointRule | Maximise le contact avec les bords |

## Drag & Drop (Vue 2D)

- **Clic** → Sélectionne une palette
- **Ctrl+Clic** → Ajoute/retire de la sélection
- **Double-clic** → Sélectionne toutes les palettes de même taille
- **Glisser** → Déplace toutes les palettes sélectionnées ensemble
- **Relâcher** → Résolution de collisions (palettes déplacées replacées en blocs contigus)

## Configuration par défaut

| Paramètre | Valeur |
|---|---|
| Semi-remorque | 1360 × 245 cm |
| Hauteur | 270 cm |
| Poids max | 24 000 kg |
| Palettes | Dimensions en mm, converties en cm |

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | Node.js + Express 4.21 |
| Base de données | SQLite (better-sqlite3) |
| Authentification | JWT (jsonwebtoken + bcryptjs) |
| Frontend | React 18 + Vite 5 |
| CSS | TailwindCSS 3.4 |
| 3D | Three.js + @react-three/fiber + drei |
| Icônes | Lucide React |

## API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| GET | `/api/auth/preferences` | Préférences utilisateur |
| PUT | `/api/auth/preferences` | Modifier préférences |
| GET | `/api/projects` | Liste des projets |
| POST | `/api/projects` | Créer un projet |
| PUT | `/api/projects/:id` | Modifier un projet |
| DELETE | `/api/projects/:id` | Supprimer un projet |
| GET | `/api/palettes/config` | Configuration palettes |
| PUT | `/api/palettes/config` | Modifier configuration |
| POST | `/api/calculate` | Lancer le calcul d'optimisation |
