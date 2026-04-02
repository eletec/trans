import React, { useContext } from 'react';
import { AppContext } from '../App';

export default function PreferencesDialog() {
  const {
    setShowPrefs, heuristic, setHeuristic,
    allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous,
    maxTrucks, setMaxTrucks
  } = useContext(AppContext);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPrefs(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">⚙️ Préférences de calcul</h2>

        <div className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre max de camions</label>
            <input
              type="number" min={1} max={50} value={maxTrucks}
              onChange={e => setMaxTrucks(Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox" checked={allowRotation}
              onChange={e => setAllowRotation(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Autoriser la rotation à 90°</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox" checked={groupContiguous}
              onChange={e => setGroupContiguous(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Grouper les palettes identiques (contigu)</span>
          </label>
        </div>

        <button
          onClick={() => setShowPrefs(false)}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
