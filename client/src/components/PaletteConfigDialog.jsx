import React, { useContext, useState } from 'react';
import { AppContext } from '../App';

/**
 * Configuration Palettes — equivalent to the original C++ palette_config form.
 * Allows defining reusable palette dimension presets (Longueur x Largeur in mm).
 * These presets populate the dropdown in the palette grid.
 */
export default function PaletteConfigDialog() {
  const { setShowPaletteConfig, paletteTemplates, setPaletteTemplates } = useContext(AppContext);
  const [templates, setTemplates] = useState(paletteTemplates.map(t => ({ ...t })));

  const addRow = () => {
    setTemplates(prev => [...prev, { name: '', length: 1200, width: 800, color: '#94a3b8', label: '' }]);
  };

  const updateRow = (index, field, value) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== index) return t;
      const updated = { ...t, [field]: (field === 'name' || field === 'color' || field === 'label') ? value : Number(value) || 0 };
      if (field === 'length' || field === 'width') {
        updated.name = `${updated.length}x${updated.width}`;
      }
      return updated;
    }));
  };

  const removeRow = (index) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    const cleaned = templates
      .filter(t => t.length > 0 && t.width > 0)
      .map(t => ({
        ...t,
        name: t.name || `${t.length}x${t.width}`,
        color: t.color || '#94a3b8',
        label: t.label || ''
      }));
    setPaletteTemplates(cleaned);
    setShowPaletteConfig(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPaletteConfig(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-2">📐 Configuration Palettes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Définir les formats standards avec couleur et libellé
        </p>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Longueur (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Largeur (mm)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Couleur</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Libellé</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={t.length}
                      onChange={e => updateRow(i, 'length', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={t.width}
                      onChange={e => updateRow(i, 'width', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="color"
                      value={t.color || '#94a3b8'}
                      onChange={e => updateRow(i, 'color', e.target.value)}
                      className="w-10 h-7 border-0 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={t.label || ''}
                      onChange={e => updateRow(i, 'label', e.target.value)}
                      placeholder="ex: Mobilier A"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-400 hover:text-red-600 text-lg"
                    >×</button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 text-sm">
                    Aucun format défini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={addRow}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Ajouter
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Appliquer
          </button>
          <button
            onClick={() => setShowPaletteConfig(false)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
