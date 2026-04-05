# Easy Packing - Truck Loading Optimization

Web application for pallet loading optimization in trucks.
The engine combines a 2D solver (MAXRECTS + Simulated Annealing), a layered 3D stacking mode, and a full 3D cuboid solver (Option B) based on 3D free-space placement.

![Easy Packing](https://img.shields.io/badge/version-1.4.0-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-private-lightgrey)

## Features

- Optimized calculation: MAXRECTS (5 heuristics) + deterministic Simulated Annealing
- Multi-truck support: automatic overflow split across trucks
- 2D packing mode: historical solver, robust and fast
- 3D stacking mode (experimental): layered stacking with z coordinate
- Full 3D cuboid mode (Option B): true volume placement in free cuboids (x,y,z)
- 3D business rule: stackable yes/no per pallet (active in 3D modes only)
- 2D view: interactive canvas (drag and drop, multi-select, collisions)
- 3D view: Three.js rendering (zoom, orbit, layer visualization)
- Axle + center of gravity indicators: king pin, bogie, CoG and load split
- International standards catalog: 42 preconfigured truck/container formats
- Preset menus grouped by region (EU, UK, ISO, NA, LATAM, CN, JP, IN, AU, GCC)
- Internationalization: 9 languages (fr, en, es, de, it, nl, pt, zh, ru)
- Dark/light themes, responsive mobile/desktop UI, history, projects, export/import

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm

## Installation

```bash
git clone https://github.com/eletec/trans.git
cd trans
npm install
```

## Usage

### Development

```bash
npm run dev
```

Starts Express server (port 3001) and Vite client (port 5173) in parallel with hot reload.

### Production

```bash
npm run build
npm start
```

The client is built into `dist/` and served by Express at `http://localhost:3001`.

### Docker

```bash
docker compose up -d
```

## Calculation Modes

### 1) 2D solver (default)

Main pipeline in 4 phases:

1. Deterministic multi-strategy sorting
2. Deterministic Simulated Annealing
3. Final hill-climb refinement
4. Identical pallet grouping

### 2) 3D stacking solver (experimental)

Current 3D stacking mode is layer-based:

- Fills one layer using 2D MAXRECTS
- Moves to next layer by increasing z
- Attempts to reduce floor meters by compressing X usage

Applied rules:

- `stackable=false` -> pallet forced to ground layer (z=0)
- Footprints of non-stackable pallets become forbidden zones in upper layers
- Stacking allowed only if truck height permits it

### 3) Full 3D cuboid solver (Option B)

Option B uses a true 3D free-space approach:

- Maintains a list of free 3D boxes (`x,y,z,w,d,h`)
- Places pallets with 3D heuristics and support constraints
- Checks placement stability (support ratio, corner/center support)
- Distributes load over supporting pallets while respecting remaining capacity
- Enforces `stackable=false` rule (ground-only + blocked column above)
- Optimizes used length (floor meters) with X-width sweep

## Practical Stacking Rules

To stack on 2 layers:

- `2 x pallet_height_mm <= truck_height_mm`
- Example with a 270 cm truck (2700 mm): pallet height <= 1350 mm

So a 1500 mm pallet cannot be stacked in 3D mode.

## International Standard Formats

Built-in presets cover commonly used logistics formats:

- Europe: standard/mega/reefer semi-trailers, rigid trucks, BDF swap bodies, vans
- UK/Ireland: artic and rigid 18t/26t
- ISO maritime: 10', 20', 40', 40' HC, 45' HC, reefer 40' HC
- North America: 53'/48' dry van, reefer, pup trailers, straight trucks
- LATAM, China, Japan, India, Australia/Oceania, and GCC

Dimensions are operational reference values (mainly useful internal dimensions) and may vary slightly by manufacturer and equipment.

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
│       ├── solver.js          # Main orchestrator
│       ├── solver3d.js        # Layered 3D stacking solver
│       ├── solver3d_cuboid.js # Full 3D cuboid solver (Option B)
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

## Main API

| Method | Route | Description |
|---|---|---|
| POST | `/api/calculate` | Run a calculation (`packingDimension`: `2d`, `3d`, `3d-cuboid`) |
| GET | `/api/calculate/cache` | Solver cache statistics |
| DELETE | `/api/calculate/cache` | Clear solver cache |
| GET | `/api/auth/preferences` | Load user preferences |
| PUT | `/api/auth/preferences` | Save user preferences |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

## Known Limitations

- Full 3D cuboid mode (Option B) is heuristic: it prioritizes feasibility/stability and may not always produce absolute best compaction.
- Some advanced physical constraints are not modeled yet (dynamic transport stability, advanced stacking compatibility).
- Frontend build may show chunk-size warnings above 500 kB in Vite.

## Roadmap

- Continue tuning the full 3D cuboid solver (compaction quality and speed)
- Add more business constraints (support load limits, advanced stability, stacking compatibility rules)
