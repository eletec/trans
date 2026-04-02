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
import { api } from './api/client';

export const AppContext = createContext();

const DEFAULT_TRUCK = {
  length_cm: 1340,
  width_cm: 242,
  height_cm: 270,
  max_weight_kg: 24000
};

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
  const [showPrefs, setShowPrefs] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [activeTruckIndex, setActiveTruckIndex] = useState(0);
  const [error, setError] = useState('');

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { api.logout(); setUser(null); };

  const addPalette = () => {
    setPalettes(prev => [...prev, {
      id: Date.now(),
      ref: `P${prev.length + 1}`,
      length: 1200,
      width: 800,
      height: 1500,
      weight: 500,
      quantity: 1,
      color: PALETTE_COLORS[prev.length % PALETTE_COLORS.length],
      comment: ''
    }]);
  };

  const updatePalette = (index, field, value) => {
    setPalettes(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePalette = (index) => {
    setPalettes(prev => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (palettes.length === 0) { setError('Ajoutez au moins une palette'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.calculate({
        palettes,
        truck,
        heuristic,
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
    setShowProjects(false);
  };

  const ctx = {
    user, setUser, palettes, setPalettes, truck, setTruck,
    result, setResult, loading, viewMode, setViewMode,
    heuristic, setHeuristic, allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous, maxTrucks, setMaxTrucks,
    activeTruckIndex, setActiveTruckIndex, error, setError,
    addPalette, updatePalette, removePalette,
    handleCalculate, handleDragPalette, handleLoadProject,
    handleLogout, showPrefs, setShowPrefs, showProjects, setShowProjects,
    PALETTE_COLORS
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
              <div className="flex gap-2">
                <button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg
                             disabled:opacity-50 transition-colors shadow-md"
                >
                  {loading ? 'Calcul en cours...' : '🚛 Calculer'}
                </button>
                <button
                  onClick={() => { setResult(null); setError(''); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
                  title="Réinitialiser"
                >
                  ↺
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
                  <span className="ml-auto text-sm text-gray-500">
                    Heuristique: <strong>{result.heuristic}</strong>
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
      </Layout>
    </AppContext.Provider>
  );
}
