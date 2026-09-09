import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

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
  addEntry: (input: TravelWalletInput) => string;
  updateEntry: (id: string, input: TravelWalletInput) => void;
  removeEntry: (id: string) => void;
  clearPlanEntries: (planId: string) => void;
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
    (set) => ({
      entriesByUser: {},

      addEntry: (input) => {
        const uid = getUid();
        const id = generateId();
        const entry: TravelWalletEntry = {
          id,
          createdAt: Date.now(),
          ...sanitizeWalletInput(input),
        };
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: [entry, ...(state.entriesByUser[uid] ?? [])],
          },
        }));
        return id;
      },

      updateEntry: (id, input) => {
        const uid = getUid();
        const clean = sanitizeWalletInput(input);
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: (state.entriesByUser[uid] ?? []).map((entry) =>
              entry.id === id ? { ...entry, ...clean } : entry,
            ),
          },
        }));
      },

      removeEntry: (id) => {
        const uid = getUid();
        set((state) => ({
          entriesByUser: {
            ...state.entriesByUser,
            [uid]: (state.entriesByUser[uid] ?? []).filter((entry) => entry.id !== id),
          },
        }));
      },

      clearPlanEntries: (planId) => {
        const uid = getUid();
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
    },
  ),
);
