import { collection, doc, onSnapshot, runTransaction, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { TravelWalletEntry } from '../store/useTravelWalletStore';

const walletDoc = (uid: string, id: string) => doc(db, 'users', uid, 'wallet', id);

// A tombstone prevents another browser's old localStorage copy resurrecting a
// deleted record during migration. Personal fields are removed on deletion.
export async function writeWalletEntry(uid: string, entry: TravelWalletEntry, mode: 'create' | 'update' | 'migrate') {
  await runTransaction(db, async tx => {
    const ref = walletDoc(uid, entry.id);
    const existing = await tx.get(ref);
    if (mode === 'migrate' && existing.exists()) return;
    if (mode === 'update' && (!existing.exists() || existing.data().deleted === true)) throw new Error('Bu kayıt başka bir cihazda silindi.');
    if (mode === 'create' && existing.exists()) throw new Error('Kayıt zaten mevcut.');
    if (mode === 'update' && (existing.data()?.updatedAt ?? 0) !== (entry.updatedAt ?? 0)) throw new Error('Kayıt başka bir cihazda değişti. Yeniden açıp deneyin.');
    const { id, ...fields } = entry;
    void id;
    tx.set(ref, { ...fields, updatedAt: Date.now(), schemaVersion: 1, deleted: false });
  });
}

export async function deleteWalletEntry(uid: string, id: string) {
  await runTransaction(db, async tx => {
    const ref = walletDoc(uid, id);
    await tx.get(ref);
    tx.set(ref, { deleted: true, updatedAt: Date.now(), schemaVersion: 1 });
  });
}

export function subscribeWallet(uid: string, onEntries: (entries: TravelWalletEntry[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', uid, 'wallet'), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    onEntries(snapshot.docs.filter(d => !d.data().deleted).map(d => ({ ...d.data(), id: d.id }) as TravelWalletEntry));
  }, onError);
}
