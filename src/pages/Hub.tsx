import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import { Plane, MapPin, Wind } from 'lucide-react';

/* ── Helpers ── */
const getGreeting = (): { text: string; emoji: string } => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: 'Günaydın',    emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'İyi Öğleler', emoji: '🌤️' };
  if (h >= 18 && h < 22) return { text: 'İyi Akşamlar', emoji: '🌆' };
  return                         { text: 'İyi Geceler', emoji: '🌙' };
};

const weatherIcon = (code: number): string => {
  if (code === 0)  return '☀️';
  if (code <= 2)   return '🌤️';
  if (code === 3)  return '☁️';
  if (code <= 48)  return '🌫️';
  if (code <= 55)  return '🌦️';
  if (code <= 67)  return '🌧️';
  if (code <= 77)  return '❄️';
  if (code <= 82)  return '🌦️';
  return '⛈️';
};

const weatherLabel = (code: number): string => {
  if (code === 0)  return 'Açık Hava';
  if (code <= 2)   return 'Az Bulutlu';
  if (code === 3)  return 'Bulutlu';
  if (code <= 48)  return 'Sisli';
  if (code <= 55)  return 'Çiseleyen';
  if (code <= 67)  return 'Yağmurlu';
  if (code <= 77)  return 'Karlı';
  if (code <= 82)  return 'Sağanak';
  return 'Fırtınalı';
};

interface WeatherData { temp: number; code: number; windspeed: number }

/* ═══════════════════════════════════════════════
   HUB
════════════════════════════════════════════════ */
const Hub: React.FC = () => {
  const { user }  = useAuthStore();
  const plans     = useUserPlans();

  const [weather, setWeather]             = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Gezgin';
  const greeting  = getGreeting();
  const todayStr  = new Date().toISOString().split('T')[0];

  /* Bir sonraki seyahat (startDate > bugün) veya fallback en son plan */
  const nextTrip = plans
    .filter(p => p.onboardingData.startDate > todayStr)
    .sort((a, b) => a.onboardingData.startDate.localeCompare(b.onboardingData.startDate))[0]
    ?? plans[0];

  const daysUntil = nextTrip
    ? Math.ceil(
        (new Date(nextTrip.onboardingData.startDate).getTime() - Date.now()) / 86_400_000
      )
    : null;
  const isFuture = daysUntil !== null && daysUntil > 0;

  const cityName = nextTrip?.plan.destination.split(',')[0].trim() ?? '';

  /* Hava durumu — Open-Meteo (ücretsiz, API key gerekmez) */
  useEffect(() => {
    if (!cityName) return;
    setWeatherLoading(true);
    setWeather(null);

    (async () => {
      try {
        const geoRes  = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`
        );
        const geoData = await geoRes.json();
        if (!geoData.results?.length) return;

        const { latitude, longitude } = geoData.results[0];
        const wxRes  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        );
        const wxData = await wxRes.json();
        if (wxData.current_weather) {
          setWeather({
            temp:      Math.round(wxData.current_weather.temperature),
            code:      wxData.current_weather.weathercode,
            windspeed: Math.round(wxData.current_weather.windspeed),
          });
        }
      } catch { /* sessizce başarısız */ }
      finally  { setWeatherLoading(false); }
    })();
  }, [cityName]);

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* ── Greeting ── */}
        <div className="mb-10">
          <p className="text-slate-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{greeting.emoji}</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              {greeting.text},{' '}
              <span className="text-[#f8981d]">{firstName}!</span>
            </h1>
          </div>
        </div>

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Seyahat Sayacı */}
          {nextTrip ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-[#f8981d] to-[#e08518] rounded-2xl p-6 text-white shadow-xl shadow-[#f8981d]/25">
              {/* dekoratif daireler */}
              <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute right-4 -bottom-14 w-44 h-44 bg-white/8 rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full gap-4">
                <div className="flex items-center gap-2">
                  <Plane size={14} className="text-white/75" />
                  <span className="text-white/75 text-[11px] font-bold uppercase tracking-widest">
                    {isFuture ? 'Bir Sonraki Seyahat' : 'Son Seyahat'}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-black leading-tight">{nextTrip.plan.destination}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={12} className="text-white/70" />
                    <p className="text-white/70 text-sm">
                      {nextTrip.onboardingData.startDate} → {nextTrip.onboardingData.endDate}
                    </p>
                  </div>
                </div>

                {isFuture ? (
                  <div className="mt-auto bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 inline-flex items-baseline gap-2 self-start">
                    <span className="text-4xl font-black leading-none">{daysUntil}</span>
                    <span className="text-white/90 font-semibold text-sm">gün kaldı ✈️</span>
                  </div>
                ) : (
                  <div className="mt-auto bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5 inline-flex items-center gap-2 self-start">
                    <span className="text-sm font-semibold">Son kayıtlı plan</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
              <div className="w-14 h-14 bg-[#f8981d]/10 rounded-2xl flex items-center justify-center">
                <Plane size={24} className="text-[#f8981d]" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Henüz plan yok</p>
                <p className="text-slate-400 text-sm mt-0.5">Yeni plan oluşturmaya başla</p>
              </div>
            </div>
          )}

          {/* Hava Durumu */}
          {nextTrip ? (
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-slate-50 rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Hava Durumu</span>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <MapPin size={12} className="text-[#f8981d]" />
                  <span className="text-slate-700 text-sm font-semibold">{cityName}</span>
                </div>

                {weatherLoading ? (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-7 w-20 bg-slate-100 rounded-lg animate-pulse" />
                      <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                ) : weather ? (
                  <div className="flex items-end gap-5 mt-auto">
                    <span className="text-7xl leading-none select-none">
                      {weatherIcon(weather.code)}
                    </span>
                    <div>
                      <p className="text-5xl font-black text-slate-900 leading-none">
                        {weather.temp}°
                      </p>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        {weatherLabel(weather.code)}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Wind size={11} className="text-slate-400" />
                        <span className="text-slate-400 text-xs">{weather.windspeed} km/s rüzgar</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto text-slate-400 text-sm">Hava durumu yüklenemedi</div>
                )}
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
};

export default Hub;
