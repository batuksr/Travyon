import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedPlan } from '../store/useSavedPlansStore';

const plansCollection = (uid: string) => collection(db, 'users', uid, 'plans');
const planDocument = (uid: string, planId: string) =>
  doc(db, 'users', uid, 'plans', planId);

const firestorePayload = (plan: SavedPlan): Record<string, unknown> =>
  JSON.parse(JSON.stringify({
    createdAt: plan.createdAt,
    customName: plan.customName,
    isFavorite: plan.isFavorite,
    plan: plan.plan,
    onboardingData: plan.onboardingData,
    schemaVersion: 1,
    updatedAt: Date.now(),
  })) as Record<string, unknown>;

const savedPlanFromDocument = (
  id: string,
  data: Record<string, unknown>,
): SavedPlan | null => {
  if (!data.plan || !data.onboardingData) return null;
  return {
    id,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    customName: typeof data.customName === 'string' ? data.customName : undefined,
    isFavorite: data.isFavorite === true,
    plan: data.plan as SavedPlan['plan'],
    onboardingData: data.onboardingData as SavedPlan['onboardingData'],
  };
};

export const savePlanToCloud = async (uid: string, plan: SavedPlan): Promise<void> => {
  await setDoc(planDocument(uid, plan.id), firestorePayload(plan), { merge: true });
};

export const deletePlanFromCloud = async (uid: string, planId: string): Promise<void> => {
  await deleteDoc(planDocument(uid, planId));
};

export const clearPlansFromCloud = async (uid: string): Promise<void> => {
  const snapshot = await getDocs(plansCollection(uid));
  await Promise.all(snapshot.docs.map((plan) => deleteDoc(plan.ref)));
};

/**
 * Eski localStorage planlarını yalnızca bulutta aynı kimlik yoksa yükler.
 * Böylece başka bir cihazdaki daha güncel plan yanlışlıkla ezilmez.
 */
export const migrateLocalPlansToCloud = async (
  uid: string,
  localPlans: SavedPlan[],
): Promise<void> => {
  if (localPlans.length === 0) return;
  const snapshot = await getDocs(plansCollection(uid));
  const existingIds = new Set(snapshot.docs.map((plan) => plan.id));
  await Promise.all(
    localPlans
      .filter((plan) => !existingIds.has(plan.id))
      .map((plan) => savePlanToCloud(uid, plan)),
  );
};

export const subscribeToCloudPlans = (
  uid: string,
  onPlans: (plans: SavedPlan[]) => void,
  onError: (error: Error) => void,
): Unsubscribe => {
  const plansQuery = query(plansCollection(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    plansQuery,
    (snapshot) => {
      // Firestore can first emit an empty cached snapshot while the emulator or
      // network connection is still being established. Do not let that
      // transient state erase plans that are already stored in localStorage.
      if (snapshot.empty && snapshot.metadata.fromCache) return;

      const plans = snapshot.docs
        .map((plan) => savedPlanFromDocument(plan.id, plan.data()))
        .filter((plan): plan is SavedPlan => plan !== null);
      onPlans(plans);
    },
    onError,
  );
};
