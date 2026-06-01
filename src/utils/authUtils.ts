import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';

/** E-posta doğrulanmış mı? Gerekirse sunucudan tazeler ve store'u günceller. */
export const isEmailVerified = async (): Promise<boolean> => {
  const current = auth.currentUser;
  if (!current) return false;
  if (current.emailVerified) return true;
  try {
    await current.reload();
    if (auth.currentUser?.emailVerified) {
      useAuthStore.getState().setUser(auth.currentUser);
      return true;
    }
  } catch { /* yoksay */ }
  return false;
};

/** Doğrulanmamış kullanıcıya doğrulama mailini (yeniden) gönderir. */
export const resendVerification = async (): Promise<void> => {
  const current = auth.currentUser;
  if (current && !current.emailVerified) {
    await sendEmailVerification(current, {
      url: `${window.location.origin}/hub`,
      handleCodeInApp: false,
    });
  }
};
