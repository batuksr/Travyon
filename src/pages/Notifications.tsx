import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, CheckCheck, Plane, AlertCircle, Info, ExternalLink } from 'lucide-react';
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
  urgent:  {
    bar:   'bg-red-400',
    dot:   'bg-red-400',
    badge: 'bg-red-100 text-red-600',
    icon:  AlertCircle,
    iconColor: 'text-red-400',
    label: 'Acil',
  },
  warning: {
    bar:   'bg-amber-400',
    dot:   'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    icon:  AlertCircle,
    iconColor: 'text-amber-400',
    label: 'Uyarı',
  },
  info:    {
    bar:   'bg-blue-400',
    dot:   'bg-blue-400',
    badge: 'bg-blue-100 text-blue-600',
    icon:  Info,
    iconColor: 'text-blue-400',
    label: 'Bilgi',
  },
};

const Notifications: React.FC = () => {
  const plans = useUserPlans();
  const {
    tempCelsius,
    appPlanNotif, appCommunityNotif, appUpdateNotif,
    pushEnabled, pushPermission,
  } = useAppSettingsStore();

  const [weather, setWeather]     = useState<WeatherData | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('travyon-dismissed-notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const nextTrip = plans
    .filter(p => p.onboardingData.startDate >= todayStr)
    .sort((a, b) => a.onboardingData.startDate.localeCompare(b.onboardingData.startDate))[0]
    ?? plans[0];
  const cityName = nextTrip?.plan.destination.split(',')[0].trim() ?? '';

  useEffect(() => {
    if (!cityName) return;
    (async () => {
      const alias = GEO_ALIASES[cityName.toLowerCase()];
      let coords  = alias ? await geocodeOnce(alias) : null;
      if (!coords) coords = await geocodeOnce(cityName);
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
    if (!appPlanNotif)      notifs = notifs.filter(n => n.id.startsWith('weather-'));
    if (!appCommunityNotif) notifs = notifs.filter(n => !n.id.startsWith('community-'));
    if (!appUpdateNotif)    notifs = notifs.filter(n => !n.id.startsWith('update-'));
    return notifs;
  }, [plans, weather, todayStr, cityName, tempCelsius, appPlanNotif, appCommunityNotif, appUpdateNotif]);

  const notifications: AppNotification[] = useMemo(() =>
    allNotifications.filter(n => !dismissed.has(n.id)),
  [allNotifications, dismissed]);

  useEffect(() => {
    if (!pushEnabled || pushPermission !== 'granted') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const urgentPlan = plans.find(p => {
      const daysLeft = Math.ceil((new Date(p.onboardingData.startDate).getTime() - Date.now()) / 86_400_000);
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
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ── Başlık ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f8981d]/10 flex items-center justify-center">
              <Bell size={18} className="text-[#f8981d]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Bildirimler</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {notifications.length === 0
                  ? 'Her şey yolunda görünüyor'
                  : `${notifications.length} bildirim · ${urgentCount > 0 ? `${urgentCount} acil` : warningCount > 0 ? `${warningCount} uyarı` : 'hepsi bilgi'}`}
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-all"
            >
              <CheckCheck size={12} />
              Tümünü temizle
            </button>
          )}
        </div>

        {/* ── Boş durum ── */}
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-16 text-center">
            <div className="w-14 h-14 bg-[#f5f0e8] dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plane size={22} className="text-[#f8981d]" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">Yeni bildirim yok</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              Yaklaşan seyahat, bütçe veya hava durumu uyarıların burada görünecek.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60">
            {notifications.map((n, idx) => {
              const cfg = levelConfig[n.level];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors group ${idx === 0 ? '' : ''}`}
                >
                  {/* Sol renk şeridi */}
                  <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${cfg.bar}`} />

                  {/* İkon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.level === 'urgent'  ? 'bg-red-50 dark:bg-red-900/20' :
                    n.level === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                                           'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <Icon size={14} className={cfg.iconColor} />
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{n.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.body}</p>

                    {/* Aksiyon butonu */}
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#f8981d] hover:text-[#e08518] transition-colors"
                      >
                        {n.actionLabel}
                        <ExternalLink size={11} />
                      </a>
                    )}
                    {n.actionRoute && (
                      <Link
                        to={n.actionRoute}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#187fe7] hover:text-[#1060b0] transition-colors"
                      >
                        {n.actionLabel}
                      </Link>
                    )}
                  </div>

                  {/* Kapat */}
                  <button
                    onClick={() => dismiss(n.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 mt-1 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    aria-label="Kapat"
                  >
                    <X size={12} />
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
