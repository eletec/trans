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
import { Eye, Truck, RotateCcw, Trash2, Save, Loader2, Zap, Printer } from 'lucide-react';
import { api } from './api/client';

export const AppContext = createContext();

const DEFAULT_TRUCK = {
  length_cm: 1360,
  width_cm: 245,
  height_cm: 270,
  max_weight_kg: 24000
};

// Standard transport container presets
const TRUCK_PRESETS = [
  { name: 'Semi-remorque 13.6m', length_cm: 1360, width_cm: 245, height_cm: 270, max_weight_kg: 24000 },
  { name: 'Porteur 7.7m', length_cm: 770, width_cm: 245, height_cm: 270, max_weight_kg: 11000 },
  { name: 'Fourgon 20m³', length_cm: 430, width_cm: 210, height_cm: 220, max_weight_kg: 1200 },
  { name: 'Container 20\'', length_cm: 590, width_cm: 235, height_cm: 239, max_weight_kg: 21770 },
  { name: 'Container 40\'', length_cm: 1203, width_cm: 235, height_cm: 239, max_weight_kg: 26680 },
  { name: 'Container 40\' HC', length_cm: 1203, width_cm: 235, height_cm: 269, max_weight_kg: 26460 },
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
  const [iterations, setIterations] = useState(1000);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showPaletteConfig, setShowPaletteConfig] = useState(false);
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
      } catch (e) {
        // Preferences not available yet, use defaults
      } finally {
        setPrefsLoaded(true);
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
    if (palettes.length === 0) { setError('Ajoutez au moins une palette'); return; }
    const useMode = modeOverride || calcMode;
    setLoading(true);
    setError('');
    try {
      const data = await api.calculate({
        palettes,
        truck,
        heuristic,
        mode: useMode,
        iterations: useMode === 'simulation' ? iterations : 0,
        allowRotation,
        groupContiguous,
        maxTrucks
      });
      setResult(data.result);
      setActiveTruckIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragPalette = (truckIdx, palIdx, newX, newY) => {
    if (!result) return;
    setResult(prev => {
      const next = { ...prev, trucks: [...prev.trucks] };
      next.trucks[truckIdx] = {
        ...next.trucks[truckIdx],
        placements: next.trucks[truckIdx].placements.map((p, i) =>
          i === palIdx ? { ...p, x: Math.round(newX), y: Math.round(newY) } : p
        )
      };
      return next;
    });
  };

  const handleDropPalette = (truckIdx, palIdx, newX, newY) => {
    if (!result) return;
    // Recalculate maxX (floor meters) from current positions
    setResult(prev => {
      const next = { ...prev, trucks: [...prev.trucks] };
      const t = { ...next.trucks[truckIdx] };
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
          calcMode, iterations, marker, paletteTemplates
        }
      });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    } catch (e) {
      setError('Erreur sauvegarde: ' + e.message);
    }
  };

  const handlePrint = () => {
    if (!result || !result.trucks) return;

    // Gather all 2D canvas images (one per truck rendered in the DOM)
    const canvases = document.querySelectorAll('canvas');
    const canvasImages = Array.from(canvases).map(c => {
      try { return c.toDataURL('image/png'); } catch { return ''; }
    });

    // Build per-truck sections
    const truckSections = result.trucks.map((truckData, tIdx) => {
      const paletteRows = truckData.placements.map((p, i) =>
        `<tr>
          <td>#${p.num || (i + 1)}</td>
          <td>${p.ref || '-'}</td>
          <td style="width:20px;height:14px;background:${p.color || '#ccc'};border:1px solid #999"></td>
          <td>${p.placedWidth * 10} × ${p.placedHeight * 10}</td>
          <td>${p.weight || '-'}</td>
          <td>(${p.x}, ${p.y})</td>
          <td>${p.rotated ? 'Oui' : 'Non'}</td>
        </tr>`
      ).join('');

      const imgSrc = canvasImages[tIdx] || '';
      return `
<h2>Camion ${tIdx + 1} — ${truckData.floorMeters?.toFixed(2)}m — ${truckData.placements.length} palette(s) — ${truckData.totalWeight}kg — ${(truckData.occupancy * 100).toFixed(1)}%</h2>
<div class="plan-img">
  ${imgSrc ? `<img src="${imgSrc}" />` : '<p>Vue non disponible</p>'}
</div>
<table>
  <thead><tr><th>#</th><th>Réf</th><th>Couleur</th><th>Dimensions (mm)</th><th>Poids (kg)</th><th>Position (cm)</th><th>Pivoté</th></tr></thead>
  <tbody>${paletteRows}</tbody>
</table>`;
    }).join('\n<div style="page-break-before:always"></div>\n');

    // Multi-truck summary
    const truckSummaryRows = result.trucks.map((t, i) =>
      `<tr>
        <td><strong>Camion ${i + 1}</strong></td>
        <td>${t.placements.length} palettes</td>
        <td>${t.floorMeters?.toFixed(2)}m</td>
        <td>${t.totalWeight}kg</td>
        <td>${(t.occupancy * 100).toFixed(1)}%</td>
      </tr>`
    ).join('');

    const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Plan de chargement — Easy Packing</title>
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
    <h1>🚛 Easy Packing — Plan de chargement</h1>
    <span>${currentProjectName || 'Sans nom'}</span>
  </div>
  <div class="header-right">
    ${new Date().toLocaleString('fr-FR')}<br>
    ${result.trucks.length} camion(s)
  </div>
</div>

<h2>Configuration camion</h2>
<div class="truck-config">
  <span>Longueur: <strong>${truck.length_cm} cm</strong></span>
  <span>Largeur: <strong>${truck.width_cm} cm</strong></span>
  <span>Hauteur: <strong>${truck.height_cm} cm</strong></span>
  <span>Poids max: <strong>${truck.max_weight_kg} kg</strong></span>
</div>

<h2>Résumé</h2>
<div class="summary">
  <div class="summary-item"><div class="val">${result.totalPlaced}/${result.totalPalettes}</div><div class="lbl">Palettes placées</div></div>
  <div class="summary-item"><div class="val">${result.trucks.length}</div><div class="lbl">Camion(s)</div></div>
</div>

${result.trucks.length > 1 ? `
<h2>Détail par camion</h2>
<table><thead><tr><th>Camion</th><th>Palettes</th><th>Plancher</th><th>Poids</th><th>Occupé</th></tr></thead>
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

  const ctx = {
    user, setUser, palettes, setPalettes, truck, setTruck,
    result, setResult, loading, viewMode, setViewMode,
    heuristic, setHeuristic, allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous, maxTrucks, setMaxTrucks,
    calcMode, setCalcMode, iterations, setIterations,
    activeTruckIndex, setActiveTruckIndex, error, setError,
    language, setLanguage, marker, setMarker,
    addPalette, updatePalette, removePalette,
    handleCalculate, handleDragPalette, handleLoadProject, handleQuickSave,
    handleLogout, showPrefs, setShowPrefs, showProjects, setShowProjects,
    showPaletteConfig, setShowPaletteConfig,
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
          <div className="flex flex-col lg:flex-row gap-4 h-full">
            {/* Left panel: data entry */}
            <div className="w-full lg:w-[420px] flex flex-col gap-4 shrink-0">
              <TruckConfig />
              <PaletteGrid />
              {/* Mode buttons — matching original Preview / Calculer */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCalculate('preview')}
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md text-sm"
                  title="Aperçu rapide (1 passe, pas d'optimisation)"
                >
                  {loading && calcMode === 'preview' ? '...' : <><Eye className="w-4 h-4 inline -mt-0.5" /> Preview</>}
                </button>
                <button
                  onClick={() => handleCalculate('calculate')}
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md text-sm"
                  title="Calcul optimal (Recuit Simulé)"
                >
                  {loading && calcMode === 'calculate' ? '...' : <><Truck className="w-4 h-4 inline -mt-0.5" /> Calculer</>}
                </button>
                <button
                  onClick={() => { setResult(null); setError(''); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-3 rounded-lg transition-colors"
                  title="Réinitialiser"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    try { await api.clearCache(); setResult(null); setError(''); }
                    catch(e) { setError('Erreur: ' + e.message); }
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-600 py-3 px-3 rounded-lg transition-colors"
                  title="Vider le cache et recalculer"
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
                  title={currentProjectId ? `Sauvegarder "${currentProjectName}"` : 'Enregistrer comme nouveau projet'}
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
            </div>

            {/* Right panel: visualization + results */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* View toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === '2d' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Vue 2D
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === '3d' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Vue 3D
                </button>

                {result && result.trucks && result.trucks.length > 1 && (
                  <span className="ml-2 text-sm text-gray-500 font-medium">{result.trucks.length} camions</span>
                )}

                {result && (
                  <span className="ml-auto text-sm text-gray-500 flex gap-3 items-center">
                    <span>Mode: <strong>{result.mode}</strong></span>
                    <span>Heuristique: <strong>{result.heuristic}</strong></span>
                    {result.iterations > 1 && <span>{result.iterations} iter.</span>}
                    {result.fromCache && <span className="text-green-600 flex items-center gap-1" title="Résultat depuis le cache"><Zap className="w-3 h-3" /> cache</span>}
                    <button
                      onClick={handlePrint}
                      className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors flex items-center gap-1"
                      title="Imprimer le plan de chargement"
                    >
                      <Printer className="w-4 h-4" /> Imprimer
                    </button>
                  </span>
                )}
              </div>

              {/* Visualization — all trucks stacked */}
              <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-auto min-h-[300px] relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/70 z-10 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm text-gray-600 font-medium">Calcul en cours...</p>
                    <p className="text-xs text-gray-400">Optimisation par recuit simulé</p>
                  </div>
                )}
                {result && result.trucks && result.trucks.map((trk, tIdx) => (
                  <div key={tIdx}>
                    {result.trucks.length > 1 && (
                      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                        Camion {tIdx + 1} — {trk.floorMeters?.toFixed(2)}m — {trk.placements?.length} palette(s) — {trk.totalWeight}kg
                      </div>
                    )}
                    <div style={{ minHeight: '300px' }}>
                      {viewMode === '2d' ? (
                        <Canvas2D
                          truck={truck}
                          result={result}
                          truckIndex={tIdx}
                          onDragPalette={handleDragPalette}
                          onDropPalette={handleDropPalette}
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
                    <p className="text-gray-400 text-lg">Lancez un calcul pour afficher le résultat</p>
                  </div>
                )}
              </div>

              {/* Results log */}
              <ResultsPanel result={result} />
            </div>
          </div>
        )}

        {showPrefs && <PreferencesDialog />}
        {showProjects && <ProjectManager />}
        {showPaletteConfig && <PaletteConfigDialog />}
      </Layout>
    </AppContext.Provider>
  );
}
