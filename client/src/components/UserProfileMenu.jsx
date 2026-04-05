import React, { useState, useRef, useEffect, useContext } from 'react';
import { User, LogOut, Moon, Sun, Globe, Building2, ChevronDown, Camera, Mail, Shield } from 'lucide-react';
import { AppContext } from '../App';
import { useTheme } from '../ThemeContext';
import { api } from '../api/client';
import { useT } from '../i18n';

export default function UserProfileMenu() {
  const { user, setUser, handleLogout, language, setLanguage } = useContext(AppContext);
  const { darkMode, toggleDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [entityName, setEntityName] = useState(user?.entity?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = useRef();
  const t = useT();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 512000) {
      setMsg(t('profile.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await api.updateProfile({ avatar: reader.result });
        setUser(prev => ({ ...prev, avatar: reader.result }));
        api.setUser && localStorage.setItem('adctrans_user', JSON.stringify({ ...user, avatar: reader.result }));
      } catch (err) {
        setMsg(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMsg('');
    try {
      const data = await api.updateProfile({ email: profileEmail, entityName });
      const updatedUser = data.user;
      setUser(updatedUser);
      localStorage.setItem('adctrans_user', JSON.stringify(updatedUser));
      setMsg(t('profile.updated'));
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const avatar = user?.avatar;
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-700/50 dark:hover:bg-gray-700 transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <span className="text-sm text-white hidden sm:inline">{user?.username}</span>
        <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="relative group">
                {avatar ? (
                  <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                    {initials}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                {user?.entity?.name && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" /> {user.entity.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Dark mode toggle */}
            <button
              onClick={() => { toggleDarkMode(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-400" />}
              <span>{darkMode ? t('profile.lightMode') : t('profile.darkMode')}</span>
              <div className={`ml-auto w-9 h-5 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Language */}
            <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-shrink-0">{t('profile.language')}</span>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="ml-auto border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="it">🇮🇹 Italiano</option>
                <option value="nl">🇳🇱 Nederlands</option>
                <option value="pt">🇵🇹 Português</option>
                <option value="zh">🇨🇳 中文</option>
                <option value="ru">🇷🇺 Русский</option>
              </select>
            </div>

            {/* Profile edit */}
            <button
              onClick={() => { setShowProfile(!showProfile); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Shield className="w-4 h-4 text-gray-400" />
              <span>{t('profile.section')}</span>
            </button>

            {showProfile && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><Mail className="w-3 h-3 inline" /> {t('profile.email')}</label>
                  <input
                    type="email" value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><Building2 className="w-3 h-3 inline" /> {t('profile.entity')}</label>
                  <input
                    type="text" value={entityName}
                    onChange={e => setEntityName(e.target.value)}
                    placeholder={t('profile.entityPlaceholder')}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {msg && <div className={`text-xs p-1.5 rounded ${msg.includes('mis à jour') ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-red-600 bg-red-50 dark:bg-red-900/30'}`}>{msg}</div>}
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? '...' : t('btn.save.profile')}
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('btn.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
