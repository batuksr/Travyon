import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, Compass, MapPin, RotateCcw, Shuffle, Users } from 'lucide-react';
import { CITIES } from '../data/cities';
import type { OnboardingData } from '../store/useOnboardingStore';
import HubDiscovery from './HubDiscovery';

interface Props {
  onStart: (data: Partial<OnboardingData>) => void;
  onCommunity: () => void;
}

// Keep calendar dates local: UTC conversion can move a date to the previous day.
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const weekendDates = () => {
  const saturday = new Date();
  saturday.setHours(12, 0, 0, 0);
  saturday.setDate(saturday.getDate() + (saturday.getDay() === 6 ? 7 : 6 - saturday.getDay()));
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() + 1);
  return { saturday, sunday, startDate: dateValue(saturday), endDate: dateValue(sunday) };
};

const cardClass = 'group min-w-0 flex flex-col items-start rounded-2xl border border-divider bg-surface p-5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';
const iconClass = 'mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent';

export default function HubGettingStarted({ onStart, onCommunity }: Props) {
  const { t, i18n } = useTranslation();
  const [city, setCity] = useState<(typeof CITIES)[number] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayCity, setDisplayCity] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const suggestCity = () => {
    if (timer.current) return;
    const selected = CITIES[Math.floor(Math.random() * CITIES.length)];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCity(selected);
      return;
    }
    setSpinning(true);
    let frame = 0;
    timer.current = setInterval(() => {
      setDisplayCity(CITIES[Math.floor(Math.random() * CITIES.length)].city);
      if (++frame === 16) {
        clearInterval(timer.current!);
        timer.current = null;
        setCity(selected);
        setSpinning(false);
      }
    }, 70);
  };

  const dates = weekendDates();
  const formatDate = (date: Date) => date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'short' });
  const cta = (label: string) => <span className="mt-auto flex items-center gap-2 pt-4 text-xs font-semibold text-accent">{label}<ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span>;

  return (
    <section aria-labelledby="hub-start-title" className="mb-8">
      <div className="relative isolate mb-7 overflow-hidden rounded-3xl bg-[#314b3f] px-6 py-7 text-[#fff9ed] sm:px-9 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/5 opacity-20 sm:opacity-40">
          <svg viewBox="0 0 360 300" className="h-full w-full" fill="none">
            <circle cx="245" cy="150" r="135" stroke="#b8c5a3" strokeDasharray="3 7" />
            <circle cx="245" cy="150" r="100" stroke="#b8c5a3" />
            <path d="M15 260C180 285 80 85 195 105S275 190 335 35" stroke="#e3a56d" strokeWidth="2" strokeDasharray="6 7" />
            <circle cx="195" cy="105" r="6" fill="#e3a56d" />
            <circle cx="335" cy="35" r="6" fill="#fff9ed" />
          </svg>
        </div>
        <div className="max-w-2xl">
          <h2 id="hub-start-title" className="font-heading text-2xl leading-tight sm:text-3xl">{t('hub.gettingStarted.title')}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#dce4d8] sm:text-base">{t('hub.gettingStarted.subtitle')}</p>
          <button type="button" onClick={() => onStart({})} className="mt-6 inline-flex items-center justify-center gap-3 rounded-full bg-[#fff9ed] px-6 py-3 text-sm font-heading text-[#314b3f] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {t('hub.gettingStarted.cta')}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <h3 className="mb-4 flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-muted"><Compass size={14} aria-hidden="true" />{t('hub.gettingStarted.actionsTitle')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => { const current = weekendDates(); onStart({ startDate: current.startDate, endDate: current.endDate }); }} className={cardClass}>
          <span className={iconClass}><CalendarDays size={19} aria-hidden="true" /></span>
          <span className="text-sm font-heading text-text">{t('hub.gettingStarted.weekend.title')}</span>
          <span className="mt-2 text-xs leading-relaxed text-muted">{formatDate(dates.saturday)} – {formatDate(dates.sunday)}</span>
          {cta(t('hub.gettingStarted.weekend.cta'))}
        </button>
        <div className={`${cardClass} !p-0`}>
          {city && !spinning ? (
            <div className="flex h-full w-full flex-col items-start p-5">
              <span className={iconClass}><MapPin size={19} aria-hidden="true" /></span>
              <p className="text-sm font-heading text-text">{city.city}</p>
              <p className="mt-2 text-xs text-muted">{city.country}</p>
              <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-2 pt-4">
                <button type="button" onClick={() => onStart({ destination: `${city.city}, ${city.country}` })} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white hover:brightness-110">{t('hub.gettingStarted.random.planCta')}</button>
                <button type="button" onClick={suggestCity} aria-label={t('hub.gettingStarted.random.retry')} title={t('hub.gettingStarted.random.retry')} className="rounded-full border border-divider p-2 text-muted hover:text-accent"><RotateCcw size={16} aria-hidden="true" /></button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={suggestCity} disabled={spinning} className="flex h-full w-full flex-col items-start rounded-2xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait">
              <span className={iconClass}><Shuffle size={19} aria-hidden="true" /></span>
              <span className="text-sm font-heading text-text">{t('hub.gettingStarted.random.title')}</span>
              <span className="mt-2 text-xs leading-relaxed text-muted" aria-hidden={spinning || undefined}>{spinning ? displayCity || t('hub.gettingStarted.random.loading') : t('hub.gettingStarted.random.subtitle')}</span>
              {cta(t(spinning ? 'hub.gettingStarted.random.loading' : 'hub.gettingStarted.random.cta'))}
            </button>
          )}
          <span className="sr-only" role="status">{spinning ? t('hub.gettingStarted.random.loading') : city ? `${city.city}, ${city.country}` : ''}</span>
        </div>
        <button type="button" onClick={onCommunity} className={cardClass}>
          <span className={iconClass}><Users size={19} aria-hidden="true" /></span>
          <span className="text-sm font-heading text-text">{t('hub.gettingStarted.community.title')}</span>
          <span className="mt-2 text-xs leading-relaxed text-muted">{t('hub.gettingStarted.community.subtitle')}</span>
          {cta(t('hub.gettingStarted.community.cta'))}
        </button>
      </div>
      <HubDiscovery onStart={onStart} onCommunity={onCommunity} />
    </section>
  );
}
