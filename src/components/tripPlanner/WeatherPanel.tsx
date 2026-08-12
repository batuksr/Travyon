import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, CloudSun, ExternalLink, Droplets, Wind } from 'lucide-react';
import { DEMO_DAYS, type DemoWeatherCond } from '../../data/tripPlannerDemo';

interface WeatherPanelProps {
  onClose: () => void;
}

const COND_EMOJI: Record<DemoWeatherCond, string> = {
  clear: '☀️',
  mostlyClear: '🌤️',
  partlyCloudy: '⛅',
};

const fmtDate = (dateStr: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(dateStr + 'T00:00:00'));

const WeatherPanel: React.FC<WeatherPanelProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const rangeStart = fmtDate(DEMO_DAYS[0].date, locale);
  const rangeEnd = fmtDate(DEMO_DAYS[DEMO_DAYS.length - 1].date, locale);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="absolute inset-y-0 right-0 w-full sm:w-[min(430px,90%)] bg-surface border-l border-divider shadow-2xl flex flex-col z-30"
    >
      <div className="px-5 py-4 border-b border-divider shrink-0">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-heading font-semibold text-[17px] text-text">
            <CloudSun size={18} className="text-accent" strokeWidth={2} />
            {t('weatherView.title')}
          </p>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors p-1">
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <p className="text-[12px] text-muted mt-1">
          {t('home.product.demo.destination')} · {rangeStart} – {rangeEnd}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {DEMO_DAYS.map((day, i) => (
          <div key={day.id} className="border border-divider rounded-2xl overflow-hidden mb-3.5">
            <a
              href={`https://www.windy.com/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 text-[11.5px] font-semibold hover:brightness-105 transition-all"
            >
              <ExternalLink size={12} strokeWidth={2.2} />
              {t('weatherView.windyLink')}
            </a>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] text-muted">{t('weatherView.dayLabel', { number: i + 1 })}</p>
                <p className="font-semibold text-[14.5px] text-text my-0.5">{fmtDate(day.date, locale)}</p>
                <p className="text-[12px] text-muted">{t(`weatherView.conditions.${day.weather.cond}`)}</p>
              </div>
              <span className="text-3xl leading-none">{COND_EMOJI[day.weather.cond]}</span>
            </div>
            <div className="px-4 pb-3.5">
              <p className="font-semibold text-[24px] text-text">
                {day.weather.hi}° <span className="text-[14px] text-muted font-medium">/ {day.weather.lo}°C</span>
              </p>
              <div className="flex gap-4 mt-1.5 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1"><Droplets size={12} />{t('weatherView.precipitationChance', { value: day.weather.rain })}</span>
                <span className="inline-flex items-center gap-1"><Wind size={12} />{day.weather.windKmh} km/h</span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-accent-100 border border-accent-200 rounded-2xl p-3.5 mb-2.5">
          <p className="font-heading font-bold text-[10.5px] uppercase tracking-[0.12em] text-accent-700 mb-1.5">
            {t('weatherView.packingTipsTitle')}
          </p>
          <p className="text-[13px] text-text">🧴 {t('weatherView.packingTips.hot')}</p>
        </div>
        <p className="text-center text-[11px] text-muted py-1">{t('weatherView.footer')}</p>
      </div>
    </motion.div>
  );
};

export default WeatherPanel;
