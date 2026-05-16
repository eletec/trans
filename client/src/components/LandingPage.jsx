import React from 'react';
import { ArrowRight, Sparkles, Layers, Printer, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useT } from '../i18n';

export default function LandingPage({ onOpenRegister, onOpenLogin, donateUrl }) {
  const t = useT();

  return (
    <div className="w-full" style={{ fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> {t('landing.freeBadge')}
            </div>
            <h1
              className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900 leading-tight"
              style={{ fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
            >
              {t('landing.title')}
            </h1>
            <p className="mt-4 text-slate-600 text-lg">
              {t('landing.subtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenRegister}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold flex items-center gap-2"
              >
                {t('landing.ctaStart')} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenLogin}
                className="px-4 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                {t('landing.ctaLogin')}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t('landing.freeNote')}</p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="text-sm font-semibold text-slate-900">{t('landing.metric1')}</div>
                <div className="text-xs text-slate-500">{t('landing.metric1Hint')}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="text-sm font-semibold text-slate-900">{t('landing.metric2')}</div>
                <div className="text-xs text-slate-500">{t('landing.metric2Hint')}</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-white shadow-xl border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-wide text-slate-500">{t('landing.preview')}</div>
              <div className="mt-3 space-y-4">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{t('landing.feature1Title')}</div>
                    <div className="text-sm text-slate-600">{t('landing.feature1Body')}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{t('landing.feature2Title')}</div>
                    <div className="text-sm text-slate-600">{t('landing.feature2Body')}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Printer className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{t('landing.feature3Title')}</div>
                    <div className="text-sm text-slate-600">{t('landing.feature3Body')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-900 text-white p-6 shadow-xl">
              <div className="text-sm font-semibold">{t('landing.stepsTitle')}</div>
              <div className="mt-3 text-sm text-slate-200 space-y-2">
                <div>1. {t('landing.step1')}</div>
                <div>2. {t('landing.step2')}</div>
                <div>3. {t('landing.step3')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-6 h-6 text-amber-700" />
            <div>
              <div className="font-semibold text-slate-900">{t('landing.donateTitle')}</div>
              <div className="text-sm text-slate-600">{t('landing.donateBody')}</div>
            </div>
          </div>
          <div className="md:ml-auto">
            <a
              href={donateUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {t('landing.donateCta')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
