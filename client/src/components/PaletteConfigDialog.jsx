import React, { useContext, useState } from 'react';
import { Ruler } from 'lucide-react';
import { AppContext } from '../App';
import { api } from '../api/client';
import { useT } from '../i18n';

/**
 * Configuration Palettes — equivalent to the original C++ palette_config form.
 * Allows defining reusable palette dimension presets (Longueur x Largeur in mm).
 * These presets populate the dropdown in the palette grid.
 * Changes are saved to user preferences (per-user, persistent).
 */
export default function PaletteConfigDialog() {
  const { setShowPaletteConfig, paletteTemplates, setPaletteTemplates } = useContext(AppContext);
  const [templates, setTemplates] = useState(paletteTemplates.map(t => ({ ...t })));
  const t = useT();

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
    // Persist to user preferences
    api.savePreferences({ paletteTemplates: cleaned }).catch(() => {});
    setShowPaletteConfig(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaletteConfig(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><Ruler className="w-5 h-5" /> {t('paletteConfig.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('paletteConfig.subtitle')}
        </p>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('paletteConfig.length')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('paletteConfig.width')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('paletteConfig.color')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('paletteConfig.label')}</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={tmpl.length}
                      onChange={e => updateRow(i, 'length', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={tmpl.width}
                      onChange={e => updateRow(i, 'width', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="color"
                      value={tmpl.color || '#94a3b8'}
                      onChange={e => updateRow(i, 'color', e.target.value)}
                      className="w-10 h-7 border-0 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={tmpl.label || ''}
                      onChange={e => updateRow(i, 'label', e.target.value)}
                      placeholder={t('paletteConfig.labelPlaceholder')}
                      className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    {t('paletteConfig.empty')}
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
            {t('btn.addRow')}
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('btn.apply')}
          </button>
          <button
            onClick={() => setShowPaletteConfig(false)}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {t('btn.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
