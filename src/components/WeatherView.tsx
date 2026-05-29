import React, { useEffect, useState } from 'react';
import { X, Droplets, Wind, Cloud, ExternalLink } from 'lucide-react';
import {
  fetchWeatherForTrip,
  getWeatherInfo,
  getPackingTips,
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

const WeatherView: React.FC<Props> = ({ plan, onboardingData, onClose }) => {
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
          setError('Bu tarihlere ait tahmin henüz hazır değil. Seyahat tarihinize yaklaştıkça tekrar kontrol edin (en fazla 16 gün öncesinden).');
        } else if (msg === 'NOT_FOUND') {
          setError(`"${plan.destination}" konumu bulunamadı.`);
        } else {
          setError('Hava durumu alınamadı. İnternet bağlantınızı kontrol edin.');
        }
      })
      .finally(() => setLoading(false));
  }, [plan.destination, onboardingData.startDate, onboardingData.endDate]);

  const weather    = result?.weather ?? null;
  const packingTips = weather ? getPackingTips(weather) : [];

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
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Hava Durumu</h2>
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
              <p className="text-xs text-slate-400">Yükleniyor...</p>
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
                      Saatlik detaylı tahmin — Windy.com
                    </a>

                    <div className="p-3.5">
                      {/* Üst satır */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Gün {day.dayNumber}</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                            {fmt(day.date)}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{info.label}</p>
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
                            <span>%{w.precipitationProbabilityMax} yağış</span>
                          </div>
                        ) : w.precipitationSum > 0 ? (
                          <div className="flex items-center gap-1">
                            <Droplets size={9} className="text-sky-400 shrink-0" />
                            <span>{w.precipitationSum} mm</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Droplets size={9} className="text-slate-300 shrink-0" />
                            <span>Yağış yok</span>
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
                    Bavul Önerileri
                  </p>
                  <ul className="space-y-1.5">
                    {packingTips.map((tip, i) => (
                      <li key={i} className="text-xs text-amber-800 dark:text-amber-300">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center pt-1 pb-2">
                Open-Meteo · Ücretsiz açık kaynak hava verisi
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherView;
