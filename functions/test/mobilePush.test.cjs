const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePushInput, pushDeviceId, runMobilePush } = require('../lib/mobilePush.js');
const token = 'test-token_0123456789:valid';
const input = (action) => parsePushInput({ action, token, platform: 'android' });

function setup() {
  const devices = new Map();
  const sent = [];
  return { devices, sent, options: {
    enabled: true, emulator: false,
    store: {
      async bind(id, data) { devices.set(id, data); },
      async read(id) { return devices.get(id); },
      async removeOwned(id, uid) { if (devices.get(id)?.uid === uid) devices.delete(id); },
    },
    async send(message) { sent.push(message); },
  } };
}

test('push rejects malformed requests; device identifiers do not expose tokens', () => {
  for (const value of [null, {}, {action:'broadcast', token}, {action:'register',token,platform:'web'}, {action:'test',token:' bad token '}, {action:'test',token:'x'.repeat(4097)}]) {
    assert.throws(() => parsePushInput(value));
  }
  assert.match(pushDeviceId(token), /^[a-f0-9]{64}$/);
  assert.equal(pushDeviceId(token), pushDeviceId(token));
});

test('emulator and disabled rollout cannot write devices or send real pushes', async () => {
  for (const change of [{emulator:true}, {enabled:false}]) {
    const { options, devices, sent } = setup();
    Object.assign(options, change);
    await assert.rejects(runMobilePush(input('register'), 'alice', options));
    await assert.rejects(runMobilePush(input('test'), 'alice', options));
    assert.equal(devices.size, 0);
    assert.equal(sent.length, 0);
  }
});

test('device ownership is unique; another user cannot test or remove its binding', async () => {
  const { options, devices, sent } = setup();
  await runMobilePush(input('register'), 'alice', options);
  await runMobilePush(input('register'), 'bob', options);
  assert.equal(devices.size, 1);
  await assert.rejects(runMobilePush(input('test'), 'alice', options));
  await runMobilePush(input('unregister'), 'alice', options);
  await runMobilePush(input('test'), 'bob', options);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].data, { screen:'notifications', kind:'test' });
  assert.equal(sent[0].android.ttl, 60000);
  assert.ok(!JSON.stringify(sent[0]).includes('bob'));
});

test('kill switch still permits owned-device cleanup', async () => {
  const { options, devices } = setup();
  await runMobilePush(input('register'), 'alice', options);
  options.enabled = false;
  await runMobilePush(input('unregister'), 'alice', options);
  assert.equal(devices.size, 0);
});

test('invalid tokens removed, transient failures retained and sanitized', async () => {
  for (const code of ['messaging/registration-token-not-registered', 'messaging/unavailable']) {
    const { options, devices } = setup();
    await runMobilePush(input('register'), 'alice', options);
    options.send = async () => { throw Object.assign(new Error(token), { code }); };
    await assert.rejects(runMobilePush(input('test'), 'alice', options), e => !e.message.includes(token));
    assert.equal(devices.size, code.endsWith('not-registered') ? 0 : 1);
  }
});
