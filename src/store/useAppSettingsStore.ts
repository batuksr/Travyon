import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettingsData {
  // Görünüm
  language: string;
  currencyLabel: string;
  currencyCode: string;
  currencySymbol: string;
  distanceKm: boolean;
  tempCelsius: boolean;

  // Bildirimler
  appPlanNotif: boolean;
  appCommunityNotif: boolean;
  appUpdateNotif: boolean;
  emailPlanNotif: boolean;
  emailWeeklyDigest: boolean;
  emailPromoNotif: boolean;
  pushEnabled: boolean;
  pushSoundEnabled: boolean;
  pushPermission: 'default' | 'granted' | 'denied' | 'unsupported';

  // Gizlilik
  profilePublic: boolean;   // profil topluluğa açık mı
  plansPublic: boolean;     // planlar paylaşılabilir mi
  followPublic: boolean;    // herkes takip edebilir mi
  locationEnabled: boolean; // konum tabanlı özellikler
  locationHistory: boolean; // konum geçmişi kaydedilsin mi
  analyticsEnabled: boolean;

  // Profil
  photoURL: string | null;
}

interface AppSettingsState extends AppSettingsData {
  setSettings: (s: Partial<AppSettingsData>) => void;
}

const defaults: AppSettingsData = {
  language: 'Türkçe',
  currencyLabel: 'TRY — ₺',
  currencyCode: 'TRY',
  currencySymbol: '₺',
  distanceKm: true,
  tempCelsius: true,
  appPlanNotif: true,
  appCommunityNotif: true,
  appUpdateNotif: false,
  emailPlanNotif: true,
  emailWeeklyDigest: true,
  emailPromoNotif: false,
  pushEnabled: false,
  pushSoundEnabled: true,
  pushPermission: 'default',
  profilePublic: true,
  plansPublic: true,
  followPublic: true,
  locationEnabled: true,
  locationHistory: false,
  analyticsEnabled: true,
  photoURL: null,
};

export const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'TRY — ₺': { code: 'TRY', symbol: '₺' },
  'USD — $':  { code: 'USD', symbol: '$'  },
  'EUR — €':  { code: 'EUR', symbol: '€'  },
  'GBP — £':  { code: 'GBP', symbol: '£'  },
  'JPY — ¥':  { code: 'JPY', symbol: '¥'  },
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setSettings: (s) => set(s),
    }),
    { name: 'travyon-app-settings' }
  )
);
