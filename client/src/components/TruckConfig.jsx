import React, { useContext } from 'react';
import { Truck } from 'lucide-react';
import { AppContext } from '../App';
import { useT } from '../i18n';

export default function TruckConfig() {
  const { truck, setTruck, TRUCK_PRESETS } = useContext(AppContext);
  const t = useT();

  const update = (field, value) => {
    setTruck(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const applyPreset = (name) => {
    const p = TRUCK_PRESETS.find(t => t.name === name);
    if (p) setTruck({ length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm, max_weight_kg: p.max_weight_kg, axle_rear_cm: p.axle_rear_cm });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4" /> {t('truck.title')}
      </h3>
      <div className="mb-3">
        <select
          onChange={e => applyPreset(e.target.value)}
          defaultValue=""
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="" disabled>{t('truck.preset')}</option>
          {TRUCK_PRESETS.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
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
    </div>
  );
}
