import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Info } from 'lucide-react';
import { useUserPlans } from '../store/useSavedPlansStore';
import { buildNotifications, type AppNotification } from '../utils/notificationUtils';
import { useAppSettingsStore } from '../store/useAppSettingsStore';

interface WeatherData { temp: number; code: number; windspeed: number }

const GEO_ALIASES: Record<string, string> = {
  'kapadokya': 'Nevşehir', 'cappadocia': 'Nevşehir', 'pamukkale': 'Denizli',
  'efes': 'Selçuk', 'ölüdeniz': 'Fethiye', 'bali': 'Denpasar',
  'santorini': 'Fira', 'tuscany': 'Floransa', 'toskana': 'Floransa',
};

const geocodeOnce = async (name: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&format=json`
    );
    const data = await res.json();
    if (data.results?.length) return { lat: data.results[0].latitude, lng: data.results[0].longitude };
  } catch { /* sessiz */ }
  return null;
};

const levelConfig = {
  urgent:  { bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500',    title: 'text-red-800',   body: 'text-red-600',   badge: 'bg-red-500',   icon: AlertTriangle },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  bar: 'bg-amber-400',  title: 'text-amber-900', body: 'text-amber-700', badge: 'bg-amber-400', icon: AlertTriangle },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   bar: 'bg-blue-400',   title: 'text-blue-800',  body: 'text-blue-600',  badge: 'bg-blue-400',  icon: Info },
};

const Notifications: React.FC = () => {
  const plans = useUserPlans();
  const {
    tempCelsius,
    appPlanNotif, appCommunityNotif, appUpdateNotif,
    pushEnabled, pushPermission,
  } = useAppSettingsStore();

  const [weather, setWeather]       = useState<WeatherData | null>(null);
  const [dismissed, setDismissed]   = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('travyon-dismissed-notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const todayStr  = new Date().toISOString().split('T')[0];
  const nextTrip  = plans
    .filter(p => p.onboardingData.startDate >= todayStr)
    .sort((a, b) => a.onboardingData.startDate.localeCompare(b.onboardingData.startDate))[0]
    ?? plans[0];
  const cityName  = nextTrip?.plan.destination.split(',')[0].trim() ?? '';

  /* Hava durumu çek */
  useEffect(() => {
    if (!cityName) return;
    (async () => {
      const alias  = GEO_ALIASES[cityName.toLowerCase()];
      let coords   = alias ? await geocodeOnce(alias) : null;
      if (!coords)  coords = await geocodeOnce(cityName);
      if (!coords && nextTrip?.plan.destination !== cityName)
        coords = await geocodeOnce(nextTrip!.plan.destination);
      if (!coords) return;
      const res  = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`
      );
      const data = await res.json();
      if (data.current_weather) setWeather({
        temp: Math.round(data.current_weather.temperature),
        code: data.current_weather.weathercode,
        windspeed: Math.round(data.current_weather.windspeed),
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]);

  /* Dismissed'i localStorage'a yaz */
  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set([...prev, id]);
      localStorage.setItem('travyon-dismissed-notifs', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissed(prev => {
      const all = allNotifications.map(n => n.id);
      const next = new Set([...prev, ...all]);
      localStorage.setItem('travyon-dismissed-notifs', JSON.stringify([...next]));
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allNotifications = useMemo(() => {
    let notifs = buildNotifications(plans, weather, todayStr, cityName, tempCelsius);

    // Kullanıcının bildirim tercihlerine göre filtrele
    if (!appPlanNotif) {
      // Plan/bütçe/seyahat bildirimleri kapalı — sadece hava durumunu göster
      notifs = notifs.filter(n => n.id.startsWith('weather-'));
    }
    if (!appCommunityNotif) {
      notifs = notifs.filter(n => !n.id.startsWith('community-'));
    }
    if (!appUpdateNotif) {
      notifs = notifs.filter(n => !n.id.startsWith('update-'));
    }
    return notifs;
  }, [plans, weather, todayStr, cityName, tempCelsius, appPlanNotif, appCommunityNotif, appUpdateNotif]);

  const notifications: AppNotification[] = useMemo(() =>
    allNotifications.filter(n => !dismissed.has(n.id)),
  [allNotifications, dismissed]);

  // Push bildirimi gönder — sayfa açıldığında, izin varsa ve push aktifse
  useEffect(() => {
    if (!pushEnabled || pushPermission !== 'granted') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const urgentPlan = plans.find(p => {
      const start = p.onboardingData.startDate;
      const daysLeft = Math.ceil((new Date(start).getTime() - Date.now()) / 86_400_000);
      return daysLeft >= 0 && daysLeft <= 1;
    });

    if (urgentPlan) {
      const dest = urgentPlan.plan.destination.split(',')[0];
      const daysLeft = Math.ceil((new Date(urgentPlan.onboardingData.startDate).getTime() - Date.now()) / 86_400_000);
      const sent = sessionStorage.getItem('push-sent-' + urgentPlan.id);
      if (!sent) {
        new Notification(daysLeft === 0 ? `Bugün ${dest}'a yolculuk! ✈️` : `Yarın ${dest}'a yolculuk! 🧳`, {
          body: daysLeft === 0 ? 'Planını son kez kontrol etmeyi unutma.' : 'Hazırlıklarını tamamladın mı?',
          icon: '/favicon.ico',
        });
        sessionStorage.setItem('push-sent-' + urgentPlan.id, '1');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushEnabled, pushPermission]);

  const urgentCount  = notifications.filter(n => n.level === 'urgent').length;
  const warningCount = notifications.filter(n => n.level === 'warning').length;

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-900">
      <div className="max-w-[1150px] mx-auto px-10 py-10">

        {/* Başlık */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={18} className="text-[#f8981d]" />
              <p className="text-xs font-bold text-[#f8981d] uppercase tracking-widest">Bildirimler</p>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Bildirimlerim</h1>
            <p className="text-slate-400 text-sm mt-1">Seyahat uyarıları, bütçe takibi ve hava durumu bildirimleri.</p>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all mt-1"
            >
              <CheckCheck size={13} />
              Tümünü Okundu Say
            </button>
          )}
        </div>

        {/* Özet istatistik */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-slate-900">{notifications.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Toplam</p>
            </div>
            <div className={`rounded-xl p-4 text-center border ${urgentCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <p className={`text-2xl font-black ${urgentCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{urgentCount}</p>
              <p className={`text-xs mt-0.5 ${urgentCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>Acil</p>
            </div>
            <div className={`rounded-xl p-4 text-center border ${warningCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <p className={`text-2xl font-black ${warningCount > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{warningCount}</p>
              <p className={`text-xs mt-0.5 ${warningCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Uyarı</p>
            </div>
          </div>
        )}

        {/* Bildirim listesi */}
        {notifications.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700">Yeni bildirim yok</p>
            <p className="text-xs text-slate-400 mt-1">Yaklaşan seyahat, bütçe veya hava durumu uyarıların burada görünecek.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map(n => {
              const cfg = levelConfig[n.level];
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl border pl-0 pr-4 py-4 overflow-hidden ${cfg.bg} ${cfg.border}`}
                >
                  {/* Seviye çizgisi */}
                  <div className={`w-1 self-stretch rounded-r-full flex-shrink-0 ${cfg.bar}`} />

                  {/* Emoji */}
                  <span className="text-xl leading-none flex-shrink-0 mt-0.5">{n.icon}</span>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold leading-tight ${cfg.title}`}>{n.title}</p>
                      <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider ${cfg.badge}`}>
                        {n.level === 'urgent' ? 'Acil' : n.level === 'warning' ? 'Uyarı' : 'Bilgi'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${cfg.body}`}>{n.body}</p>
                  </div>

                  {/* Kapat */}
                  <button
                    onClick={() => dismiss(n.id)}
                    className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Kapat"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Notifications;
