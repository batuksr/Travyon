import { lazy, Suspense, useId, useState } from 'react';
import { List, Map, MapPin, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEMO_DAYS, DEMO_STAY, type DemoActivity } from '../../data/tripPlannerDemo';
import { GROUP_COLORS } from './types';

const RealMap = lazy(() => import('./RealMap'));
const initialDays = () => DEMO_DAYS.map(day => [...day.items]);

// This sandbox never reads or writes the visitor's saved plans.
export default function MobilePlanPreview() {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [days, setDays] = useState(initialDays);
  const [dayIndex, setDayIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [removed, setRemoved] = useState<{ day: number; index: number; item: DemoActivity } | null>(null);
  const day = DEMO_DAYS[dayIndex];
  const items = days[dayIndex];
  const locale = i18n.language.startsWith('en') ? 'en-GB' : 'tr-TR';
  const money = (value: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(value);
  const title = (item: DemoActivity) => t(`home.product.demo.items.${item.id}.title`);
  const copy = (key: string) => t(`home.product.mobilePlan.${key}`);
  const total = items.reduce((sum, item) => sum + item.cost, 0);
  const controlClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-divider px-3 text-xs text-muted transition-colors hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  const remove = (item: DemoActivity, index: number) => {
    setRemoved({ day: dayIndex, index, item });
    setDays(previous => previous.map((list, i) => i === dayIndex ? list.filter(entry => entry.id !== item.id) : list));
    setExpanded(null);
  };
  const undo = () => {
    if (!removed) return;
    setDays(previous => previous.map((list, i) => i === removed.day
      ? [...list.slice(0, removed.index), removed.item, ...list.slice(removed.index)] : list));
    setRemoved(null);
  };

  return (
    <section aria-label={copy('title')} className="bg-surface text-text">
      <header className="border-b border-divider px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin size={18} className="shrink-0 text-sage" aria-hidden="true" />
            <h3 className="text-base font-semibold">{copy('city')}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-sage/10 px-2.5 py-1 text-[10px] font-medium text-sage-700">{copy('sample')}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{copy('hint')}</p>
      </header>

      <div className="px-4 pt-4 sm:px-6">
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={copy('days')}>
          {DEMO_DAYS.map((entry, index) => (
            <button key={entry.id} type="button" aria-pressed={dayIndex === index}
              onClick={() => { setDayIndex(index); setExpanded(null); }}
              className={`min-h-11 rounded-xl border px-1 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dayIndex === index ? 'border-accent bg-accent text-white' : 'border-divider bg-surface text-muted'}`}>
              {t('home.product.mobilePlan.day', { count: index + 1 })}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${day.date}T12:00:00`))}</p>
            <p className="mt-1 text-sm font-medium">{t('home.product.mobilePlan.stops', { count: items.length })}</p>
          </div>
          <div className="shrink-0 text-right" aria-live="polite" aria-atomic="true">
            <p className="text-[10px] text-muted">{copy('estimate')}</p>
            <p className="mt-0.5 text-lg font-semibold text-accent-700" data-testid="mobile-plan-total">{money(total)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t(`home.product.demo.summaries.${day.id}`)}</p>
        <div className="flex items-center justify-between gap-2 py-4">
          <button type="button" className={controlClass} aria-expanded={mapOpen} aria-controls={`${id}-map`} onClick={() => setMapOpen(value => !value)}>
            {mapOpen ? <List size={15} /> : <Map size={15} />}{copy(mapOpen ? 'list' : 'map')}
          </button>
          <button type="button" className={controlClass} onClick={() => { setDays(initialDays()); setRemoved(null); setExpanded(null); }}>
            <RotateCcw size={14} />{copy('reset')}
          </button>
        </div>
      </div>

      {mapOpen && (
        <div id={`${id}-map`} className="border-y border-divider">
          <div className="relative isolate h-72 overflow-hidden">
            <Suspense fallback={<p className="p-6 text-sm text-muted" role="status">{copy('loadingMap')}</p>}>
              <RealMap pins={items.map(item => ({ id: item.id, lat: item.lat, lng: item.lng, label: title(item) }))}
                stay={DEMO_STAY} activeId={expanded} onSelect={selected => { setExpanded(selected); setMapOpen(false); }} />
            </Suspense>
          </div>
          <p className="px-4 py-2 text-[11px] leading-relaxed text-muted">{copy('mapNote')}</p>
        </div>
      )}

      <div className="max-h-[440px] overflow-y-auto overscroll-y-contain px-4 pb-3 sm:px-6" aria-label={copy('stopsLabel')} tabIndex={0}>
        {items.length === 0 && <p className="py-8 text-center text-sm text-muted">{copy('empty')}</p>}
        {items.map((item, index) => {
          const open = expanded === item.id;
          const colors = GROUP_COLORS[item.group];
          const description = t(`home.product.demo.items.${item.id}.desc`);
          const canExpand = description.length > 140;
          const excerpt = description.slice(0, 140).replace(/\s+\S*$/, '').trimEnd();
          return (
            <article key={item.id} className="border-t border-divider py-3">
              {(index === 0 || items[index - 1].group !== item.group) && (
                <p className={`mb-3 text-[10px] font-semibold uppercase tracking-widest ${colors.text}`}>{t(`dashboard.dailyPlanView.periods.${item.group}`)}</p>
              )}
              <div className="flex w-full items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${colors.border} ${colors.text}`}>{index + 1}</span>
                <h4 className="min-w-0 flex-1 pt-0.5 text-sm font-medium leading-relaxed">{title(item)}</h4>
              </div>
              <div className="ml-10 mt-2 text-sm leading-relaxed text-muted">
                <p id={`${id}-${item.id}`}>{open || !canExpand ? description : `${excerpt}…`}</p>
                {canExpand && (
                  <button type="button" aria-expanded={open} aria-controls={`${id}-${item.id}`}
                    onClick={() => setExpanded(open ? null : item.id)}
                    className="min-h-11 rounded-md text-xs font-semibold text-accent-700 underline decoration-accent/30 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    {copy(open ? 'readLess' : 'readMore')}
                  </button>
                )}
              </div>
              <div className="ml-10 mt-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{money(item.cost)}</span>
                <button type="button" onClick={() => remove(item, index)} aria-label={t('home.product.mobilePlan.remove', { title: title(item) })}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-accent-100 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-accent">
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <footer className="border-t border-divider bg-bg/50 px-4 py-3 sm:px-6">
        <div aria-live="polite" className="text-xs leading-relaxed text-muted">
          {removed ? (
            <div className="flex items-center justify-between gap-3">
              <span>{copy('removed')}</span>
              <button type="button" onClick={undo} className={`${controlClass} shrink-0`}><Undo2 size={14} />{copy('undo')}</button>
            </div>
          ) : copy('disclaimer')}
        </div>
      </footer>
    </section>
  );
}
