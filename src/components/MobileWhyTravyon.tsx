import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MapPin, Plane, Route, Search, Sparkles, Wallet } from 'lucide-react';

const MobileWhyTravyon: React.FC = () => {
  const { t } = useTranslation();

  const problems = [
    { icon: Search, key: 'research' },
    { icon: MapPin, key: 'route' },
    { icon: Wallet, key: 'budget' },
  ] as const;

  const benefits = [
    { icon: Sparkles, key: 'personal' },
    { icon: Route, key: 'optimized' },
    { icon: Wallet, key: 'controlled' },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-lg pt-12 pb-12 lg:hidden">
      <div className="mx-auto max-w-sm px-2 text-center">
        <span className="block font-heading text-xs uppercase tracking-widest text-accent-700">
          {t('home.whyTravyon.eyebrow')}
        </span>
        <h2 className="mt-1 font-heading text-2xl leading-tight text-text">
          {t('home.whyTravyon.title')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t('home.whyTravyon.subtitle')}
        </p>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[28px] border border-divider bg-surface shadow-[0_20px_50px_rgba(46,43,37,0.12)]">
        <div className="relative overflow-hidden bg-[#27241f] px-5 pt-5 pb-8 text-white">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-white/[0.06]" />
          <div className="absolute -right-3 -top-7 h-24 w-24 rounded-full border border-white/[0.06]" />

          <div className="relative">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/50">
              {t('home.whyTravyon.before.label')}
            </span>
          </div>

          <h3 className="relative mt-2 max-w-[270px] font-heading text-xl leading-snug">
            {t('home.whyTravyon.before.title')}
          </h3>

          <div className="relative mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.045]">
            {problems.map(({ icon: Icon, key }, index) => (
              <div
                key={key}
                className={`flex min-h-14 items-center gap-3 px-3.5 py-2.5 ${index > 0 ? 'border-t border-white/10' : ''}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-white/55">
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/75">
                  {t(`home.whyTravyon.before.items.${key}`)}
                </span>
                <span className="font-heading text-[9px] tracking-wider text-white/20">0{index + 1}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">
              {t('home.whyTravyon.before.caption')}
            </span>
          </div>
        </div>

        <div className="relative z-10 h-0">
          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border-4 border-surface bg-accent px-4 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_9px_22px_rgba(198,113,57,0.28)]">
            <Plane size={14} className="-rotate-45" />
            {t('home.whyTravyon.transition')}
          </div>
        </div>

        <div className="relative px-5 pt-10 pb-5">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-accent-700">
              {t('home.whyTravyon.after.label')}
            </span>
          </div>

          <h3 className="mt-2 font-heading text-xl leading-snug text-text">
            {t('home.whyTravyon.after.title')}
          </h3>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-divider bg-bg/55">
            <div className="flex items-center justify-between border-b border-divider px-3.5 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                {t('home.whyTravyon.after.planLabel')}
              </span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-1.5 w-8 rounded-full bg-accent" />
                <span className="h-1.5 w-3 rounded-full bg-accent/30" />
                <span className="h-1.5 w-3 rounded-full bg-sage-700/25" />
              </div>
            </div>

            {benefits.map(({ icon: Icon, key }, index) => (
              <div
                key={key}
                className={`flex min-h-14 items-center gap-3 px-3.5 py-2.5 ${index > 0 ? 'border-t border-divider' : ''}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
                  <Icon size={15} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-text">
                  {t(`home.whyTravyon.after.items.${key}`)}
                </span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f1e8] text-sage-700">
                  <Check size={11} strokeWidth={3} />
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default MobileWhyTravyon;
