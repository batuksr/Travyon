import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase';

export interface BillingDetails {
  identityNumber: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface CheckoutResult {
  checkoutFormContent: string | null;
  paymentPageUrl: string | null;
}

const rethrow = (err: unknown, fallback: string): never => {
  if (err instanceof FunctionsError && err.message) throw new Error(err.message);
  throw new Error(fallback);
};

/** "Yükselt" akışını başlatır — iyzico hosted checkout formunu/URL'sini döner.
 *  Fatura bilgileri (TCKN/telefon/adres) burada gönderilir; ad/e-posta sunucuda
 *  Firebase Auth kaydından alınır. */
export const initiateSubscriptionCheckout = async (details: BillingDetails): Promise<CheckoutResult> => {
  try {
    const fn = httpsCallable<BillingDetails, CheckoutResult>(functions, 'initiateSubscriptionCheckout');
    const res = await fn(details);
    return res.data;
  } catch (err) {
    return rethrow(err, 'Ödeme başlatılamadı.');
  }
};

/** "İptal Et" — iyzico'daki yenilemeyi durdurur. Erişim dönem sonuna kadar sürer. */
export const cancelSubscription = async (): Promise<void> => {
  try {
    const fn = httpsCallable<Record<string, never>, { ok: true }>(functions, 'cancelSubscription');
    await fn({});
  } catch (err) {
    rethrow(err, 'İptal işlemi başarısız.');
  }
};
