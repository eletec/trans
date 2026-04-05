import React, { useContext } from 'react';
import { Settings } from 'lucide-react';
import { AppContext } from '../App';
import { useT } from '../i18n';
import { api } from '../api/client';

export default function PreferencesDialog() {
  const {
    setShowPrefs, heuristic, setHeuristic,
    allowRotation, setAllowRotation,
    groupContiguous, setGroupContiguous,
    maxTrucks, setMaxTrucks,
    iterations, setIterations,
    calcMode, setCalcMode,
    packingDimension, setPackingDimension,
    truck, setTruck,
    marker, setMarker,
    TRUCK_PRESETS
  } = useContext(AppContext);

  const applyTruckPreset = (name) => {
    const p = TRUCK_PRESETS.find(t => t.name === name);
    if (p) setTruck({ length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm, max_weight_kg: p.max_weight_kg });
  };
  const t = useT();

  const closeAndPersist = () => {
    api.savePreferences({
      heuristic,
      allowRotation,
      groupContiguous,
      maxTrucks,
      calcMode,
      packingDimension,
      marker,
    }).catch(() => {});
    setShowPrefs(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeAndPersist}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> {t('prefs.title')}</h2>

        <div className="space-y-4">
          {/* Algorithm */}
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <legend className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">{t('prefs.algorithm')}</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('prefs.heuristic')}</label>
                <select
                  value={heuristic}
                  onChange={e => setHeuristic(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="auto">{t('prefs.heuristic.auto')}</option>
                  <option value="BestShortSideFit">Best Short Side Fit</option>
                  <option value="BestLongSideFit">Best Long Side Fit</option>
                  <option value="BestAreaFit">Best Area Fit</option>
                  <option value="BottomLeftRule">Bottom Left Rule</option>
                  <option value="ContactPointRule">Contact Point Rule</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('prefs.calcMode')}</label>
                <select
                  value={calcMode}
                  onChange={e => setCalcMode(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="preview">{t('prefs.calcMode.preview')}</option>
                  <option value="calculate">{t('prefs.calcMode.calculate')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('prefs.packingDimension')}</label>
                <select
                  value={packingDimension}
                  onChange={e => setPackingDimension(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="2d">{t('prefs.packingDimension.2d')}</option>
                  <option value="3d">{t('prefs.packingDimension.3d')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('prefs.maxTrucks')}</label>
                <input
                  type="number" min={1} max={50} value={maxTrucks}
                  onChange={e => setMaxTrucks(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowRotation}
                  onChange={e => setAllowRotation(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('prefs.allowRotation')}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={groupContiguous}
                  onChange={e => setGroupContiguous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('prefs.groupContiguous')}</span>
              </label>
            </div>
          </fieldset>

          {/* Container */}
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <legend className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">{t('prefs.container')}</legend>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('prefs.standardSize')}</label>
                <select
                  onChange={e => applyTruckPreset(e.target.value)}
                  defaultValue=""
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>{t('prefs.choosePreset')}</option>
                  {TRUCK_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.length_cm}×{p.width_cm}cm)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.length')}</label>
                  <input type="number" value={truck.length_cm}
                    onChange={e => setTruck(prev => ({ ...prev, length_cm: Number(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.width')}</label>
                  <input type="number" value={truck.width_cm}
                    onChange={e => setTruck(prev => ({ ...prev, width_cm: Number(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('prefs.marker')}</label>
                <input type="number" value={marker}
                  onChange={e => setMarker(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('prefs.markerHint')}</p>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={closeAndPersist}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {t('btn.apply')}
          </button>
          <button
            onClick={closeAndPersist}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors"
          >
            {t('btn.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
