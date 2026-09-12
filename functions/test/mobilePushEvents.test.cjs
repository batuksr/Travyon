const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildEventMessage, communityPush, tripReminderPush } = require('../lib/mobilePushEvents.js');

test('community notifications never expose user-authored or profile text', () => {
  const event = communityPush.sharedPlan('rome_2026');
  const message = buildEventMessage(event, ['token'], false);
  assert.deepEqual(message.data, {
    screen: 'notifications',
    kind: 'community_shared_plan',
    planId: 'rome_2026',
  });
  assert.equal(message.tokens[0], 'token');
  assert.ok(!JSON.stringify(message).includes('displayName'));
  assert.ok(!JSON.stringify(message).includes('destination'));
});

test('trip reminders are localized and carry only navigation identifiers', () => {
  const event = tripReminderPush('plan-1', 1);
  const tr = buildEventMessage(event, ['token'], false);
  const en = buildEventMessage(event, ['token'], true);
  assert.match(tr.notification.body, /yarın/);
  assert.match(en.notification.body, /tomorrow/);
  assert.deepEqual(en.data, {
    screen: 'notifications', kind: 'trip_reminder', planId: 'plan-1', days: '1',
  });
});
