import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const db = getFirestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Resend'de doğrulanmış bir gönderim domaini olmadan sadece hesap sahibinin
// kendi mailine (onboarding@resend.dev ile) gönderim yapılabilir.
// Domain doğrulandıktan sonra RESEND_FROM'u kendi domaininize göre güncelleyin.
const RESEND_FROM = defineSecret("RESEND_FROM");

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const RESEND_COOLDOWN_MS = 45 * 1000; // 45 saniye
const MAX_ATTEMPTS = 5;

const generateCode = (): string => {
  const n = Math.floor(Math.random() * 10 ** CODE_LENGTH);
  return n.toString().padStart(CODE_LENGTH, "0");
};

const codeDocRef = (uid: string) => db.collection("emailVerificationCodes").doc(uid);

const buildEmailHtml = (code: string, lang: string): string => {
  const isEn = lang === "en";
  const title = isEn ? "Verify your email" : "E-postanı doğrula";
  const body = isEn
    ? "Enter this code in Travyon to verify your email address. It expires in 10 minutes."
    : "E-posta adresini doğrulamak için bu kodu Travyon'a gir. Kodun süresi 10 dakika içinde dolar.";
  const ignore = isEn
    ? "If you didn't request this, you can safely ignore this email."
    : "Bu isteği sen yapmadıysan bu e-postayı görmezden gelebilirsin.";
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;">
    <h2 style="color:#1c140c;margin:0 0 8px;">${title}</h2>
    <p style="color:#6b6258;font-size:14px;line-height:1.6;margin:0 0 24px;">${body}</p>
    <div style="background:#f5ead8;border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#c67139;">${code}</span>
    </div>
    <p style="color:#9a9186;font-size:12px;line-height:1.5;">${ignore}</p>
  </div>`;
};

/**
 * Giriş yapmış kullanıcının e-postasına 6 haneli doğrulama kodu gönderir.
 * 45 saniyede bir istek sınırı vardır.
 */
export const sendVerificationCode = onCall(
  { secrets: [RESEND_API_KEY, RESEND_FROM] },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

    const email = auth.token.email as string | undefined;
    if (!email) throw new HttpsError("failed-precondition", "Hesapta e-posta bulunamadı.");

    const lang = (request.data?.lang === "en" ? "en" : "tr") as string;

    const ref = codeDocRef(auth.uid);
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data()!;
      const lastSentAt = data.lastSentAt?.toMillis?.() ?? 0;
      const sinceLast = Date.now() - lastSentAt;
      if (sinceLast < RESEND_COOLDOWN_MS) {
        throw new HttpsError(
          "resource-exhausted",
          "cooldown",
          { retryAfterMs: RESEND_COOLDOWN_MS - sinceLast }
        );
      }
    }

    const code = generateCode();
    await ref.set({
      code,
      email,
      uid: auth.uid,
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastSentAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    const fromAddress = RESEND_FROM.value() || "Travyon <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: lang === "en" ? "Your Travyon verification code" : "Travyon doğrulama kodun",
        html: buildEmailHtml(code, lang),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("Resend gönderim hatası", { status: res.status, text });
      throw new HttpsError("internal", "E-posta gönderilemedi.");
    }

    return { ok: true, cooldownMs: RESEND_COOLDOWN_MS };
  }
);

/**
 * Kullanıcının girdiği kodu doğrular. Başarılıysa Firebase Auth'ta
 * emailVerified=true olarak işaretler (native e-posta doğrulama akışıyla
 * aynı sonucu üretir — isEmailVerified() gibi mevcut kontroller değişmeden çalışır).
 */
export const verifyEmailCode = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

  const submittedCode = String(request.data?.code ?? "").trim();
  if (!/^\d{6}$/.test(submittedCode)) {
    throw new HttpsError("invalid-argument", "invalid_format");
  }

  const ref = codeDocRef(auth.uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "no_pending_code");

  const data = snap.data()!;
  const expiresAt = data.expiresAt?.toMillis?.() ?? 0;
  if (Date.now() > expiresAt) {
    await ref.delete();
    throw new HttpsError("deadline-exceeded", "expired");
  }

  if ((data.attempts ?? 0) >= MAX_ATTEMPTS) {
    await ref.delete();
    throw new HttpsError("resource-exhausted", "too_many_attempts");
  }

  if (data.code !== submittedCode) {
    await ref.update({ attempts: FieldValue.increment(1) });
    throw new HttpsError("invalid-argument", "wrong_code");
  }

  await getAuth().updateUser(auth.uid, { emailVerified: true });
  await ref.delete();

  return { ok: true };
});
