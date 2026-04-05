# Easy Packing — Optimisation Chargement Camions

Application web d'optimisation de chargement de palettes en camion.
Le moteur combine un solveur 2D (MAXRECTS + Simulated Annealing), un mode 3D stacking layered et un solveur 3D cuboide complet (Option B) base sur des espaces libres 3D.

![Easy Packing](https://img.shields.io/badge/version-1.4.0-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-private-lightgrey)

## Fonctionnalites

- Calcul optimise: MAXRECTS (5 heuristiques) + Simulated Annealing deterministe
- Multi-camions: repartition automatique en cas de debordement
- Mode remplissage 2D: solveur historique, robuste et rapide
- Mode remplissage 3D stacking (experimental): empilage par couches avec coordonnee z
- Mode remplissage 3D cuboide (Option B): placement en volume dans des cuboides libres (x,y,z)
- Regle metier 3D: palette empilable oui/non (active uniquement en mode 3D)
- Vue 2D: canvas interactif (drag and drop, multi-selection, collisions)
- Vue 3D: rendu Three.js (zoom, orbite, visualisation des couches)
- Indicateurs essieux + CdG: king pin, bogie, CdG et repartition de charge
- Internationalisation: 9 langues (fr, en, es, de, it, nl, pt, zh, ru)
- Themes dark/light, responsive mobile/desktop, historique, projets, export/import

## Prerequis

- [Node.js](https://nodejs.org/) >= 18
- npm

## Installation

```bash
git clone https://github.com/eletec/trans.git
cd trans
npm install
```

## Utilisation

### Developpement

```bash
npm run dev
```

Lance le serveur Express (port 3001) et le client Vite (port 5173) en parallele avec hot reload.

### Production

```bash
npm run build
npm start
```

Le client est compile dans `dist/` et servi par Express sur `http://localhost:3001`.

### Docker

```bash
docker compose up -d
```

## Modes de calcul

### 1) Solveur 2D (par defaut)

Pipeline principal en 4 phases:

1. Tri deterministe multi-strategies
2. Simulated Annealing deterministe
3. Hill-climb de finition
4. Regroupement des palettes identiques

### 2) Solveur 3D stacking (experimental)

Le mode 3D actuel fonctionne par couches horizontales:

- Remplit une couche avec MAXRECTS 2D
- Passe a la couche suivante en augmentant z
- Tente de reduire les metres plancher en comprimant l'axe X

Regles appliquees:

- `stackable=false` -> palette forcee au sol (z=0)
- Les empreintes des palettes non empilables deviennent des zones interdites en couches superieures
- Empilage possible seulement si la hauteur camion le permet

### 3) Solveur 3D cuboide complet (Option B)

Le mode Option B utilise un free-space 3D en cuboides:

- Maintient une liste d'espaces libres 3D (`x,y,z,w,d,h`)
- Place les palettes selon heuristiques 3D et contraintes de support
- Verifie la stabilite de pose (ratio de support, coins/centre supportes)
- Repartit la charge sur les palettes support et respecte leur capacite restante
- Integre la regle `stackable=false` (sol uniquement + colonne interdite)
- Optimise la longueur utile (metres plancher) via balayage de largeur X

## Regles pratiques pour tester l'empilage

Pour empiler sur 2 couches:

- `2 x hauteur_palette_mm <= hauteur_camion_mm`
- Exemple avec camion 270 cm (2700 mm): palette <= 1350 mm

Donc une palette de 1500 mm ne peut pas etre empilee en mode 3D.

## Architecture

```text
www/
├── server/
│   ├── index.js
│   ├── db.js
│   ├── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── history.js
│   │   ├── palettes.js
│   │   └── calculate.js
│   └── algorithm/
│       ├── solver.js          # Orchestrateur principal
│       ├── solver3d.js        # Solveur 3D stacking (layered)
│       ├── solver3d_cuboid.js # Solveur 3D cuboide (Option B)
│       ├── maxrects.js
│       └── grouping.js
├── client/
│   └── src/
│       ├── App.jsx
│       ├── i18n.js
│       ├── api/client.js
│       └── components/
│           ├── Layout.jsx
│           ├── TruckConfig.jsx
│           ├── PaletteGrid.jsx
│           ├── Canvas2D.jsx
│           ├── View3D.jsx
│           ├── ResultsPanel.jsx
│           ├── PreferencesDialog.jsx
│           ├── ProjectManager.jsx
│           ├── HistoryDialog.jsx
│           └── ExportDialog.jsx
└── package.json
```

## API principale

| Methode | Route | Description |
|---|---|---|
| POST | `/api/calculate` | Lance un calcul (`packingDimension`: `2d`, `3d`, `3d-cuboid`) |
| GET | `/api/calculate/cache` | Statistiques du cache solveur |
| DELETE | `/api/calculate/cache` | Vide le cache solveur |
| GET | `/api/auth/preferences` | Charge preferences utilisateur |
| PUT | `/api/auth/preferences` | Sauvegarde preferences utilisateur |
| GET | `/api/projects` | Liste des projets |
| POST | `/api/projects` | Cree un projet |
| PUT | `/api/projects/:id` | Met a jour un projet |
| DELETE | `/api/projects/:id` | Supprime un projet |

## Limites connues

- Le mode 3D cuboide (Option B) est heuristique: il privilegie la faisabilite/stabilite et ne garantit pas toujours la meilleure compaction absolue.
- Certaines contraintes physiques avancees ne sont pas encore modelisees (stabilite dynamique transport, compatibilites de gerbage fines).
- Les performances front peuvent afficher un warning de chunk > 500 kB au build Vite.

## Roadmap

- Tuning continu du solveur cuboide 3D (qualite de compaction et vitesse)
- Contraintes metier additionnelles (charge supportable, stabilite avancee, compatibilites de superposition)
