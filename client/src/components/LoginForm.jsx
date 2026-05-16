import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { api } from '../api/client';
import { useT } from '../i18n';

export default function LoginForm({ onLogin, initialMode = 'login', onModeChange, embedded = false }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [entityName, setEntityName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useT();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    if (onModeChange) onModeChange(nextMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      const rawIdentifier = email.trim();
      if (!rawIdentifier) throw new Error(t('login.emailRequired'));

      if (mode === 'login') {
        const identifier = rawIdentifier.includes('@')
          ? rawIdentifier.toLowerCase()
          : rawIdentifier;
        data = await api.login(identifier, password);
      } else {
        const normalizedEmail = rawIdentifier.toLowerCase();
        if (!normalizedEmail.includes('@')) throw new Error(t('login.emailRequired'));
        const trimmedEntity = entityName.trim();
        if (!trimmedEntity) throw new Error(t('login.entityRequired'));
        if (password !== confirmPassword) throw new Error(t('login.passwordMismatch'));
        data = await api.register(normalizedEmail, normalizedEmail, password, trimmedEntity);
      }
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? '' : 'flex items-center justify-center min-h-[60vh]'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Truck className="w-12 h-12 text-blue-600 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-2">Easy Packing</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('login.subtitle')}</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('login.login')}
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'register' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('login.register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.email')}</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoComplete={mode === 'login' ? 'username' : 'email'}
            />
            {mode === 'register' && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('login.emailAutoValidated')}</p>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.entity')}</label>
                <input
                  type="text"
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                  placeholder={t('login.entityPlaceholder')}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg
                       disabled:opacity-50 transition-colors shadow"
          >
            {loading ? '...' : mode === 'login' ? t('login.submit.login') : t('login.submit.register')}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('register')} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              {t('login.noAccount')}
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              {t('login.haveAccount')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
