import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase';

export type VerifyCodeErrorReason =
  | 'invalid_format'
  | 'no_pending_code'
  | 'expired'
  | 'too_many_attempts'
  | 'wrong_code'
  | 'unknown';

export class VerifyCodeError extends Error {
  reason: VerifyCodeErrorReason;
  constructor(reason: VerifyCodeErrorReason) {
    super(reason);
    this.reason = reason;
  }
}

const toReason = (err: unknown): VerifyCodeErrorReason => {
  if (err instanceof FunctionsError && typeof err.message === 'string') {
    const known: VerifyCodeErrorReason[] = [
      'invalid_format', 'no_pending_code', 'expired', 'too_many_attempts', 'wrong_code',
    ];
    if (known.includes(err.message as VerifyCodeErrorReason)) {
      return err.message as VerifyCodeErrorReason;
    }
  }
  return 'unknown';
};

/** Giriş yapmış kullanıcının e-postasına 6 haneli doğrulama kodu gönderir. */
export const sendVerificationCode = async (lang: 'tr' | 'en'): Promise<{ cooldownMs: number }> => {
  try {
    const fn = httpsCallable<{ lang: string }, { ok: true; cooldownMs: number }>(functions, 'sendVerificationCode');
    const res = await fn({ lang });
    return { cooldownMs: res.data.cooldownMs };
  } catch (err) {
    if (err instanceof FunctionsError && err.code === 'functions/resource-exhausted') {
      throw new VerifyCodeError('too_many_attempts');
    }
    throw new VerifyCodeError('unknown');
  }
};

/** Kullanıcının girdiği 6 haneli kodu doğrular. */
export const verifyEmailCode = async (code: string): Promise<void> => {
  try {
    const fn = httpsCallable<{ code: string }, { ok: true }>(functions, 'verifyEmailCode');
    await fn({ code });
  } catch (err) {
    throw new VerifyCodeError(toReason(err));
  }
};
