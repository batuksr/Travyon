import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { TRAVEL_CHECKLIST } from '../data/travelChecklist';
import { db } from './firebase';

const KNOWN_IDS = new Set(
  TRAVEL_CHECKLIST.flatMap(group => group.items.map(item => item.id)),
);

const checklistRef = (uid: string, planId: string) =>
  doc(db, 'users', uid, 'plans', planId, 'checklist', 'state');

export const normalizeChecklistIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (item): item is string => typeof item === 'string' && KNOWN_IDS.has(item),
  ))];
};

export function watchTravelChecklist(
  uid: string,
  planId: string,
  localIds: string[],
  onValue: (ids: string[]) => void,
  onError: () => void,
): Unsubscribe {
  let migrationStarted = false;
  return onSnapshot(checklistRef(uid, planId), snapshot => {
    if (snapshot.exists()) {
      onValue(normalizeChecklistIds(snapshot.data().checkedIds));
      return;
    }
    const migration = normalizeChecklistIds(localIds);
    onValue(migration);
    if (migrationStarted || migration.length === 0) return;
    migrationStarted = true;
    void setDoc(checklistRef(uid, planId), {
      schemaVersion: 1,
      checkedIds: migration,
      updatedAt: serverTimestamp(),
    }).catch(onError);
  }, onError);
}

export async function setTravelChecklistItem(
  uid: string,
  planId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  if (!KNOWN_IDS.has(itemId)) throw new Error('invalid checklist item');
  await setDoc(checklistRef(uid, planId), {
    schemaVersion: 1,
    checkedIds: checked ? arrayUnion(itemId) : arrayRemove(itemId),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function resetTravelChecklist(uid: string, planId: string): Promise<void> {
  await setDoc(checklistRef(uid, planId), {
    schemaVersion: 1,
    checkedIds: [],
    updatedAt: serverTimestamp(),
  });
}
