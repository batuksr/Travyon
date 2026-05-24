import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import type { TravelPlanResponse } from '../services/aiService';
import type { OnboardingData } from './useOnboardingStore';

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
        return id;
      },

      updatePlan: (id, plan, onboardingData) => {
        const uid = getUid();
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).map((p) =>
              p.id === id ? { ...p, plan, onboardingData } : p
            ),
          },
        }));
      },

      removePlan: (id) => {
        const uid = getUid();
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).filter((p) => p.id !== id),
          },
        }));
      },

      toggleFavorite: (id) => {
        const uid = getUid();
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).map((p) =>
              p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
            ),
          },
        }));
      },

      renamePlan: (id, name) => {
        const uid = getUid();
        set((state) => ({
          plansByUser: {
            ...state.plansByUser,
            [uid]: (state.plansByUser[uid] ?? []).map((p) =>
              p.id === id ? { ...p, customName: name } : p
            ),
          },
        }));
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
