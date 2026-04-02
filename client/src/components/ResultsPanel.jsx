import React from 'react';

export default function ResultsPanel({ result }) {
  if (!result) return null;

  const { trucks, totalPlaced, totalPalettes, unplaced, log, heuristic } = result;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 max-h-[300px] overflow-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Résultats</h3>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-700">{totalPlaced}/{totalPalettes}</div>
          <div className="text-xs text-blue-500">Palettes placées</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-700">{trucks?.length || 0}</div>
          <div className="text-xs text-green-500">Camion(s)</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-purple-700">
            {trucks?.[0]?.floorMeters?.toFixed(2) || '0'}m
          </div>
          <div className="text-xs text-purple-500">Mètres plancher</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-amber-700">
            {trucks?.reduce((s, t) => s + t.totalWeight, 0) || 0}kg
          </div>
          <div className="text-xs text-amber-500">Poids total</div>
        </div>
      </div>

      {/* Per-truck summary */}
      {trucks && trucks.length > 0 && (
        <div className="mb-3 space-y-1">
          {trucks.map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-xs bg-gray-50 rounded px-3 py-1.5">
              <span className="font-semibold text-gray-700">Camion {i + 1}</span>
              <span>{t.placements.length} palettes</span>
              <span>{t.floorMeters?.toFixed(2)}m plancher</span>
              <span>{t.totalWeight}kg</span>
              <span className="ml-auto">{(t.occupancy * 100).toFixed(1)}% occupé</span>
            </div>
          ))}
        </div>
      )}

      {/* Unplaced */}
      {unplaced && unplaced.length > 0 && (
        <div className="bg-red-50 rounded-lg p-2 mb-3">
          <div className="text-sm font-medium text-red-700 mb-1">⚠️ {unplaced.length} palette(s) non placée(s)</div>
          {unplaced.map((p, i) => (
            <div key={i} className="text-xs text-red-600">
              {p.ref} [{p.length * 10}×{p.width * 10}mm] {p.weight}kg
            </div>
          ))}
        </div>
      )}

      {/* Log */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Journal détaillé</summary>
        <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto max-h-[200px] font-mono text-[11px]">
          {log?.join('\n')}
        </pre>
      </details>
    </div>
  );
}
