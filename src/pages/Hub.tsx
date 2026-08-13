import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAppSettingsStore } from '../store/useAppSettingsStore';
import { CITIES } from '../data/cities';
import { Plane, MapPin, Wind, LayoutGrid, Wallet, Globe, Trophy,
         Shuffle, Sparkles, CalendarDays, ChevronRight, Zap,
         Clock, CheckCheck, FileText, Loader2 } from 'lucide-react';
import { relativeTime } from '../utils/timeUtils';
import {
  getMySharedPlanIds,
  shareplan, unshareplan,
} from '../services/socialService';
import { AiAssistantWidget } from '../components/AiAssistantWidget';

const LIBRARIES: ('places')[] = ['places'];

/* ── Greeting ── */
const getGreeting = (t: TFunction): { text: string; emoji: string } => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: t('hub.greeting.morning'),   emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: t('hub.greeting.afternoon'), emoji: '🌤️' };
  if (h >= 18 && h < 22) return { text: t('hub.greeting.evening'),   emoji: '🌆' };
  return                         { text: t('hub.greeting.night'),     emoji: '🌙' };
};

/* ── Weather helpers (open-meteo WMO codes) ── */
const weatherIcon = (code: number) => {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
};
const weatherLabel = (code: number, t: TFunction) => {
  if (code === 0) return t('hub.weather.conditions.clear');
  if (code === 1) return t('hub.weather.conditions.mostlyClear');
  if (code === 2) return t('hub.weather.conditions.partlyCloudy');
  if (code === 3) return t('hub.weather.conditions.overcast');
  if ([45, 48].includes(code)) return t('hub.weather.conditions.fog');
  if ([51, 53, 55, 56, 57].includes(code)) return t('hub.weather.conditions.drizzle');
  if ([61, 63, 65, 66, 67].includes(code)) return t('hub.weather.conditions.rain');
  if ([80, 81, 82].includes(code)) return t('hub.weather.conditions.showers');
  if ([71, 73, 75, 77, 85, 86].includes(code)) return t('hub.weather.conditions.snow');
  if ([95, 96, 99].includes(code)) return t('hub.weather.conditions.storm');
  return t('hub.weather.conditions.variable');
};

/* ── Country flag ── */
const getCountryFlag = (country: string): string => {
  const map: Record<string, string> = {
    'türkiye': '🇹🇷', 'italya': '🇮🇹', 'fransa': '🇫🇷', 'ispanya': '🇪🇸',
    'ingiltere': '🇬🇧', 'hollanda': '🇳🇱', 'almanya': '🇩🇪', 'japonya': '🇯🇵',
    'abd': '🇺🇸', 'yunanistan': '🇬🇷', 'portekiz': '🇵🇹', 'isveç': '🇸🇪',
    'norveç': '🇳🇴', 'danimarka': '🇩🇰', 'finlandiya': '🇫🇮', 'avustralya': '🇦🇺',
    'çin': '🇨🇳', 'hindistan': '🇮🇳', 'bae': '🇦🇪', 'mısır': '🇪🇬',
    'brezilya': '🇧🇷', 'arjantin': '🇦🇷', 'meksika': '🇲🇽', 'kanada': '🇨🇦',
    'avusturya': '🇦🇹', 'isviçre': '🇨🇭', 'belçika': '🇧🇪', 'polonya': '🇵🇱',
    'çekya': '🇨🇿', 'macaristan': '🇭🇺', 'hırvatistan': '🇭🇷', 'güney kore': '🇰🇷',
    'tayland': '🇹🇭', 'endonezya': '🇮🇩', 'malezya': '🇲🇾', 'vietnam': '🇻🇳',
    'singapur': '🇸🇬', 'hong kong': '🇭🇰', 'tayvan': '🇹🇼', 'fas': '🇲🇦',
    'güney afrika': '🇿🇦', 'kenya': '🇰🇪', 'peru': '🇵🇪', 'kolombiya': '🇨🇴',
    'şili': '🇨🇱', 'küba': '🇨🇺', 'ürdün': '🇯🇴', 'suudi arabistan': '🇸🇦',
    'katar': '🇶🇦', 'umman': '🇴🇲', 'lübnan': '🇱🇧', 'gürcistan': '🇬🇪',
    'azerbaycan': '🇦🇿', 'ermenistan': '🇦🇲', 'kazakistan': '🇰🇿', 'özbekistan': '🇺🇿',
    'sırbistan': '🇷🇸', 'romanya': '🇷🇴', 'bulgaristan': '🇧🇬', 'slovakya': '🇸🇰',
    'slovenya': '🇸🇮', 'estonya': '🇪🇪', 'letonya': '🇱🇻', 'litvanya': '🇱🇹',
    'irlanda': '🇮🇪', 'izlanda': '🇮🇸', 'yeni zelanda': '🇳🇿', 'maldivler': '🇲🇻',
  };
  return map[country.toLowerCase().trim()] ?? '🌍';
};

/* ── Gamification ── */
type GamificationLevel = {
  label: string; icon: string; color: string;
  bg: string; border: string; minCities: number; maxCities: number;
};
const LEVELS: GamificationLevel[] = [
  { label: 'Yeni Gezgin', icon: '🌱', color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200', minCities: 0,  maxCities: 1  },
  { label: 'Kaşif',       icon: '🗺️', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', minCities: 1,  maxCities: 3  },
  { label: 'Gezgin',      icon: '✈️', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',   minCities: 3,  maxCities: 6  },
  { label: 'Seyyah',      icon: '⭐', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  minCities: 6,  maxCities: 11 },
  { label: 'Dünya Gezgini', icon: '🏆', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', minCities: 11, maxCities: 20 },
  { label: 'Efsane',      icon: '👑', color: 'text-accent',  bg: 'bg-accent-100', border: 'border-accent/30', minCities: 20, maxCities: 999 },
];

const getLevel = (cityCount: number): GamificationLevel =>
  [...LEVELS].reverse().find(l => cityCount >= l.minCities) ?? LEVELS[0];

/* ── Map styles — Light ── */
const WORLD_MAP_STYLES_LIGHT = [
  { featureType: 'all' as const,       elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'water' as const,      stylers: [{ color: '#dbeafe' }] },
  { featureType: 'landscape' as const,  stylers: [{ color: '#f8fafc' }] },
  { featureType: 'road' as const,       stylers: [{ visibility: 'off' }] },
  { featureType: 'poi' as const,        stylers: [{ visibility: 'off' }] },
  { featureType: 'transit' as const,    stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative' as const, elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }, { weight: 0.8 }] },
];

/* ── Map styles — Dark ── */
const WORLD_MAP_STYLES_DARK = [
  { featureType: 'all' as const,        elementType: 'labels.text.fill',   stylers: [{ color: '#64748b' }] },
  { featureType: 'all' as const,        elementType: 'labels.text.stroke',  stylers: [{ color: '#0f172a' }] },
  { featureType: 'water' as const,       stylers: [{ color: '#0f2744' }] },
  { featureType: 'landscape' as const,   stylers: [{ color: '#1e293b' }] },
  { featureType: 'road' as const,        stylers: [{ visibility: 'off' }] },
  { featureType: 'poi' as const,         stylers: [{ visibility: 'off' }] },
  { featureType: 'transit' as const,     stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative' as const, elementType: 'geometry.stroke', stylers: [{ color: '#334155' }, { weight: 0.8 }] },
];

const BASE_MAP_OPTIONS = {
  disableDefaultUI: true,
  scrollwheel: true,
  draggable: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
};

const MAP_INIT_CENTER = { lat: 30, lng: 20 };
const MAP_INIT_ZOOM   = 2;

interface WeatherData { temp: number; code: number; windspeed: number }
interface DestPin { lat: number; lng: number; name: string }

/* ═══════════════════════════════════════════════
   HUB
════════════════════════════════════════════════ */

/* ── Activity types ── */
interface ActivityItem {
  id:          string;
  type:        'created' | 'upcoming' | 'active' | 'completed';
  planId:      string;
  destination: string;
  text:        string;
  sub:         string;
  timeLabel:   string;
  sortKey:     number;
}


/* ── Vibe options ── */
const VIBE_OPTIONS = [
  { val: 'culture',   emoji: '🏛️', labelKey: 'culture'   },
  { val: 'relax',     emoji: '😴', labelKey: 'relax'     },
  { val: 'nightlife', emoji: '🌙', labelKey: 'nightlife' },
  { val: 'nature',    emoji: '🏔️', labelKey: 'nature'    },
] as const;

/* ══════════════════════════════════════════════
   HUB
═══════════════════════════════════════════════ */
const Hub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const localeCode = i18n.language === 'en' ? 'en-US' : 'tr-TR';
  const navigate   = useNavigate();
  const { user }   = useAuthStore();
  const plans      = useUserPlans();
  const { resetForm, updateData } = useOnboardingStore();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [weather, setWeather]               = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [mapInstance, setMapInstance]       = useState<google.maps.Map | null>(null);
  const [hoveredPin, setHoveredPin]         = useState<string | null>(null);
  const [selectedPin, setSelectedPin]       = useState<DestPin | null>(null);
  const { dark } = useThemeStore();
  const { tempCelsius, distanceKm: distKm } = useAppSettingsStore();

  /* Birim yardımcıları */
  const displayTemp  = (c: number) => tempCelsius ? `${c}°C` : `${Math.round(c * 9 / 5 + 32)}°F`;
  const displayWind  = (kmh: number) => distKm ? `${kmh} ${t('hub.units.kmh')}` : `${Math.round(kmh * 0.621371)} mph`;

  /* ── Social state (paylaş butonu için) ── */
  const [sharedPlanIds, setSharedPlanIds] = useState<Set<string>>(new Set());
  const [savingShare, setSavingShare]     = useState<string | null>(null);
  const [shareError, setShareError]       = useState<string | null>(null);

  /* Timeout yardımcısı */
  const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  /* Shared plan IDs yükle */
  useEffect(() => {
    if (!user) return;
    getMySharedPlanIds(user.uid).then(s => setSharedPlanIds(s)).catch(() => {});
  }, [user]);

  /* Paylaş / geri al */
  const { plansPublic } = useAppSettingsStore();

  const handleShare = useCallback(async (planId: string) => {
    if (!user) return;
    // Gizlilik kontrolü — sadece geri almaya izin ver
    if (!plansPublic && !sharedPlanIds.has(planId)) {
      setShareError(t('hub.shareErrors.privacyDisabled'));
      setTimeout(() => setShareError(null), 4000);
      return;
    }
    setSavingShare(planId);
    setShareError(null);
    try {
      if (sharedPlanIds.has(planId)) {
        await withTimeout(unshareplan(planId));
        setSharedPlanIds(prev => { const n = new Set(prev); n.delete(planId); return n; });
      } else {
        const savedPlan = plans.find(p => p.id === planId);
        if (!savedPlan) return;
        await withTimeout(
          shareplan(planId, savedPlan.plan, savedPlan.onboardingData, {
            uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
          })
        );
        setSharedPlanIds(prev => new Set([...prev, planId]));
      }
    } catch {
      setShareError(t('hub.shareErrors.failed'));
      setTimeout(() => setShareError(null), 3000);
    } finally {
      setSavingShare(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sharedPlanIds, plans, plansPublic]);

  /* ── Quick Actions state ── */
  type RandState = 'idle' | 'spinning' | 'revealed';
  const [randState, setRandState]     = useState<RandState>('idle');
  const [randCity, setRandCity]       = useState<{ city: string; country: string } | null>(null);
  const [displayCity, setDisplayCity] = useState('');
  const [showVibe, setShowVibe]           = useState(false);
  const [activitiesShowAll, setActivitiesShowAll] = useState(false);
  const spinRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFitRef     = useRef(false);

  useEffect(() => () => { if (spinRef.current) clearInterval(spinRef.current); }, []);

  /* ── Next weekend dates ── */
  const nextWeekend = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const toSat = day === 6 ? 7 : (6 - day);
    const sat = new Date(now); sat.setDate(now.getDate() + toSat);
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return {
      startDate: sat.toISOString().split('T')[0],
      endDate:   sun.toISOString().split('T')[0],
      label: `${sat.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString(localeCode, { day: 'numeric', month: 'short' })}`,
    };
  }, [localeCode]);

  /* ── Avg budget from past plans ── */
  const avgBudget = useMemo(() => {
    if (!plans.length) return { amount: 15000, symbol: '₺', code: 'TRY' };
    const tryPlans = plans.filter(p => (p.onboardingData.currencyCode ?? 'TRY') === 'TRY');
    const src = tryPlans.length ? tryPlans : plans;
    const avg = Math.round(src.reduce((s, p) => s + p.onboardingData.budget, 0) / src.length / 1000) * 1000;
    return { amount: avg, symbol: src[0].onboardingData.currencySymbol ?? '₺', code: src[0].onboardingData.currencyCode ?? 'TRY' };
  }, [plans]);

  const fmtNumber = useCallback((n: number) => n.toLocaleString(localeCode), [localeCode]);

  /* ── Quick Action handlers ── */
  const handleWeekend = () => {
    resetForm();
    updateData({ startDate: nextWeekend.startDate, endDate: nextWeekend.endDate });
    navigate('/onboarding');
  };

  const handleRandomCity = () => {
    if (randState === 'spinning') return;
    const final = CITIES[Math.floor(Math.random() * CITIES.length)];
    setRandState('spinning');
    let count = 0;
    spinRef.current = setInterval(() => {
      setDisplayCity(CITIES[Math.floor(Math.random() * CITIES.length)].city);
      count++;
      if (count >= 20) {
        clearInterval(spinRef.current!);
        setDisplayCity(final.city);
        setRandCity(final);
        setRandState('revealed');
      }
    }, 70);
  };

  const handleGoRandom = () => {
    if (!randCity) return;
    resetForm();
    updateData({ destination: `${randCity.city}, ${randCity.country}` });
    navigate('/onboarding');
  };

  const handleBudget = () => {
    resetForm();
    updateData({ budget: avgBudget.amount, currencyCode: avgBudget.code, currencySymbol: avgBudget.symbol });
    navigate('/onboarding');
  };

  const handleVibe = (vibe: string) => {
    const last = plans[0];
    if (!last) return;
    resetForm();
    updateData({
      destination:          last.plan.destination,
      startDate:            last.onboardingData.startDate,
      endDate:              last.onboardingData.endDate,
      budget:               last.onboardingData.budget,
      currencyCode:         last.onboardingData.currencyCode ?? 'TRY',
      currencySymbol:       last.onboardingData.currencySymbol ?? '₺',
      peopleCount:          last.onboardingData.peopleCount,
      tripPurpose:          vibe,
    });
    navigate('/onboarding');
  };


  /* ── Activity feed ── */
  const activities = useMemo((): ActivityItem[] => {
    const now      = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    return plans.slice(0, 12).map((p): ActivityItem => {
      const dest     = p.plan.destination.split(',')[0].trim();
      const startTs  = new Date(p.onboardingData.startDate).getTime();
      const endTs    = new Date(p.onboardingData.endDate).getTime() + 86_399_999; // end of day
      const daysUntil = Math.ceil((startTs - now) / 86_400_000);
      const daysSinceEnd = Math.floor((now - endTs) / 86_400_000);
      const nights    = p.plan.dailyPlans.length;
      const budget    = `${p.onboardingData.currencySymbol ?? '₺'}${fmtNumber(p.onboardingData.budget)}`;

      /* Currently traveling */
      if (p.onboardingData.startDate <= todayStr && p.onboardingData.endDate >= todayStr) {
        return {
          id: p.id + '-active', type: 'active', planId: p.id, destination: dest,
          text: t('hub.activity.active.text', { dest }),
          sub: t('hub.activity.active.sub', { endDate: p.onboardingData.endDate }),
          timeLabel: t('hub.activity.active.timeLabel'),
          sortKey: now + 9e15,
        };
      }

      /* Upcoming trip */
      if (p.onboardingData.startDate > todayStr) {
        const countdown = daysUntil <= 0 ? t('hub.activity.upcoming.today') : daysUntil === 1 ? t('hub.activity.upcoming.tomorrow') : t('hub.activity.upcoming.daysLeft', { count: daysUntil });
        return {
          id: p.id + '-upcoming', type: 'upcoming', planId: p.id, destination: dest,
          text: t('hub.activity.upcoming.text', { dest }),
          sub: t('hub.activity.upcoming.sub', { nights, budget, startDate: p.onboardingData.startDate }),
          timeLabel: countdown,
          sortKey: now - daysUntil * 86_400_000 + 8e15,
        };
      }

      /* Completed (within 90 days) */
      if (daysSinceEnd >= 0 && daysSinceEnd <= 90) {
        return {
          id: p.id + '-done', type: 'completed', planId: p.id, destination: dest,
          text: t('hub.activity.completed.text', { dest }),
          sub: t('hub.activity.completed.sub', { nights, budget }),
          timeLabel: relativeTime(endTs),
          sortKey: endTs,
        };
      }

      /* Default: plan created */
      return {
        id: p.id + '-created', type: 'created', planId: p.id, destination: dest,
        text: t('hub.activity.created.text', { dest }),
        sub: t('hub.activity.created.sub', { nights, budget }),
        timeLabel: relativeTime(p.createdAt),
        sortKey: p.createdAt,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 5);
  }, [plans, fmtNumber, t]);

  const firstName = user?.displayName?.split(' ')[0] ?? t('hub.greeting.defaultName');
  const greeting  = getGreeting(t);
  const todayStr  = new Date().toISOString().split('T')[0];

  const onMapLoad = useCallback((m: google.maps.Map) => {
    setMapInstance(m);
  }, []);
  const onMapUnmount = useCallback(() => { setMapInstance(null); hasFitRef.current = false; }, []);

  /* ── Next trip ── */
  const nextTrip = plans
    .filter(p => p.onboardingData.startDate > todayStr)
    .sort((a, b) => a.onboardingData.startDate.localeCompare(b.onboardingData.startDate))[0]
    ?? plans[0];
  const daysUntil = nextTrip
    ? Math.ceil((new Date(nextTrip.onboardingData.startDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const isFuture  = daysUntil !== null && daysUntil > 0;
  const cityName  = nextTrip?.plan.destination.split(',')[0].trim() ?? '';

  /* ── Countdown progress ── */
  const tripDuration = nextTrip
    ? Math.round((new Date(nextTrip.onboardingData.endDate).getTime() - new Date(nextTrip.onboardingData.startDate).getTime()) / 86_400_000)
    : 0;
  const _createdMs  = nextTrip?.createdAt ? new Date(nextTrip.createdAt).getTime() : null;
  const _startMs    = nextTrip ? new Date(nextTrip.onboardingData.startDate).getTime() : null;
  const totalCountdownDays = (_createdMs && _startMs)
    ? Math.max(1, Math.round((_startMs - _createdMs) / 86_400_000))
    : null;
  const elapsedDays = _createdMs
    ? Math.max(0, Math.round((Date.now() - _createdMs) / 86_400_000))
    : 0;
  const countdownProgressPct = totalCountdownDays
    ? Math.min(100, Math.max(4, (elapsedDays / totalCountdownDays) * 100))
    : 50;

  /* ── Stats + Pins ── */
  const { stats, destPins } = useMemo(() => {
    const now        = new Date();
    const today      = now.toISOString().split('T')[0];
    const thisMonth  = now.getMonth();
    const thisYear   = now.getFullYear();
    const thisMonthCount = plans.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const getCountry = (dest: string) =>
      dest.includes(',') ? dest.split(',').slice(1).join(',').trim() : '';
    const getCityRaw = (dest: string) => dest.split(',')[0].trim();

    // Sadece tamamlanmış seyahatler (bitiş tarihi bugünden önce)
    const visitedPlans = plans.filter(p => p.onboardingData.endDate < today);

    const uniqueCities    = new Set(visitedPlans.map(p => getCityRaw(p.plan.destination))).size;
    const allCountries    = visitedPlans.map(p => getCountry(p.plan.destination)).filter(Boolean);
    const uniqueCountries = new Set(allCountries).size;
    const countryCounts: Record<string, number> = {};
    allCountries.forEach(c => { countryCounts[c] = (countryCounts[c] ?? 0) + 1; });
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const uniqueFlags  = [...new Set(allCountries)].slice(0, 8).map(c => ({ name: c, flag: getCountryFlag(c) }));
    const budgetMap: Record<string, { symbol: string; total: number }> = {};
    visitedPlans.forEach(p => {
      const code = p.onboardingData.currencyCode ?? 'TRY';
      const sym  = p.onboardingData.currencySymbol ?? '₺';
      if (!budgetMap[code]) budgetMap[code] = { symbol: sym, total: 0 };
      budgetMap[code].total += p.onboardingData.budget;
    });
    const budgets = Object.entries(budgetMap).sort((a, b) => b[1].total - a[1].total).slice(0, 3);

    /* Destination pins — sadece tamamlanmış seyahatler (centroid, deduplicated) */
    const seen = new Set<string>();
    const pins: DestPin[] = [];
    visitedPlans.forEach(p => {
      const activities = p.plan.dailyPlans.flatMap(d => d.activities);
      if (!activities.length) return;
      const lat = activities.reduce((s, a) => s + a.coordinates.lat, 0) / activities.length;
      const lng = activities.reduce((s, a) => s + a.coordinates.lng, 0) / activities.length;
      if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return;
      const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
      if (seen.has(key)) return;
      seen.add(key);
      pins.push({ lat, lng, name: getCityRaw(p.plan.destination) });
    });

    return {
      stats: { thisMonthCount, uniqueCities, uniqueCountries, topCountries, uniqueFlags, budgets },
      destPins: pins,
    };
  }, [plans]);

  const currentLevel = getLevel(stats.uniqueCities);
  const nextLevel    = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  // progress: level ilerlemesi (UI'da şimdilik kullanılmıyor)
  void (nextLevel
    ? Math.min(100, ((stats.uniqueCities - currentLevel.minCities) / (nextLevel.minCities - currentLevel.minCities)) * 100)
    : 100);

  /* ── Weather ── */

  // Bölge adı → geocode edilebilir şehir eşlemeleri
  const GEO_ALIASES: Record<string, string> = {
    'kapadokya':   'Nevşehir',
    'cappadocia':  'Nevşehir',
    'barselona':   'Barcelona',
    'londra':      'London',
    'münih':       'Munich',
    'viyana':      'Vienna',
    'varşova':     'Warsaw',
    'brüksel':     'Brussels',
    'lizbon':      'Lisbon',
    'kopenhag':    'Copenhagen',
    'stokholm':    'Stockholm',
    'amsterdam':   'Amsterdam',
    'dubai':       'Dubai',
    'new york':    'New York',
    'los angeles': 'Los Angeles',
    'şikago':      'Chicago',
    'moskova':     'Moscow',
    'pekin':       'Beijing',
    'şangay':      'Shanghai',
    'singapur':    'Singapore',
    'bangkok':     'Bangkok',
    'maldivler':   'Malé',
    'pamukkale':   'Denizli',
    'efes':        'Selçuk',
    'şirince':     'Selçuk',
    'ölüdeniz':    'Fethiye',
    'olimpos':     'Kemer',
    'dalyan':      'Ortaca',
    'safranbolu':  'Safranbolu',
    'ayder':       'Rize',
    'nemrut':      'Adıyaman',
    'ani':         'Kars',
    'hasankeyf':   'Batman',
    'mount fuji':  'Fujiyoshida',
    'bali':        'Denpasar',
    'santorini':   'Fira',
    'mykonos':     'Mykonos',
    'tuscany':     'Floransa',
    'toskana':     'Floransa',
    'provence':    'Marseille',
    'algarve':     'Faro',
    'amalfi':      'Salerno',
    'corsica':     'Ajaccio',
    'sardinia':    'Cagliari',
    'sicily':      'Palermo',
    'sicilya':     'Palermo',
  };

  useEffect(() => {
    if (!cityName) return;
    setWeatherLoading(true);
    setWeather(null);

    (async () => {
      try {
        const alias      = GEO_ALIASES[cityName.toLowerCase()];
        const candidates = [alias, cityName, nextTrip?.plan.destination?.split(',')[0]]
          .filter(Boolean) as string[];

        for (const candidate of candidates) {
          try {
            // 1) Şehri koordinata çevir (open-meteo geocoding — ücretsiz, güvenilir)
            const geoRes = await withTimeout(
              fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=${i18n.language}&format=json`),
              8000,
            );
            if (!geoRes.ok) continue;
            const geoData = await geoRes.json();
            const place   = geoData?.results?.[0];
            if (!place) continue;

            // 2) Güncel hava durumunu al
            const wRes = await withTimeout(
              fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`),
              8000,
            );
            if (!wRes.ok) continue;
            const wData = await wRes.json();
            const cur   = wData?.current_weather;
            if (cur) {
              setWeather({
                temp:      Math.round(cur.temperature),
                code:      cur.weathercode,
                windspeed: Math.round(cur.windspeed),
              });
              return;
            }
          } catch { continue; }
        }
      } catch { /* sessizce */ }
      finally { setWeatherLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]);

  /* Dark mode değişince harita stilini güncelle */
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.setOptions({ styles: dark ? WORLD_MAP_STYLES_DARK : WORLD_MAP_STYLES_LIGHT });
  }, [dark, mapInstance]);

  /* FitBounds — mapInstance hazır olunca sadece bir kez çalışır */
  useEffect(() => {
    if (!mapInstance || !isLoaded || destPins.length === 0) return;
    if (hasFitRef.current) return;
    hasFitRef.current = true;

    if (destPins.length === 1) {
      mapInstance.setCenter({ lat: destPins[0].lat, lng: destPins[0].lng });
      mapInstance.setZoom(5);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    destPins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapInstance.fitBounds(bounds, 60);
    const listener = window.google.maps.event.addListener(mapInstance, 'idle', () => {
      if ((mapInstance.getZoom() ?? 0) > 10) mapInstance.setZoom(10);
      window.google.maps.event.removeListener(listener);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance]);

  const maxCount = stats.topCountries[0]?.[1] ?? 1;

  /* Harita pin rengi — terracotta accent (dark/light için sabit ton) */
  const pinColor      = dark ? '#e08a4f' : '#c67139';
  const pinColorActive = dark ? '#f0b184' : '#8c491a';

  return (
    <>
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 sm:pl-12 py-6 sm:py-10">

        {/* ── Greeting ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted text-sm mb-1">
                {new Date().toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl leading-none">{greeting.emoji}</span>
                <h1 className="font-heading text-2xl md:text-3xl text-text leading-tight">
                  {greeting.text}, <span className="text-accent">{firstName}!</span>
                </h1>
              </div>
            </div>

          </div>
        </div>

        {/* ── Next Trip + Weather ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {nextTrip ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-accent to-accent-700 rounded-3xl p-6 text-white shadow-[0_18px_40px_rgba(198,113,57,0.3)]">
              <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute right-4 -bottom-14 w-44 h-44 bg-white/8 rounded-full pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full gap-4">
                <div className="flex items-center gap-2">
                  <Plane size={14} className="text-white/75" />
                  <span className="text-white/75 text-[11px] font-heading uppercase tracking-widest">
                    {isFuture ? t('hub.nextTrip.next') : t('hub.nextTrip.last')}
                  </span>
                </div>
                <div>
                  <h2 className="font-heading text-2xl leading-tight">{nextTrip.plan.destination}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={12} className="text-white/70" />
                    <p className="text-white/70 text-sm">{nextTrip.onboardingData.startDate} → {nextTrip.onboardingData.endDate}</p>
                  </div>
                </div>
                {isFuture ? (
                  <div className="mt-auto space-y-3">
                    {/* Gün sayacı */}
                    <div className="flex items-end gap-3">
                      <span className="font-heading text-5xl leading-none">{daysUntil}</span>
                      <div className="pb-1 space-y-0.5">
                        <span className="text-white/90 font-semibold text-sm block">{t('hub.nextTrip.daysLeft')}</span>
                        {tripDuration > 0 && (
                          <span className="text-white/60 text-xs">{t('hub.nextTrip.durationDays', { count: tripDuration })}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{ width: `${countdownProgressPct}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>

                    {/* Checklist linki */}
                    <button
                      onClick={() => navigate('/travel-checklist')}
                      className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center justify-between text-sm font-semibold transition-all duration-200"
                    >
                      <span>{t('hub.nextTrip.checklist')}</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5 inline-flex items-center gap-2 self-start">
                    <span className="text-sm font-semibold">{t('hub.nextTrip.lastSaved')}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-divider rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
              <div className="w-14 h-14 bg-accent-100 rounded-2xl flex items-center justify-center">
                <Plane size={24} className="text-accent" />
              </div>
              <div>
                <p className="font-heading text-text">{t('hub.nextTrip.noPlanTitle')}</p>
                <p className="text-muted text-sm mt-0.5">{t('hub.nextTrip.noPlanSubtitle')}</p>
              </div>
            </div>
          )}

          {nextTrip && (
            <div className="relative overflow-hidden bg-surface border border-divider rounded-3xl p-6">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-surface-2 rounded-full pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <span className="text-muted text-[11px] font-heading uppercase tracking-widest mb-1">{t('hub.weather.title')}</span>
                <div className="flex items-center gap-1.5 mb-4">
                  <MapPin size={12} className="text-accent" />
                  <span className="text-text text-sm font-heading">{cityName}</span>
                </div>
                {weatherLoading ? (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 bg-surface-2 rounded-2xl animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-7 w-20 bg-surface-2 rounded-lg animate-pulse" />
                      <div className="h-4 w-28 bg-surface-2 rounded animate-pulse" />
                    </div>
                  </div>
                ) : weather ? (
                  <div className="flex items-end gap-5 mt-auto">
                    <span className="text-7xl leading-none select-none">{weatherIcon(weather.code)}</span>
                    <div>
                      <p className="font-heading text-5xl text-text leading-none">{displayTemp(weather.temp)}</p>
                      <p className="text-muted text-sm font-medium mt-1">{weatherLabel(weather.code, t)}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Wind size={11} className="text-muted" />
                        <span className="text-muted text-xs">{displayWind(weather.windspeed)} {t('hub.weather.wind')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-2">
                    <p className="text-muted text-sm">{t('hub.weather.loadFailed')}</p>
                    <button
                      onClick={() => {
                        if (!cityName) return;
                        setWeather(null);
                        setWeatherLoading(true);
                        const alias      = GEO_ALIASES[cityName.toLowerCase()];
                        const candidates = [alias, cityName, nextTrip?.plan.destination]
                          .filter(Boolean) as string[];
                        (async () => {
                          try {
                            for (const candidate of candidates) {
                              try {
                                const res = await withTimeout(
                                  fetch(`https://wttr.in/${encodeURIComponent(candidate)}?format=j1`),
                                  8000,
                                );
                                if (!res.ok) continue;
                                const data = await res.json();
                                const cur  = data?.current_condition?.[0];
                                if (cur) {
                                  setWeather({
                                    temp:      parseInt(cur.temp_C,        10),
                                    code:      parseInt(cur.weatherCode,   10),
                                    windspeed: parseInt(cur.windspeedKmph, 10),
                                  });
                                  return;
                                }
                              } catch { continue; }
                            }
                          } catch { /* sessizce */ }
                          finally { setWeatherLoading(false); }
                        })();
                      }}
                      className="text-xs font-heading text-accent hover:text-accent-700 transition-colors self-start"
                    >
                      {t('hub.weather.retry')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Hızlı Eylemler ── */}
        <div className="mb-8">
          <p className="text-xs font-heading text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap size={12} /> {t('hub.quickActions.title')}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* ① Bu hafta sonu */}
            <button
              onClick={handleWeekend}
              className="group bg-surface border border-divider hover:border-accent/40 hover:shadow-md rounded-2xl p-4 text-left transition-all duration-200"
            >
              <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center mb-3">
                <CalendarDays size={15} className="text-accent" />
              </div>
              <p className="text-sm font-heading text-text mb-0.5">{t('hub.quickActions.weekend.title')}</p>
              <p className="text-xs text-muted mb-3">{nextWeekend.label}</p>
              <span className="text-xs font-heading text-accent flex items-center gap-0.5">
                {t('hub.quickActions.weekend.cta')} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* ② Rastgele şehir */}
            <div
              onClick={randState === 'revealed' ? undefined : handleRandomCity}
              className={`group bg-surface border border-divider hover:border-divider hover:shadow-md rounded-2xl p-4 transition-all duration-200 ${randState !== 'revealed' ? 'cursor-pointer' : ''}`}
            >
              <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center mb-3">
                <Shuffle size={15} className="text-muted" />
              </div>
              <p className="text-sm font-heading text-text mb-0.5">{t('hub.quickActions.random.title')}</p>

              {randState === 'idle' && (
                <>
                  <p className="text-xs text-muted mb-3">{t('hub.quickActions.random.subtitle')}</p>
                  <span className="text-xs font-heading text-muted flex items-center gap-0.5 group-hover:text-text transition-colors">
                    {t('hub.quickActions.random.cta')} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </>
              )}
              {randState === 'spinning' && (
                <p className="text-sm font-heading text-text animate-pulse mt-1 tabular-nums">{displayCity}</p>
              )}
              {randState === 'revealed' && randCity && (
                <div className="mt-1">
                  <p className="text-sm font-heading text-text leading-tight">{randCity.city}</p>
                  <p className="text-xs text-muted mb-2">{randCity.country}</p>
                  <div className="flex gap-1.5">
                    <button onClick={handleGoRandom} className="text-xs font-heading bg-accent text-white px-2.5 py-1 rounded-full hover:brightness-105 transition-all">
                      {t('hub.quickActions.random.planCta')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRandState('idle'); setRandCity(null); setDisplayCity(''); }}
                      className="text-xs font-heading text-muted px-2 py-1 rounded-full border border-divider hover:bg-surface-2 transition-colors"
                    >↺</button>
                  </div>
                </div>
              )}
            </div>

            {/* ③ Bütçeme göre */}
            <button
              onClick={handleBudget}
              className="group bg-surface border border-divider hover:border-emerald-200 hover:shadow-md rounded-2xl p-4 text-left transition-all duration-200"
            >
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                <Wallet size={15} className="text-emerald-600" />
              </div>
              <p className="text-sm font-heading text-text mb-0.5">{t('hub.quickActions.budget.title')}</p>
              <p className="text-xs text-muted mb-3">
                {plans.length > 0 ? avgBudget.symbol + fmtNumber(avgBudget.amount) : t('hub.quickActions.budget.defaultLabel')}
              </p>
              <span className="text-xs font-heading text-emerald-600 flex items-center gap-0.5">
                {t('hub.quickActions.budget.cta')} <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* ④ Vibe değiştir */}
            <div
              className={`bg-surface border border-divider hover:border-violet-200 hover:shadow-md rounded-2xl p-4 transition-all duration-200 ${plans.length > 0 ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => plans.length > 0 && setShowVibe(v => !v)}
            >
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center mb-3">
                <Sparkles size={15} className="text-violet-500" />
              </div>
              <p className="text-sm font-heading text-text mb-0.5">{t('hub.quickActions.vibe.title')}</p>
              {!showVibe ? (
                <>
                  <p className="text-xs text-muted mb-3">
                    {plans.length > 0 ? `"${plans[0].plan.destination.split(',')[0]}"` : t('hub.quickActions.vibe.noPlan')}
                  </p>
                  <span className="text-xs font-heading text-violet-500 flex items-center gap-0.5">
                    {t('hub.quickActions.vibe.cta')} <ChevronRight size={11} />
                  </span>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {VIBE_OPTIONS.map(v => (
                    <button
                      key={v.val}
                      onClick={(e) => { e.stopPropagation(); handleVibe(v.val); }}
                      className="flex items-center gap-1 bg-surface-2 hover:bg-violet-50 border border-divider hover:border-violet-200 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-text transition-colors"
                    >
                      <span>{v.emoji}</span><span>{t(`hub.vibeOptions.${v.labelKey}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>


        {/* ── İstatistikler ── */}
        {plans.length > 0 && (
          <>
            <p className="text-xs font-heading text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <LayoutGrid size={12} /> {t('hub.stats.title')}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {/* Toplam Plan */}
              <div className="bg-surface border border-divider rounded-3xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 bg-accent-100 rounded-xl flex items-center justify-center">
                    <LayoutGrid size={16} className="text-accent" />
                  </div>
                  {stats.thisMonthCount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      {t('hub.stats.thisMonth', { count: stats.thisMonthCount })}
                    </span>
                  )}
                </div>
                <p className="font-heading text-2xl text-text leading-none">{plans.length}</p>
                <p className="text-muted text-xs mt-1">{t('hub.stats.totalPlans')}</p>
              </div>

              {/* Şehir & Ülke */}
              <div className="bg-surface border border-divider rounded-3xl p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Globe size={16} className="text-blue-500" />
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <p className="font-heading text-2xl text-text leading-none">{stats.uniqueCities}</p>
                  <span className="text-muted text-xs">{t('hub.stats.city')}</span>
                </div>
                <p className="text-muted text-xs mb-3">{t('hub.stats.differentCountries', { count: stats.uniqueCountries })}</p>
                {stats.uniqueFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {stats.uniqueFlags.map(f => (
                      <span key={f.name} title={f.name} className="text-base leading-none">{f.flag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Toplam Bütçe */}
              <div className="bg-surface border border-divider rounded-3xl p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                  <Wallet size={16} className="text-violet-500" />
                </div>
                <p className="text-[10px] font-heading text-muted uppercase tracking-widest mb-2">{t('hub.stats.totalBudget')}</p>
                <div className="space-y-1.5">
                  {stats.budgets.map(([code, { symbol, total }]) => (
                    <div key={code} className="flex items-baseline gap-1">
                      <span className="font-heading text-base text-text leading-none">{symbol}{fmtNumber(total)}</span>
                      <span className="text-muted text-[10px]">{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* En Çok Gezilen */}
              <div className="bg-surface border border-divider rounded-3xl p-5 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <Trophy size={16} className="text-amber-500" />
                </div>
                <p className="text-[10px] font-heading text-muted uppercase tracking-widest mb-3">{t('hub.stats.mostVisited')}</p>
                {stats.topCountries.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topCountries.map(([country, count], i) => (
                      <div key={country}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm leading-none">{getCountryFlag(country)}</span>
                            <span className={`text-xs font-semibold truncate max-w-[80px] ${i === 0 ? 'text-text' : 'text-muted'}`}>{country}</span>
                          </div>
                          <span className="text-[10px] text-muted font-bold">{count}</span>
                        </div>
                        <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 ? 'bg-accent' : i === 1 ? 'bg-accent/50' : 'bg-accent/25'}`}
                            style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted text-sm">{t('hub.stats.noData')}</p>}
              </div>
            </div>

            {/* Share error toast */}
            {shareError && (
              <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-2xl">
                <span>⚠️</span>
                <span>{shareError}</span>
              </div>
            )}

            {/* ── Aktivite Akışı ── */}
            {activities.length > 0 && (
              <div className="bg-surface border border-divider rounded-3xl overflow-hidden mb-5">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-divider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-muted" />
                    <span className="text-xs font-heading text-muted uppercase tracking-wider">{t('hub.activity.title')}</span>
                  </div>
                  <span className="text-xs text-muted">{t('hub.activity.planCount', { count: plans.length })}</span>
                </div>

                {/* Timeline list */}
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[43px] top-5 bottom-5 w-px bg-divider pointer-events-none" />

                  <div className="divide-y divide-divider">
                    {(activitiesShowAll ? activities : activities.slice(0, 2)).map((item) => {
                      const isActive    = item.type === 'active';
                      const isUpcoming  = item.type === 'upcoming';
                      const isCompleted = item.type === 'completed';

                      /* Dot colors */
                      const dotBg =
                        isActive    ? 'bg-emerald-100 ring-2 ring-emerald-200' :
                        isUpcoming  ? 'bg-blue-100 ring-2 ring-blue-200'       :
                        isCompleted ? 'bg-accent-100 ring-2 ring-accent-200' :
                                      'bg-surface-2';

                      /* Time badge colors */
                      const badgeCls =
                        isActive    ? 'bg-emerald-100 text-emerald-600' :
                        isUpcoming  ? 'bg-blue-100 text-blue-600'       :
                        isCompleted ? 'bg-accent-100 text-accent-700'  :
                                      'bg-surface-2 text-muted';

                      /* Icon */
                      const Icon =
                        isActive    ? Plane        :
                        isUpcoming  ? CalendarDays :
                        isCompleted ? CheckCheck   :
                                      FileText;

                      const iconColor =
                        isActive    ? 'text-emerald-600' :
                        isUpcoming  ? 'text-blue-600'    :
                        isCompleted ? 'text-accent'   :
                                      'text-muted';

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 px-6 py-4 hover:bg-surface-2/60 transition-colors group"
                        >
                          {/* Dot */}
                          <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${dotBg}`}>
                            <Icon size={13} className={iconColor} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-text leading-snug">{item.text}</p>
                              <span className={`text-[10px] font-bold whitespace-nowrap flex-shrink-0 px-2 py-0.5 rounded-full ${badgeCls}`}>
                                {item.timeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 leading-relaxed">{item.sub}</p>

                            {/* CTA + Share row */}
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className="flex items-center gap-3">
                                {isCompleted && (
                                  <button
                                    onClick={() => { resetForm(); updateData({ destination: item.destination }); navigate('/onboarding'); }}
                                    className="text-xs font-bold text-accent hover:text-accent-700 transition-colors"
                                  >
                                    {t('hub.activity.replan')}
                                  </button>
                                )}
                                {isUpcoming && (
                                  <button
                                    onClick={() => navigate('/saved-plans')}
                                    className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                                  >
                                    {t('hub.activity.viewPlan')}
                                  </button>
                                )}
                              </div>

                              {/* Share toggle */}
                              <button
                                onClick={() => handleShare(item.planId)}
                                disabled={savingShare === item.planId || (!plansPublic && !sharedPlanIds.has(item.planId))}
                                title={!plansPublic && !sharedPlanIds.has(item.planId) ? t('hub.activity.shareDisabledTitle') : undefined}
                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${
                                  !plansPublic && !sharedPlanIds.has(item.planId)
                                    ? 'bg-surface-2 text-muted border-divider cursor-not-allowed opacity-60'
                                    : sharedPlanIds.has(item.planId)
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200'
                                      : 'bg-surface-2 text-muted border-divider hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                }`}
                              >
                                {savingShare === item.planId
                                  ? <Loader2 size={10} className="animate-spin" />
                                  : sharedPlanIds.has(item.planId)
                                    ? <><Globe size={10} />{t('hub.activity.shared')}</>
                                    : <><Globe size={10} />{t('hub.activity.share')}</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Daha Fazla / Daha Az butonu */}
                  {activities.length > 2 && (
                    <button
                      onClick={() => setActivitiesShowAll(v => !v)}
                      className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-muted hover:text-text hover:bg-surface-2 transition-colors border-t border-divider"
                    >
                      {activitiesShowAll ? (
                        <>{t('hub.activity.showLess')} <ChevronRight size={13} className="rotate-[-90deg]" /></>
                      ) : (
                        <>{t('hub.activity.showMore', { count: activities.length - 2 })} <ChevronRight size={13} className="rotate-90" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

          </>
        )}

        {/* ── Dünya Haritası — her zaman görünür ── */}
        <div className="bg-surface border border-divider rounded-3xl overflow-hidden">

          {/* Harita başlık */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-accent-100 rounded-md flex items-center justify-center">
                <Globe size={11} className="text-accent" />
              </div>
              <span className="text-xs font-heading text-muted uppercase tracking-widest">{t('hub.map.title')}</span>
            </div>
            <p className="font-heading text-lg text-text">
              {t('hub.map.exploredPrefix')}{' '}
              <span className="text-accent">{t('hub.map.citiesCount', { count: stats.uniqueCities })}</span>{' '}
              {t('hub.map.exploredSuffix')}
            </p>
            <p className="text-muted text-xs mt-0.5">
              {t('hub.map.spread', { countries: stats.uniqueCountries, destinations: destPins.length })}
            </p>
          </div>

          {/* Harita */}
          <div className="h-72 w-full border-t border-divider">
            {!isLoaded ? (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={MAP_INIT_CENTER}
                zoom={MAP_INIT_ZOOM}
                options={{ ...BASE_MAP_OPTIONS, styles: dark ? WORLD_MAP_STYLES_DARK : WORLD_MAP_STYLES_LIGHT }}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                onClick={() => setSelectedPin(null)}
              >
                {destPins.map((pin) => (
                  <MarkerF
                    key={`${pin.lat}-${pin.lng}`}
                    position={{ lat: pin.lat, lng: pin.lng }}
                    title={pin.name}
                    onMouseOver={() => setHoveredPin(pin.name)}
                    onMouseOut={() => setHoveredPin(null)}
                    onClick={() => setSelectedPin(pin)}
                    icon={isLoaded ? {
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                          <circle cx="14" cy="14" r="${(hoveredPin === pin.name || selectedPin?.name === pin.name) ? 11 : 8}" fill="${(hoveredPin === pin.name || selectedPin?.name === pin.name) ? pinColorActive : pinColor}" stroke="white" stroke-width="2.5"/>
                        </svg>`
                      )}`,
                      scaledSize: new window.google.maps.Size(28, 28),
                      anchor: new window.google.maps.Point(14, 14),
                    } : undefined}
                  />
                ))}

                {selectedPin && (
                  <InfoWindowF
                    position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
                    onCloseClick={() => setSelectedPin(null)}
                    options={{ pixelOffset: new window.google.maps.Size(0, -22), disableAutoPan: true }}
                  >
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      background: 'rgba(28,20,12,0.88)', backdropFilter: 'blur(8px)',
                      color: '#f5ead8', fontSize: '12px', fontWeight: 700,
                      fontFamily: 'var(--font-body),system-ui,sans-serif', whiteSpace: 'nowrap',
                      padding: '5px 10px', borderRadius: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    }}>
                      <span style={{ color: pinColor, fontSize: '13px' }}>📍</span>
                      {selectedPin.name}
                    </div>
                  </InfoWindowF>
                )}
              </GoogleMap>
            )}
          </div>

          {/* Harita alt bilgi */}
          {destPins.length === 0 && (
            <div className="px-6 py-3 border-t border-divider">
              <p className="text-muted text-xs text-center">{t('hub.map.empty')}</p>
            </div>
          )}
        </div>

      </div>
    </div>

    {/* ── AI Assistant Widget ── */}
    <AiAssistantWidget />
    </>
  );
};

export default Hub;
