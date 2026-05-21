import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  plans: SavedPlan[];
  addPlan: (plan: TravelPlanResponse, onboardingData: OnboardingData) => string;
  removePlan: (id: string) => void;
  toggleFavorite: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  getPlanById: (id: string) => SavedPlan | undefined;
  clearAll: () => void;
}

const generateId = (): string =>
  `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useSavedPlansStore = create<SavedPlansState>()(
  persist(
    (set, get) => ({
      plans: [],

      addPlan: (plan, onboardingData) => {
        const id = generateId();
        const newPlan: SavedPlan = {
          id,
          createdAt: Date.now(),
          isFavorite: false,
          plan,
          onboardingData,
        };
        set((state) => ({ plans: [newPlan, ...state.plans] }));
        return id;
      },

      removePlan: (id) => {
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          ),
        }));
      },

      renamePlan: (id, name) => {
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id ? { ...p, customName: name } : p
          ),
        }));
      },

      getPlanById: (id) => {
        return get().plans.find((p) => p.id === id);
      },

      clearAll: () => set({ plans: [] }),
    }),
    {
      name: 'travyon-saved-plans',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
