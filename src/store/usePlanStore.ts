import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TravelPlanResponse, DailyPlan, DailyActivity } from '../services/aiService';

interface PlanState {
  plan: TravelPlanResponse | null;
  savedPlanId: string | null;
  setPlan: (plan: TravelPlanResponse) => void;
  setSavedPlanId: (id: string | null) => void;
  updateDayPlan: (dayNumber: number, newDayPlan: DailyPlan) => void;
  updateActivityActualCost: (dayNumber: number, activityIndex: number, cost: number) => void;
  deleteActivity: (dayNumber: number, activityIndex: number) => void;
  moveActivity: (dayNumber: number, fromIndex: number, toIndex: number) => void;
  addActivity: (dayNumber: number, activity: DailyActivity, insertIndex?: number) => void;
  clearPlan: () => void;
}

const recalcCost = (activities: DailyActivity[]) =>
  activities.reduce((s, a) => s + (a.actualCost ?? a.estimatedCost), 0);

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: null,
      savedPlanId: null,
      setPlan: (plan) => set({ plan, savedPlanId: null }),
      setSavedPlanId: (id) => set({ savedPlanId: id }),
      updateDayPlan: (dayNumber, newDayPlan) => set((state) => {
        if (!state.plan) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day =>
          day.dayNumber === dayNumber ? newDayPlan : day
        );
        return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
      }),
      updateActivityActualCost: (dayNumber, activityIndex, cost) => set((state) => {
        if (!state.plan) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const updatedActivities = [...day.activities];
          updatedActivities[activityIndex] = { ...updatedActivities[activityIndex], actualCost: cost };
          return { ...day, activities: updatedActivities, totalEstimatedCost: recalcCost(updatedActivities) };
        });
        return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
      }),
      deleteActivity: (dayNumber, activityIndex) => set((state) => {
        if (!state.plan) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = day.activities.filter((_, i) => i !== activityIndex);
          return { ...day, activities, totalEstimatedCost: recalcCost(activities) };
        });
        return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
      }),
      moveActivity: (dayNumber, fromIndex, toIndex) => set((state) => {
        if (!state.plan) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = [...day.activities];
          const [moved] = activities.splice(fromIndex, 1);
          activities.splice(toIndex, 0, moved);
          return { ...day, activities };
        });
        return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
      }),
      addActivity: (dayNumber, activity, insertIndex) => set((state) => {
        if (!state.plan) return state;
        const updatedDailyPlans = state.plan.dailyPlans.map(day => {
          if (day.dayNumber !== dayNumber) return day;
          const activities = [...day.activities];
          activities.splice(insertIndex ?? activities.length, 0, activity);
          return { ...day, activities, totalEstimatedCost: recalcCost(activities) };
        });
        return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
      }),
      clearPlan: () => set({ plan: null, savedPlanId: null }),
    }),
    { name: 'travyon-plan' }
  )
);
