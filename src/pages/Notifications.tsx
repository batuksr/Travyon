import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    bar:   'bg-accent',
    dot:   'bg-accent',
    badge: 'bg-accent-100 text-accent-700',
    icon:  AlertCircle,
    iconColor: 'text-accent',
  },
  warning: {
    bar:   'bg-amber-400',
    dot:   'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    icon:  AlertCircle,
    iconColor: 'text-amber-400',
  },
  info:    {
    bar:   'bg-sage',
    dot:   'bg-sage',
    badge: 'bg-sage-200 text-sage-700',
    icon:  Info,
    iconColor: 'text-sage',
  },
};

const Notifications: React.FC = () => {
  const { t } = useTranslation();
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

  // React Compiler bu memo'yu kendi optimizasyonuyla yeniden üretemiyor (notifs'in
  // sırayla filtrelenmesi nedeniyle) — normal useMemo olarak çalışmaya devam ediyor.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
        new Notification(
          daysLeft === 0 ? t('notifications.push.todayTitle', { dest }) : t('notifications.push.tomorrowTitle', { dest }),
          {
            body: daysLeft === 0 ? t('notifications.push.todayBody') : t('notifications.push.tomorrowBody'),
            icon: '/favicon.ico',
          }
        );
        sessionStorage.setItem('push-sent-' + urgentPlan.id, '1');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushEnabled, pushPermission]);

  const urgentCount  = notifications.filter(n => n.level === 'urgent').length;
  const warningCount = notifications.filter(n => n.level === 'warning').length;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        {/* ── Başlık ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-100 flex items-center justify-center">
              <Bell size={18} strokeWidth={2.5} className="text-accent" />
            </div>
            <div>
              <h1 className="font-heading text-xl text-text leading-none">{t('notifications.title')}</h1>
              <p className="text-xs text-muted mt-1">
                {notifications.length === 0
                  ? t('notifications.subtitle.empty')
                  : t('notifications.subtitle.count', {
                      count: notifications.length,
                      detail: urgentCount > 0
                        ? t('notifications.subtitle.urgentDetail', { count: urgentCount })
                        : warningCount > 0
                          ? t('notifications.subtitle.warningDetail', { count: warningCount })
                          : t('notifications.subtitle.infoDetail'),
                    })}
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-heading text-text hover:text-accent bg-surface border-[1.5px] border-divider rounded-full hover:shadow-sm transition-all"
            >
              <CheckCheck size={12} strokeWidth={2.5} />
              {t('notifications.clearAll')}
            </button>
          )}
        </div>

        {/* ── Boş durum ── */}
        {notifications.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-divider p-16 text-center">
            <div className="w-14 h-14 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plane size={22} strokeWidth={2.5} className="text-accent" />
            </div>
            <p className="font-heading text-text">{t('notifications.empty.title')}</p>
            <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-xs mx-auto">
              {t('notifications.empty.description')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => {
              const cfg = levelConfig[n.level];
              return (
                <div
                  key={n.id}
                  className="bg-surface border border-divider rounded-2xl px-5 py-4 flex gap-3.5 group"
                >
                  {/* Renk noktası */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-heading text-[15.5px] text-text leading-tight">{n.title}</h4>
                      <span className={`text-[10px] font-heading uppercase tracking-wide px-2.5 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                        {t(`notifications.levels.${n.level}`)}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-muted leading-relaxed mt-1.5">{n.body}</p>

                    {/* Aksiyon butonu */}
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-heading text-accent hover:text-accent-700 transition-colors"
                      >
                        {n.actionLabel}
                        <ExternalLink size={11} strokeWidth={2.5} />
                      </a>
                    )}
                    {n.actionRoute && (
                      <Link
                        to={n.actionRoute}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-heading text-sage-700 hover:brightness-90 transition-colors"
                      >
                        {n.actionLabel}
                      </Link>
                    )}
                  </div>

                  {/* Kapat */}
                  <button
                    onClick={() => dismiss(n.id)}
                    className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted hover:text-text transition-all text-base"
                    aria-label={t('notifications.close')}
                  >
                    <X size={16} strokeWidth={2.5} />
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
