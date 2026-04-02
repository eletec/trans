import React, { useContext, useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { AppContext } from '../App';
import { api } from '../api/client';

export default function ProjectManager() {
  const { setShowProjects, palettes, truck, heuristic, result, handleLoadProject,
    allowRotation, groupContiguous, maxTrucks, calcMode, iterations, marker,
    paletteTemplates } = useContext(AppContext);
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleSave = async () => {
    if (!newName.trim()) return;
    try {
      await api.createProject({
        name: newName,
        truck_config: truck,
        palette_data: palettes,
        result_data: result,
        heuristic,
        settings: {
          allowRotation,
          groupContiguous,
          maxTrucks,
          calcMode,
          iterations,
          marker,
          paletteTemplates
        }
      });
      setNewName('');
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
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowProjects(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FolderOpen className="w-5 h-5" /> Projets</h2>

        {/* Save new */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nom du projet..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            Enregistrer
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm mb-3">{error}</div>}

        {/* Project list */}
        {loading ? (
          <p className="text-gray-400 text-center py-4">Chargement...</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Aucun projet sauvegardé</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(p.updated_at).toLocaleString('fr-FR')} — {p.heuristic}
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(p.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowProjects(false)}
          className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
