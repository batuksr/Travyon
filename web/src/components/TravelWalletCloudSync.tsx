import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelWalletStore, sanitizeWalletInput } from '../store/useTravelWalletStore';
import { subscribeWallet, writeWalletEntry } from '../services/travelWalletCloudService';

export default function TravelWalletCloudSync() {
  const uid = useAuthStore(state => state.user?.uid);
  const retry = useTravelWalletStore(state => state.syncRetry);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    useTravelWalletStore.setState({ readyUid: null, syncError: '' });
    const failed = () => {
      if (!cancelled) useTravelWalletStore.setState({ readyUid: null, syncError: 'Cüzdan eşitlenemedi. Bağlantıyı kontrol edip tekrar dene; yerel kayıtların korunuyor.' });
    };
    void (async () => {
      try {
        // Import only this signed-in user's entries. Existing cloud records,
        // including deletion tombstones, always win. No global migration flag:
        // local/emulator/production environments stay independent.
        const entries = useTravelWalletStore.getState().entriesByUser[uid] ?? [];
        for (const entry of entries) {
          if (cancelled) return;
          await writeWalletEntry(uid, { ...entry, ...sanitizeWalletInput(entry) }, 'migrate');
        }
        if (cancelled) return;
        unsubscribe = subscribeWallet(uid, entries => {
          if (cancelled) return;
          useTravelWalletStore.setState(state => ({ entriesByUser: { ...state.entriesByUser, [uid]: entries }, readyUid: uid, syncError: '' }));
        }, failed);
      } catch { failed(); }
    })();
    return () => { cancelled = true; unsubscribe?.(); useTravelWalletStore.setState({ readyUid: null }); };
  }, [uid, retry]);
  return null;
}
