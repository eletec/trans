import React, { useState, createContext, useContext, useEffect } from 'react';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import PaletteGrid from './components/PaletteGrid';
import TruckConfig from './components/TruckConfig';
import Canvas2D from './components/Canvas2D';
import View3D from './components/View3D';
import ResultsPanel from './components/ResultsPanel';
import PreferencesDialog from './components/PreferencesDialog';
import ProjectManager from './components/ProjectManager';
import PaletteConfigDialog from './components/PaletteConfigDialog';
import HistoryDialog from './components/HistoryDialog';
import ExportDialog from './components/ExportDialog';
import { Eye, Truck, RotateCcw, Trash2, Save, Loader2, Zap, Printer } from 'lucide-react';
import { api } from './api/client';
import { getT } from './i18n';

export const AppContext = createContext();

// ── Collision resolution on drop ────────────────────────────────
function _overlaps(a, b) {
  return a.x < b.x + b.pw && a.x + a.pw > b.x &&
         a.y < b.y + b.ph && a.y + a.ph > b.y;
}

function _isFree(test, items, skipIdx) {
  for (let j = 0; j < items.length; j++) {
    if (j === skipIdx) continue;
    if (_overlaps(test, items[j])) return false;
  }
  return true;
}

function _dimKey(p) {
  const l = Math.max(p.pw, p.ph);
  const w = Math.min(p.pw, p.ph);
  return `${l}x${w}`;
}

function resolveCollisions(placements, fixedIndices, binW, binH) {
  const fixedSet = new Set(Array.isArray(fixedIndices) ? fixedIndices : [fixedIndices]);
  const items = placements.map(p => ({
    ...p,
    pw: p.placedWidth,
    ph: p.placedHeight,
  }));

  // 1. Identify all displaced palettes (non-fixed that collide with anything)
  const displaced = [];
  for (let i = 0; i < items.length; i++) {
    if (fixedSet.has(i)) continue;
    for (let j = 0; j < items.length; j++) {
      if (j === i) continue;
      if (_overlaps(items[i], items[j])) {
        displaced.push(i);
        break;
      }
    }
  }

  if (displaced.length === 0) return placements;

  // 2. Temporarily remove displaced palettes (set to off-screen)
  const savedPositions = displaced.map(i => ({ x: items[i].x, y: items[i].y }));
  for (const i of displaced) {
    items[i] = { ...items[i], x: -9999, y: -9999 };
  }

  // 3. Group displaced palettes by dimension, keeping same sizes together
  const groups = new Map();
  for (const i of displaced) {
    const key = _dimKey(items[i]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }

  // Sort groups by area descending (place larger palettes first)
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const areaA = items[a[0]].pw * items[a[0]].ph;
    const areaB = items[b[0]].pw * items[b[0]].ph;
    return areaB - areaA;
  });

  // 4. For each group, find best contiguous block placement
  //    Priority: pack as far left as possible (minimize maxX = no gaps)
  for (const group of sortedGroups) {
    const pw = items[group[0]].pw;
    const ph = items[group[0]].ph;
    const count = group.length;

    // Build candidate anchor positions from edges of all placed palettes + bin edges
    const anchors = [{ x: 0, y: 0 }];
    for (let j = 0; j < items.length; j++) {
      if (items[j].x < -999) continue;
      const o = items[j];
      anchors.push({ x: o.x + o.pw, y: 0 });
      anchors.push({ x: o.x + o.pw, y: o.y });
      anchors.push({ x: 0, y: o.y });
      anchors.push({ x: 0, y: o.y + o.ph });
      anchors.push({ x: o.x, y: o.y + o.ph });
      anchors.push({ x: o.x + o.pw, y: o.y + o.ph });
    }

    let bestPlacement = null;
    let bestMaxX = Infinity;  // minimize rightmost edge = pack left, no gaps

    // Try grid arrangements: rows × cols, both orientations
    const arrangements = [];
    for (const [cellW, cellH] of [[pw, ph], [ph, pw]]) {
      const maxCols = Math.floor(binW / cellW);
      const maxRows = Math.floor(binH / cellH);
      for (let cols = Math.min(maxCols, count); cols >= 1; cols--) {
        const rows = Math.ceil(count / cols);
        if (rows <= maxRows) {
          arrangements.push({ cellW, cellH, cols, rows });
        }
      }
    }

    for (const arr of arrangements) {
      for (const anchor of anchors) {
        const ax = Math.max(0, Math.round(anchor.x));
        const ay = Math.max(0, Math.round(anchor.y));

        if (ax + arr.cols * arr.cellW > binW) continue;
        if (ay + arr.rows * arr.cellH > binH) continue;

        // Check each cell is free
        const positions = [];
        let allFree = true;
        for (let r = 0; r < arr.rows && positions.length < count; r++) {
          for (let c = 0; c < arr.cols && positions.length < count; c++) {
            const cx = ax + c * arr.cellW;
            const cy = ay + r * arr.cellH;
            const test = { x: cx, y: cy, pw: arr.cellW, ph: arr.cellH };
            let free = true;
            for (let j = 0; j < items.length; j++) {
              if (items[j].x < -999) continue;
              if (_overlaps(test, items[j])) { free = false; break; }
            }
            if (!free) { allFree = false; break; }
            positions.push({ x: cx, y: cy, cellW: arr.cellW, cellH: arr.cellH });
          }
          if (!allFree) break;
        }

        if (!allFree || positions.length < count) continue;

        // Compute maxX of entire truck if we place here
        // = max of all non-displaced maxX + this block's right edge
        let candidateMaxX = 0;
        for (let j = 0; j < items.length; j++) {
          if (items[j].x < -999) continue;
          candidateMaxX = Math.max(candidateMaxX, items[j].x + items[j].pw);
        }
        const blockRight = positions.reduce((mx, p) => Math.max(mx, p.x + p.cellW), 0);
        candidateMaxX = Math.max(candidateMaxX, blockRight);

        // Prefer leftmost placement (smallest maxX), break ties by smallest block X
        if (candidateMaxX < bestMaxX || (candidateMaxX === bestMaxX && ax < (bestPlacement ? bestPlacement[0].x : Infinity))) {
          bestMaxX = candidateMaxX;
          bestPlacement = positions;
        }
      }
    }

    if (bestPlacement) {
      for (let k = 0; k < group.length; k++) {
        const i = group[k];
        items[i] = {
          ...items[i],
          x: bestPlacement[k].x,
          y: bestPlacement[k].y,
          pw: bestPlacement[k].cellW,
          ph: bestPlacement[k].cellH,
        };
      }
    } else {
      // Fallback: place individually, leftmost free position
      for (const i of group) {
        const a = items[i];
        items[i] = { ...items[i], x: -9999, y: -9999 }; // keep removed while finding

        const cands = [{ x: 0, y: 0 }];
        for (let j = 0; j < items.length; j++) {
          if (j === i || items[j].x < -999) continue;
          const o = items[j];
          cands.push({ x: o.x + o.pw, y: 0 });
          cands.push({ x: o.x + o.pw, y: o.y });
          cands.push({ x: 0, y: o.y + o.ph });
          cands.push({ x: o.x, y: o.y + o.ph });
        }

        let bestX = 0, bestY = 0, bestMX = Infinity;
        for (const c of cands) {
          const cx = Math.max(0, Math.min(binW - a.pw, Math.round(c.x)));
          const cy = Math.max(0, Math.min(binH - a.ph, Math.round(c.y)));
          const test = { x: cx, y: cy, pw: a.pw, ph: a.ph };
          if (!_isFree(test, items, i)) continue;
          // Prefer leftmost
          if (cx + a.pw < bestMX || (cx + a.pw === bestMX && cy < bestY)) {
            bestMX = cx + a.pw; bestX = cx; bestY = cy;
          }
        }
        items[i] = { ...items[i], x: bestX, y: bestY };
      }
    }
  }

  // Update placedWidth/placedHeight if rotation changed
  return placements.map((p, i) => ({
    ...p,
    x: items[i].x,
    y: items[i].y,
    placedWidth: items[i].pw,
    placedHeight: items[i].ph,
    rotated: items[i].pw !== p.placedWidth ? !p.rotated : p.rotated,
  }));
}
// ─────────────────────────────────────────────────────────────────

const DEFAULT_TRUCK = {
  length_cm: 1360,
  width_cm: 245,
  height_cm: 270,
  max_weight_kg: 24000,
  axle_rear_cm: 1160,
};

// Standard international transport presets (road, ISO containers, and regional fleets)
const TRUCK_PRESETS = [
  // Europe - road
  { name: 'EU - Semi-remorque 13.6m (tautliner)', length_cm: 1360, width_cm: 245, height_cm: 270, max_weight_kg: 24000, axle_rear_cm: 1160 },
  { name: 'EU - Semi-remorque MEGA 13.6m',        length_cm: 1360, width_cm: 245, height_cm: 300, max_weight_kg: 24000, axle_rear_cm: 1160 },
  { name: 'EU - Semi-remorque frigorifique 13.4m', length_cm: 1330, width_cm: 246, height_cm: 260, max_weight_kg: 22000, axle_rear_cm: 1130 },
  { name: 'EU - Porteur 7.7m',                     length_cm: 770,  width_cm: 245, height_cm: 270, max_weight_kg: 11000, axle_rear_cm: 560  },
  { name: 'EU - Porteur 9.6m',                     length_cm: 960,  width_cm: 245, height_cm: 270, max_weight_kg: 15000, axle_rear_cm: 700  },
  { name: 'EU - Porteur 12.0m',                    length_cm: 1200, width_cm: 245, height_cm: 270, max_weight_kg: 18000, axle_rear_cm: 870  },
  { name: 'EU - Caisse mobile BDF 7.45m',          length_cm: 745,  width_cm: 245, height_cm: 270, max_weight_kg: 14000, axle_rear_cm: 610  },
  { name: 'EU - Fourgon 12m3',                     length_cm: 320,  width_cm: 175, height_cm: 190, max_weight_kg: 1000,  axle_rear_cm: 220  },
  { name: 'EU - Fourgon 20m3',                     length_cm: 430,  width_cm: 210, height_cm: 220, max_weight_kg: 1200,  axle_rear_cm: 300  },
  { name: 'EU - Fourgon 30m3',                     length_cm: 500,  width_cm: 220, height_cm: 230, max_weight_kg: 1500,  axle_rear_cm: 350  },

  // UK / Ireland - common road freight
  { name: 'UK - Artic 13.6m',                      length_cm: 1360, width_cm: 245, height_cm: 270, max_weight_kg: 24500, axle_rear_cm: 1160 },
  { name: 'UK - Rigid 18t (8.2m body)',            length_cm: 820,  width_cm: 245, height_cm: 255, max_weight_kg: 10000, axle_rear_cm: 600  },
  { name: 'UK - Rigid 26t (9.6m body)',            length_cm: 960,  width_cm: 245, height_cm: 260, max_weight_kg: 15000, axle_rear_cm: 700  },

  // ISO containers (internal dimensions approximations)
  { name: "ISO - Container 10'",                  length_cm: 283,  width_cm: 235, height_cm: 239, max_weight_kg: 10000, axle_rear_cm: 240  },
  { name: "ISO - Container 20'",                  length_cm: 590,  width_cm: 235, height_cm: 239, max_weight_kg: 21770, axle_rear_cm: 500  },
  { name: "ISO - Container 40'",                  length_cm: 1203, width_cm: 235, height_cm: 239, max_weight_kg: 26680, axle_rear_cm: 1020 },
  { name: "ISO - Container 40' HC",               length_cm: 1203, width_cm: 235, height_cm: 269, max_weight_kg: 26460, axle_rear_cm: 1020 },
  { name: "ISO - Container 45' HC",               length_cm: 1355, width_cm: 235, height_cm: 269, max_weight_kg: 27700, axle_rear_cm: 1150 },
  { name: "ISO - Container Reefer 40' HC",        length_cm: 1158, width_cm: 229, height_cm: 255, max_weight_kg: 27000, axle_rear_cm: 980  },

  // North America - common trailers / box trucks
  { name: "NA - Dry Van 53'",                     length_cm: 1615, width_cm: 248, height_cm: 274, max_weight_kg: 20000, axle_rear_cm: 1375 },
  { name: "NA - Reefer 53'",                      length_cm: 1600, width_cm: 246, height_cm: 266, max_weight_kg: 19500, axle_rear_cm: 1360 },
  { name: "NA - Dry Van 48'",                     length_cm: 1463, width_cm: 248, height_cm: 274, max_weight_kg: 19000, axle_rear_cm: 1245 },
  { name: "NA - Pup Trailer 28'",                 length_cm: 853,  width_cm: 248, height_cm: 274, max_weight_kg: 12000, axle_rear_cm: 725  },
  { name: "NA - Straight Truck 24'",              length_cm: 731,  width_cm: 246, height_cm: 250, max_weight_kg: 10000, axle_rear_cm: 620  },
  { name: "NA - Straight Truck 26'",              length_cm: 792,  width_cm: 246, height_cm: 250, max_weight_kg: 12000, axle_rear_cm: 670  },

  // Latin America - frequently used freight bodies
  { name: 'LATAM - Carreta 15m',                   length_cm: 1500, width_cm: 248, height_cm: 270, max_weight_kg: 28000, axle_rear_cm: 1275 },
  { name: 'LATAM - Truck 3/4 (6.8m)',              length_cm: 680,  width_cm: 240, height_cm: 250, max_weight_kg: 6000,  axle_rear_cm: 500  },
  { name: 'LATAM - Urban VUC (4.2m)',              length_cm: 420,  width_cm: 210, height_cm: 220, max_weight_kg: 2500,  axle_rear_cm: 300  },

  // Asia - common domestic and long-haul formats
  { name: 'CN - Van 7.6m',                         length_cm: 760,  width_cm: 240, height_cm: 250, max_weight_kg: 8000,  axle_rear_cm: 560  },
  { name: 'CN - Van 9.6m',                         length_cm: 960,  width_cm: 240, height_cm: 250, max_weight_kg: 12000, axle_rear_cm: 700  },
  { name: 'CN - Semi 13.75m',                      length_cm: 1375, width_cm: 250, height_cm: 300, max_weight_kg: 30000, axle_rear_cm: 1170 },
  { name: 'CN - Semi 17.5m',                       length_cm: 1750, width_cm: 250, height_cm: 300, max_weight_kg: 32000, axle_rear_cm: 1490 },
  { name: 'JP - 2t Truck',                         length_cm: 430,  width_cm: 210, height_cm: 220, max_weight_kg: 2000,  axle_rear_cm: 300  },
  { name: 'JP - 4t Truck',                         length_cm: 620,  width_cm: 220, height_cm: 230, max_weight_kg: 4000,  axle_rear_cm: 450  },
  { name: 'JP - 10t Truck',                        length_cm: 960,  width_cm: 240, height_cm: 240, max_weight_kg: 10000, axle_rear_cm: 700  },
  { name: 'IN - SXL 20ft',                         length_cm: 610,  width_cm: 244, height_cm: 260, max_weight_kg: 9000,  axle_rear_cm: 450  },
  { name: 'IN - SXL 32ft',                         length_cm: 975,  width_cm: 244, height_cm: 270, max_weight_kg: 16000, axle_rear_cm: 715  },

  // Oceania / Middle East - common heavy logistics
  { name: 'AU - Semi Trailer 13.7m',               length_cm: 1370, width_cm: 248, height_cm: 300, max_weight_kg: 28000, axle_rear_cm: 1165 },
  { name: 'AU - B-Double (2x13.7m)',               length_cm: 2740, width_cm: 248, height_cm: 300, max_weight_kg: 42000, axle_rear_cm: 2330 },
  { name: 'AU - Road Train (3 trailers)',          length_cm: 3650, width_cm: 248, height_cm: 300, max_weight_kg: 70000, axle_rear_cm: 3100 },
  { name: 'GCC - Curtain Side 13.6m',              length_cm: 1360, width_cm: 248, height_cm: 280, max_weight_kg: 26000, axle_rear_cm: 1160 },
  { name: 'GCC - Flatbed 12.5m',                   length_cm: 1250, width_cm: 248, height_cm: 260, max_weight_kg: 26000, axle_rear_cm: 1060 },
];

const PALETTE_COLORS = [
  '#94a3b8', '#86efac', '#fde047', '#fca5a5', '#93c5fd',
  '#c4b5fd', '#fbcfe8', '#6ee7b7', '#fdba74', '#a5f3fc',
  '#d9f99d', '#fecdd3', '#e9d5ff', '#bae6fd', '#fef08a',
  '#f9a8d4', '#a7f3d0', '#fed7aa'
];

export default function App() {
  const [user, setUser] = useState(api.getUser());
  const [palettes, setPalettes] = useState([]);
  const [truck, setTruck] = useState(DEFAULT_TRUCK);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'
  const [heuristic, setHeuristic] = useState('auto');
  const [allowRotation, setAllowRotation] = useState(true);
  const [groupContiguous, setGroupContiguous] = useState(true);
  const [maxTrucks, setMaxTrucks] = useState(5);
  const [calcMode, setCalcMode] = useState('calculate'); // 'preview' | 'calculate'
  const [packingDimension, setPackingDimension] = useState('2d'); // '2d' | '3d' | '3d-cuboid'
  const [iterations, setIterations] = useState(1000);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showPaletteConfig, setShowPaletteConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [saveFlash, setSaveFlash] = useState(false);
  const [activeTruckIndex, setActiveTruckIndex] = useState(0);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('fr');
  const [marker, setMarker] = useState(800); // marker line in cm (e.g. 800 = 8m porteur reference)

  // Palette templates with color and label (like original "Configuration Palettes" dialog)
  const DEFAULT_PALETTE_TEMPLATES = [
    { name: '2500x1000', length: 2500, width: 1000, color: '#C0C0C0', label: 'PA2' },
    { name: '2100x1000', length: 2100, width: 1000, color: '#00FF00', label: 'Mobilier C' },
    { name: '1500x1000', length: 1500, width: 1000, color: '#0000FF', label: 'Mobilier B' },
    { name: '1400x1100', length: 1400, width: 1100, color: '#FF0000', label: 'Mobilier A' },
    { name: '1500x900',  length: 1500, width: 900,  color: '#FF00FF', label: 'Présentoirs' },
    { name: '1200x800',  length: 1200, width: 800,  color: '#FFFF00', label: 'PA 1' },
    { name: '1000x1200', length: 1000, width: 1200, color: '#FFA500', label: '' },
    { name: '600x800',   length: 600,  width: 800,  color: '#00CED1', label: '' },
  ];
  const [paletteTemplates, setPaletteTemplates] = useState(DEFAULT_PALETTE_TEMPLATES);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load user preferences on login/mount
  useEffect(() => {
    if (!user) { setPrefsLoaded(false); return; }
    (async () => {
      try {
        const data = await api.getPreferences();
        const prefs = data.preferences || {};
        if (prefs.paletteTemplates) setPaletteTemplates(prefs.paletteTemplates);
        if (prefs.marker !== undefined) setMarker(prefs.marker);
        if (prefs.allowRotation !== undefined) setAllowRotation(prefs.allowRotation);
        if (prefs.groupContiguous !== undefined) setGroupContiguous(prefs.groupContiguous);
        if (prefs.calcMode) setCalcMode(prefs.calcMode);
        if (prefs.packingDimension) setPackingDimension(prefs.packingDimension);
      } catch (e) {
        // Preferences not available yet, use defaults
      } finally {
        setPrefsLoaded(true);
      }
      // Auto-load last project
      try {
        const { projects } = await api.getProjects();
        if (projects && projects.length > 0) {
          const { project } = await api.getProject(projects[0].id);
          if (project) {
            if (project.truck_config) setTruck(project.truck_config);
            if (project.palette_data) setPalettes(project.palette_data);
            if (project.result_data) setResult(project.result_data);
            if (project.heuristic) setHeuristic(project.heuristic);
            if (project.settings) {
              const s = project.settings;
              if (s.allowRotation !== undefined) setAllowRotation(s.allowRotation);
              if (s.groupContiguous !== undefined) setGroupContiguous(s.groupContiguous);
              if (s.maxTrucks !== undefined) setMaxTrucks(s.maxTrucks);
              if (s.calcMode) setCalcMode(s.calcMode);
              if (s.packingDimension) setPackingDimension(s.packingDimension);
              if (s.iterations !== undefined) setIterations(s.iterations);
              if (s.marker !== undefined) setMarker(s.marker);
              if (s.paletteTemplates) setPaletteTemplates(s.paletteTemplates);
            }
            setCurrentProjectId(project.id);
            setCurrentProjectName(project.name);
          }
        }
      } catch (e) {
        // No projects yet
      }
    })();
  }, [user]);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { api.logout(); setUser(null); };

  const addPalette = (template) => {
    setPalettes(prev => [...prev, {
      id: Date.now(),
      ref: template?.label || `P${prev.length + 1}`,
      length: template?.length || 1200,
      width: template?.width || 800,
      height: 1500,
      weight: 500,
      quantity: template?.quantity || 1,
      stackable: template?.stackable !== false,
      color: template?.color || PALETTE_COLORS[prev.length % PALETTE_COLORS.length],
      comment: template?.label || ''
    }]);
  };

  const updatePalette = (index, field, value) => {
    setPalettes(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePalette = (index) => {
    setPalettes(prev => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = async (modeOverride) => {
    if (palettes.length === 0) { setError(getT(language)('error.addPalette')); return; }
    const useMode = modeOverride || calcMode;
    setLoading(true);
    setError('');
    try {
      const data = await api.calculate({
        palettes,
        truck,
        heuristic,
        mode: useMode,
        packingDimension,
        iterations: useMode === 'simulation' ? iterations : 0,
        allowRotation,
        groupContiguous,
        maxTrucks
      });
      setResult(data.result);
      setActiveTruckIndex(0);

      // Auto-save to history
      try {
        await api.saveHistory({
          projectName: currentProjectName || 'Calcul',
          truckConfig: truck,
          paletteData: palettes,
          resultData: data.result,
          settings: { allowRotation, groupContiguous, maxTrucks, calcMode: useMode, packingDimension, iterations, marker, paletteTemplates },
          heuristic: data.result?.heuristic || heuristic,
        });
      } catch (_) { /* history save is optional */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // moves: [{palIdx, x, y}, ...]
  const handleDragPalettes = (truckIdx, moves) => {
    if (!result) return;
    setResult(prev => {
      const next = { ...prev, trucks: [...prev.trucks] };
      const trk = { ...next.trucks[truckIdx] };
      const newPlacements = [...trk.placements];
      for (const m of moves) {
        newPlacements[m.palIdx] = { ...newPlacements[m.palIdx], x: Math.round(m.x), y: Math.round(m.y) };
      }
      trk.placements = newPlacements;
      const maxX = trk.placements.reduce((mx, p) => Math.max(mx, p.x + p.placedWidth), 0);
      trk.maxX = maxX;
      trk.floorMeters = maxX / 100;
      next.trucks[truckIdx] = trk;
      return next;
    });
  };

  // fixedIndices: array of palette indices that were dragged (they stay put)
  const handleDropPalettes = (truckIdx, fixedIndices) => {
    if (!result) return;
    setResult(prev => {
      const next = { ...prev, trucks: [...prev.trucks] };
      const t = { ...next.trucks[truckIdx] };
      t.placements = resolveCollisions(t.placements, fixedIndices, truck.length_cm, truck.width_cm);
      const maxX = t.placements.reduce((mx, p) => Math.max(mx, p.x + p.placedWidth), 0);
      t.maxX = maxX;
      t.floorMeters = maxX / 100;
      next.trucks[truckIdx] = t;
      return next;
    });
  };

  const handleLoadProject = (project) => {
    if (project.truck_config) setTruck(project.truck_config);
    if (project.palette_data) setPalettes(project.palette_data);
    if (project.result_data) setResult(project.result_data);
    if (project.heuristic) setHeuristic(project.heuristic);
    if (project.settings) {
      const s = project.settings;
      if (s.allowRotation !== undefined) setAllowRotation(s.allowRotation);
      if (s.groupContiguous !== undefined) setGroupContiguous(s.groupContiguous);
      if (s.maxTrucks !== undefined) setMaxTrucks(s.maxTrucks);
      if (s.calcMode) setCalcMode(s.calcMode);
      if (s.packingDimension) setPackingDimension(s.packingDimension);
      if (s.iterations !== undefined) setIterations(s.iterations);
      if (s.marker !== undefined) setMarker(s.marker);
      if (s.paletteTemplates) setPaletteTemplates(s.paletteTemplates);
    }
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setShowProjects(false);
  };

  const handleQuickSave = async () => {
    if (!currentProjectId) { setShowProjects(true); return; }
    try {
      await api.updateProject(currentProjectId, {
        truck_config: truck,
        palette_data: palettes,
        result_data: result,
        heuristic,
        settings: {
          allowRotation, groupContiguous, maxTrucks,
          calcMode, packingDimension, iterations, marker, paletteTemplates
        }
      });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    } catch (e) {
      setError(getT(language)('error.save') + ' ' + e.message);
    }
  };

  const handlePrint = () => {
    if (!result || !result.trucks) return;
    const tp = getT(language);
    const is3D = result.packingDimension && result.packingDimension !== '2d';
    const packingModeLabel = result.packingDimension === '3d-cuboid'
      ? tp('result.packing.3dCuboid')
      : result.packingDimension === '3d'
        ? tp('result.packing.3d')
        : tp('result.packing.2d');

    // Gather all 2D canvas images (one per truck rendered in the DOM)
    const canvases = document.querySelectorAll('canvas');
    const canvasImages = Array.from(canvases).map(c => {
      try { return c.toDataURL('image/png'); } catch { return ''; }
    });

    // Build per-truck sections
    const truckSections = result.trucks.map((truckData, tIdx) => {
      const paletteRows = truckData.placements.map((p, i) => {
        const heightMm = p.height || 1500;
        const dimsText = is3D
          ? `${p.placedWidth * 10} × ${p.placedHeight * 10} × ${heightMm}`
          : `${p.placedWidth * 10} × ${p.placedHeight * 10}`;
        const posText = is3D
          ? `(${p.x}, ${p.y}, ${p.z || 0})`
          : `(${p.x}, ${p.y})`;
        return `<tr>
          <td>#${p.num || (i + 1)}</td>
          <td>${p.ref || '-'}</td>
          <td style="width:20px;height:14px;background:${p.color || '#ccc'};border:1px solid #999"></td>
          <td>${dimsText}</td>
          <td>${p.weight || '-'}</td>
          <td>${posText}</td>
          <td>${p.rotated ? tp('print.rotated.yes') : tp('print.rotated.no')}</td>
        </tr>`;
      }).join('');

      const imgSrc = canvasImages[tIdx] || '';
      return `
<h2>${tp('results.truck')} ${tIdx + 1} — ${truckData.floorMeters?.toFixed(2)}m — ${truckData.placements.length} ${tp('results.palettes')} — ${truckData.totalWeight}kg — ${(truckData.occupancy * 100).toFixed(1)}%</h2>
<div class="plan-img">
  ${imgSrc ? `<img src="${imgSrc}" />` : `<p>${tp('print.noView')}</p>`}
</div>
<table>
  <thead><tr><th>${tp('print.col.num')}</th><th>${tp('print.col.ref')}</th><th>${tp('print.col.color')}</th><th>${tp('print.col.dims')}</th><th>${tp('print.col.weightKg')}</th><th>${tp('print.col.pos')}</th><th>${tp('print.col.rotated')}</th></tr></thead>
  <tbody>${paletteRows}</tbody>
</table>`;
    }).join('\n<div style="page-break-before:always"></div>\n');

    // Multi-truck summary
    const truckSummaryRows = result.trucks.map((trk, i) =>
      `<tr>
        <td><strong>${tp('results.truck')} ${i + 1}</strong></td>
        <td>${trk.placements.length} ${tp('results.palettes')}</td>
        <td>${trk.floorMeters?.toFixed(2)}m</td>
        <td>${trk.totalWeight}kg</td>
        <td>${(trk.occupancy * 100).toFixed(1)}%</td>
      </tr>`
    ).join('');

    const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${tp('print.title')} — Easy Packing</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 15mm; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  h2 { font-size: 14px; margin: 12px 0 6px; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
  .header-left h1 { color: #1e40af; }
  .header-right { text-align: right; font-size: 10px; color: #666; }
  .summary { display: flex; gap: 20px; margin: 8px 0; }
  .summary-item { background: #f1f5f9; border-radius: 6px; padding: 8px 14px; text-align: center; }
  .summary-item .val { font-size: 16px; font-weight: bold; color: #1e40af; }
  .summary-item .lbl { font-size: 9px; color: #64748b; }
  .plan-img { text-align: center; margin: 10px 0; }
  .plan-img img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; font-size: 10px; }
  th { background: #f1f5f9; font-weight: 600; }
  .truck-config { display: flex; gap: 20px; font-size: 10px; margin: 4px 0; }
  .footer { margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 9px; color: #999; text-align: center; }
  @media print { body { padding: 10mm; } }
</style>
</head><body>
<div class="header">
  <div class="header-left">
    <h1>🚛 Easy Packing — ${tp('print.title')}</h1>
    <span>${currentProjectName || tp('print.noName')}</span>
  </div>
  <div class="header-right">
    ${new Date().toLocaleString('fr-FR')}<br>
    ${result.trucks.length} ${tp('result.trucks')}<br>
    ${tp('result.packing')} ${packingModeLabel}
  </div>
</div>

<h2>${tp('print.truckConfig')}</h2>
<div class="truck-config">
  <span>${tp('truck.length')}: <strong>${truck.length_cm} cm</strong></span>
  <span>${tp('truck.width')}: <strong>${truck.width_cm} cm</strong></span>
  <span>${tp('truck.height')}: <strong>${truck.height_cm} cm</strong></span>
  <span>${tp('truck.maxWeight')}: <strong>${truck.max_weight_kg} kg</strong></span>
</div>

<h2>${tp('print.summary')}</h2>
<div class="summary">
  <div class="summary-item"><div class="val">${result.totalPlaced}/${result.totalPalettes}</div><div class="lbl">${tp('results.placed')}</div></div>
  <div class="summary-item"><div class="val">${result.trucks.length}</div><div class="lbl">${tp('results.trucks')}</div></div>
</div>

${result.trucks.length > 1 ? `
<h2>${tp('print.detail')}</h2>
<table><thead><tr><th>${tp('print.col.truck')}</th><th>${tp('print.col.palettes')}</th><th>${tp('print.col.floor')}</th><th>${tp('print.col.weight')}</th><th>${tp('print.col.occupied')}</th></tr></thead>
<tbody>${truckSummaryRows}</tbody></table>
` : ''}

${truckSections}

<div class="footer">
  Easy Packing — Heuristique: ${result.heuristic} — Mode: ${result.mode}${result.iterations > 1 ? ` — ${result.iterations} itérations` : ''}
</div>
</body></html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(printHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  };

  const is3DMode = (mode) => !!mode && mode !== '2d';
  const packingLabel = (mode) => {
    if (mode === '3d-cuboid') return getT(language)('result.packing.3dCuboid');
    if (mode === '3d') return getT(language)('result.packing.3d');
    return getT(language)('result.packing.2d');
  };

  const ctx = {
    user, setUser, palettes, setPalettes, truck, setTruck,
    result, setResult, loading, viewMode, setViewMode,
    heuristic, setHeuristic, allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous, maxTrucks, setMaxTrucks,
    packingDimension, setPackingDimension,
    calcMode, setCalcMode, iterations, setIterations,
    activeTruckIndex, setActiveTruckIndex, error, setError,
    language, setLanguage, marker, setMarker,
    addPalette, updatePalette, removePalette,
    handleCalculate, handleDragPalettes, handleLoadProject, handleQuickSave,
    handleLogout, showPrefs, setShowPrefs, showProjects, setShowProjects,
    showPaletteConfig, setShowPaletteConfig,
    showHistory, setShowHistory, showExport, setShowExport,
    paletteTemplates, setPaletteTemplates,
    currentProjectId, setCurrentProjectId, currentProjectName, setCurrentProjectName,
    saveFlash,
    PALETTE_COLORS, TRUCK_PRESETS
  };

  return (
    <AppContext.Provider value={ctx}>
      <Layout>
        {!user && <LoginForm onLogin={handleLogin} />}
        {user && (
          <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 h-full">
            {/* Left panel: data entry */}
            <div className="w-full lg:w-[520px] flex flex-col gap-2 sm:gap-4 shrink-0">
              <TruckConfig />
              <PaletteGrid />
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{getT(language)('result.packing')}</span>
                <button
                  onClick={() => setPackingDimension('2d')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    packingDimension === '2d'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getT(language)('result.packing.2d')}
                </button>
                <button
                  onClick={() => setPackingDimension('3d')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    packingDimension === '3d'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getT(language)('result.packing.3d')}
                </button>
                <button
                  onClick={() => setPackingDimension('3d-cuboid')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    packingDimension === '3d-cuboid'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getT(language)('result.packing.3dCuboid')}
                </button>
              </div>
              {/* Mode buttons — matching original Preview / Calculer */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCalculate('preview')}
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md text-sm"
                  title="Aperçu rapide (1 passe, pas d'optimisation)"
                >
                  {loading && calcMode === 'preview' ? '...' : <><Eye className="w-4 h-4 inline -mt-0.5" /> {getT(language)('btn.preview')}</>}
                </button>
                <button
                  onClick={() => handleCalculate('calculate')}
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md text-sm"
                  title="Calcul optimal (Recuit Simulé)"
                >
                  {loading && calcMode === 'calculate' ? '...' : <><Truck className="w-4 h-4 inline -mt-0.5" /> {getT(language)('btn.calculate')}</>}
                </button>
                <button
                  onClick={() => { setResult(null); setError(''); }}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-3 rounded-lg transition-colors"
                  title={getT(language)('tooltip.reset')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    try { await api.clearCache(); setResult(null); setError(''); }
                    catch(e) { setError(getT(language)('error.save') + ' ' + e.message); }
                  }}
                  className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 py-3 px-3 rounded-lg transition-colors"
                  title={getT(language)('tooltip.clearCache')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleQuickSave}
                  className={`py-3 px-3 rounded-lg transition-all ${
                    saveFlash
                      ? 'bg-green-500 text-white'
                      : currentProjectId
                        ? 'bg-green-100 hover:bg-green-200 text-green-700'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                  title={currentProjectId ? `${getT(language)('btn.saveTitle')} "${currentProjectName}"` : getT(language)('tooltip.saveNew')}
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}
            </div>

            {/* Right panel: visualization + results */}
            <div className="flex-1 flex flex-col gap-2 sm:gap-4 min-w-0 min-h-0">
              {/* View toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === '2d' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getT(language)('view.2d')}
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === '3d' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {getT(language)('view.3d')}
                </button>

                {result && result.trucks && result.trucks.length > 1 && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium">{result.trucks.length} {getT(language)('result.trucks')}</span>
                )}

                {result && (
                  <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 flex gap-3 items-center flex-wrap">
                    <span>{getT(language)('result.mode')} <strong>{result.mode}</strong></span>
                    <span>{getT(language)('result.packing')} <strong>{packingLabel(result.packingDimension)}</strong></span>
                    <span>{getT(language)('result.heuristic')} <strong>{result.heuristic}</strong></span>
                    {result.iterations > 1 && <span>{result.iterations} {getT(language)('result.iter')}</span>}
                    {result.fromCache && <span className="text-green-600 flex items-center gap-1" title="Résultat depuis le cache"><Zap className="w-3 h-3" /> {getT(language)('result.cache')}</span>}
                    <button
                      onClick={handlePrint}
                      className="ml-2 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1"
                      title="Imprimer le plan de chargement"
                    >
                      <Printer className="w-4 h-4" /> {getT(language)('btn.print')}
                    </button>
                  </span>
                )}
              </div>

              {is3DMode(result?.packingDimension) && viewMode === '2d' && (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  Mode {packingLabel(result?.packingDimension)} actif: passe en Vue 3D pour visualiser les couches (hauteur Z).
                </div>
              )}

              {result?.packingDimension === '2d' && viewMode === '3d' && (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  Vue 3D active mais calcul en remplissage 2D: active "3D stacking" puis recalcule.
                </div>
              )}

              {/* Visualization — all trucks stacked */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-auto min-h-[150px] relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 z-10 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Calcul en cours...</p>
                    <p className="text-xs text-gray-400">Optimisation par recuit simulé</p>
                  </div>
                )}
                {result && result.trucks && result.trucks.map((trk, tIdx) => (
                  <div key={tIdx}>
                    {result.trucks.length > 1 && (
                      <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {getT(language)('results.truck')} {tIdx + 1} — {trk.floorMeters?.toFixed(2)}m — {trk.placements?.length} {getT(language)('results.palettes')} — {trk.totalWeight}kg{is3DMode(result.packingDimension) ? ` — ${trk.layers || 1} couche(s)` : ''}
                      </div>
                    )}
                    <div style={{ height: viewMode === '3d' ? '450px' : 'auto' }}>
                      {viewMode === '2d' ? (
                        <Canvas2D
                          truck={truck}
                          result={result}
                          truckIndex={tIdx}
                          onDragPalettes={handleDragPalettes}
                          onDropPalettes={handleDropPalettes}
                        />
                      ) : (
                        <View3D
                          truck={truck}
                          result={result}
                          truckIndex={tIdx}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {!result && (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <p className="text-gray-400 dark:text-gray-500 text-lg">Lancez un calcul pour afficher le résultat</p>
                  </div>
                )}
              </div>

              {/* Results log */}
              <ResultsPanel result={result} truck={truck} />
            </div>
          </div>
        )}

        {showPrefs && <PreferencesDialog />}
        {showProjects && <ProjectManager />}
        {showPaletteConfig && <PaletteConfigDialog />}
        {showHistory && <HistoryDialog />}
        {showExport && <ExportDialog />}
      </Layout>
    </AppContext.Provider>
  );
}
