import { db } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  query, orderBy, limit, where, serverTimestamp,
  runTransaction, Timestamp,
} from 'firebase/firestore';
import type { TravelPlanResponse } from './aiService';
import type { OnboardingData } from '../store/useOnboardingStore';

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
═══════════════════════════════════════════════ */
export const shareplan = async (
  planId: string,
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
  user: { uid: string; displayName: string | null; photoURL: string | null },
): Promise<void> => {
  await setDoc(doc(db, 'publicPlans', planId), {
    userId:          user.uid,
    userDisplayName: user.displayName ?? 'Gezgin',
    userPhotoURL:    user.photoURL ?? null,
    destination:     plan.destination,
    dailyPlanCount:  plan.dailyPlans.length,
    budget:          onboardingData.budget,
    currencySymbol:  onboardingData.currencySymbol ?? '₺',
    tripPurpose:     onboardingData.tripPurpose ?? '',
    createdAt:       serverTimestamp(),
    avgRating:       0,
    ratingCount:     0,
    // Onboarding seçimleri
    travelType:          onboardingData.travelType          ?? '',
    peopleCount:         onboardingData.peopleCount         ?? 1,
    pace:                onboardingData.pace                ?? '',
    purposes:            onboardingData.purposes            ?? [],
    earlyBird:           onboardingData.earlyBird           ?? false,
    dietaryRestrictions: onboardingData.dietaryRestrictions ?? [],
    foodPhilosophy:      onboardingData.foodPhilosophy      ?? '',
    accommodation:       onboardingData.accommodation       ?? '',
    transport:           onboardingData.transport           ?? '',
    startDate:           onboardingData.startDate           ?? '',
    endDate:             onboardingData.endDate             ?? '',
    planData:            plan,
  });
};

export const getPublicPlanDetails = async (planId: string): Promise<TravelPlanResponse | null> => {
  const snap = await getDoc(doc(db, 'publicPlans', planId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return (data?.planData as TravelPlanResponse) ?? null;
};

export const unshareplan = async (planId: string): Promise<void> => {
  await deleteDoc(doc(db, 'publicPlans', planId));
};

/** Paylaşılmış plandaki fotoğrafı günceller (profil foto değiştiğinde) */
export const updatePlanPhoto = async (planId: string, photoURL: string | null): Promise<void> => {
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, 'publicPlans', planId), { userPhotoURL: photoURL ?? null });
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

export const getPublicFeed = async (limitCount = 10): Promise<PublicPlan[]> => {
  const q = query(
    collection(db, 'publicPlans'),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => toPublicPlan(d.id, d.data() as Record<string, unknown>));
};

/* ══════════════════════════════════════════════
   Community Ratings  (on shared plans)
═══════════════════════════════════════════════ */
export const ratePlan = async (
  planId: string,
  userId: string,
  rating: number,
): Promise<{ newAvg: number; newCount: number }> => {
  const ratingRef = doc(db, 'planRatings', `${planId}_${userId}`);
  const planRef   = doc(db, 'publicPlans', planId);

  return runTransaction(db, async (tx) => {
    const [existingSnap, planSnap] = await Promise.all([tx.get(ratingRef), tx.get(planRef)]);
    if (!planSnap.exists()) throw new Error('Plan bulunamadı');

    const curr  = planSnap.data() as { avgRating?: number; ratingCount?: number };
    let count   = curr.ratingCount ?? 0;
    let sum     = (curr.avgRating ?? 0) * count;

    if (existingSnap.exists()) {
      sum = sum - (existingSnap.data().rating as number) + rating;   // replace old rating
    } else {
      sum  += rating;
      count += 1;
    }

    const newAvg = count > 0 ? sum / count : 0;
    tx.set(ratingRef, { planId, userId, rating, createdAt: serverTimestamp() });
    tx.update(planRef, { avgRating: newAvg, ratingCount: count });
    return { newAvg, newCount: count };
  });
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
═══════════════════════════════════════════════ */
export const followUser = async (myUid: string, targetUid: string): Promise<void> => {
  await setDoc(doc(db, 'userFollows', myUid, 'following', targetUid), {
    followedAt: serverTimestamp(),
  });
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

/** Birden fazla kullanıcının profilini Firestore'dan çeker.
 *  Önce users/ koleksiyonuna bakar; yoksa publicPlans'taki bilgileri kullanır. */
export const getUserProfiles = async (uids: string[]): Promise<UserProfile[]> => {
  if (!uids.length) return [];
  const results = await Promise.all(
    uids.map(async (uid): Promise<UserProfile | null> => {
      let displayName = '';
      let photoURL: string | null = null;
      let email: string | undefined;

      // 1) users/ koleksiyonundan dene
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const d = snap.data();
          displayName = (d.displayName as string) || '';
          photoURL    = (d.photoURL    as string | null) ?? null;
          email       = (d.email       as string | undefined);
        }
      } catch { /* izin yok veya belge yok — fallback'e geç */ }

      // 2) publicPlans'tan fallback — isim veya foto eksikse tamamla
      if (!displayName || !photoURL) {
        try {
          const q = query(
            collection(db, 'publicPlans'),
            where('userId', '==', uid),
            limit(1),
          );
          const plansSnap = await getDocs(q);
          if (!plansSnap.empty) {
            const d = plansSnap.docs[0].data();
            if (!displayName) displayName = (d.userDisplayName as string) || '';
            if (!photoURL)    photoURL    = (d.userPhotoURL    as string | null) ?? null;
          }
        } catch { /* hata */ }
      }

      return { uid, displayName: displayName || 'Gezgin', photoURL, email };
    })
  );
  return results.filter(Boolean) as UserProfile[];
};
