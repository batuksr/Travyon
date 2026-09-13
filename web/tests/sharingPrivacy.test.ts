import { expect, it, vi } from 'vitest';
import type { TravelPlanResponse } from '../src/services/aiService';
import type { OnboardingData } from '../src/store/useOnboardingStore';

const { call } = vi.hoisted(() => ({ call: vi.fn().mockResolvedValue({ data: { ok: true } }) }));
vi.mock('../src/services/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => call }));
import { shareplan, sharePlanAsLink } from '../src/services/socialService';

it.each([shareplan, sharePlanAsLink])('does not send personal fields in either sharing mode', async (share) => {
  call.mockClear();
  const plan = {
    destination: 'Roma', overallSummary: 'Gezi', currencySymbol: '€', totalEstimatedCost: 10,
    note: 'PRIVATE', wallet: ['PRIVATE'],
    cityGuide: { transportationTips: '', localCustoms: '', generalAdvice: '', secret: 'PRIVATE' },
    dailyPlans: [{
      date: '2026-09-16', dayNumber: 1, daySummary: 'Gezi', totalEstimatedCost: 10,
      note: 'PRIVATE', activities: [{
        placeName: 'Pantheon', description: 'Ziyaret', period: 'Sabah', estimatedCost: 10,
        coordinates: { lat: 41.9, lng: 12.4 }, note: 'PRIVATE', actualCost: 20, completed: true,
      }],
    }],
  } as TravelPlanResponse;
  const data = { destination: 'Roma', startDate: '2026-09-16', budget: 100, currencySymbol: '€', accommodationAddress: 'PRIVATE' } as OnboardingData;
  const original = structuredClone(plan);
  await share('p1', plan, data);
  const payload = call.mock.calls[0][0];
  expect(JSON.stringify(payload)).not.toContain('PRIVATE');
  expect(payload.plan.dailyPlans[0].activities[0]).not.toHaveProperty('actualCost');
  expect(payload.plan.dailyPlans[0].activities[0]).not.toHaveProperty('completed');
  expect(payload.plan.dailyPlans[0].activities[0].placeName).toBe('Pantheon');
  expect(plan).toEqual(original);
});
