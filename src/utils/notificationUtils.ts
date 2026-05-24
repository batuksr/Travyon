import type { TravelPlanResponse } from '../services/aiService';
import type { OnboardingData } from '../store/useOnboardingStore';

/* ══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
export type NotifLevel = 'info' | 'warning' | 'urgent';

export interface AppNotification {
  id:      string;
  icon:    string;
  title:   string;
  body:    string;
  level:   NotifLevel;
  planId?: string;
}

export interface PlanEntry {
  id:             string;
  plan:           TravelPlanResponse;
  onboardingData: OnboardingData;
  createdAt:      number;
}

interface WeatherData { temp: number; code: number; windspeed: number }

/* ══════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════ */

// Yerler için önceden bilet/rezervasyon gerektiren anahtar kelimeler
const BOOKABLE_KEYWORDS = [
  'kolezyum', 'colosseum', 'müze', 'museum', 'tiyatro', 'opera',
  'konser', 'concert', 'safari', 'tur ', 'tekne', 'boat',
  'lunapark', 'stadyum', 'stadium', 'louvre', 'vatikan', 'vaticano',
  'sagrada', 'alhambra', 'acropolis', 'akropol', 'burj', 'bürj',
  'uffizi', 'topkapı', 'dolmabahçe', 'ayasofya', 'hagia sophia',
  'leaning tower', 'pisa', 'palace', 'sarayı', 'tower', 'kule',
  'katedral', 'cathedral', 'anne frank', 'rijksmuseum', 'guggenheim',
  'moma', 'british museum', 'national gallery',
];

const requiresBooking = (placeName: string): boolean =>
  BOOKABLE_KEYWORDS.some(kw => placeName.toLowerCase().includes(kw));

/* ══════════════════════════════════════════════
   Main builder
═══════════════════════════════════════════════ */
export const buildNotifications = (
  plans:       PlanEntry[],
  weather:     WeatherData | null,
  todayStr:    string,
  nextTripCity: string,
): AppNotification[] => {
  const now   = Date.now();
  const notifs: AppNotification[] = [];

  /* ── Plan-based notifications ─────────────────────────── */
  plans.forEach(p => {
    const startTs   = new Date(p.onboardingData.startDate).getTime();
    const daysUntil = Math.ceil((startTs - now) / 86_400_000);
    const dest      = p.plan.destination.split(',')[0].trim();
    const isUpcoming = p.onboardingData.startDate > todayStr;

    /* Yaklaşan seyahat sayacı */
    if (isUpcoming && daysUntil <= 7) {
      if (daysUntil <= 0) {
        notifs.push({
          id: `${p.id}-today`, icon: '✈️', level: 'urgent',
          title: 'Bugün yola çıkıyorsun!',
          body: `${dest} seyahatin bugün başlıyor. İyi yolculuklar! 🎉`,
          planId: p.id,
        });
      } else if (daysUntil === 1) {
        notifs.push({
          id: `${p.id}-tomorrow`, icon: '✈️', level: 'urgent',
          title: 'Yarın yola çıkıyorsun!',
          body: `${dest} seyahatin yarın başlıyor. Son hazırlıklarını yaptın mı?`,
          planId: p.id,
        });
      } else if (daysUntil <= 3) {
        notifs.push({
          id: `${p.id}-soon`, icon: '🧳', level: 'warning',
          title: `${daysUntil} günde ${dest}!`,
          body: 'Bilet, pasaport ve rezervasyonlarını kontrol etme vakti.',
          planId: p.id,
        });
      } else {
        notifs.push({
          id: `${p.id}-week`, icon: '📅', level: 'info',
          title: `${dest} seyahatin ${daysUntil} gün sonra`,
          body: 'Hazırlıklarını tamamlamaya başlamak için iyi bir an.',
          planId: p.id,
        });
      }
    }

    /* Bilet/rezervasyon gerektiren aktiviteler (≤ 14 gün) */
    if (isUpcoming && daysUntil <= 14 && p.plan.dailyPlans.length > 0) {
      const allActivities = p.plan.dailyPlans.flatMap(d => d.activities);
      // İlk eşleşen "rezervasyon gerekli" yeri bul
      const bookable = allActivities.find(a => requiresBooking(a.placeName));
      if (bookable) {
        notifs.push({
          id: `${p.id}-ticket-${bookable.placeName.replace(/\s+/g, '').slice(0, 12)}`,
          icon: '🎟️', level: 'warning',
          title: 'Bilet rezervasyonu gerekebilir',
          body: `${dest} planındaki ${bookable.placeName} için önceden bilet almayı unutma.`,
          planId: p.id,
        });
      }
    }

    /* Bütçe harcama takibi */
    const allActivities = p.plan.dailyPlans.flatMap(d => d.activities);
    const totalSpent    = allActivities.reduce((s, a) => s + (a.actualCost ?? 0), 0);
    const totalEstimated = p.plan.totalEstimatedCost > 0
      ? p.plan.totalEstimatedCost
      : p.onboardingData.budget;

    if (totalSpent > 0 && totalEstimated > 0) {
      const pct = Math.round((totalSpent / totalEstimated) * 100);
      const sym = p.onboardingData.currencySymbol ?? '₺';
      const spentFmt = `${sym}${totalSpent.toLocaleString('tr-TR')}`;
      const totalFmt = `${sym}${totalEstimated.toLocaleString('tr-TR')}`;

      if (pct >= 80) {
        notifs.push({
          id: `${p.id}-budget-high`, icon: '💸', level: 'urgent',
          title: `Bütçe uyarısı — %${pct} harcandı!`,
          body: `${dest}: ${spentFmt} / ${totalFmt}. Harcamaları gözden geçir.`,
          planId: p.id,
        });
      } else if (pct >= 50) {
        notifs.push({
          id: `${p.id}-budget-mid`, icon: '💰', level: 'warning',
          title: `Bütçenin yarısı harcandı — %${pct}`,
          body: `${dest} planında ${spentFmt} harcama kaydedildi.`,
          planId: p.id,
        });
      } else if (pct >= 20) {
        notifs.push({
          id: `${p.id}-budget-low`, icon: '💰', level: 'info',
          title: `Bütçenin %${pct}'i harcandı`,
          body: `${dest} planında ${spentFmt} harcama kaydedildi.`,
          planId: p.id,
        });
      }
    }
  });

  /* ── Hava durumu bildirimleri ─────────────────────────── */
  if (weather && nextTripCity) {
    const { temp, code } = weather;

    // Yağış
    if (code >= 80) {
      notifs.push({
        id: 'weather-storm', icon: '⛈️', level: 'urgent',
        title: 'Şiddetli hava uyarısı',
        body: `${nextTripCity}'da fırtına/sağanak var. Açık hava planlarını gözden geçir.`,
      });
    } else if (code >= 61 && code <= 79) {
      notifs.push({
        id: 'weather-rain', icon: '☂️', level: 'warning',
        title: 'Yağmur bekleniyor',
        body: `${nextTripCity}'da yağış var. Yağmurluk ve su geçirmez ayakkabı götür.`,
      });
    } else if (code >= 71 && code <= 77) {
      notifs.push({
        id: 'weather-snow', icon: '❄️', level: 'warning',
        title: 'Kar bekleniyor',
        body: `${nextTripCity}'da kar var. Transferlerde gecikme olabilir.`,
      });
    }

    // Sıcaklık
    if (temp <= 2) {
      notifs.push({
        id: 'weather-freezing', icon: '🥶', level: 'urgent',
        title: `Hava ${temp}°C — Dondurucu`,
        body: `${nextTripCity}'da çok soğuk. Kalın mont, eldiven ve bere şart.`,
      });
    } else if (temp < 10) {
      notifs.push({
        id: 'weather-cold', icon: '🧥', level: 'warning',
        title: `Hava ${temp}°C — Soğuk`,
        body: `${nextTripCity}'da soğuk hava. Yağmurluk ve kalın giysi planla.`,
      });
    } else if (temp >= 35) {
      notifs.push({
        id: 'weather-hot', icon: '🌡️', level: 'warning',
        title: `Hava ${temp}°C — Çok Sıcak`,
        body: `${nextTripCity}'da sıcak hava. Bol su ve güneş kremi unutma.`,
      });
    }
  }

  // Önem sırasına göre sırala: urgent > warning > info
  const ORDER: Record<NotifLevel, number> = { urgent: 0, warning: 1, info: 2 };
  return notifs.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
};
