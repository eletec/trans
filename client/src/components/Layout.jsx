import React, { useContext } from 'react';
import { Truck, FolderOpen, SlidersHorizontal, Settings, User, LogOut } from 'lucide-react';
import { AppContext } from '../App';

export default function Layout({ children }) {
  const { user, handleLogout, setShowPrefs, setShowProjects, setShowPaletteConfig } = useContext(AppContext);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-lg">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">ADC Trans</h1>
              <p className="text-blue-200 text-xs">Optimisation chargement camions</p>
            </div>
          </div>

          {user && (
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setShowProjects(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 transition-colors"
              >
                <FolderOpen className="w-4 h-4 inline -mt-0.5" /> Projets
              </button>
              <button
                onClick={() => setShowPaletteConfig(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 inline -mt-0.5" /> Config. Palettes
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 transition-colors"
              >
                <Settings className="w-4 h-4 inline -mt-0.5" /> Préférences
              </button>
              <div className="ml-4 flex items-center gap-2 text-sm">
                <span className="text-blue-200 flex items-center gap-1"><User className="w-4 h-4" /> {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1800px] mx-auto w-full p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t text-center py-2 text-xs text-gray-500">
        ADC Trans © 2026 — Optimisation bin packing multi-camions
      </footer>
    </div>
  );
}
