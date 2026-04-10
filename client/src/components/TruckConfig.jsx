import React, { useContext, useState } from 'react';
import { Truck } from 'lucide-react';
import { AppContext } from '../App';
import { useT } from '../i18n';

const PRESET_GROUP_LABELS = {
  EU: 'EU / Europe',
  UK: 'UK / Ireland',
  ISO: 'ISO Containers',
  NA: 'North America',
  LATAM: 'Latin America',
  CN: 'China',
  JP: 'Japan',
  IN: 'India',
  AU: 'Australia / Oceania',
  GCC: 'Middle East (GCC)',
  Other: 'Other'
};

function getPresetGroupCode(name) {
  const idx = name.indexOf(' - ');
  if (idx <= 0) return 'Other';
  return name.slice(0, idx).trim();
}

function getPresetShortLabel(name, groupCode) {
  const prefix = `${groupCode} - `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export default function TruckConfig() {
  const { truck, setTruck, TRUCK_PRESETS } = useContext(AppContext);
  const t = useT();
  const [showDetails, setShowDetails] = useState(false);

  const groupedPresets = TRUCK_PRESETS.reduce((acc, preset) => {
    const groupCode = getPresetGroupCode(preset.name);
    if (!acc.has(groupCode)) acc.set(groupCode, []);
    acc.get(groupCode).push(preset);
    return acc;
  }, new Map());

  const update = (field, value) => {
    setTruck(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const applyPreset = (name) => {
    const p = TRUCK_PRESETS.find(t => t.name === name);
    if (p) setTruck({ length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm, max_weight_kg: p.max_weight_kg, axle_rear_cm: p.axle_rear_cm });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Truck className="w-4 h-4" /> {t('truck.title')}
        </h3>
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          aria-expanded={showDetails}
        >
          {showDetails ? t('truck.detailsHide') : t('truck.details')}
        </button>
      </div>
      <div className="mb-3">
        <select
          onChange={e => applyPreset(e.target.value)}
          defaultValue=""
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="" disabled>{t('truck.preset')}</option>
          {Array.from(groupedPresets.entries()).map(([groupCode, presets]) => (
            <optgroup key={groupCode} label={PRESET_GROUP_LABELS[groupCode] || groupCode}>
              {presets.map(p => (
                <option key={p.name} value={p.name}>{getPresetShortLabel(p.name, groupCode)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {showDetails && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.length')}</label>
            <input
              type="number"
              value={truck.length_cm}
              onChange={e => update('length_cm', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.width')}</label>
            <input
              type="number"
              value={truck.width_cm}
              onChange={e => update('width_cm', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.height')}</label>
            <input
              type="number"
              value={truck.height_cm}
              onChange={e => update('height_cm', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.maxWeight')}</label>
            <input
              type="number"
              value={truck.max_weight_kg}
              onChange={e => update('max_weight_kg', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('truck.axleRear')}</label>
            <input
              type="number"
              value={truck.axle_rear_cm || Math.round(truck.length_cm * 0.855)}
              onChange={e => update('axle_rear_cm', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
