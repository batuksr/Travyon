import { db, functions } from './firebase';
import {
  collection, doc, getDoc, getDocs, deleteDoc,
  query, orderBy, limit, where, Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { TravelPlanResponse } from './aiService';
import type { OnboardingData } from '../store/useOnboardingStore';

/*
 * Kayıtlı planlar localStorage'da tutulduğu için eski sürümlerde oluşturulan
 * planlar, güncel paylaşım şemasındaki bazı alanları taşımayabilir. Ekranda
 * gösterilebilen bu planları Cloud Function'a göndermeden önce güncel ve
 * sınırlandırılmış şekle getiriyoruz. Sunucudaki doğrulama yine son güvenlik
 * katmanı olarak çalışmaya devam eder.
 */
const boundedText = (value: unknown, maxLength: number, fallback = ''): string => {
  const text = typeof value === 'string' ? value : fallback;
  return text.slice(0, maxLength);
};

const boundedAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.min(Math.max(amount, 0), 1_000_000_000);
};

const fallbackDate = (startDate: string, dayIndex: number): string => {
  const parsed = Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return '1970-01-01';
  return new Date(parsed + dayIndex * 86_400_000).toISOString().slice(0, 10);
};

const normalizePlanForSharing = (
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
): TravelPlanResponse => ({
  ...plan,
  destination: boundedText(plan.destination, 200, onboardingData.destination || 'Gezi planı').trim()
    || 'Gezi planı',
  overallSummary: boundedText(plan.overallSummary, 10_000),
  totalEstimatedCost: boundedAmount(plan.totalEstimatedCost),
  currencySymbol: boundedText(plan.currencySymbol, 10, onboardingData.currencySymbol || '₺'),
  cityGuide: {
    transportationTips: boundedText(plan.cityGuide?.transportationTips, 5_000),
    localCustoms: boundedText(plan.cityGuide?.localCustoms, 5_000),
    generalAdvice: boundedText(plan.cityGuide?.generalAdvice, 5_000),
  },
  dailyPlans: (Array.isArray(plan.dailyPlans) ? plan.dailyPlans : []).slice(0, 31).map((day, dayIndex) => ({
    ...day,
    dayNumber: dayIndex + 1,
    date: boundedText(day?.date, 32, fallbackDate(onboardingData.startDate, dayIndex)).trim()
      || fallbackDate(onboardingData.startDate, dayIndex),
    daySummary: boundedText(day?.daySummary, 4_000),
    totalEstimatedCost: boundedAmount(day?.totalEstimatedCost),
    activities: (Array.isArray(day?.activities) ? day.activities : []).slice(0, 15).map((activity) => {
      const rawLat = Number(activity?.coordinates?.lat);
      const rawLng = Number(activity?.coordinates?.lng);
      const normalized = {
        period: boundedText(activity?.period, 50, 'Gün').trim() || 'Gün',
        placeName: boundedText(activity?.placeName, 200, 'İsimsiz durak').trim() || 'İsimsiz durak',
        description: boundedText(activity?.description, 4_000),
        coordinates: {
          lat: Number.isFinite(rawLat) ? Math.min(Math.max(rawLat, -90), 90) : 0,
          lng: Number.isFinite(rawLng) ? Math.min(Math.max(rawLng, -180), 180) : 0,
        },
        estimatedCost: boundedAmount(activity?.estimatedCost),
      };

      if (activity?.actualCost !== undefined) {
        return {
          ...normalized,
          actualCost: boundedAmount(activity.actualCost),
          ...(typeof activity.note === 'string' ? { note: boundedText(activity.note, 2_000) } : {}),
        };
      }
      return {
        ...normalized,
        ...(typeof activity?.note === 'string' ? { note: boundedText(activity.note, 2_000) } : {}),
      };
    }),
  })),
});

const normalizeOnboardingForSharing = (data: OnboardingData) => ({
  budget: boundedAmount(data.budget),
  currencySymbol: boundedText(data.currencySymbol, 100, '₺'),
  tripPurpose: boundedText(data.tripPurpose, 100),
  travelType: boundedText(data.travelType, 100),
  peopleCount: Math.min(Math.max(Math.trunc(Number(data.peopleCount)) || 1, 1), 100),
  pace: boundedText(data.pace, 100),
  purposes: (Array.isArray(data.purposes) ? data.purposes : [])
    .slice(0, 20).map((item) => boundedText(item, 100)),
  earlyBird: data.earlyBird === true,
  dietaryRestrictions: (Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : [])
    .slice(0, 20).map((item) => boundedText(item, 100)),
  foodPhilosophy: boundedText(data.foodPhilosophy, 100),
  accommodation: boundedText(data.accommodation, 100),
  transport: boundedText(data.transport, 100),
  startDate: boundedText(data.startDate, 32),
  endDate: boundedText(data.endDate, 32),
});

/* ══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
export interface PublicPlan {
  id:              string;
  userId:          string;
  userDisplayName: string;
  userPhotoURL:    string | null;
  destination:     string;
  dailyPlanCount:  number;
  budget:          number;
  currencySymbol:  string;
  tripPurpose:     string;
  createdAt:       number;   // ms timestamp
  avgRating:       number;
  ratingCount:     number;
  feedVisible?:    boolean;  // false → sadece link ile görülebilir, community feed'de çıkmaz
  profilePublic?:  boolean;
  // Onboarding seçimleri (opsiyonel — eski planlar yoksa undefined)
  travelType?:          string;
  peopleCount?:         number;
  pace?:                string;
  purposes?:            string[];
  earlyBird?:           boolean;
  dietaryRestrictions?: string[];
  foodPhilosophy?:      string;
  accommodation?:       string;
  transport?:           string;
  startDate?:           string;
  endDate?:             string;
}

/* ══════════════════════════════════════════════
   Plan Sharing
   Not: userId/displayName/photoURL artık istemciden gönderilmiyor —
   sharePublicPlan Cloud Function'ı kendi Auth kaydından (request.auth)
   güvenilir şekilde türetiyor (sahte isim/foto engellenir).
═══════════════════════════════════════════════ */
const callSharePublicPlan = async (
  planId: string,
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
  linkOnly?: boolean,
): Promise<void> => {
  const normalizedPlan = normalizePlanForSharing(plan, onboardingData);
  if (normalizedPlan.dailyPlans.length === 0) {
    throw new Error('invalid-plan');
  }
  const normalizedOnboardingData = normalizeOnboardingForSharing(onboardingData);
  const fn = httpsCallable<
    {
      planId: string;
      plan: TravelPlanResponse;
      onboardingData: ReturnType<typeof normalizeOnboardingForSharing>;
      linkOnly?: boolean;
    },
    { ok: true }
  >(functions, 'sharePublicPlan');
  await fn({
    planId,
    plan: normalizedPlan,
    onboardingData: normalizedOnboardingData,
    ...(typeof linkOnly === 'boolean' ? { linkOnly } : {}),
  });
};

export const shareplan = async (
  planId: string,
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
  /** @deprecated sunucu artık kendi Auth kaydını kullanıyor, bu parametre yok sayılıyor */
  _user?: { uid: string; displayName: string | null; photoURL: string | null },
): Promise<void> => {
  void _user;
  await callSharePublicPlan(planId, plan, onboardingData);
};

export const unshareplan = async (planId: string): Promise<void> => {
  const fn = httpsCallable<{ planId: string }, { ok: true }>(functions, 'unsharePublicPlan');
  await fn({ planId });
};

/** Planı sadece link ile görülebilecek şekilde paylaşır — community feed'e çıkmaz */
export const sharePlanAsLink = async (
  planId: string,
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
  /** @deprecated sunucu artık kendi Auth kaydını kullanıyor, bu parametre yok sayılıyor */
  _user?: { uid: string; displayName: string | null; photoURL: string | null },
): Promise<void> => {
  void _user;
  await callSharePublicPlan(planId, plan, onboardingData, true);
};

/** Kullanıcının TÜM paylaşılmış planlarında isim/foto bilgisini günceller
 *  (profil adı veya fotoğrafı değiştiğinde toplulukta da yansısın) */
export const syncSharedPlansIdentity = async (
  _userId: string,
  _displayName: string | null,
  _photoURL: string | null,
): Promise<void> => {
  void _userId; void _displayName; void _photoURL;
  const fn = httpsCallable<Record<string, never>, { ok: true }>(functions, 'syncSharedPlansIdentity');
  await fn({});
};

export const getMySharedPlanIds = async (userId: string): Promise<Set<string>> => {
  const q = query(collection(db, 'publicPlans'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return new Set(snap.docs.map(d => d.id));
};

/* ══════════════════════════════════════════════
   Public Feed
═══════════════════════════════════════════════ */
const toPublicPlan = (id: string, data: Record<string, unknown>): PublicPlan => ({
  id,
  userId:          data.userId          as string,
  userDisplayName: data.userDisplayName as string,
  userPhotoURL:    (data.userPhotoURL   as string | null) ?? null,
  destination:     data.destination     as string,
  dailyPlanCount:  (data.dailyPlanCount as number) ?? 0,
  budget:          (data.budget         as number) ?? 0,
  currencySymbol:  (data.currencySymbol as string) ?? '₺',
  tripPurpose:     (data.tripPurpose    as string) ?? '',
  createdAt:       data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
  avgRating:       (data.avgRating      as number) ?? 0,
  ratingCount:     (data.ratingCount    as number) ?? 0,
  feedVisible:     data.feedVisible !== false,
  profilePublic:   data.profilePublic === true,
  travelType:          (data.travelType          as string)   || undefined,
  peopleCount:         (data.peopleCount          as number)  || undefined,
  pace:                (data.pace                as string)   || undefined,
  purposes:            (data.purposes            as string[]) || undefined,
  earlyBird:           data.earlyBird            != null ? (data.earlyBird as boolean) : undefined,
  dietaryRestrictions: (data.dietaryRestrictions as string[]) || undefined,
  foodPhilosophy:      (data.foodPhilosophy      as string)   || undefined,
  accommodation:       (data.accommodation       as string)   || undefined,
  transport:           (data.transport           as string)   || undefined,
  startDate:           (data.startDate           as string)   || undefined,
  endDate:             (data.endDate             as string)   || undefined,
});

export const getPublicPlanRecord = async (planId: string): Promise<{
  meta: PublicPlan;
  planData: TravelPlanResponse;
} | null> => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(planId)) return null;
  const snap = await getDoc(doc(db, 'publicPlans', planId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  if (!data.planData) return null;
  return { meta: toPublicPlan(snap.id, data), planData: data.planData as TravelPlanResponse };
};

export const getPublicFeed = async (limitCount = 10): Promise<PublicPlan[]> => {
  const safeLimit = Math.min(Math.max(Math.trunc(limitCount) || 10, 1), 50);
  const q = query(
    collection(db, 'publicPlans'),
    where('feedVisible', '==', true),
    orderBy('createdAt', 'desc'),
    limit(safeLimit),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toPublicPlan(d.id, d.data() as Record<string, unknown>))
    .filter(p => p.feedVisible !== false)
    .slice(0, safeLimit); // link-only planları feed'den gizle
};

export const getPublicPlansByUser = async (userId: string, limitCount = 50): Promise<PublicPlan[]> => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limitCount) || 50, 1), 100);
  const q = query(
    collection(db, 'publicPlans'),
    where('userId', '==', userId),
    where('feedVisible', '==', true),
    orderBy('createdAt', 'desc'),
    limit(safeLimit),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => toPublicPlan(d.id, d.data() as Record<string, unknown>));
};

/* ══════════════════════════════════════════════
   Community Ratings  (on shared plans)
═══════════════════════════════════════════════ */
export const ratePlan = async (
  planId: string,
  _userId: string,
  rating: number,
): Promise<{ newAvg: number; newCount: number }> => {
  void _userId;
  const fn = httpsCallable<
    { planId: string; rating: number },
    { newAvg: number; newCount: number }
  >(functions, 'ratePublicPlan');
  const result = await fn({ planId, rating });
  return result.data;
};

export const getUserRatings = async (
  userId: string,
  planIds: string[],
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};
  await Promise.all(
    planIds.map(async (planId) => {
      const snap = await getDoc(doc(db, 'planRatings', `${planId}_${userId}`));
      if (snap.exists()) results[planId] = snap.data().rating as number;
    }),
  );
  return results;
};

/* ══════════════════════════════════════════════
   Follow System  (Twitter-style, one-way)
   Not: myUid artık kullanılmıyor — followUserAction Cloud Function'ı
   çağıranı request.auth üzerinden zaten biliyor, istek-sıklığı sınırı
   uyguluyor. İmza geriye dönük uyumluluk için korunuyor.
═══════════════════════════════════════════════ */
export const followUser = async (
  /** @deprecated sunucu artık request.auth üzerinden çağıranı biliyor, bu parametre yok sayılıyor */
  _myUid: string,
  targetUid: string,
): Promise<void> => {
  const fn = httpsCallable<{ targetUid: string }, { ok: true }>(functions, 'followUserAction');
  await fn({ targetUid });
};

export const unfollowUser = async (myUid: string, targetUid: string): Promise<void> => {
  await deleteDoc(doc(db, 'userFollows', myUid, 'following', targetUid));
};

export const getFollowingList = async (myUid: string): Promise<string[]> => {
  const snap = await getDocs(collection(db, 'userFollows', myUid, 'following'));
  return snap.docs.map(d => d.id);
};

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email?: string;
}

export const getPublicUserProfile = async (targetUid: string): Promise<{
  exists: boolean;
  isPublic: boolean;
  displayName?: string;
  photoURL?: string | null;
}> => {
  const fn = httpsCallable<
    { targetUid: string },
    { exists: boolean; isPublic: boolean; displayName?: string; photoURL?: string | null }
  >(functions, 'getPublicProfile');
  return (await fn({ targetUid })).data;
};

/** Birden fazla kullanıcının profilini Firestore'dan çeker.
 *  Önce users/ koleksiyonuna bakar; yoksa publicPlans'taki bilgileri kullanır. */
export const getUserProfiles = async (uids: string[]): Promise<UserProfile[]> => {
  if (!uids.length) return [];
  const results = await Promise.all(
    uids.map(async (uid): Promise<UserProfile | null> => {
      try {
        const profile = await getPublicUserProfile(uid);
        if (!profile.exists || !profile.isPublic) return null;
        return {
          uid,
          displayName: profile.displayName || 'Gezgin',
          photoURL: profile.photoURL ?? null,
        };
      } catch { return null; }
    })
  );
  return results.filter(Boolean) as UserProfile[];
};
