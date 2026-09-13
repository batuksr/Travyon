// Isolated, synthetic data only. Never connects to a live Firebase project.
// firebase emulators:exec --config firebase.storage-tests.json --project demo-travyon-security --only storage "node --test scripts/test-storage-rules.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getStorage, connectStorageEmulator, ref, uploadBytes, getMetadata,
  getBytes, listAll, deleteObject,
} from 'firebase/storage';

const projectId = 'demo-travyon-security';
const bucket = `${projectId}.appspot.com`;
const base = `http://127.0.0.1:19199/v0/b/${bucket}/o`;
const denied = operation => assert.rejects(operation, { code: 'storage/unauthorized' });

test('Storage rules isolate private files while preserving community avatars', { timeout: 60000 }, async () => {
  const uid = `storage_rules_${randomUUID()}`;
  const apps = [];
  const client = userId => {
    const app = initializeApp({ projectId, storageBucket: bucket, apiKey: 'emulator-only' }, `${uid}_${apps.length}`);
    apps.push(app);
    const storage = getStorage(app);
    connectStorageEmulator(storage, '127.0.0.1', 19199,
      userId ? { mockUserToken: { sub: userId, user_id: userId } } : {});
    storage.maxOperationRetryTime = 2000;
    storage.maxUploadRetryTime = 2000;
    return storage;
  };
  const owner = client(uid);
  const other = client(`${uid}_other`);
  const anonymous = client(null);
  const avatar = `users/${uid}/avatar.jpg`;
  const privateFile = `users/${uid}/private/reservation.jpg`;
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const upload = (storage, path, bytes = jpeg, contentType = 'image/jpeg') =>
    uploadBytes(ref(storage, path), bytes, { contentType });
  // The emulator's owner token seeds a pre-existing file the new rules forbid uploading.
  const admin = (url, options) => fetch(url, {
    ...options, headers: { ...options?.headers, Authorization: 'Bearer owner' },
    signal: AbortSignal.timeout(5000),
  });
  try {
    const seed = await admin(`${base}?uploadType=media&name=${encodeURIComponent(privateFile)}`, {
      method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg,
    });
    assert.equal(seed.status, 200, 'seed synthetic private file locally');
    await upload(owner, avatar);
    await upload(owner, avatar); // update as well as create
    await getMetadata(ref(owner, avatar));
    await getBytes(ref(other, avatar));
    await denied(getBytes(ref(anonymous, avatar)));
    await denied(upload(other, avatar));
    await denied(upload(anonymous, avatar));
    await denied(upload(owner, avatar, jpeg, 'image/png'));
    await denied(upload(owner, avatar, new Uint8Array(512 * 1024)));
    await getBytes(ref(owner, privateFile));
    await denied(getBytes(ref(other, privateFile)));
    await denied(getMetadata(ref(other, privateFile)));
    await denied(getBytes(ref(anonymous, privateFile)));
    await denied(upload(owner, privateFile));
    await denied(upload(owner, `users/${uid}/another.jpg`));
    await denied(upload(owner, 'unscoped.jpg'));
    await denied(listAll(ref(owner, `users/${uid}`)));
    await denied(listAll(ref(other, `users/${uid}`)));
    await denied(deleteObject(ref(other, avatar)));
    await denied(deleteObject(ref(owner, privateFile)));
    await deleteObject(ref(owner, avatar));
  } finally {
    // Only exact synthetic paths created by this test; never a recursive delete.
    for (const path of [avatar, privateFile]) {
      await admin(`${base}/${encodeURIComponent(path)}`, { method: 'DELETE' });
    }
    await Promise.all(apps.map(app => deleteApp(app)));
  }
});
