import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSavedPlansStore } from '../store/useSavedPlansStore';
import {
  migrateLocalPlansToCloud,
  subscribeToCloudPlans,
} from '../services/savedPlansCloudService';

const migrationKey = (uid: string) => `travyon-plans-cloud-migrated-v1-${uid}`;

/** Webdeki yerel planları bir kez Firestore'a taşır ve cihazlar arası eşitler. */
const SavedPlansCloudSync: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const replaceUserPlans = useSavedPlansStore((state) => state.replaceUserPlans);

  useEffect(() => {
    if (!user) return undefined;

    const uid = user.uid;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      const key = migrationKey(uid);
      const localPlans = useSavedPlansStore.getState().plansByUser[uid] ?? [];
      try {
        if (localStorage.getItem(key) !== 'done') {
          await migrateLocalPlansToCloud(uid, localPlans);
          localStorage.setItem(key, 'done');
        }
      } catch (error) {
        console.warn('Yerel planlar buluta taşınamadı.', error);
      }

      if (cancelled) return;
      unsubscribe = subscribeToCloudPlans(
        uid,
        (plans) => replaceUserPlans(uid, plans),
        (error) => console.warn('Plan eşitlemesi kesildi.', error),
      );
    };

    void start();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, replaceUserPlans]);

  return null;
};

export default SavedPlansCloudSync;
