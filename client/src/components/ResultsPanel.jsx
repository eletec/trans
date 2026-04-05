import React from 'react';
import { ClipboardList, FileText, AlertTriangle } from 'lucide-react';
import { useT } from '../i18n';

export default function ResultsPanel({ result }) {
  const t = useT();
  if (!result) return null;

  const { trucks, totalPlaced, totalPalettes, unplaced, log, heuristic } = result;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 max-h-[300px] overflow-auto">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4" /> {t('results.title')}</h3>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{totalPlaced}/{totalPalettes}</div>
          <div className="text-xs text-blue-500 dark:text-blue-400">{t('results.placed')}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-700 dark:text-green-400">{trucks?.length || 0}</div>
          <div className="text-xs text-green-500 dark:text-green-400">{t('results.trucks')}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
            {trucks?.[0]?.floorMeters?.toFixed(2) || '0'}m
          </div>
          <div className="text-xs text-purple-500 dark:text-purple-400">{t('results.floorMeters')}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {trucks?.reduce((s, t) => s + t.totalWeight, 0) || 0}kg
          </div>
          <div className="text-xs text-amber-500 dark:text-amber-400">{t('results.totalWeight')}</div>
        </div>
      </div>

      {/* Per-truck summary */}
      {trucks && trucks.length > 0 && (
        <div className="mb-3 space-y-1">
          {trucks.map((trk, i) => (
            <div key={i} className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-1.5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{t('results.truck')} {i + 1}</span>
              <span>{trk.placements.length} {t('results.palettes')}</span>
              <span>{trk.floorMeters?.toFixed(2)}{t('results.floor')}</span>
              <span>{trk.totalWeight}kg</span>
              <span className="ml-auto">{(trk.occupancy * 100).toFixed(1)}{t('results.occupied')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Unplaced */}
      {unplaced && unplaced.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 mb-3">
          <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {unplaced.length} {t('results.unplaced')}</div>
          {unplaced.map((p, i) => (
            <div key={i} className="text-xs text-red-600">
              {p.ref} [{p.length * 10}×{p.width * 10}mm] {p.weight}kg
            </div>
          ))}
        </div>
      )}

      {/* Log — matching original format */}
      <details open className="text-xs">
        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
          <FileText className="w-4 h-4 inline -mt-0.5" /> {t('results.log')} ({log?.length || 0} {t('results.lines')})
        </summary>
        <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto max-h-[300px] font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
{log?.join('\n')}
        </pre>
      </details>
    </div>
  );
}
