import React, { useContext, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { AppContext } from '../App';
import { useT } from '../i18n';

export default function PaletteGrid() {
  const { palettes, addPalette, updatePalette, removePalette, paletteTemplates, truck, packingDimension } = useContext(AppContext);
  const [quickTpl, setQuickTpl] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const t = useT();

  const truckHeightMm = (truck?.height_cm || 0) * 10;
  const tooTallQty = palettes.reduce((sum, p) => {
    const qty = p.quantity || 1;
    const h = p.height || 0;
    // Only stackable items are expected to use upper layers.
    if (p.stackable !== false && h > 0 && (h * 2) > truckHeightMm) return sum + qty;
    return sum;
  }, 0);

  const applyTemplate = (index, templateName) => {
    const tpl = paletteTemplates.find(t => t.name === templateName);
    if (tpl) {
      updatePalette(index, 'length', tpl.length);
      updatePalette(index, 'width', tpl.width);
      if (tpl.color) updatePalette(index, 'color', tpl.color);
      if (tpl.label) updatePalette(index, 'comment', tpl.label);
    }
  };

  const handleQuickAdd = () => {
    const tpl = paletteTemplates.find(t => t.name === quickTpl);
    if (tpl) {
      addPalette({ ...tpl, quantity: quickQty });
    } else {
      addPalette({ quantity: quickQty });
    }
    setQuickQty(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Package className="w-4 h-4" /> {t('palettes.title')}</h3>
      </div>

      {/* Quick-add bar: template + quantity + add button */}
      <div className="flex gap-1.5 mb-3">
        <select
          value={quickTpl}
          onChange={e => setQuickTpl(e.target.value)}
          className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">{t('palettes.manual')}</option>
          {paletteTemplates.map(t => (
            <option key={t.name} value={t.name}>{t.name}{t.label ? ` — ${t.label}` : ''}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">{t('palettes.qty')}</label>
          <input
            type="number" min={1} max={99} value={quickQty}
            onChange={e => setQuickQty(Math.max(1, Number(e.target.value)))}
            className="w-14 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={handleQuickAdd}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> {t('btn.addRow').replace('+ ', '')}
        </button>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.ref')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.format')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.length')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.width')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.height')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.weight')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.stackable')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.qty')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.color')}</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('palettes.note')}</th>
              <th className="px-1 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {palettes.map((p, i) => (
              <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-1 py-1">
                  <input
                    type="text" value={p.ref}
                    onChange={e => updatePalette(i, 'ref', e.target.value)}
                    className="w-14 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={`${p.length}x${p.width}`}
                    onChange={e => applyTemplate(i, e.target.value)}
                    className="w-24 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700"
                  >
                    <option value="">Manuel</option>
                    {paletteTemplates.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number" value={p.length}
                    onChange={e => updatePalette(i, 'length', Number(e.target.value))}
                    className="w-16 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number" value={p.width}
                    onChange={e => updatePalette(i, 'width', Number(e.target.value))}
                    className="w-16 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number" value={p.height}
                    onChange={e => updatePalette(i, 'height', Number(e.target.value))}
                    className="w-16 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number" value={p.weight}
                    onChange={e => updatePalette(i, 'weight', Number(e.target.value))}
                    className="w-14 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={p.stackable !== false}
                    onChange={e => updatePalette(i, 'stackable', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                    title={t('palettes.stackableHint')}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number" value={p.quantity} min={1}
                    onChange={e => updatePalette(i, 'quantity', Math.max(1, Number(e.target.value)))}
                    className="w-12 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="color" value={p.color}
                    onChange={e => updatePalette(i, 'color', e.target.value)}
                    className="w-8 h-6 border-0 rounded cursor-pointer"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text" value={p.comment}
                    onChange={e => updatePalette(i, 'comment', e.target.value)}
                    className="w-20 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-1 py-0.5 text-xs"
                    placeholder="..."
                  />
                </td>
                <td className="px-1 py-1">
                  <button
                    onClick={() => removePalette(i)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                    title={t('palettes.delete')}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {palettes.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-400 text-sm">
                  {t('palettes.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {palettes.length > 0 && (
        <div className="mt-2 pt-2 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex gap-4">
          <span>{t('palettes.total')} <strong>{palettes.reduce((s, p) => s + (p.quantity || 1), 0)}</strong> {t('palettes.totalUnit')}</span>
          <span>{t('palettes.weightLabel')} <strong>{palettes.reduce((s, p) => s + (p.weight || 0) * (p.quantity || 1), 0)}</strong> kg</span>
          <span>{t('palettes.surface')} <strong>{(palettes.reduce((s, p) => s + (p.length * p.width / 1000000) * (p.quantity || 1), 0)).toFixed(2)}</strong> m²</span>
        </div>
      )}

      {packingDimension === '3d' && palettes.length > 0 && (
        <div className={`mt-2 text-xs rounded-lg px-2 py-1.5 ${tooTallQty > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
          {t('palettes.stackRule')} ({truckHeightMm} mm) - {tooTallQty} {t('palettes.tooTall')}
        </div>
      )}
    </div>
  );
}
