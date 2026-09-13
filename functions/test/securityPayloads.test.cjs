const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePrivacySettings, publicPlanPayload } = require('../lib/securityPayloads.js');

const preferences = () => ({
  profilePublic: true, plansPublic: true, followPublic: false,
  locationEnabled: false, locationHistory: false, analyticsEnabled: false,
});

test('privacy payload allows only six own boolean fields, never entitlement fields', () => {
  const input = preferences();
  assert.deepEqual(parsePrivacySettings(input), input);
  assert.notEqual(parsePrivacySettings(input), input);
  for (const key of [
    'isPro', 'subscriptionStatus', 'currentPeriodEnd', 'plansUsedThisMonth',
    'subscriptionProvider', 'role', 'uid', 'photoURL', '__proto__',
  ]) {
    assert.throws(() => parsePrivacySettings({ ...input, [key]: true }), { code: 'invalid-argument' });
  }
  for (const malformed of [null, [], {}, 'text', { ...input, analyticsEnabled: 'false' },
    { ...input, locationHistory: true }, Object.create(input)]) {
    assert.throws(() => parsePrivacySettings(malformed), { code: 'invalid-argument' });
  }
});

const plan = () => ({
  destination: 'Roma', currencySymbol: '€', overallSummary: 'Şehir gezisi',
  totalEstimatedCost: 999, note: 'PRIVATE', wallet: ['PRIVATE'],
  accommodationAddress: 'PRIVATE', metadata: { private: 'PRIVATE' },
  cityGuide: { transportationTips: 'Metro', localCustoms: 'Kültür', generalAdvice: 'Tavsiye', secret: 'PRIVATE' },
  dailyPlans: [{
    date: '2026-09-16', dayNumber: 1, daySummary: 'Roma günü', totalEstimatedCost: 999,
    note: 'PRIVATE', walletEntries: ['PRIVATE'],
    activities: [{
      placeName: 'Pantheon', description: 'Ziyaret', period: 'Sabah', estimatedCost: 5,
      coordinates: { lat: 41.9, lng: 12.4, private: 'PRIVATE' },
      actualCost: 100, note: 'PRIVATE', completed: true, reservation: 'PRIVATE',
    }],
  }],
});

test('public sharing rebuilds every object and excludes all private and unknown fields', () => {
  const input = plan();
  const snapshot = structuredClone(input);
  const result = publicPlanPayload(input);
  assert.deepEqual(result, {
    destination: 'Roma', currencySymbol: '€', overallSummary: 'Şehir gezisi', totalEstimatedCost: 5,
    cityGuide: { transportationTips: 'Metro', localCustoms: 'Kültür', generalAdvice: 'Tavsiye' },
    dailyPlans: [{ date: '2026-09-16', dayNumber: 1, daySummary: 'Roma günü', totalEstimatedCost: 5,
      activities: [{ placeName: 'Pantheon', description: 'Ziyaret', period: 'Sabah', estimatedCost: 5,
        coordinates: { lat: 41.9, lng: 12.4 } }],
    }],
  });
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.deepEqual(input, snapshot);
  result.dailyPlans[0].activities[0].coordinates.lat = 0;
  assert.equal(input.dailyPlans[0].activities[0].coordinates.lat, 41.9);
});

test('legacy plans without guide and empty days remain serializable', () => {
  const input = plan();
  delete input.cityGuide;
  input.dailyPlans[0].activities = [];
  const result = publicPlanPayload(input);
  assert.equal(result.totalEstimatedCost, 0);
  assert.equal(Object.hasOwn(result, 'cityGuide'), false);
  assert.deepEqual(result, JSON.parse(JSON.stringify(result)));
});

test('real privacy handler rejects extra privileged fields before any Admin operation', async () => {
  // .run invokes only the handler; App Check middleware is separately enforced
  // by onCall in production. No credentials or live database are used here.
  const { updatePrivacySettings } = require('../lib/index.js');
  await assert.rejects(updatePrivacySettings.run({
    data: { ...preferences(), isPro: true },
    auth: { uid: 'security-test-only', token: {} },
  }), { code: 'invalid-argument' });
  await assert.rejects(updatePrivacySettings.run({ data: preferences() }), { code: 'unauthenticated' });
});
