import React, { useContext, useState } from 'react';
import { Truck, FolderOpen, SlidersHorizontal, Settings, Save, Check, Menu, X, History, Download } from 'lucide-react';
import { AppContext } from '../App';
import UserProfileMenu from './UserProfileMenu';
import { useT } from '../i18n';

export default function Layout({ children }) {
  const { user, setShowPrefs, setShowProjects, setShowPaletteConfig, setShowHistory, setShowExport,
    currentProjectName, currentProjectId, handleQuickSave, saveFlash } = useContext(AppContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useT();

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-40 bg-gradient-to-r from-blue-800 to-blue-600 dark:from-gray-800 dark:to-gray-700 text-white shadow-lg">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-7 h-7 shrink-0" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight">Easy Packing</h1>
              <p className="text-blue-200 dark:text-gray-400 text-xs">{t('app.subtitle')}</p>
            </div>
            <h1 className="text-lg font-bold tracking-tight sm:hidden">Easy Packing</h1>
            {/* Current project indicator */}
            {user && currentProjectName && (
              <div className="ml-2 sm:ml-4 flex items-center gap-2 bg-blue-900/50 dark:bg-gray-900/50 rounded-lg px-3 py-1.5 max-w-[150px] sm:max-w-none">
                <span className="text-sm text-blue-100 dark:text-gray-300 font-medium truncate">{currentProjectName}</span>
                <button
                  onClick={handleQuickSave}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all shrink-0 ${
                    saveFlash
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500/50 hover:bg-blue-400/60 dark:bg-gray-600 dark:hover:bg-gray-500 text-white'
                  }`}
                  title={t('btn.saveTitle')}
                >
                  {saveFlash ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{saveFlash ? t('btn.saved') : t('btn.save')}</span>
                </button>
              </div>
            )}
          </div>

          {user && (
            <>
              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setShowProjects(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 inline -mt-0.5" /> {t('nav.projects')}
                </button>
                <button
                  onClick={() => setShowPaletteConfig(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 inline -mt-0.5" /> {t('nav.paletteConfig')}
                </button>
                <button
                  onClick={() => setShowPrefs(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <Settings className="w-4 h-4 inline -mt-0.5" /> {t('nav.prefs')}
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <History className="w-4 h-4 inline -mt-0.5" /> {t('nav.history')}
                </button>
                <button
                  onClick={() => setShowExport(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-700 hover:bg-blue-900 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <Download className="w-4 h-4 inline -mt-0.5" /> {t('nav.export')}
                </button>
                <div className="ml-2">
                  <UserProfileMenu />
                </div>
              </nav>

              {/* Mobile hamburger */}
              <div className="flex items-center gap-2 md:hidden">
                <UserProfileMenu />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg hover:bg-blue-700/50 dark:hover:bg-gray-700 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile menu dropdown */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-700/50 dark:border-gray-600 px-4 py-2 space-y-1">
            <button onClick={() => { setShowProjects(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-700/50 dark:hover:bg-gray-700 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> {t('nav.projects')}
            </button>
            <button onClick={() => { setShowPaletteConfig(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-700/50 dark:hover:bg-gray-700 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> {t('nav.palettesConfigFull')}
            </button>
            <button onClick={() => { setShowPrefs(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-700/50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4" /> {t('nav.preferencesFull')}
            </button>
            <button onClick={() => { setShowHistory(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-700/50 dark:hover:bg-gray-700 flex items-center gap-2">
              <History className="w-4 h-4" /> {t('nav.history')}
            </button>
            <button onClick={() => { setShowExport(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-700/50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> {t('nav.exportImport')}
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-auto w-full px-0 py-2 sm:py-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700 text-center py-2 text-xs text-gray-500 dark:text-gray-400">
        Easy Packing © 2026 — Optimisation bin packing multi-camions
      </footer>
    </div>
  );
}
