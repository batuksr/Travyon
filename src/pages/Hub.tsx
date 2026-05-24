import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUserPlans } from '../store/useSavedPlansStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { CITIES } from '../data/cities';
import { Plane, MapPin, Wind, LayoutGrid, Wallet, Globe, Trophy,
         Shuffle, Sparkles, CalendarDays, ChevronRight, Zap,
         Clock, CheckCheck, FileText, Users, Loader2,
         Bell, BellRing, X as XIcon } from 'lucide-react';
import { buildNotifications, type AppNotification } from '../utils/notificationUtils';
import { relativeTime } from '../utils/timeUtils';
import {
  getPublicFeed, getMySharedPlanIds, getFollowingList,
  shareplan, unshareplan, ratePlan, getUserRatings,
  followUser, unfollowUser,
  type PublicPlan,
} from '../services/socialService';
import { PublicPlanCard } from '../components/PublicPlanCard';
import SharedPlanModal from '../components/SharedPlanModal';
import { AiAssistantWidget } from '../components/AiAssistantWidget';

const LIBRARIES: ('places')[] = ['places'];

/* ── Greeting ── */
const getGreeting = (): { text: string; emoji: string } => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { text: 'Günaydın',     emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'İyi Öğleler',  emoji: '🌤️' };
  if (h >= 18 && h < 22) return { text: 'İyi Akşamlar', emoji: '🌆' };
  return                         { text: 'İyi Geceler',  emoji: '🌙' };
};

/* ── Weather helpers ── */
const weatherIcon = (code: number) => {
  if (code === 0) return '☀️'; if (code <= 2)  return '🌤️';
  if (code === 3) return '☁️'; if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️'; if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️'; if (code <= 82) return '🌦️';
  return '⛈️';
};
const weatherLabel = (code: number) => {
  if (code === 0) return 'Açık Hava';  if (code <= 2)  return 'Az Bulutlu';
  if (code === 3) return 'Bulutlu';    if (code <= 48) return 'Sisli';
  if (code <= 55) return 'Çiseleyen'; if (code <= 67) return 'Yağmurlu';
  if (code <= 77) return 'Karlı';     if (code <= 82) return 'Sağanak';
  return 'Fırtınalı';
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
  { label: 'Efsane',      icon: '👑', color: 'text-[#f8981d]',  bg: 'bg-[#f8981d]/10', border: 'border-[#f8981d]/30', minCities: 20, maxCities: 999 },
];

const getLevel = (cityCount: number): GamificationLevel =>
  [...LEVELS].reverse().find(l => cityCount >= l.minCities) ?? LEVELS[0];

/* ── Map styles ── */
const WORLD_MAP_STYLES = [
  { featureType: 'all' as const,       elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'water' as const,      stylers: [{ color: '#dbeafe' }] },
  { featureType: 'landscape' as const,  stylers: [{ color: '#f8fafc' }] },
  { featureType: 'road' as const,       stylers: [{ visibility: 'off' }] },
  { featureType: 'poi' as const,        stylers: [{ visibility: 'off' }] },
  { featureType: 'transit' as const,    stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative' as const, elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }, { weight: 0.8 }] },
];

const WORLD_MAP_OPTIONS = {
  disableDefaultUI: true, scrollwheel: false, draggable: true,
  zoomControl: false, mapTypeControl: false, streetViewControl: false,
  styles: WORLD_MAP_STYLES,
};

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
  { val: 'culture',   emoji: '🏛️', label: 'Kültür'     },
  { val: 'relax',     emoji: '😴', label: 'Dinlenme'   },
  { val: 'nightlife', emoji: '🌙', label: 'Gece Hayatı' },
  { val: 'nature',    emoji: '🏔️', label: 'Macera'     },
] as const;

/* ══════════════════════════════════════════════
   HUB
═══════════════════════════════════════════════ */
const Hub: React.FC = () => {
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

  /* ── Social state ── */
  const [publicFeed, setPublicFeed]       = useState<PublicPlan[]>([]);
  const [feedLoading, setFeedLoading]     = useState(false);
  const [feedError, setFeedError]         = useState(false);
  const [shareError, setShareError]       = useState<string | null>(null);
  const [feedTab, setFeedTab]             = useState<'all' | 'following'>('all');
  const [followingSet, setFollowingSet]   = useState<Set<string>>(new Set());
  const [sharedPlanIds, setSharedPlanIds] = useState<Set<string>>(new Set());
  const [userRatings, setUserRatings]     = useState<Record<string, number>>({});
  const [savingShare, setSavingShare]         = useState<string | null>(null);
  const [savingRating, setSavingRating]       = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan]       = useState<PublicPlan | null>(null);

  /* ── Notification state ── */
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(new Set());
  const [showNotifs, setShowNotifs]           = useState(true);

  /* Timeout yardımcısı */
  const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  /* Load social data — max 5 sn bekle */
  useEffect(() => {
    if (!user) return;
    setFeedLoading(true);
    setFeedError(false);
    withTimeout(
      Promise.all([
        getPublicFeed(12),
        getFollowingList(user.uid),
        getMySharedPlanIds(user.uid),
      ]),
      5000,
    )
    .then(async ([feed, following, shared]) => {
      setPublicFeed(feed);
      setFollowingSet(new Set(following));
      setSharedPlanIds(shared);
      const planIds = feed.map(p => p.id);
      if (planIds.length) {
        getUserRatings(user.uid, planIds).then(setUserRatings).catch(() => {});
      }
    })
    .catch(() => setFeedError(true))
    .finally(() => setFeedLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Social handlers */
  const handleShare = useCallback(async (planId: string) => {
    if (!user) return;
    setSavingShare(planId);
    setShareError(null);
    try {
      if (sharedPlanIds.has(planId)) {
        await withTimeout(unshareplan(planId));
        setSharedPlanIds(prev => { const n = new Set(prev); n.delete(planId); return n; });
        setPublicFeed(prev => prev.filter(p => p.id !== planId));
      } else {
        const savedPlan = plans.find(p => p.id === planId);
        if (!savedPlan) return;
        await withTimeout(
          shareplan(planId, savedPlan.plan, savedPlan.onboardingData, {
            uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
          })
        );
        setSharedPlanIds(prev => new Set([...prev, planId]));
        setPublicFeed(prev => [{
          id: planId,
          userId:          user.uid,
          userDisplayName: user.displayName ?? 'Gezgin',
          userPhotoURL:    user.photoURL ?? null,
          destination:     savedPlan.plan.destination,
          dailyPlanCount:  savedPlan.plan.dailyPlans.length,
          budget:          savedPlan.onboardingData.budget,
          currencySymbol:  savedPlan.onboardingData.currencySymbol ?? '₺',
          tripPurpose:     savedPlan.onboardingData.tripPurpose ?? '',
          createdAt: Date.now(), avgRating: 0, ratingCount: 0,
        }, ...prev]);
      }
    } catch (err) {
      const msg = err instanceof Error && err.message === 'timeout'
        ? 'Bağlantı zaman aşımı — Firebase kurallarını kontrol et'
        : 'Paylaşım başarısız';
      setShareError(msg);
      setTimeout(() => setShareError(null), 4000);
    } finally {
      setSavingShare(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sharedPlanIds, plans]);

  const handleRate = useCallback(async (planId: string, rating: number) => {
    if (!user) return;
    setSavingRating(planId);
    try {
      const { newAvg, newCount } = await ratePlan(planId, user.uid, rating);
      setUserRatings(prev => ({ ...prev, [planId]: rating }));
      setPublicFeed(prev => prev.map(p =>
        p.id === planId ? { ...p, avgRating: newAvg, ratingCount: newCount } : p
      ));
    } catch { /* hata */ }
    finally { setSavingRating(null); }
  }, [user]);

  const handleToggleFollow = useCallback(async (targetUid: string) => {
    if (!user) return;
    try {
      if (followingSet.has(targetUid)) {
        await unfollowUser(user.uid, targetUid);
        setFollowingSet(prev => { const n = new Set(prev); n.delete(targetUid); return n; });
      } else {
        await followUser(user.uid, targetUid);
        setFollowingSet(prev => new Set([...prev, targetUid]));
      }
    } catch { /* hata */ }
  }, [user, followingSet]);

  /* ── Quick Actions state ── */
  type RandState = 'idle' | 'spinning' | 'revealed';
  const [randState, setRandState]     = useState<RandState>('idle');
  const [randCity, setRandCity]       = useState<{ city: string; country: string } | null>(null);
  const [displayCity, setDisplayCity] = useState('');
  const [showVibe, setShowVibe]       = useState(false);
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      label: `${sat.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`,
    };
  }, []);

  /* ── Avg budget from past plans ── */
  const avgBudget = useMemo(() => {
    if (!plans.length) return { amount: 15000, symbol: '₺', code: 'TRY' };
    const tryPlans = plans.filter(p => (p.onboardingData.currencyCode ?? 'TRY') === 'TRY');
    const src = tryPlans.length ? tryPlans : plans;
    const avg = Math.round(src.reduce((s, p) => s + p.onboardingData.budget, 0) / src.length / 1000) * 1000;
    return { amount: avg, symbol: src[0].onboardingData.currencySymbol ?? '₺', code: src[0].onboardingData.currencyCode ?? 'TRY' };
  }, [plans]);

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
      const budget    = `${p.onboardingData.currencySymbol ?? '₺'}${p.onboardingData.budget.toLocaleString('tr-TR')}`;

      /* Currently traveling */
      if (p.onboardingData.startDate <= todayStr && p.onboardingData.endDate >= todayStr) {
        return {
          id: p.id + '-active', type: 'active', planId: p.id, destination: dest,
          text: `Şu an ${dest}'dasın!`,
          sub: `${p.onboardingData.endDate} tarihine kadar — iyi seyahatler ✈️`,
          timeLabel: 'devam ediyor',
          sortKey: now + 9e15,
        };
      }

      /* Upcoming trip */
      if (p.onboardingData.startDate > todayStr) {
        const countdown = daysUntil <= 0 ? 'Bugün!' : daysUntil === 1 ? 'Yarın!' : `${daysUntil} gün kaldı`;
        return {
          id: p.id + '-upcoming', type: 'upcoming', planId: p.id, destination: dest,
          text: `${dest} seyahatin yaklaşıyor`,
          sub: `${nights} gece · ${budget} · ${p.onboardingData.startDate}`,
          timeLabel: countdown,
          sortKey: now - daysUntil * 86_400_000 + 8e15,
        };
      }

      /* Completed (within 90 days) */
      if (daysSinceEnd >= 0 && daysSinceEnd <= 90) {
        return {
          id: p.id + '-done', type: 'completed', planId: p.id, destination: dest,
          text: `${dest} seyahatini tamamladın`,
          sub: `${nights} gün · ${budget} harcama planı`,
          timeLabel: relativeTime(endTs),
          sortKey: endTs,
        };
      }

      /* Default: plan created */
      return {
        id: p.id + '-created', type: 'created', planId: p.id, destination: dest,
        text: `${dest} planı oluşturdun`,
        sub: `${nights} gün · ${budget}`,
        timeLabel: relativeTime(p.createdAt),
        sortKey: p.createdAt,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 5);
  }, [plans]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Gezgin';
  const greeting  = getGreeting();
  const todayStr  = new Date().toISOString().split('T')[0];

  const onMapLoad   = useCallback((m: google.maps.Map) => setMapInstance(m), []);
  const onMapUnmount = useCallback(() => setMapInstance(null), []);

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

  /* ── Stats + Pins ── */
  const { stats, destPins } = useMemo(() => {
    const now        = new Date();
    const thisMonth  = now.getMonth();
    const thisYear   = now.getFullYear();
    const thisMonthCount = plans.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const getCountry = (dest: string) =>
      dest.includes(',') ? dest.split(',').slice(1).join(',').trim() : '';
    const getCityRaw = (dest: string) => dest.split(',')[0].trim();

    const uniqueCities    = new Set(plans.map(p => getCityRaw(p.plan.destination))).size;
    const allCountries    = plans.map(p => getCountry(p.plan.destination)).filter(Boolean);
    const uniqueCountries = new Set(allCountries).size;
    const countryCounts: Record<string, number> = {};
    allCountries.forEach(c => { countryCounts[c] = (countryCounts[c] ?? 0) + 1; });
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const uniqueFlags  = [...new Set(allCountries)].slice(0, 8).map(c => ({ name: c, flag: getCountryFlag(c) }));
    const budgetMap: Record<string, { symbol: string; total: number }> = {};
    plans.forEach(p => {
      const code = p.onboardingData.currencyCode ?? 'TRY';
      const sym  = p.onboardingData.currencySymbol ?? '₺';
      if (!budgetMap[code]) budgetMap[code] = { symbol: sym, total: 0 };
      budgetMap[code].total += p.onboardingData.budget;
    });
    const budgets = Object.entries(budgetMap).sort((a, b) => b[1].total - a[1].total).slice(0, 3);

    /* Destination pins — centroid of each plan's activities (deduplicated) */
    const seen = new Set<string>();
    const pins: DestPin[] = [];
    plans.forEach(p => {
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
  const progress     = nextLevel
    ? Math.min(100, ((stats.uniqueCities - currentLevel.minCities) / (nextLevel.minCities - currentLevel.minCities)) * 100)
    : 100;

  /* ── Weather ── */

  // Bölge adı → geocode edilebilir şehir eşlemeleri
  const GEO_ALIASES: Record<string, string> = {
    'kapadokya':   'Nevşehir',
    'cappadocia':  'Nevşehir',
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

  // Tek bir isim için koordinat döndürür; bulunamazsa null
  const geocodeOnce = async (name: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res  = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&format=json`
      );
      const data = await res.json();
      if (data.results?.length) {
        return { lat: data.results[0].latitude, lng: data.results[0].longitude };
      }
    } catch { /* ağ hatası */ }
    return null;
  };

  useEffect(() => {
    if (!cityName) return;
    setWeatherLoading(true);
    setWeather(null);

    (async () => {
      try {
        // 1. Bilinen alias'ı dene (Kapadokya → Nevşehir gibi)
        const alias  = GEO_ALIASES[cityName.toLowerCase()];
        let   coords = alias ? await geocodeOnce(alias) : null;

        // 2. Doğrudan şehir adını dene
        if (!coords) coords = await geocodeOnce(cityName);

        // 3. Tam destinasyon stringini dene ("Kapadokya, Türkiye")
        if (!coords && nextTrip?.plan.destination && nextTrip.plan.destination !== cityName) {
          coords = await geocodeOnce(nextTrip.plan.destination);
        }

        // 4. Virgülden sonraki kısmı (ülke/bölge) dene
        if (!coords && nextTrip?.plan.destination.includes(',')) {
          const rest = nextTrip.plan.destination.split(',').slice(1).join(',').trim();
          if (rest) coords = await geocodeOnce(rest);
        }

        if (!coords) return;   // hiçbiri bulunamadı

        const wxRes  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`
        );
        const wxData = await wxRes.json();
        if (wxData.current_weather) {
          setWeather({
            temp:      Math.round(wxData.current_weather.temperature),
            code:      wxData.current_weather.weathercode,
            windspeed: Math.round(wxData.current_weather.windspeed),
          });
        }
      } catch { /* sessizce */ }
      finally { setWeatherLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]);

  /* FitBounds on pins */
  useEffect(() => {
    if (!mapInstance || !isLoaded || destPins.length === 0) return;
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
  }, [mapInstance, isLoaded, destPins]);

  const maxCount = stats.topCountries[0]?.[1] ?? 1;

  /* ── Displayed feed (tab filter) ── */
  const displayedFeed = useMemo(() =>
    feedTab === 'all'
      ? publicFeed.filter(p => p.userId !== user?.uid)
      : publicFeed.filter(p => followingSet.has(p.userId)),
  [publicFeed, feedTab, followingSet, user?.uid]);

  /* ── Notifications ── */
  const allNotifications = useMemo(() =>
    buildNotifications(plans, weather, todayStr, cityName),
  [plans, weather, todayStr, cityName]);

  const notifications: AppNotification[] = useMemo(() =>
    allNotifications.filter(n => !dismissedNotifs.has(n.id)),
  [allNotifications, dismissedNotifs]);

  const dismissNotif = useCallback((id: string) =>
    setDismissedNotifs(prev => new Set([...prev, id])),
  []);

  const urgentCount = notifications.filter(n => n.level === 'urgent').length;
  const notifBadge  = notifications.length;

  return (
    <>
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-[1280px] mx-auto px-8 py-10">

        {/* ── Greeting ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">
                {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl leading-none">{greeting.emoji}</span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                  {greeting.text}, <span className="text-[#f8981d]">{firstName}!</span>
                </h1>
              </div>
            </div>

            {/* ── Bell button ── */}
            {notifBadge > 0 && (
              <button
                onClick={() => setShowNotifs(v => !v)}
                className="relative flex-shrink-0 mt-1 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                aria-label="Bildirimler"
              >
                {urgentCount > 0
                  ? <BellRing size={18} className="text-red-500" />
                  : <Bell     size={18} className="text-slate-600" />
                }
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 ${
                  urgentCount > 0 ? 'bg-red-500' : 'bg-[#f8981d]'
                }`}>
                  {notifBadge}
                </span>
              </button>
            )}
          </div>

          {/* ── Notification cards ── */}
          {notifBadge > 0 && showNotifs && (
            <div className="mt-5 flex flex-col gap-2">
              {notifications.map(n => {
                const styles = n.level === 'urgent'
                  ? { wrap: 'bg-red-50 border-red-200',    bar: 'bg-red-500',    title: 'text-red-800',   body: 'text-red-600',   dismiss: 'text-red-300 hover:text-red-500'  }
                  : n.level === 'warning'
                  ? { wrap: 'bg-amber-50 border-amber-200', bar: 'bg-amber-400',  title: 'text-amber-900', body: 'text-amber-700', dismiss: 'text-amber-300 hover:text-amber-500' }
                  : { wrap: 'bg-blue-50 border-blue-200',   bar: 'bg-blue-400',   title: 'text-blue-800',  body: 'text-blue-600',  dismiss: 'text-blue-300 hover:text-blue-500'  };

                return (
                  <div key={n.id} className={`flex items-start gap-3 rounded-xl border pl-0 pr-3 py-3 overflow-hidden ${styles.wrap}`}>
                    {/* Level bar */}
                    <div className={`w-1 self-stretch rounded-r-full flex-shrink-0 ${styles.bar}`} />
                    {/* Icon */}
                    <span className="text-lg leading-none flex-shrink-0 mt-0.5">{n.icon}</span>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-tight ${styles.title}`}>{n.title}</p>
                      <p className={`text-[11px] mt-0.5 leading-relaxed ${styles.body}`}>{n.body}</p>
                    </div>
                    {/* Dismiss */}
                    <button
                      onClick={() => dismissNotif(n.id)}
                      className={`flex-shrink-0 mt-0.5 transition-colors ${styles.dismiss}`}
                      aria-label="Kapat"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Next Trip + Weather ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {nextTrip ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-[#f8981d] to-[#e08518] rounded-2xl p-6 text-white shadow-xl shadow-[#f8981d]/25">
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
                    <p className="text-white/70 text-sm">{nextTrip.onboardingData.startDate} → {nextTrip.onboardingData.endDate}</p>
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

          {nextTrip && (
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-slate-50 rounded-full pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">Hava Durumu</span>
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
                    </div>
                  </div>
                ) : weather ? (
                  <div className="flex items-end gap-5 mt-auto">
                    <span className="text-7xl leading-none select-none">{weatherIcon(weather.code)}</span>
                    <div>
                      <p className="text-5xl font-black text-slate-900 leading-none">{weather.temp}°</p>
                      <p className="text-slate-500 text-sm font-medium mt-1">{weatherLabel(weather.code)}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Wind size={11} className="text-slate-400" />
                        <span className="text-slate-400 text-xs">{weather.windspeed} km/s rüzgar</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-2">
                    <p className="text-slate-400 text-sm">Hava durumu yüklenemedi</p>
                    <button
                      onClick={() => {
                        if (!cityName) return;
                        setWeather(null);
                        setWeatherLoading(true);
                        // cityName değişmeden tekrar tetiklemek için dummy state değişikliği yerine
                        // doğrudan fetch yapalım
                        const alias = GEO_ALIASES[cityName.toLowerCase()];
                        const candidates = [alias, cityName, nextTrip?.plan.destination].filter(Boolean) as string[];
                        (async () => {
                          try {
                            let coords: { lat: number; lng: number } | null = null;
                            for (const c of candidates) {
                              coords = await geocodeOnce(c);
                              if (coords) break;
                            }
                            if (!coords) return;
                            const wxRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`);
                            const wxData = await wxRes.json();
                            if (wxData.current_weather) {
                              setWeather({ temp: Math.round(wxData.current_weather.temperature), code: wxData.current_weather.weathercode, windspeed: Math.round(wxData.current_weather.windspeed) });
                            }
                          } catch { /* sessizce */ }
                          finally { setWeatherLoading(false); }
                        })();
                      }}
                      className="text-xs font-bold text-[#f8981d] hover:text-[#e08518] transition-colors self-start"
                    >
                      Tekrar dene →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Hızlı Eylemler ── */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap size={12} /> Hızlı Eylemler
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* ① Bu hafta sonu */}
            <button
              onClick={handleWeekend}
              className="group bg-white border border-slate-200 hover:border-[#f8981d]/40 hover:shadow-md rounded-xl p-4 text-left transition-all duration-200"
            >
              <div className="w-8 h-8 bg-[#f8981d]/10 rounded-lg flex items-center justify-center mb-3">
                <CalendarDays size={15} className="text-[#f8981d]" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Bu hafta sonu</p>
              <p className="text-xs text-slate-400 mb-3">{nextWeekend.label}</p>
              <span className="text-xs font-semibold text-[#f8981d] flex items-center gap-0.5">
                Plan oluştur <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* ② Rastgele şehir */}
            <div
              onClick={randState === 'revealed' ? undefined : handleRandomCity}
              className={`group bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-4 transition-all duration-200 ${randState !== 'revealed' ? 'cursor-pointer' : ''}`}
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <Shuffle size={15} className="text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Rastgele şehir</p>

              {randState === 'idle' && (
                <>
                  <p className="text-xs text-slate-400 mb-3">Sürpriz destinasyon</p>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-0.5 group-hover:text-slate-700 transition-colors">
                    Deneyelim <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </>
              )}
              {randState === 'spinning' && (
                <p className="text-sm font-bold text-slate-900 animate-pulse mt-1 tabular-nums">{displayCity}</p>
              )}
              {randState === 'revealed' && randCity && (
                <div className="mt-1">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{randCity.city}</p>
                  <p className="text-xs text-slate-400 mb-2">{randCity.country}</p>
                  <div className="flex gap-1.5">
                    <button onClick={handleGoRandom} className="text-xs font-semibold bg-[#f8981d] text-white px-2.5 py-1 rounded-lg hover:bg-[#e08518] transition-colors">
                      Planla →
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRandState('idle'); setRandCity(null); setDisplayCity(''); }}
                      className="text-xs font-semibold text-slate-500 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >↺</button>
                  </div>
                </div>
              )}
            </div>

            {/* ③ Bütçeme göre */}
            <button
              onClick={handleBudget}
              className="group bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-md rounded-xl p-4 text-left transition-all duration-200"
            >
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                <Wallet size={15} className="text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Bütçeme göre</p>
              <p className="text-xs text-slate-400 mb-3">
                {plans.length > 0 ? avgBudget.symbol + avgBudget.amount.toLocaleString('tr-TR') : 'Varsayılan bütçe'}
              </p>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                Plan oluştur <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* ④ Vibe değiştir */}
            <div
              className={`bg-white border border-slate-200 hover:border-violet-200 hover:shadow-md rounded-xl p-4 transition-all duration-200 ${plans.length > 0 ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => plans.length > 0 && setShowVibe(v => !v)}
            >
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center mb-3">
                <Sparkles size={15} className="text-violet-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Vibe değiştir</p>
              {!showVibe ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    {plans.length > 0 ? `"${plans[0].plan.destination.split(',')[0]}"` : 'Önce plan oluştur'}
                  </p>
                  <span className="text-xs font-semibold text-violet-500 flex items-center gap-0.5">
                    Tarz seç <ChevronRight size={11} />
                  </span>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {VIBE_OPTIONS.map(v => (
                    <button
                      key={v.val}
                      onClick={(e) => { e.stopPropagation(); handleVibe(v.val); }}
                      className="flex items-center gap-1 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors"
                    >
                      <span>{v.emoji}</span><span>{v.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Topluluk Akışı ── */}
        <div className="mb-8">
          {/* Header + tabs */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={12} /> Topluluk
            </p>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {(['all', 'following'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFeedTab(tab)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                    feedTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'all' ? 'Herkes' : (
                    <span className="flex items-center gap-1">
                      Takip Ettiklerim
                      {followingSet.size > 0 && (
                        <span className="bg-blue-500 text-white text-[9px] font-black px-1 rounded-full">
                          {followingSet.size}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feed content */}
          {feedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 bg-slate-100 rounded" />
                      <div className="h-3 w-44 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : feedError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">Topluluk verisi yüklenemedi</p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  Firebase Firestore kuralları okumayı engelliyor olabilir.
                  Console'dan <span className="font-bold">test modunu</span> veya izin kurallarını kontrol et.
                </p>
                <button
                  onClick={() => { setFeedError(false); setFeedLoading(true);
                    withTimeout(Promise.all([getPublicFeed(12), getFollowingList(user!.uid), getMySharedPlanIds(user!.uid)]))
                      .then(([f, fl, s]) => { setPublicFeed(f); setFollowingSet(new Set(fl)); setSharedPlanIds(s); })
                      .catch(() => setFeedError(true))
                      .finally(() => setFeedLoading(false));
                  }}
                  className="mt-2 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
                >
                  Tekrar dene →
                </button>
              </div>
            </div>
          ) : displayedFeed.length > 0 ? (
            <div className="space-y-3">
              {displayedFeed.map(plan => (
                <PublicPlanCard
                  key={plan.id}
                  plan={plan}
                  currentUserId={user?.uid}
                  isFollowing={followingSet.has(plan.userId)}
                  userRating={userRatings[plan.id]}
                  isSavingRating={savingRating === plan.id}
                  onRate={handleRate}
                  onToggleFollow={handleToggleFollow}
                  onOpen={setSelectedPlan}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              {feedTab === 'following' ? (
                <>
                  <p className="text-2xl mb-2">👥</p>
                  <p className="text-sm font-bold text-slate-700">Henüz kimseyi takip etmiyorsun</p>
                  <p className="text-xs text-slate-400 mt-1">
                    "Herkes" sekmesinde gezginleri keşfet ve takip et
                  </p>
                  <button
                    onClick={() => setFeedTab('all')}
                    className="mt-3 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Herkese bak →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-2">🌍</p>
                  <p className="text-sm font-bold text-slate-700">Henüz paylaşılan plan yok</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktivite akışındaki planlarını topluluğa paylaş
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── İstatistikler ── */}
        {plans.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <LayoutGrid size={12} /> İstatistikler
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {/* Toplam Plan */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 bg-[#f8981d]/10 rounded-xl flex items-center justify-center">
                    <LayoutGrid size={16} className="text-[#f8981d]" />
                  </div>
                  {stats.thisMonthCount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      +{stats.thisMonthCount} bu ay
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{plans.length}</p>
                <p className="text-slate-500 text-xs mt-1">Toplam Plan</p>
              </div>

              {/* Şehir & Ülke */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Globe size={16} className="text-blue-500" />
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <p className="text-2xl font-bold text-slate-900 leading-none">{stats.uniqueCities}</p>
                  <span className="text-slate-400 text-xs">şehir</span>
                </div>
                <p className="text-slate-500 text-xs mb-3">{stats.uniqueCountries} farklı ülke</p>
                {stats.uniqueFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {stats.uniqueFlags.map(f => (
                      <span key={f.name} title={f.name} className="text-base leading-none">{f.flag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Toplam Bütçe */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                  <Wallet size={16} className="text-violet-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Toplam Bütçe</p>
                <div className="space-y-1.5">
                  {stats.budgets.map(([code, { symbol, total }]) => (
                    <div key={code} className="flex items-baseline gap-1">
                      <span className="text-base font-bold text-slate-900 leading-none">{symbol}{total.toLocaleString('tr-TR')}</span>
                      <span className="text-slate-400 text-[10px]">{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* En Çok Gezilen */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <Trophy size={16} className="text-amber-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">En Çok Gezilen</p>
                {stats.topCountries.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topCountries.map(([country, count], i) => (
                      <div key={country}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm leading-none">{getCountryFlag(country)}</span>
                            <span className={`text-xs font-semibold truncate max-w-[80px] ${i === 0 ? 'text-slate-900' : 'text-slate-600'}`}>{country}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{count}</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 ? 'bg-[#f8981d]' : i === 1 ? 'bg-[#f8981d]/50' : 'bg-[#f8981d]/25'}`}
                            style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-sm">Henüz veri yok</p>}
              </div>
            </div>

            {/* Share error toast */}
            {shareError && (
              <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl">
                <span>⚠️</span>
                <span>{shareError}</span>
              </div>
            )}

            {/* ── Aktivite Akışı ── */}
            {activities.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-5">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Son Hareketler</span>
                  </div>
                  <span className="text-xs text-slate-400">{plans.length} plan</span>
                </div>

                {/* Timeline list */}
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[43px] top-5 bottom-5 w-px bg-slate-100 pointer-events-none" />

                  <div className="divide-y divide-slate-50">
                    {activities.map((item) => {
                      const isActive    = item.type === 'active';
                      const isUpcoming  = item.type === 'upcoming';
                      const isCompleted = item.type === 'completed';

                      /* Dot colors */
                      const dotBg =
                        isActive    ? 'bg-emerald-100 ring-2 ring-emerald-200' :
                        isUpcoming  ? 'bg-blue-100 ring-2 ring-blue-200'       :
                        isCompleted ? 'bg-[#f8981d]/15 ring-2 ring-[#f8981d]/25' :
                                      'bg-slate-100';

                      /* Time badge colors */
                      const badgeCls =
                        isActive    ? 'bg-emerald-100 text-emerald-600' :
                        isUpcoming  ? 'bg-blue-100 text-blue-600'       :
                        isCompleted ? 'bg-[#f8981d]/15 text-[#e08518]'  :
                                      'bg-slate-100 text-slate-500';

                      /* Icon */
                      const Icon =
                        isActive    ? Plane        :
                        isUpcoming  ? CalendarDays :
                        isCompleted ? CheckCheck   :
                                      FileText;

                      const iconColor =
                        isActive    ? 'text-emerald-600' :
                        isUpcoming  ? 'text-blue-600'    :
                        isCompleted ? 'text-[#f8981d]'   :
                                      'text-slate-400';

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Dot */}
                          <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${dotBg}`}>
                            <Icon size={13} className={iconColor} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-slate-800 leading-snug">{item.text}</p>
                              <span className={`text-[10px] font-bold whitespace-nowrap flex-shrink-0 px-2 py-0.5 rounded-full ${badgeCls}`}>
                                {item.timeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.sub}</p>

                            {/* CTA + Share row */}
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className="flex items-center gap-3">
                                {isCompleted && (
                                  <button
                                    onClick={() => { resetForm(); updateData({ destination: item.destination }); navigate('/onboarding'); }}
                                    className="text-xs font-bold text-[#f8981d] hover:text-[#e08518] transition-colors"
                                  >
                                    Tekrar Planla →
                                  </button>
                                )}
                                {isUpcoming && (
                                  <button
                                    onClick={() => navigate('/saved-plans')}
                                    className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                                  >
                                    Planı Gör →
                                  </button>
                                )}
                              </div>

                              {/* Share toggle */}
                              <button
                                onClick={() => handleShare(item.planId)}
                                disabled={savingShare === item.planId}
                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${
                                  sharedPlanIds.has(item.planId)
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                }`}
                              >
                                {savingShare === item.planId
                                  ? <Loader2 size={10} className="animate-spin" />
                                  : sharedPlanIds.has(item.planId)
                                    ? <><Globe size={10} />Paylaşıldı</>
                                    : <><Globe size={10} />Paylaş</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Dünya Haritası ── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

              {/* Harita başlık + gamification */}
              <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-[#f8981d]/15 rounded-md flex items-center justify-center">
                      <Globe size={11} className="text-[#f8981d]" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dünya Haritam</span>
                  </div>
                  <p className="text-lg font-black text-slate-900">
                    Şu ana kadar{' '}
                    <span className="text-[#f8981d]">{stats.uniqueCities} şehir</span>{' '}
                    keşfettin!
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {stats.uniqueCountries} ülkeye yayılan {destPins.length} destinasyon
                  </p>
                </div>

                {/* Level badge */}
                <div className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3 rounded-2xl border ${currentLevel.bg} ${currentLevel.border}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{currentLevel.icon}</span>
                    <div>
                      <p className={`text-sm font-black leading-none ${currentLevel.color}`}>{currentLevel.label}</p>
                      {nextLevel && (
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Sonraki: {nextLevel.label} {nextLevel.icon} ({nextLevel.minCities - stats.uniqueCities} şehir)
                        </p>
                      )}
                    </div>
                  </div>
                  {nextLevel && (
                    <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full bg-current rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, color: 'inherit', backgroundColor: 'currentColor' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Level yolu */}
              <div className="px-6 pb-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
                {LEVELS.map((lvl, i) => {
                  const reached = stats.uniqueCities >= lvl.minCities;
                  return (
                    <React.Fragment key={lvl.label}>
                      <div title={`${lvl.label} (${lvl.minCities}+ şehir)`}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex-shrink-0 border
                          ${reached
                            ? `${lvl.bg} ${lvl.border} ${lvl.color}`
                            : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                        <span>{lvl.icon}</span>
                        <span className="hidden sm:inline">{lvl.label}</span>
                      </div>
                      {i < LEVELS.length - 1 && (
                        <div className={`h-px w-4 flex-shrink-0 ${stats.uniqueCities >= LEVELS[i + 1].minCities ? 'bg-[#f8981d]/40' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Harita */}
              <div className="h-72 w-full border-t border-slate-100">
                {!isLoaded ? (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#f8981d] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={destPins.length > 0 ? { lat: destPins[0].lat, lng: destPins[0].lng } : { lat: 30, lng: 20 }}
                    zoom={destPins.length === 0 ? 2 : 3}
                    options={WORLD_MAP_OPTIONS}
                    onLoad={onMapLoad}
                    onUnmount={onMapUnmount}
                  >
                    {destPins.map((pin) => (
                      <MarkerF
                        key={`${pin.lat}-${pin.lng}`}
                        position={{ lat: pin.lat, lng: pin.lng }}
                        title={pin.name}
                        onMouseOver={() => setHoveredPin(pin.name)}
                        onMouseOut={() => setHoveredPin(null)}
                        icon={isLoaded ? {
                          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                              <circle cx="14" cy="14" r="${hoveredPin === pin.name ? 11 : 8}" fill="${hoveredPin === pin.name ? '#e08518' : '#f8981d'}" stroke="white" stroke-width="2.5"/>
                            </svg>`
                          )}`,
                          scaledSize: new window.google.maps.Size(28, 28),
                          anchor: new window.google.maps.Point(14, 14),
                        } : undefined}
                      />
                    ))}
                  </GoogleMap>
                )}
              </div>

              {/* Harita alt bilgi */}
              {destPins.length === 0 && (
                <div className="px-6 py-3 border-t border-slate-100">
                  <p className="text-slate-400 text-xs text-center">Plan oluşturdukça şehirler haritada belirmeye başlayacak 🗺️</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>

    {/* ── Shared Plan Modal ── */}
    {selectedPlan && (
      <SharedPlanModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    )}

    {/* ── AI Assistant Widget ── */}
    <AiAssistantWidget />
    </>
  );
};

export default Hub;
