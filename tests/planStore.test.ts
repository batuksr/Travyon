import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TravelPlanResponse } from '../src/services/aiService';

vi.mock('../src/store/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { uid: 'test-user' } }) } }));
const { memory } = vi.hoisted(() => ({ memory: new Map<string, string>() }));
vi.mock('zustand/middleware', async importOriginal => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return { ...actual, persist: ((config, options) => actual.persist(config, { ...options, storage: {
    getItem: (key: string) => memory.has(key) ? JSON.parse(memory.get(key)!) : null,
    setItem: (key: string, value: unknown) => { memory.set(key, JSON.stringify(value)); },
    removeItem: (key: string) => { memory.delete(key); },
  } })) as typeof actual.persist };
});
let usePlanStore: typeof import('../src/store/usePlanStore').usePlanStore;
const fixture = (): TravelPlanResponse => ({
  destination: 'Sevilla', currencySymbol: '€', overallSummary: '', totalEstimatedCost: 999,
  cityGuide: { generalAdvice: '', localCustoms: '', transportationTips: '' },
  dailyPlans: [1, 2].map(dayNumber => ({ dayNumber, date: `2026-09-${10 + dayNumber}`, daySummary: '', totalEstimatedCost: 999,
    activities: [10, 20].map((estimatedCost, index) => ({ placeName: `Stop ${index}`, description: 'Details', period: 'Sabah', coordinates: { lat: 37, lng: -5 }, estimatedCost })),
  })),
});
beforeAll(async () => { ({ usePlanStore } = await import('../src/store/usePlanStore')); });
beforeEach(() => { usePlanStore.getState().clearPlan(); usePlanStore.getState().setPlan(fixture()); });

describe('plan editing and estimates', () => {
  it('repairs totals and keeps actual expenses separate', () => {
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(60);
    usePlanStore.getState().updateActivityActualCost(1, 0, 45);
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(60);
    expect(usePlanStore.getState().plan?.dailyPlans[0].totalEstimatedCost).toBe(30);
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0].actualCost).toBe(45);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0].actualCost).toBeUndefined();
  });
  it('updates both estimate levels on deletion/addition and restores all fields', () => {
    usePlanStore.getState().toggleActivityCompleted(1, 0);
    usePlanStore.getState().updateActivityNote(1, 0, 'My note');
    usePlanStore.getState().deleteActivity(1, 0);
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(50);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0]).toMatchObject({ completed: true, note: 'My note' });
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(60);
    usePlanStore.getState().addActivity(1, fixture().dailyPlans[0].activities[0]);
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(70);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities).toHaveLength(2);
  });
  it('carries visited state with the activity when reordered and isolates days', () => {
    usePlanStore.getState().toggleActivityCompleted(1, 0);
    usePlanStore.getState().moveActivity(1, 0, 1);
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[1].completed).toBe(true);
    expect(usePlanStore.getState().plan?.dailyPlans[1].activities[0].completed).toBeUndefined();
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0].completed).toBe(true);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0].completed).toBeUndefined();
  });
  it('undoes an entire regenerated day and its total', () => {
    usePlanStore.getState().updateDayPlan(1, { ...fixture().dailyPlans[0], activities: [] });
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(30);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(60);
  });
  it('rejects invalid edits without creating phantom activities or history', () => {
    usePlanStore.getState().updateActivityActualCost(1, 99, 20);
    usePlanStore.getState().updateActivityActualCost(1, 0, -1);
    usePlanStore.getState().updateActivityActualCost(1, 0, NaN);
    usePlanStore.getState().moveActivity(1, 0, 9);
    usePlanStore.getState().updateActivityNote(1, 9, 'x');
    usePlanStore.getState().deleteActivity(99, 0);
    expect(usePlanStore.getState().history).toHaveLength(0);
    expect(usePlanStore.getState().plan?.totalEstimatedCost).toBe(60);
  });
  it('caps session history and persists progress but never undo history', async () => {
    for (let i = 0; i < 25; i++) usePlanStore.getState().toggleActivityCompleted(1, 0);
    expect(usePlanStore.getState().history).toHaveLength(20);
    const stored = JSON.parse(memory.get('travyon-plan')!).state;
    expect(stored.history).toBeUndefined();
    expect(stored.plan.dailyPlans[0].activities[0].completed).toBe(true);
    await usePlanStore.persist.rehydrate();
    expect(usePlanStore.getState().history).toHaveLength(0);
    expect(usePlanStore.getState().plan?.dailyPlans[0].activities[0].completed).toBe(true);
  });
  it('clears undo history when another plan is opened or the user signs out', () => {
    usePlanStore.getState().deleteActivity(1, 0);
    usePlanStore.getState().setPlan({ ...fixture(), destination: 'Roma' });
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan?.destination).toBe('Roma');
    expect(usePlanStore.getState().history).toHaveLength(0);
    usePlanStore.getState().deleteActivity(1, 0);
    usePlanStore.getState().clearPlan();
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().plan).toBeNull();
  });
});
