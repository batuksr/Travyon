import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import type { TravelPlanResponse } from '../services/aiService';
import type { OnboardingData } from './useOnboardingStore';
import {
  clearPlansFromCloud,
  deletePlanFromCloud,
  savePlanToCloud,
} from '../services/savedPlansCloudService';

export interface SavedPlan {
  id: string;
  createdAt: number;
  customName?: string;
  isFavorite: boolean;
  plan: TravelPlanResponse;
  onboardingData: OnboardingData;
}

interface SavedPlansState {
  plansByUser: Record<string, SavedPlan[]>;
  addPlan: (plan: TravelPlanResponse, onboardingData: OnboardingData) => string;
  updatePlan: (id: string, plan: TravelPlanResponse, onboardingData: OnboardingData) => void;
  removePlan: (id: string) => void;
  toggleFavorite: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  getPlanById: (id: string) => SavedPlan | undefined;
  clearAll: () => void;
  replaceUserPlans: (uid: string, plans: SavedPlan[]) => void;
}

const generateId = (): string =>
  `plan_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const getUid = (): string =>
  useAuthStore.getState().user?.uid ?? 'anonymous';

export const useSavedPlansStore = create<SavedPlansState>()(
  persist(
    (set, get) => ({
      plansByUser: {},

      addPlan: (plan, onboardingData) => {
        const uid = getUid();
        const id = generateId();
        const newPlan: SavedPlan = { id, createdAt: Date.now(), isFavorite: false, plan, onboardingData };
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: [newPlan, ...(state.plansByUser[uid] ?? [])],
          },
        }));
        if (uid !== 'anonymous') void savePlanToCloud(uid, newPlan).catch(() => {});
        return id;
      },

      updatePlan: (id, plan, onboardingData) => {
        const uid = getUid();
        let updatedPlan: SavedPlan | undefined;
        set((state) => {
          const userPlans = state.plansByUser[uid] ?? [];
          const existingPlan = userPlans.find((savedPlan) => savedPlan.id === id);
          updatedPlan = existingPlan
            ? { ...existingPlan, plan, onboardingData }
            : {
                id,
                createdAt: Date.now(),
                isFavorite: false,
                plan,
                onboardingData,
              };

          return {
            plansByUser: {
              ...state.plansByUser,
              [uid]: existingPlan
                ? userPlans.map((savedPlan) => savedPlan.id === id ? updatedPlan! : savedPlan)
                : [updatedPlan, ...userPlans],
            },
          };
        });
        if (uid !== 'anonymous' && updatedPlan) {
          void savePlanToCloud(uid, updatedPlan).catch(() => {});
        }
      },

      removePlan: (id) => {
        const uid = getUid();
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).filter((p) => p.id !== id),
          },
        }));
        if (uid !== 'anonymous') void deletePlanFromCloud(uid, id).catch(() => {});
      },

      toggleFavorite: (id) => {
        const uid = getUid();
        let updatedPlan: SavedPlan | undefined;
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).map((p) =>
              p.id === id ? (updatedPlan = { ...p, isFavorite: !p.isFavorite }) : p
            ),
          },
        }));
        if (uid !== 'anonymous' && updatedPlan) {
          void savePlanToCloud(uid, updatedPlan).catch(() => {});
        }
      },

      renamePlan: (id, name) => {
        const uid = getUid();
        let updatedPlan: SavedPlan | undefined;
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).map((p) =>
              p.id === id ? (updatedPlan = { ...p, customName: name }) : p
            ),
          },
        }));
        if (uid !== 'anonymous' && updatedPlan) {
          void savePlanToCloud(uid, updatedPlan).catch(() => {});
        }
      },

      getPlanById: (id) => {
        const uid = getUid();
        return (get().plansByUser[uid] ?? []).find((p) => p.id === id);
      },

      clearAll: () => {
        const uid = getUid();
        set((state) => ({
          plansByUser: { ...state.plansByUser, [uid]: [] },
        }));
        if (uid !== 'anonymous') void clearPlansFromCloud(uid).catch(() => {});
      },

      replaceUserPlans: (uid, plans) => {
        set((state) => ({
          plansByUser: { ...state.plansByUser, [uid]: plans },
        }));
      },
    }),
    {
      name: 'travyon-saved-plans-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Sadece giriş yapan kullanıcının planlarını döner
export const useUserPlans = (): SavedPlan[] => {
  const user = useAuthStore((s) => s.user);
  const plansByUser = useSavedPlansStore((s) => s.plansByUser);
  return plansByUser[user?.uid ?? ''] ?? [];
};
