import React, { useContext, useState, useEffect } from 'react';
import { FolderOpen, Save, FolderUp, Trash2 } from 'lucide-react';
import { AppContext } from '../App';
import { api } from '../api/client';
import { useT } from '../i18n';

export default function ProjectManager() {
  const { setShowProjects, palettes, truck, heuristic, result, handleLoadProject,
    allowRotation, groupContiguous, maxTrucks, calcMode, iterations, marker,
    packingDimension,
    paletteTemplates, currentProjectId, setCurrentProjectId, currentProjectName, setCurrentProjectName } = useContext(AppContext);
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const t = useT();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => ({
    truck_config: truck,
    palette_data: palettes,
    result_data: result,
    heuristic,
    settings: {
      allowRotation,
      groupContiguous,
      maxTrucks,
      calcMode,
      packingDimension,
      iterations,
      marker,
      paletteTemplates
    }
  });

  const handleSaveNew = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.createProject({ name: newName, ...getCurrentData() });
      setCurrentProjectId(res.id);
      setCurrentProjectName(newName);
      setNewName('');
      setSaved(`Projet "${newName}" créé`);
      setTimeout(() => setSaved(''), 2000);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id, name) => {
    try {
      await api.updateProject(id, getCurrentData());
      if (id === currentProjectId) {
        // still on same project
      }
      setSaved(`Projet "${name}" mis à jour`);
      setTimeout(() => setSaved(''), 2000);
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoad = async (id) => {
    try {
      const data = await api.getProject(id);
      handleLoadProject(data.project);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteProject(id);
      if (id === currentProjectId) {
        setCurrentProjectId(null);
        setCurrentProjectName('');
      }
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowProjects(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><FolderOpen className="w-5 h-5" /> {t('projects.title')}</h2>

        {/* Current project indicator */}
        {currentProjectId && (
          <div className="flex items-center gap-2 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
            <span className="text-sm text-blue-700 dark:text-blue-400 flex-1">
              {t('projects.active')} <strong>{currentProjectName}</strong>
            </span>
            <button
              onClick={() => handleUpdate(currentProjectId, currentProjectName)}
              className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              <Save className="w-3 h-3" /> {t('btn.saveProject')}
            </button>
          </div>
        )}

        {/* Save new */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('projects.newPlaceholder')}
            className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            onKeyDown={e => e.key === 'Enter' && handleSaveNew()}
          />
          <button
            onClick={handleSaveNew}
            disabled={!newName.trim()}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {t('btn.create')}
          </button>
        </div>

        {saved && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-lg text-sm mb-3">{saved}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg text-sm mb-3">{error}</div>}

        {/* Project list */}
        {loading ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-4">{t('status.loading')}</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-4">{t('projects.empty')}</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${p.id === currentProjectId ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(p.updated_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                <button
                  onClick={() => handleUpdate(p.id, p.name)}
                  title={t('projects.overwriteTitle')}
                  className="text-green-500 hover:text-green-700 transition-colors p-1"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleLoad(p.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  {t('btn.open')}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowProjects(false)}
          className="mt-4 w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors"
        >
          {t('btn.close')}
        </button>
      </div>
    </div>
  );
}
