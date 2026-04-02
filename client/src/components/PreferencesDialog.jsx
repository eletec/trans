import React, { useContext } from 'react';
import { Settings } from 'lucide-react';
import { AppContext } from '../App';

export default function PreferencesDialog() {
  const {
    setShowPrefs, heuristic, setHeuristic,
    allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous,
    maxTrucks, setMaxTrucks,
    iterations, setIterations,
    calcMode, setCalcMode,
    language, setLanguage,
    truck, setTruck,
    marker, setMarker,
    TRUCK_PRESETS
  } = useContext(AppContext);

  const applyTruckPreset = (name) => {
    const p = TRUCK_PRESETS.find(t => t.name === name);
    if (p) setTruck({ length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm, max_weight_kg: p.max_weight_kg });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPrefs(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Préférences</h2>

        <div className="space-y-4">
          {/* Localization */}
          <fieldset className="border border-gray-200 rounded-lg p-3">
            <legend className="text-sm font-semibold text-gray-600 px-2">Localisation</legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </fieldset>

          {/* Algorithm */}
          <fieldset className="border border-gray-200 rounded-lg p-3">
            <legend className="text-sm font-semibold text-gray-600 px-2">Algorithme</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heuristique</label>
                <select
                  value={heuristic}
                  onChange={e => setHeuristic(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="auto">Auto (meilleure des 5)</option>
                  <option value="BestShortSideFit">Best Short Side Fit</option>
                  <option value="BestLongSideFit">Best Long Side Fit</option>
                  <option value="BestAreaFit">Best Area Fit</option>
                  <option value="BottomLeftRule">Bottom Left Rule</option>
                  <option value="ContactPointRule">Contact Point Rule</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de calcul par défaut</label>
                <select
                  value={calcMode}
                  onChange={e => setCalcMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="preview">Preview — aperçu rapide</option>
                  <option value="calculate">Calculer — Recuit Simulé (optimal)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre max de camions</label>
                <input
                  type="number" min={1} max={50} value={maxTrucks}
                  onChange={e => setMaxTrucks(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowRotation}
                  onChange={e => setAllowRotation(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Autoriser la rotation à 90°</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={groupContiguous}
                  onChange={e => setGroupContiguous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700">Grouper les palettes identiques (contigu)</span>
              </label>
            </div>
          </fieldset>

          {/* Container */}
          <fieldset className="border border-gray-200 rounded-lg p-3">
            <legend className="text-sm font-semibold text-gray-600 px-2">Container</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille standard</label>
                <select
                  onChange={e => applyTruckPreset(e.target.value)}
                  defaultValue=""
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>Choisir un format standard…</option>
                  {TRUCK_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.length_cm}×{p.width_cm}cm)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longueur (cm)</label>
                  <input type="number" value={truck.length_cm}
                    onChange={e => setTruck(prev => ({ ...prev, length_cm: Number(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Largeur (cm)</label>
                  <input type="number" value={truck.width_cm}
                    onChange={e => setTruck(prev => ({ ...prev, width_cm: Number(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Marker (cm) — repère visuel sur le plan</label>
                <input type="number" value={marker}
                  onChange={e => setMarker(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Ex: 800 = repère camion porteur 8m dans un semi 13.6m</p>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setShowPrefs(false)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Appliquer
          </button>
          <button
            onClick={() => setShowPrefs(false)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
