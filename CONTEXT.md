# ADC Trans Web — Contexte Projet

## Date de création : 2026-04-02

## Description
Port de l'application ADCTRANS (C++ Builder/VCL) vers une application web moderne.
Calcul d'encombrement de palettes dans un ou plusieurs camions avec visualisation 2D/3D.

## Stack Technique
- **Backend** : Node.js + Express + SQLite (better-sqlite3)
- **Frontend** : React 18 + Vite + TailwindCSS
- **Visualisation 2D** : Canvas HTML5 avec drag & drop
- **Visualisation 3D** : Three.js
- **Auth** : JWT + bcrypt
- **Algorithme** : MAXRECTS amélioré (Deterministic Best-Fit Decreasing + Multi-Heuristic)

## Architecture
```
www/
├── server/              # Backend Node.js
│   ├── index.js         # Point d'entrée Express
│   ├── db.js            # SQLite init + helpers
│   ├── auth.js          # Middleware JWT
│   ├── routes/
│   │   ├── auth.js      # Login/register/profile
│   │   ├── projects.js  # CRUD projets de chargement
│   │   ├── palettes.js  # Config palettes prédéfinies
│   │   └── calculate.js # Lancer le calcul bin packing
│   └── algorithm/
│       ├── maxrects.js   # MAXRECTS bin packing porté en JS
│       ├── solver.js     # Orchestrateur multi-heuristique + multi-camion
│       └── grouping.js   # Groupement palettes identiques
├── client/              # Frontend React
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── PaletteGrid.jsx      # Grille de saisie palettes
│   │   │   ├── TruckConfig.jsx      # Config camions
│   │   │   ├── Canvas2D.jsx         # Visualisation 2D + drag&drop
│   │   │   ├── View3D.jsx           # Visualisation 3D Three.js
│   │   │   ├── ResultsPanel.jsx     # Log résultats
│   │   │   ├── LoginForm.jsx
│   │   │   └── PreferencesDialog.jsx
│   │   ├── hooks/
│   │   ├── api/
│   │   └── utils/
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── package.json
└── CONTEXT.md
```

## Fonctionnalités — Correspondance Original → Web

| # | Fonctionnalité | Original | Web | Statut |
|---|---|---|---|---|
| 1 | Algorithme optimal | Brute force random 100k iter | Multi-heuristique déterministe | TODO |
| 2 | Palettes contiguës | Non supporté | Groupement pré-packing | TODO |
| 3 | Multi-camions | 1 seul camion | N camions avec débordement auto | TODO |
| 4 | Contrainte poids | Non | Poids par palette + limite camion | TODO |
| 5 | Fonctionnalités existantes | Complet | Port complet | TODO |
| 6 | Design moderne | VCL Windows | React + Tailwind responsive | TODO |
| 7 | Gestion utilisateurs | Non | JWT + SQLite | TODO |
| 8 | Vue 3D | Non | Three.js optionnel | TODO |
| 9 | Drag & drop | Non | Canvas interactif | TODO |

## Dimensions camion par défaut
- Longueur : 1340 cm (13.4m)
- Largeur : 242 cm (2.42m)  
- Hauteur : 270 cm (pour le 3D)
- Poids max : 24000 kg (par défaut)

## Algorithme — Détail de l'approche
1. **Pré-traitement** : grouper les palettes identiques (même LxlxH)
2. **Tri** : par aire décroissante (Best-Fit Decreasing)
3. **Placement groupé** : les palettes identiques sont placées en bandes contiguës
4. **Multi-heuristique** : exécuter les 5 heuristiques MAXRECTS, garder la meilleure
5. **Multi-bin** : si débordement → ouvrir un nouveau camion
6. **Post-traitement** : drag & drop pour ajustements manuels

## Heuristiques MAXRECTS conservées
- BestShortSideFit (BSSF)
- BestLongSideFit (BLSF)
- BestAreaFit (BAF)
- BottomLeftRule (BL)
- ContactPointRule (CP)

## Journal des modifications
- 2026-04-02 : Création du projet, analyse des besoins, définition de l'architecture
- 2026-04-02 : Backend complet (Express + SQLite + JWT auth + routes API)
- 2026-04-02 : Algorithme MAXRECTS porté en JS + solver multi-heuristique + groupement contigu
- 2026-04-02 : Frontend React complet (saisie, visualisation 2D/3D, drag&drop, projets)
- 2026-04-02 : Test : 7/7 palettes placées en une passe (BestShortSideFit auto-sélectionné)
- 2026-04-02 : Initial commit + push GitHub
- 2026-04-03 : Internationalisation complète — 9 langues (fr/en/es/de/it/nl/pt/zh/ru), hook useT(), toutes les clés traduites
- 2026-04-03 : Corrections design : fond du journal log (bg-gray-100 / dark:bg-gray-900 + leading-tight)
- 2026-04-03 : Canvas2D + View3D : fond adaptatif dark/light mode (canvas background + grille + gradient 3D)
- 2026-04-03 : Responsive mobile : marges Canvas2D réduites, hauteur viz auto en 2D / fixe 450px en 3D
- 2026-04-04 : Visualisation essieux et centre de gravité sur Canvas2D :
    · Champ `axle_rear_cm` ajouté à DEFAULT_TRUCK et 6 presets camion
    · Input "Essieux arrière (cm)" dans TruckConfig (localisé 9 langues)
    · Canvas2D : triangle roi (king pin, amber à x=0), triangle bogie (amber + ligne tiretée à axle_rear_cm)
    · Centre de gravité (CdG) : triangle inversé + label "CdG X.Xm" + répartition des poids Pivot/Bogie
- 2026-04-05 : Indicateur CdG colorisé selon l'équilibre de charge (feu tricolore) :
    · Vert  (0.30 ≤ ratio ≤ 0.55) : charge bien équilibrée
    · Orange (0.20–0.30 ou 0.55–0.70) : acceptable, attention requise
    · Rouge  (< 0.20 ou > 0.70) : déséquilibre dangereux
    · La couleur s'applique au triangle CdG, au trait de guidage, au label et aux textes de répartition
