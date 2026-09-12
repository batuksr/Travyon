import { FunctionsError, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface PrivacySettingsPayload {
  profilePublic: boolean;
  plansPublic: boolean;
  followPublic: boolean;
  locationEnabled: boolean;
  locationHistory: boolean;
  analyticsEnabled: boolean;
}

export const savePrivacySettings = async (settings: PrivacySettingsPayload): Promise<void> => {
  const fn = httpsCallable<PrivacySettingsPayload, { ok: true }>(functions, 'updatePrivacySettings');
  await fn(settings);
};

export const deleteMyAccount = async (): Promise<void> => {
  const fn = httpsCallable<Record<string, never>, { ok: true }>(functions, 'deleteMyAccount');
  await fn({});
};

export const submitContactMessage = async (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> => {
  try {
    const fn = httpsCallable<typeof data, { ok: true }>(functions, 'submitContactMessage');
    await fn(data);
  } catch (error) {
    if (error instanceof FunctionsError) throw error;
    throw new Error('Mesaj gönderilemedi.');
  }
};
