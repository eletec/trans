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
import { Eye, Truck, RefreshCw, RotateCcw, Zap, Trash2 } from 'lucide-react';
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
  const [calcMode, setCalcMode] = useState('calculate'); // 'preview' | 'calculate' | 'simulation'
  const [iterations, setIterations] = useState(1000);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showPaletteConfig, setShowPaletteConfig] = useState(false);
  const [activeTruckIndex, setActiveTruckIndex] = useState(0);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('fr');
  const [marker, setMarker] = useState(800); // marker line in cm (e.g. 800 = 8m porteur reference)

  // Palette templates with color and label (like original "Configuration Palettes" dialog)
  const [paletteTemplates, setPaletteTemplates] = useState([
    { name: '2500x1000', length: 2500, width: 1000, color: '#C0C0C0', label: 'PA2' },
    { name: '2100x1000', length: 2100, width: 1000, color: '#00FF00', label: 'Mobilier C' },
    { name: '1500x1000', length: 1500, width: 1000, color: '#0000FF', label: 'Mobilier B' },
    { name: '1400x1100', length: 1400, width: 1100, color: '#FF0000', label: 'Mobilier A' },
    { name: '1500x900',  length: 1500, width: 900,  color: '#FF00FF', label: 'Présentoirs' },
    { name: '1200x800',  length: 1200, width: 800,  color: '#FFFF00', label: 'PA 1' },
    { name: '1000x1200', length: 1000, width: 1200, color: '#FFA500', label: '' },
    { name: '600x800',   length: 600,  width: 800,  color: '#00CED1', label: '' },
  ]);

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
    setShowProjects(false);
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
    handleCalculate, handleDragPalette, handleLoadProject,
    handleLogout, showPrefs, setShowPrefs, showProjects, setShowProjects,
    showPaletteConfig, setShowPaletteConfig,
    paletteTemplates, setPaletteTemplates,
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
                  title="Calcul déterministe multi-heuristique"
                >
                  {loading && calcMode === 'calculate' ? '...' : <><Truck className="w-4 h-4 inline -mt-0.5" /> Calculer</>}
                </button>
                <button
                  onClick={() => handleCalculate('simulation')}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md text-sm"
                  title={`Simulation ${iterations} itérations aléatoires`}
                >
                  {loading && calcMode === 'simulation' ? '...' : <><RefreshCw className="w-4 h-4 inline -mt-0.5" /> Simulation</>}
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
                  <div className="flex gap-1 ml-4">
                    {result.trucks.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTruckIndex(i)}
                        className={`px-3 py-1 rounded text-sm ${
                          activeTruckIndex === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Camion {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                {result && (
                  <span className="ml-auto text-sm text-gray-500 flex gap-3">
                    <span>Mode: <strong>{result.mode}</strong></span>
                    <span>Heuristique: <strong>{result.heuristic}</strong></span>
                    {result.iterations > 1 && <span>{result.iterations} iter.</span>}
                    {result.fromCache && <span className="text-green-600 flex items-center gap-1" title="Résultat depuis le cache"><Zap className="w-3 h-3" /> cache</span>}
                  </span>
                )}
              </div>

              {/* Visualization */}
              <div className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden min-h-[300px]">
                {viewMode === '2d' ? (
                  <Canvas2D
                    truck={truck}
                    result={result}
                    truckIndex={activeTruckIndex}
                    onDragPalette={handleDragPalette}
                  />
                ) : (
                  <View3D
                    truck={truck}
                    result={result}
                    truckIndex={activeTruckIndex}
                  />
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
