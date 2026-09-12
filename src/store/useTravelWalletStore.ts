import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { writeWalletEntry, deleteWalletEntry } from '../services/travelWalletCloudService';

export type TravelWalletCategory =
  | 'flight'
  | 'stay'
  | 'ticket'
  | 'insurance'
  | 'document'
  | 'other';

export type TravelWalletDetailKey =
  | 'airline'
  | 'flightNumber'
  | 'origin'
  | 'destination'
  | 'time'
  | 'terminal'
  | 'seat'
  | 'baggage'
  | 'address'
  | 'checkOut'
  | 'roomType'
  | 'contact'
  | 'venue'
  | 'gate'
  | 'insurer'
  | 'endDate'
  | 'emergencyPhone'
  | 'documentType'
  | 'expiryDate'
  | 'issuer';

export type TravelWalletDetails = Partial<Record<TravelWalletDetailKey, string>>;

const CATEGORY_DETAIL_KEYS: Record<TravelWalletCategory, readonly TravelWalletDetailKey[]> = {
  flight: ['airline', 'flightNumber', 'origin', 'destination', 'time', 'terminal', 'seat', 'baggage'],
  stay: ['address', 'checkOut', 'roomType', 'contact'],
  ticket: ['venue', 'time', 'seat', 'gate'],
  insurance: ['insurer', 'endDate', 'emergencyPhone'],
  document: ['documentType', 'expiryDate', 'issuer'],
  other: [],
};

export interface TravelWalletEntry {
  id: string;
  planId: string;
  category: TravelWalletCategory;
  title: string;
  reference: string;
  date: string;
  note: string;
  url: string;
  details?: TravelWalletDetails;
  createdAt: number;
  updatedAt?: number;
}

export interface TravelWalletInput {
  planId: string;
  category: TravelWalletCategory;
  title: string;
  reference?: string;
  date?: string;
  note?: string;
  url?: string;
  details?: TravelWalletDetails;
}

interface TravelWalletState {
  entriesByUser: Record<string, TravelWalletEntry[]>;
  readyUid: string | null;
  syncError: string;
  syncRetry: number;
  addEntry: (input: TravelWalletInput) => Promise<string>;
  updateEntry: (id: string, input: TravelWalletInput, expectedUpdatedAt?: number) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearPlanEntries: (planId: string) => Promise<void>;
}

const text = (value: string | undefined, maxLength: number) =>
  (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

/** Boş değerleri kabul eder; yalnızca http(s) bağlantılarını güvenli kabul eder. */
export const normalizeWalletUrl = (value: string | undefined): string | null => {
  const candidate = (value ?? '').trim();
  if (!candidate) return '';

  try {
    const parsed = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const sanitizeDetails = (
  details: TravelWalletDetails | undefined,
  category: TravelWalletCategory,
): TravelWalletDetails =>
  Object.fromEntries(
    Object.entries(details ?? {})
      .filter(([key]) => CATEGORY_DETAIL_KEYS[category].includes(key as TravelWalletDetailKey))
      .map(([key, value]) => [key, text(value, 160)])
      .filter(([, value]) => Boolean(value)),
  ) as TravelWalletDetails;

export const sanitizeWalletInput = (input: TravelWalletInput): Omit<TravelWalletEntry, 'id' | 'createdAt'> => {
  const details = sanitizeDetails(input.details, input.category);
  return {
    planId: text(input.planId, 100) || 'general',
    category: input.category,
    title: text(input.title, 100),
    reference: text(input.reference, 80),
    date: text(input.date, 40),
    note: text(input.note, 500),
    url: normalizeWalletUrl(input.url) ?? '',
    details,
  };
};

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `wallet_${crypto.randomUUID()}`
    : `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getUid = () => useAuthStore.getState().user?.uid ?? 'anonymous';

export const EMPTY_WALLET_ENTRIES: TravelWalletEntry[] = [];

export const useTravelWalletStore = create<TravelWalletState>()(
  persist(
    (set, get) => ({
      entriesByUser: {},
      readyUid: null,
      syncError: '',
      syncRetry: 0,

      addEntry: async (input) => {
        const uid = getUid();
        if (get().readyUid !== uid) throw new Error('Cüzdan bağlantısını bekleyin.');
        const id = generateId();
        const entry: TravelWalletEntry = {
          id,
          createdAt: Date.now(),
          ...sanitizeWalletInput(input),
        };
        await writeWalletEntry(uid, entry, 'create');
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: state.entriesByUser[uid]?.some(e => e.id === id)
              ? state.entriesByUser[uid] : [entry, ...(state.entriesByUser[uid] ?? [])],
          },
        }));
        return id;
      },

      updateEntry: async (id, input, expectedUpdatedAt) => {
        const uid = getUid();
        if (get().readyUid !== uid) throw new Error('Cüzdan bağlantısını bekleyin.');
        const clean = sanitizeWalletInput(input);
        const entry = get().entriesByUser[uid]?.find(e => e.id === id);
        if (!entry) throw new Error('Kayıt bulunamadı.');
        await writeWalletEntry(uid, { ...entry, ...clean, updatedAt: expectedUpdatedAt ?? entry.updatedAt ?? 0 }, 'update');
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: (state.entriesByUser[uid] ?? []).map((entry) =>
              entry.id === id ? { ...entry, ...clean } : entry,
            ),
          },
        }));
      },

      removeEntry: async (id) => {
        const uid = getUid();
        if (get().readyUid !== uid) throw new Error('Cüzdan bağlantısını bekleyin.');
        await deleteWalletEntry(uid, id);
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: (state.entriesByUser[uid] ?? []).filter((entry) => entry.id !== id),
          },
        }));
      },

      clearPlanEntries: async (planId) => {
        const uid = getUid();
        if (get().readyUid !== uid) throw new Error('Cüzdan bağlantısını bekleyin.');
        for (const entry of get().entriesByUser[uid] ?? []) {
          if (entry.planId === planId) await deleteWalletEntry(uid, entry.id);
        }
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: (state.entriesByUser[uid] ?? []).filter((entry) => entry.planId !== planId),
          },
        }));
      },
    }),
    {
      name: 'travyon-travel-wallet-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ entriesByUser: state.entriesByUser }),
    },
  ),
);
