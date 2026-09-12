import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { SavedPlan } from '../store/useSavedPlansStore';
import { TRAVEL_CHECKLIST, TRAVEL_CHECKLIST_TOTAL, getTravelChecklistStorageKey } from '../data/travelChecklist';
import AppIcon from './AppIcon';
import IconBadge from './IconBadge';
import { EMPTY_WALLET_ENTRIES, useTravelWalletStore } from '../store/useTravelWalletStore';

interface WeatherSnapshot {
  code: number;
}

interface Props {
  plan: SavedPlan;
  userId: string;
  daysUntil: number | null;
  weather: WeatherSnapshot | null;
  onOpenPlan: () => void;
  onOpenChecklist: () => void;
  onOpenWallet: () => void;
  onReplan: () => void;
}

const safelyReadChecklistCount = (userId: string, planId: string) => {
  try {
    const raw = localStorage.getItem(getTravelChecklistStorageKey(userId, planId));
    if (!raw) return 0;
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) return 0;
    const knownItems = new Set(TRAVEL_CHECKLIST.flatMap(group => group.items.map(item => item.id)));
    return new Set(values.filter(value => typeof value === 'string' && knownItems.has(value))).size;
  } catch {
    return 0;
  }
};

const HubTravelControlCenter: React.FC<Props> = ({
  plan, userId, daysUntil, weather, onOpenPlan, onOpenChecklist, onOpenWallet, onReplan,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const symbol = plan.onboardingData.currencySymbol ?? plan.plan.currencySymbol ?? '₺';
  const budget = Math.max(0, Number(plan.onboardingData.budget) || 0);
  const plannedCost = plan.plan.dailyPlans.reduce(
    (total, day) => total + day.activities.reduce(
      (dayTotal, activity) => dayTotal + Math.max(0, Number(activity.actualCost ?? activity.estimatedCost) || 0),
      0,
    ),
    0,
  );
  const remaining = budget - plannedCost;
  const budgetProgress = budget > 0 ? Math.min(100, Math.round((plannedCost / budget) * 100)) : 0;
  const dayCount = Math.max(1, plan.plan.dailyPlans.length);
  const stopCount = plan.plan.dailyPlans.reduce((sum, day) => sum + day.activities.length, 0);
  const averageStops = Math.round((stopCount / dayCount) * 10) / 10;
  const checklistCount = Math.min(TRAVEL_CHECKLIST_TOTAL, safelyReadChecklistCount(userId, plan.id));
  const checklistProgress = Math.round((checklistCount / TRAVEL_CHECKLIST_TOTAL) * 100);
  const walletEntries = useTravelWalletStore(
    (state) => state.entriesByUser[userId] ?? EMPTY_WALLET_ENTRIES,
  );
  const walletCount = walletEntries.filter((entry) => entry.planId === plan.id).length;
  const city = plan.plan.destination.split(',')[0].trim();
  const today = new Date().toISOString().split('T')[0];
  const isPast = plan.onboardingData.endDate < today;
  const isActive = plan.onboardingData.startDate <= today && plan.onboardingData.endDate >= today;
  const weatherIsRelevant = isActive || (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7);
  const adverseWeather = weather && weatherIsRelevant
    ? [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(weather.code)
    : false;
  const formatMoney = (amount: number) => `${symbol}${Math.abs(amount).toLocaleString(locale)}`;

  const periodHour = (period: string) => {
    const normalized = period.toLocaleLowerCase('tr-TR');
    if (normalized.includes('sabah') || normalized.includes('morning')) return 9;
    if (normalized.includes('öğleden') || normalized.includes('afternoon')) return 15;
    if (normalized.includes('öğle') || normalized.includes('noon')) return 12;
    if (normalized.includes('akşam') || normalized.includes('evening')) return 18;
    if (normalized.includes('gece') || normalized.includes('night')) return 21;
    return 12;
  };
  const activeDayIndex = plan.plan.dailyPlans.findIndex(day => day.date === today);
  const activeDay = activeDayIndex >= 0 ? plan.plan.dailyPlans[activeDayIndex] : null;
  const currentHour = new Date().getHours();
  const nextStop = activeDay?.activities.find(activity => periodHour(activity.period) >= currentHour)
    ?? (activeDayIndex >= 0 ? plan.plan.dailyPlans[activeDayIndex + 1]?.activities[0] : undefined);
  const timing = isActive
    ? t('hub.controlCenter.nextAction.timing.active')
    : isPast
      ? t('hub.controlCenter.nextAction.timing.past')
      : daysUntil === 0
        ? t('hub.controlCenter.nextAction.timing.today')
        : daysUntil === 1
          ? t('hub.controlCenter.nextAction.timing.tomorrow')
          : t('hub.controlCenter.nextAction.timing.days', { count: Math.max(0, daysUntil ?? 0) });

  const nextAction = (() => {
    if (isActive && nextStop) return {
      icon: 'map-pin', title: t('hub.controlCenter.nextAction.activeTitle'),
      desc: t('hub.controlCenter.nextAction.activeDesc', { place: nextStop.placeName }),
      action: onOpenPlan, cta: t('hub.controlCenter.openRoute'),
    };
    if (isPast) return {
      icon: 'sparkles', title: t('hub.controlCenter.nextAction.pastTitle'),
      desc: t('hub.controlCenter.nextAction.pastDesc', { city }),
      action: onReplan, cta: t('hub.controlCenter.planAgain'),
    };
    if (remaining < 0) return {
      icon: 'warning', title: t('hub.controlCenter.nextAction.overBudgetTitle'),
      desc: t('hub.controlCenter.nextAction.overBudgetDesc', { amount: formatMoney(remaining) }),
      action: onOpenPlan, cta: t('hub.controlCenter.reviewBudget'),
    };
    if (adverseWeather) return {
      icon: 'rain', title: t('hub.controlCenter.nextAction.weatherTitle'),
      desc: t('hub.controlCenter.nextAction.weatherDesc', { city }),
      action: onOpenPlan, cta: t('hub.controlCenter.reviewPlan'),
    };
    if (plan.onboardingData.hasReservation === false) return {
      icon: 'hotel', title: t('hub.controlCenter.nextAction.stayTitle'),
      desc: t('hub.controlCenter.nextAction.stayDesc', { city }),
      action: onReplan, cta: t('hub.controlCenter.nextAction.completeStay'),
    };
    if (checklistProgress < 100) return {
      icon: 'luggage', title: t('hub.controlCenter.nextAction.preparationTitle'),
      desc: t('hub.controlCenter.nextAction.preparationDesc', { count: TRAVEL_CHECKLIST_TOTAL - checklistCount }),
      action: onOpenChecklist, cta: t('hub.controlCenter.completeNow'),
    };
    return {
      icon: 'circle-check', title: t('hub.controlCenter.nextAction.readyTitle'),
      desc: t('hub.controlCenter.nextAction.readyDesc', { city }),
      action: onOpenPlan, cta: t('hub.controlCenter.reviewPlan'),
    };
  })();

  const cards = [
    {
      id: 'preparation', icon: 'luggage', value: isPast ? t('hub.controlCenter.completed') : `%${checklistProgress}`,
      title: t('hub.controlCenter.preparation'),
      description: isPast ? t('hub.controlCenter.tripCompleted') : t('hub.controlCenter.preparationCount', { done: checklistCount, total: TRAVEL_CHECKLIST_TOTAL }),
      progress: isPast ? 100 : checklistProgress, cta: isPast ? t('hub.controlCenter.planAgain') : t('hub.controlCenter.openChecklist'),
      action: isPast ? onReplan : onOpenChecklist, tone: 'sage',
    },
    {
      id: 'budget', icon: 'wallet', value: remaining >= 0 ? formatMoney(remaining) : `−${formatMoney(remaining)}`,
      title: remaining >= 0 ? t('hub.controlCenter.remainingBudget') : t('hub.controlCenter.budgetExceeded'),
      description: t('hub.controlCenter.plannedSpend', { amount: formatMoney(plannedCost), percent: budgetProgress }),
      progress: budgetProgress, cta: t('hub.controlCenter.reviewBudget'), action: onOpenPlan,
      tone: remaining < 0 ? 'warning' : 'accent',
    },
    {
      id: 'route', icon: 'map-pinned', value: t('hub.controlCenter.stopCount', { count: stopCount }),
      title: t('hub.controlCenter.routeDensity'),
      description: t('hub.controlCenter.routeDensityDesc', { days: dayCount, average: averageStops }),
      cta: t('hub.controlCenter.openRoute'), action: onOpenPlan, tone: 'sage',
    },
    {
      id: 'wallet', icon: 'ticket', value: t('hub.controlCenter.walletCount', { count: walletCount }),
      title: t('hub.controlCenter.travelWallet'),
      description: walletCount > 0
        ? t('hub.controlCenter.walletReady', { count: walletCount })
        : t('hub.controlCenter.walletEmpty'),
      cta: t('hub.controlCenter.openWallet'), action: onOpenWallet, tone: 'sage',
    },
  ];

  return (
    <section className="mb-8" aria-labelledby="travel-control-center-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p id="travel-control-center-title" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-muted">
            <AppIcon name="compass" size={13} /> {t('hub.controlCenter.title')}
          </p>
          <p className="mt-1 text-xs text-muted">{t('hub.controlCenter.subtitle', { city })}</p>
        </div>
        <button onClick={onOpenPlan} className="inline-flex items-center gap-1 text-xs font-heading text-accent hover:text-accent-700">
          {t('hub.controlCenter.openPlan')} <ChevronRight size={13} />
        </button>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-3xl bg-[#52613f] px-5 py-5 text-[#fffaf2] shadow-[0_14px_32px_rgba(54,65,42,0.18)] dark:bg-[#35422d] sm:px-6 sm:py-6" aria-labelledby="next-best-action-title">
        <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-16 size-36 rounded-full bg-white/[0.04]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#fffaf2]">
              <AppIcon name={nextAction.icon} size={23} />
            </span>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-heading text-[10px] uppercase tracking-[0.16em] text-[#fffaf2]/65">{t('hub.controlCenter.nextAction.eyebrow')}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-[#fffaf2]/80">{timing}</span>
              </div>
              <h3 id="next-best-action-title" className="font-heading text-lg leading-tight text-[#fffaf2] sm:text-xl">{nextAction.title}</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#fffaf2]/72 sm:text-sm">{nextAction.desc}</p>
            </div>
          </div>
          <button onClick={nextAction.action} className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#fffaf2] px-5 py-2.5 text-xs font-heading text-[#485537] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white sm:w-auto">
            {nextAction.cta} <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(card => {
          const warning = card.tone === 'warning';
          return (
            <article key={card.id} className={`group flex min-h-48 flex-col rounded-3xl border bg-surface p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${warning ? 'border-rose-200 dark:border-rose-900/60' : 'border-divider hover:border-sage/35'}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <IconBadge icon={card.icon} selected={card.tone === 'accent'} />
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-heading uppercase tracking-wider ${warning ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-sage/5 text-sage-700'}`}>{card.value}</span>
              </div>
              <h3 className="font-heading text-[15px] leading-tight text-text">{card.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{card.description}</p>
              {card.progress !== undefined && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-divider/60">
                  <div className={`h-full rounded-full transition-[width] duration-500 ${warning ? 'bg-rose-500' : card.tone === 'accent' ? 'bg-accent' : 'bg-sage'}`} style={{ width: `${Math.max(card.progress > 0 ? 4 : 0, Math.min(100, card.progress))}%` }} />
                </div>
              )}
              <button onClick={card.action} className={`mt-auto inline-flex items-center gap-1 pt-4 text-left text-xs font-heading transition-colors ${warning ? 'text-rose-600 hover:text-rose-700' : 'text-accent hover:text-accent-700'}`}>
                {card.cta} <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default HubTravelControlCenter;
