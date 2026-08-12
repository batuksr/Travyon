import React, { useEffect, useState } from 'react';
import { X, Droplets, Wind, Cloud, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  fetchWeatherForTrip,
  getWeatherInfo,
  type DayWeather,
  type WeatherResult,
} from '../services/weatherService';
import type { TravelPlanResponse } from '../services/aiService';
import type { OnboardingData } from '../store/useOnboardingStore';

interface Props {
  plan: TravelPlanResponse;
  onboardingData: OnboardingData;
  onClose: () => void;
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const fmt = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
};

const windyUrl = (lat: number, lng: number): string =>
  `https://www.windy.com/${lat.toFixed(4)}/${lng.toFixed(4)}/11`;

/* ── WMO kod → i18n anahtarı (weatherService'teki WMO tablosuyla birebir eşleşir) ── */
const WMO_LABEL_KEYS: Record<number, string> = {
  0: 'clear', 1: 'mostlyClear', 2: 'partlyCloudy', 3: 'overcast',
  45: 'fog', 48: 'denseFog',
  51: 'lightDrizzle', 53: 'drizzle', 55: 'denseDrizzle',
  61: 'lightRain', 63: 'rain', 65: 'heavyRain',
  71: 'lightSnow', 73: 'snow', 75: 'denseSnow', 77: 'hail',
  80: 'showers', 81: 'heavyShowers', 82: 'violentShowers',
  85: 'snowShowers', 86: 'denseSnowShowers',
  95: 'thunderstorm', 96: 'thunderstormHail', 99: 'severeThunderstorm',
};

const weatherLabel = (code: number, t: TFunction): string => {
  const key = WMO_LABEL_KEYS[code] ?? WMO_LABEL_KEYS[Math.floor(code / 10) * 10] ?? 'unknown';
  return t(`weatherView.conditions.${key}`);
};

/* ── Bavul önerileri — weatherService'teki getPackingTips ile aynı mantık, çevrilebilir ── */
const PACKING_TIP_EMOJIS: Record<string, string> = {
  hot: '🧴', rainy: '☂️', cold: '🧥', snowy: '🥾', windy: '🧣', stormy: '⚡',
};

const getPackingTipsLocalized = (weatherList: DayWeather[], t: TFunction): string[] => {
  const hot    = weatherList.some(w => w.tempMax > 28);
  const cold   = weatherList.some(w => w.tempMin < 12);
  const rainy  = weatherList.some(w => w.precipitationSum > 3 || (w.precipitationProbabilityMax ?? 0) > 50);
  const snowy  = weatherList.some(w => w.weatherCode >= 71 && w.weatherCode <= 77);
  const windy  = weatherList.some(w => w.windSpeedMax > 30);
  const stormy = weatherList.some(w => w.weatherCode >= 80);

  const tips: string[] = [];
  if (hot)    tips.push(`${PACKING_TIP_EMOJIS.hot} ${t('weatherView.packingTips.hot')}`);
  if (rainy)  tips.push(`${PACKING_TIP_EMOJIS.rainy} ${t('weatherView.packingTips.rainy')}`);
  if (cold)   tips.push(`${PACKING_TIP_EMOJIS.cold} ${t('weatherView.packingTips.cold')}`);
  if (snowy)  tips.push(`${PACKING_TIP_EMOJIS.snowy} ${t('weatherView.packingTips.snowy')}`);
  if (windy)  tips.push(`${PACKING_TIP_EMOJIS.windy} ${t('weatherView.packingTips.windy')}`);
  if (stormy) tips.push(`${PACKING_TIP_EMOJIS.stormy} ${t('weatherView.packingTips.stormy')}`);
  return tips;
};

const WeatherView: React.FC<Props> = ({ plan, onboardingData, onClose }) => {
  const { t } = useTranslation();
  const [result, setResult]   = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setResult(null);

    fetchWeatherForTrip(plan.destination, onboardingData.startDate, onboardingData.endDate)
      .then(data => setResult(data))
      .catch(err => {
        const msg: string = (err as Error).message;
        if (msg === 'TOO_FAR') {
          setError(t('weatherView.errors.tooFar'));
        } else if (msg === 'NOT_FOUND') {
          setError(t('weatherView.errors.notFound', { destination: plan.destination }));
        } else {
          setError(t('weatherView.errors.generic'));
        }
      })
      .finally(() => setLoading(false));
  }, [plan.destination, onboardingData.startDate, onboardingData.endDate, t]);

  const weather    = result?.weather ?? null;
  const packingTips = weather ? getPackingTipsLocalized(weather, t) : [];

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="hidden sm:flex flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full sm:w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Cloud size={13} className="text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('weatherView.title')}</h2>
            </div>
            <p className="text-[10px] text-slate-400">
              {plan.destination} · {fmt(onboardingData.startDate)} – {fmt(onboardingData.endDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">{t('weatherView.loading')}</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{error}</p>
            </div>
          )}

          {weather && result && !loading && (
            <>
              {/* Günlük kartlar */}
              {plan.dailyPlans.map(day => {
                const w = weather.find((d: DayWeather) => d.date === day.date);
                if (!w) return null;
                const info = getWeatherInfo(w.weatherCode);
                const href = windyUrl(result.lat, result.lng);

                return (
                  <div
                    key={day.date}
                    className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 overflow-hidden"
                  >
                    {/* Windy butonu — kartın üstünde tam genişlik */}
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-[10px] font-semibold transition-colors"
                    >
                      <ExternalLink size={9} />
                      {t('weatherView.windyLink')}
                    </a>

                    <div className="p-3.5">
                      {/* Üst satır */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{t('weatherView.dayLabel', { number: day.dayNumber })}</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                            {fmt(day.date)}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{weatherLabel(w.weatherCode, t)}</p>
                        </div>
                        <span className="text-3xl leading-none select-none">{info.emoji}</span>
                      </div>

                      {/* Sıcaklık */}
                      <div className="flex items-baseline gap-1 mb-2.5">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{w.tempMax}°</span>
                        <span className="text-sm text-slate-400">/ {w.tempMin}°C</span>
                      </div>

                      {/* Yağış + Rüzgar */}
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                        {w.precipitationProbabilityMax !== null ? (
                          <div className="flex items-center gap-1">
                            <Droplets size={9} className="text-sky-400 shrink-0" />
                            <span>{t('weatherView.precipitationChance', { value: w.precipitationProbabilityMax })}</span>
                          </div>
                        ) : w.precipitationSum > 0 ? (
                          <div className="flex items-center gap-1">
                            <Droplets size={9} className="text-sky-400 shrink-0" />
                            <span>{w.precipitationSum} mm</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Droplets size={9} className="text-slate-300 shrink-0" />
                            <span>{t('weatherView.noPrecipitation')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Wind size={9} className="text-slate-400 shrink-0" />
                          <span>{w.windSpeedMax} km/h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bavul önerileri */}
              {packingTips.length > 0 && (
                <div className="rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-3.5 mt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-2">
                    {t('weatherView.packingTipsTitle')}
                  </p>
                  <ul className="space-y-1.5">
                    {packingTips.map((tip, i) => (
                      <li key={i} className="text-xs text-amber-800 dark:text-amber-300">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center pt-1 pb-2">
                {t('weatherView.footer')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherView;
