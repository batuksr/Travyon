import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase';

/** Giriş yapmış kullanıcının hata raporunu gönderir — istek-sıklığı sınırı
 *  ve e-posta doğrulama kontrolü submitBugReport Cloud Function'ında. */
export const submitBugReport = async (title: string, desc: string): Promise<void> => {
  try {
    const fn = httpsCallable<{ title: string; desc: string }, { ok: true }>(functions, 'submitBugReport');
    await fn({ title, desc });
  } catch (err) {
    if (err instanceof FunctionsError && err.message) throw new Error(err.message);
    throw new Error('Rapor gönderilemedi.');
  }
};
