import React, { useState, useEffect, useContext } from 'react';
import { History, X, Trash2, Eye, Clock, Truck as TruckIcon } from 'lucide-react';
import { AppContext } from '../App';
import { api } from '../api/client';
import { useT } from '../i18n';

export default function HistoryDialog() {
  const { setShowHistory, setTruck, setPalettes, setResult, setHeuristic,
    setAllowRotation, setGroupContiguous, setMaxTrucks, setCalcMode, setIterations, setMarker, setPaletteTemplates } = useContext(AppContext);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useT();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getHistory(50);
      setEntries(data.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (entry) => {
    if (entry.truck_config) setTruck(entry.truck_config);
    if (entry.palette_data) setPalettes(entry.palette_data);
    if (entry.result_data) setResult(entry.result_data);
    if (entry.heuristic) setHeuristic(entry.heuristic);
    if (entry.settings) {
      const s = entry.settings;
      if (s.allowRotation !== undefined) setAllowRotation(s.allowRotation);
      if (s.groupContiguous !== undefined) setGroupContiguous(s.groupContiguous);
      if (s.maxTrucks !== undefined) setMaxTrucks(s.maxTrucks);
      if (s.calcMode) setCalcMode(s.calcMode);
      if (s.iterations !== undefined) setIterations(s.iterations);
      if (s.marker !== undefined) setMarker(s.marker);
      if (s.paletteTemplates) setPaletteTemplates(s.paletteTemplates);
    }
    setShowHistory(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteHistoryEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <History className="w-5 h-5" /> {t('history.title')}
          </h2>
          <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && <p className="text-center text-gray-400 dark:text-gray-500 py-8">{t('status.loading')}</p>}
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-3">{error}</div>}

          {!loading && entries.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">{t('history.empty')}</p>
          )}

          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {entry.project_name || t('history.noName')}
                    </span>
                    {entry.username && (
                      <span className="text-xs text-gray-400">{t('history.by')} {entry.username}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.created_at).toLocaleString('fr-FR')}
                    </span>
                    {entry.num_trucks && (
                      <span className="flex items-center gap-1">
                        <TruckIcon className="w-3 h-3" />
                        {entry.num_trucks} {t('history.trucks')}
                      </span>
                    )}
                    {entry.total_placed != null && (
                      <span>{entry.total_placed}/{entry.total_palettes} palettes</span>
                    )}
                    {entry.floor_meters != null && (
                      <span>{entry.floor_meters.toFixed(2)}{t('history.floorMeters')}</span>
                    )}
                    {entry.heuristic && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{entry.heuristic}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(entry)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> {t('btn.load')}
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowHistory(false)}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors"
          >
            {t('btn.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
