import React, { useContext } from 'react';
import { AppContext } from '../App';

export default function TruckConfig() {
  const { truck, setTruck } = useContext(AppContext);

  const update = (field, value) => {
    setTruck(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        🚛 Configuration Camion
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longueur (cm)</label>
          <input
            type="number"
            value={truck.length_cm}
            onChange={e => update('length_cm', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Largeur (cm)</label>
          <input
            type="number"
            value={truck.width_cm}
            onChange={e => update('width_cm', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hauteur (cm)</label>
          <input
            type="number"
            value={truck.height_cm}
            onChange={e => update('height_cm', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Poids max (kg)</label>
          <input
            type="number"
            value={truck.max_weight_kg}
            onChange={e => update('max_weight_kg', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
