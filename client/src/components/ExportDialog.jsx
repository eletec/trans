import React, { useState, useContext, useRef } from 'react';
import { Download, Upload, FileJson, FolderOpen, Settings, X } from 'lucide-react';
import { AppContext } from '../App';
import { api } from '../api/client';
import { useT } from '../i18n';

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportDialog() {
  const { setShowExport, currentProjectId, currentProjectName } = useContext(AppContext);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const t = useT();

  const handleExportProject = async () => {
    if (!currentProjectId) {
      setError('Aucun projet actif');
      return;
    }
    try {
      const data = await api.exportProject(currentProjectId);
      downloadJSON(data, `easypacking-${(currentProjectName || 'projet').replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      setMsg('Projet exporté');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportAll = async () => {
    try {
      const data = await api.exportAllProjects();
      downloadJSON(data, 'easypacking-all-projects.json');
      setMsg(`${data.projects?.length || 0} projet(s) exporté(s)`);
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportConfig = async () => {
    try {
      const data = await api.exportConfig();
      downloadJSON(data, 'easypacking-config.json');
      setMsg('Configuration exportée');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.importData(data);
      setMsg(result.message);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Fichier JSON invalide');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExport(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Download className="w-5 h-5" /> {t('export.title')}
          </h2>
          <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Export current project */}
          <button
            onClick={handleExportProject}
            disabled={!currentProjectId}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors disabled:opacity-50 text-left"
          >
            <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('export.project')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{currentProjectName || t('export.noProject')}</div>
            </div>
          </button>

          {/* Export all projects */}
          <button
            onClick={handleExportAll}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors text-left"
          >
            <FolderOpen className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('export.allProjects')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('export.allProjectsDesc')}</div>
            </div>
          </button>

          {/* Export config */}
          <button
            onClick={handleExportConfig}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors text-left"
          >
            <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('export.config')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('export.configDesc')}</div>
            </div>
          </button>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Import */}
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors text-left disabled:opacity-50"
          >
            <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {importing ? t('export.importing') : t('export.import')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('export.importDesc')}</div>
            </div>
          </button>
          <input type="file" ref={fileRef} accept=".json" className="hidden" onChange={handleFileSelected} />
        </div>

        {msg && <div className="mt-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-lg text-sm">{msg}</div>}
        {error && <div className="mt-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg text-sm">{error}</div>}

        <button
          onClick={() => setShowExport(false)}
          className="mt-4 w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors"
        >
          {t('btn.close')}
        </button>
      </div>
    </div>
  );
}
