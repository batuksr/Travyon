import { create } from 'zustand';
import type { TravelPlanResponse, DailyPlan } from '../services/aiService';

interface PlanState {
  plan: TravelPlanResponse | null;
  setPlan: (plan: TravelPlanResponse) => void;
  updateDayPlan: (dayNumber: number, newDayPlan: DailyPlan) => void;
  updateActivityActualCost: (dayNumber: number, activityIndex: number, cost: number) => void;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
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
      if (day.dayNumber === dayNumber) {
        const updatedActivities = [...day.activities];
        updatedActivities[activityIndex] = { ...updatedActivities[activityIndex], actualCost: cost };
        return { ...day, activities: updatedActivities };
      }
      return day;
    });
    return { plan: { ...state.plan, dailyPlans: updatedDailyPlans } };
  }),
  clearPlan: () => set({ plan: null }),
}));
