// Integration test against the LOCAL Firestore emulator only. No cloud access.
// Run after npm run emulators: node --test scripts/test-wallet-rules.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const project = 'travyon-5fb01';
const base = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
const token = uid => {
  const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  // Unsigned mock tokens are accepted ONLY by the local Firebase emulator.
  return `${encode({alg:'none',typ:'JWT'})}.${encode({sub:uid,user_id:uid,aud:project,iss:`https://securetoken.google.com/${project}`,iat:now,exp:now+3600,auth_time:now,email_verified:true,firebase:{sign_in_provider:'custom',identities:{}}})}.`;
};
const value = data => typeof data === 'string' ? {stringValue:data} : typeof data === 'boolean' ? {booleanValue:data} : typeof data === 'number' ? {integerValue:String(data)} : {mapValue:{fields:fields(data)}};
const fields = data => Object.fromEntries(Object.entries(data).map(([key,v])=>[key,value(v)]));
test('wallet rules isolate users, validate writes and erase deleted personal data', async () => {
  const uid = `wallet_rules_${randomUUID()}`;
  const path = `/users/${uid}/wallet/test_entry`;
  const send = (method, auth, data) => fetch(`${base}${path}`, {method, headers:{...(auth ? {Authorization:`Bearer ${auth}`} : {}),'Content-Type':'application/json'},
    ...(data ? {body:JSON.stringify({fields:fields(data)})} : {}),signal:AbortSignal.timeout(5000)});
  const entry = {planId:'general',category:'flight',title:'Test flight',reference:'TEST',date:'2026-09-20',note:'',url:'',details:{flightNumber:'TEST1'},createdAt:1,updatedAt:1,schemaVersion:1,deleted:false};
  try {
    assert.equal((await send('PATCH',token(uid),entry)).status,200,'owner can create');
    assert.equal((await send('GET',token(uid))).status,200,'owner can read');
    assert.equal((await send('GET',token(`${uid}_other`))).status,403,'other user cannot read');
    assert.equal((await send('GET',null)).status,403,'anonymous cannot read');
    assert.equal((await send('PATCH',token(`${uid}_other`),entry)).status,403,'other user cannot write');
    assert.equal((await send('PATCH',token(uid),{...entry,title:''})).status,403,'empty title rejected');
    assert.equal((await send('PATCH',token(uid),{...entry,category:'unknown'})).status,403,'unknown category rejected');
    assert.equal((await send('DELETE',token(uid))).status,403,'physical delete rejected');
    assert.equal((await send('PATCH',token(uid),{deleted:true,updatedAt:2,schemaVersion:1})).status,200,'tombstone accepted');
    const deleted = await (await send('GET',token(uid))).json();
    assert.deepEqual(Object.keys(deleted.fields).sort(),['deleted','schemaVersion','updatedAt']);
  } finally {
    // Cleanup is restricted to the single synthetic record created above.
    await send('DELETE','owner');
  }
});
