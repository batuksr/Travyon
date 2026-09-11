import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TravelPlanResponse, DailyPlan, DailyActivity } from '../services/aiService';
import { useAuthStore } from './useAuthStore';

interface PlanState {
  plan: TravelPlanResponse | null;
  savedPlanId: string | null;
  ownerUid: string | null;
  history: TravelPlanResponse[];
  undo: () => void;
  toggleActivityCompleted: (dayNumber: number, index: number) => void;
  setPlan: (plan: TravelPlanResponse) => void;
  setSavedPlanId: (id: string | null) => void;
  updateDayPlan: (dayNumber: number, newDayPlan: DailyPlan) => void;
  updateActivityActualCost: (dayNumber: number, activityIndex: number, cost: number) => void;
  deleteActivity: (dayNumber: number, activityIndex: number) => void;
  moveActivity: (dayNumber: number, fromIndex: number, toIndex: number) => void;
  addActivity: (dayNumber: number, activity: DailyActivity, insertIndex?: number) => void;
  updateActivityNote: (dayNumber: number, activityIndex: number, note: string) => void;
  clearPlan: () => void;
}

const recalcCost = (activities: DailyActivity[]) =>
  activities.reduce((s, a) => s + a.estimatedCost, 0);

export const recalculatePlanEstimates = (plan: TravelPlanResponse): TravelPlanResponse => {
  const dailyPlans = plan.dailyPlans.map(day => ({ ...day, totalEstimatedCost: recalcCost(day.activities) }));
  return { ...plan, dailyPlans, totalEstimatedCost: dailyPlans.reduce((sum, day) => sum + day.totalEstimatedCost, 0) };
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: null,
      savedPlanId: null,
      ownerUid: null,
      history: [],
      undo: () => set(state => state.history.length ? { plan: state.history[state.history.length - 1], history: state.history.slice(0, -1) } : {}),
      toggleActivityCompleted: (dayNumber, index) => set(state => {
        if (!state.plan) return state;
        const day = state.plan.dailyPlans.find(d => d.dayNumber === dayNumber);
        if (!day?.activities[index]) return state;
        return {
          history: [...state.history.slice(-19), state.plan],
          plan: { ...state.plan, dailyPlans: state.plan.dailyPlans.map(d => d !== day ? d : { ...d, activities: d.activities.map((a, i) => i === index ? { ...a, completed: !a.completed } : a) }) },
        };
      }),
      setPlan: (plan) => set({
        plan: recalculatePlanEstimates(plan),
        history: [],
        savedPlanId: null,
        ownerUid: useAuthStore.getState().user?.uid ?? null,
      }),
      setSavedPlanId: (id) => set({ savedPlanId: id }),
      updateDayPlan: (dayNumber, newDayPlan) => set((state) => {
        if (!state.plan) return state;
        if (!state.plan.dailyPlans.some(day => day.dayNumber === dayNumber) || newDayPlan.dayNumber !== dayNumber) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day =>
          day.dayNumber === dayNumber ? newDayPlan : day
        );
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      updateActivityActualCost: (dayNumber, activityIndex, cost) => set((state) => {
        if (!state.plan) return state;
        if (!Number.isFinite(cost) || cost < 0 || !Number.isInteger(activityIndex)) return state;
        const target = state.plan.dailyPlans.find(day => day.dayNumber === dayNumber)?.activities[activityIndex];
        if (!target || target.actualCost === cost) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const updatedActivities = [...day.activities];
          updatedActivities[activityIndex] = { ...updatedActivities[activityIndex], actualCost: cost };
          return { ...day, activities: updatedActivities, totalEstimatedCost: recalcCost(updatedActivities) };
        });
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      deleteActivity: (dayNumber, activityIndex) => set((state) => {
        if (!state.plan) return state;
        if (!Number.isInteger(activityIndex) || !state.plan.dailyPlans.find(day => day.dayNumber === dayNumber)?.activities[activityIndex]) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = day.activities.filter((_, i) => i !== activityIndex);
          return { ...day, activities, totalEstimatedCost: recalcCost(activities) };
        });
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      moveActivity: (dayNumber, fromIndex, toIndex) => set((state) => {
        if (!state.plan) return state;
        const target = state.plan.dailyPlans.find(day => day.dayNumber === dayNumber);
        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || !target || fromIndex === toIndex || !target.activities[fromIndex] || toIndex < 0 || toIndex >= target.activities.length) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = [...day.activities];
          const [moved] = activities.splice(fromIndex, 1);
          activities.splice(toIndex, 0, moved);
          return { ...day, activities };
        });
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      addActivity: (dayNumber, activity, insertIndex) => set((state) => {
        if (!state.plan) return state;
        const target = state.plan.dailyPlans.find(day => day.dayNumber === dayNumber);
        if (!target || (insertIndex !== undefined && (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > target.activities.length))) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = [...day.activities];
          activities.splice(insertIndex ?? activities.length, 0, activity);
          return { ...day, activities, totalEstimatedCost: recalcCost(activities) };
        });
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      updateActivityNote: (dayNumber, activityIndex, note) => set((state) => {
        if (!state.plan) return state;
        if (!Number.isInteger(activityIndex)) return state;
        const target = state.plan.dailyPlans.find(day => day.dayNumber === dayNumber)?.activities[activityIndex];
        if (!target || (target.note ?? '') === note.trim()) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = [...day.activities];
          activities[activityIndex] = {
            ...activities[activityIndex],
            note: note.trim() || undefined,
          };
          return { ...day, activities };
        });
        return { history: [...state.history.slice(-19), state.plan], plan: recalculatePlanEstimates({ ...state.plan, dailyPlans: updatedDailyPlans }) };
      }),
      clearPlan: () => set({ plan: null, savedPlanId: null, ownerUid: null, history: [] }),
    }),
    {
      name: 'travyon-plan',
      partialize: ({ plan, savedPlanId, ownerUid }) => ({ plan, savedPlanId, ownerUid }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PlanState> | undefined;
        return { ...current, plan: saved?.plan ? recalculatePlanEstimates(saved.plan) : null, savedPlanId: saved?.savedPlanId ?? null, ownerUid: saved?.ownerUid ?? null, history: [] };
      },
    }
  )
);
