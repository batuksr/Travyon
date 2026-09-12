import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineBoolean, defineSecret, defineString } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { lookupMobilePlace, validateMobilePlaceQuery, lookupMobilePhoto, validateMobilePhotoName } from "./mobilePlaces";
import { lookupAccommodation, validateAccommodationQuery } from "./mobileAccommodation";
import { getMessaging } from "firebase-admin/messaging";
import { parsePushInput, runMobilePush, PushDevice } from "./mobilePush";
import { communityPush, sendMobilePushEvent, tripReminderPush } from "./mobilePushEvents";

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const db = getFirestore();
// App Check production'da zorunlu kalır. Yerel Functions emulator'ında ise
// gerçek reCAPTCHA/debug-token kurulumu gerektirmeden geliştirme yapılabilir.
const SHOULD_ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== "true";
const MOBILE_PUSH_ENABLED = defineBoolean("MOBILE_PUSH_ENABLED", { default: false });

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Resend'de doğrulanmış bir gönderim domaini olmadan sadece hesap sahibinin
// kendi mailine (onboarding@resend.dev ile) gönderim yapılabilir.
// Domain doğrulandıktan sonra RESEND_FROM'u kendi domaininize göre güncelleyin.
const RESEND_FROM = defineSecret("RESEND_FROM");

// Gemini API anahtarı — istemciye ASLA gönderilmez, sadece burada okunur.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Geocoding/Directions REST API'leri için AYRI bir Maps anahtarı — Google,
// "HTTP referrer" kısıtlamalı anahtarların bu REST servisleriyle
// kullanılmasını YASAKLIYOR ("API keys with referer restrictions cannot be
// used with this API"). Tarayıcıdaki VITE_GOOGLE_MAPS_API_KEY (Maps
// JavaScript API için referrer-kısıtlı) burada KULLANILAMAZ — bu yüzden
// kısıtlamasız/IP-kısıtlı, sadece sunucu tarafında okunan ayrı bir anahtar.
const GOOGLE_MAPS_SERVER_KEY = defineSecret("GOOGLE_MAPS_SERVER_KEY");

// iyzico abonelik ödemeleri — kimlik bilgileri Secret Manager'da, koda hiç yazılmaz.
const IYZICO_API_KEY = defineSecret("IYZICO_API_KEY");
const IYZICO_SECRET_KEY = defineSecret("IYZICO_SECRET_KEY");
const IYZICO_MERCHANT_ID = defineSecret("IYZICO_MERCHANT_ID");
const IYZICO_PRICING_PLAN_REF = defineSecret("IYZICO_PRICING_PLAN_REF");
// Sandbox/prod geçişi kod değişikliği değil, deploy-zamanı config değişikliği olsun.
const IYZICO_BASE_URL = defineString("IYZICO_BASE_URL", { default: "https://sandbox-api.iyzipay.com" });

// Custom domain bağlanana kadar Firebase Hosting'in varsayılan adresi.
const SITE_URL = "https://travyon-5fb01.web.app";

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const RESEND_COOLDOWN_MS = 45 * 1000; // 45 saniye
const MAX_ATTEMPTS = 5;
const DAILY_SEND_LIMIT = 8; // normal kullanım için bol, script suistimalini engeller
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;
const PLAN_MONTH_LIMIT = 3; // ücretsiz kullanıcı için aylık plan oluşturma sınırı
// iyzico Pro ödeme akışı (bkz. Settings.tsx PRO_CHECKOUT_ENABLED) secret'lar
// girilene kadar pasif — bu sınır da onunla birlikte pasif tutuluyor, aksi
// halde kullanıcı sınıra takılır ama Pro'ya geçecek bir yol olmaz. İkisi
// birlikte true yapılır.
const PRO_FEATURES_ENABLED = defineBoolean("PRO_FEATURES_ENABLED", { default: false });

/* ══════════════════════════════════════════════
   RATE LIMITING — kullanıcı (uid) başına, fonksiyon başına
   sabit-pencere sayaç. emailVerificationCodes'daki cooldown
   deseniyle aynı fikir, ama transaction ile: AI uçları paralel/
   sık istek alabilir, düz oku-sonra-yaz burada yarış durumuna açık olurdu.
═══════════════════════════════════════════════ */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 dakika
const RATE_LIMITS: Record<string, number> = {
  mobilePush_register: 30,
  mobilePush_unregister: 100,
  mobilePush_test: 3,
  generateAIContent: 15,
  askTravelAssistant: 25,
  submitBugReport: 5,
  sharePublicPlan: 10,
  unsharePublicPlan: 10,
  syncSharedPlansIdentity: 5,
  ratePublicPlan: 30,
  updatePrivacySettings: 10,
  deleteMyAccount: 2,
  getPublicProfile: 50,
  followUserAction: 30,
  initiateSubscriptionCheckout: 3,
  cancelSubscription: 5,
  getSubscriptionEntitlement: 60,
  geocodeAddress: 80,
  getMobilePlaceDetails: 60,
  getMobilePlacePhoto: 120,
  getMobileAccommodation: 120,
  getDirections: 15,
};

// generateAIContent/askTravelAssistant için mesaj bilinçli olarak bu sabit
// string — aiService.ts'teki getFriendlyError() '429' alt-dizgesini arıyor.
// Diğer (AI olmayan) çağrılar kendi jenerik mesajını verir.
const DEFAULT_RATE_LIMIT_MESSAGE = "AI service rate limit exceeded (429).";

const checkRateLimit = async (uid: string, fnName: string, message = DEFAULT_RATE_LIMIT_MESSAGE): Promise<void> => {
  const max = RATE_LIMITS[fnName];
  const ref = db.collection("rateLimits").doc(`${uid}_${fnName}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists ? snap.data() : undefined;
    const windowStart = data?.windowStart?.toMillis?.() ?? 0;

    if (!data || now - windowStart > RATE_LIMIT_WINDOW_MS) {
      tx.set(ref, { windowStart: FieldValue.serverTimestamp(), count: 1 });
      return;
    }
    if ((data.count ?? 0) >= max) {
      throw new HttpsError("resource-exhausted", message);
    }
    tx.update(ref, { count: FieldValue.increment(1) });
  });
};

/**
 * Kullanıcı şu an Pro erişimine sahip mi? isPro tek başına yeterli değil —
 * abonelik iptal edilse bile ödenen dönem sonuna (currentPeriodEnd) kadar
 * erişim devam etmeli. currentPeriodEnd yoksa (eski/hiç ödeme yapmamış veri)
 * isPro'nun kendisine güvenilir (var olmayan alan sınırsız erişim vermez —
 * çünkü isPro zaten yalnızca activateSubscription() tarafından true yapılır).
 */
const isProActive = (d: Record<string, unknown> | undefined): boolean => {
  if (!d?.isPro) return false;
  const periodEnd = d.currentPeriodEnd as { toMillis?: () => number } | undefined;
  const periodEndMs = periodEnd?.toMillis?.() ?? 0;
  return periodEndMs === 0 || Date.now() < periodEndMs;
};

export const mobilePushAction = onCall({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.data?.expectedUid !== request.auth.uid) throw new HttpsError("unauthenticated", "Oturum değişti.");
  const input = parsePushInput(request.data);
  if (input.action !== "unregister" && !request.auth.token.email_verified) {
    throw new HttpsError("failed-precondition", "Önce e-posta adresini doğrula.");
  }
  await checkRateLimit(request.auth.uid, `mobilePush_${input.action}`, "Çok sık bildirim isteği. Biraz sonra tekrar dene.");
  const devices = db.collection("mobilePushDevices");
  return runMobilePush(input, request.auth.uid, {
    enabled: MOBILE_PUSH_ENABLED.value(),
    emulator: process.env.FUNCTIONS_EMULATOR === "true",
    store: {
      bind: async (id, device) => { await devices.doc(id).set(device); },
      read: async (id) => (await devices.doc(id).get()).data() as PushDevice | undefined,
      removeOwned: async (id, uid) => {
        await db.runTransaction(async (tx) => {
          const ref = devices.doc(id);
          const snap = await tx.get(ref);
          if (snap.data()?.uid === uid) tx.delete(ref);
        });
      },
    },
    send: (message) => getMessaging().send(message),
  });
});

const deliverPush = async (uid: string, event: ReturnType<typeof communityPush.follow>): Promise<boolean> => {
  try {
    await sendMobilePushEvent(db, getMessaging(), uid, event, MOBILE_PUSH_ENABLED.value());
    return true;
  } catch (error) {
    // A notification can never roll back the user's primary action.
    logger.warn("[mobilePushEvent] delivery failed", {
      uid,
      kind: event.kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

const notifyFollowersAboutPlan = async (ownerUid: string, planId: string): Promise<void> => {
  if (!MOBILE_PUSH_ENABLED.value()) return;
  const followers = await db.collectionGroup("following")
    .where("targetUid", "==", ownerUid)
    .limit(2_500)
    .get();
  const uids = [...new Set(followers.docs
    .map((document) => document.data().followerUid)
    .filter((uid): uid is string => typeof uid === "string" && uid.length > 0))];
  for (let index = 0; index < uids.length; index += 25) {
    await Promise.all(uids.slice(index, index + 25)
      .map((uid) => deliverPush(uid, communityPush.sharedPlan(planId))));
  }
};

const istanbulDate = (daysFromToday: number): string => {
  const date = new Date(Date.now() + daysFromToday * DAY_MS);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const claimScheduledPush = async (id: string, data: Record<string, unknown>): Promise<boolean> => {
  const ref = db.collection("mobilePushDeliveries").doc(id);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return false;
    tx.create(ref, {
      ...data,
      status: "claimed",
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
};

/** Daily, deduplicated reminders. The lock-screen payload is deliberately generic. */
export const sendTripReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Istanbul" },
  async () => {
    if (!MOBILE_PUSH_ENABLED.value()) return;
    for (const days of [7, 1]) {
      const startDate = istanbulDate(days);
      const plans = await db.collectionGroup("plans")
        .where("onboardingData.startDate", "==", startDate)
        .get();
      for (const plan of plans.docs) {
        const uid = plan.ref.parent.parent?.id;
        if (!uid) continue;
        const deliveryId = createHash("sha256")
          .update(`${uid}:${plan.id}:${startDate}:${days}`)
          .digest("hex");
        if (!await claimScheduledPush(deliveryId, {
          uid,
          planId: plan.id,
          kind: "trip_reminder",
          startDate,
          days,
        })) continue;
        const delivered = await deliverPush(uid, tripReminderPush(plan.id, days));
        await db.collection("mobilePushDeliveries").doc(deliveryId).set({
          status: delivered ? "processed" : "failed",
          processedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  },
);

/**
 * Ücretsiz kullanıcılar için aylık (30 günlük kayan pencere) plan oluşturma
 * sınırı — sendVerificationCode'daki günlük-limit deseniyle aynı fikir,
 * ama eşzamanlı çift istekte yarış durumuna açılmaması için transaction'lı.
 */
const checkAndIncrementPlanUsage = async (uid: string): Promise<void> => {
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data();
    if (isProActive(data)) return; // Pro kullanıcı sınırsız

    const windowStart = (data?.plansMonthWindowStart as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const now = Date.now();

    if (!windowStart || now - windowStart > MONTH_MS) {
      tx.set(userRef, {
        plansUsedThisMonth: 1,
        plansMonthWindowStart: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    if ((data?.plansUsedThisMonth ?? 0) >= PLAN_MONTH_LIMIT) {
      throw new HttpsError("resource-exhausted", "plan_limit");
    }
    tx.set(userRef, { plansUsedThisMonth: FieldValue.increment(1) }, { merge: true });
  });
};

const generateCode = (): string => {
  const n = randomInt(0, 10 ** CODE_LENGTH);
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
  { secrets: [RESEND_API_KEY, RESEND_FROM], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

    const email = auth.token.email as string | undefined;
    if (!email) throw new HttpsError("failed-precondition", "Hesapta e-posta bulunamadı.");

    const lang = (request.data?.lang === "en" ? "en" : "tr") as string;

    const code = generateCode();
    const ref = codeDocRef(auth.uid);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      const now = Date.now();
      const data = existing.data();
      const lastSentAt = data?.lastSentAt?.toMillis?.() ?? 0;
      const sinceLast = now - lastSentAt;
      if (data && sinceLast < RESEND_COOLDOWN_MS) {
        throw new HttpsError("resource-exhausted", "cooldown", {
          retryAfterMs: RESEND_COOLDOWN_MS - sinceLast,
        });
      }

      const existingDayStart = data?.dailyWindowStart?.toMillis?.() ?? 0;
      const sameDayWindow = Boolean(existingDayStart && now - existingDayStart < DAY_MS);
      const dailyCount = sameDayWindow ? (data?.dailyCount ?? 0) + 1 : 1;
      if (dailyCount > DAILY_SEND_LIMIT) {
        throw new HttpsError("resource-exhausted", "daily_limit");
      }
      tx.set(ref, {
        code,
        email,
        uid: auth.uid,
        attempts: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastSentAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(now + CODE_TTL_MS),
        dailyCount,
        dailyWindowStart: new Date(sameDayWindow ? existingDayStart : now),
      });
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
export const verifyEmailCode = onCall({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

  const submittedCode = String(request.data?.code ?? "").trim();
  if (!/^\d{6}$/.test(submittedCode)) {
    throw new HttpsError("invalid-argument", "invalid_format");
  }

  const currentAuthUser = await getAuth().getUser(auth.uid);
  const ref = codeDocRef(auth.uid);
  const result = await db.runTransaction(async (tx): Promise<"ok" | "missing" | "expired" | "locked" | "wrong" | "email_changed"> => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "missing";
    const data = snap.data()!;
    if (!currentAuthUser.email || data.email?.toLowerCase() !== currentAuthUser.email.toLowerCase()) {
      tx.delete(ref);
      return "email_changed";
    }
    const expiresAt = data.expiresAt?.toMillis?.() ?? 0;
    if (Date.now() > expiresAt) {
      tx.delete(ref);
      return "expired";
    }
    if ((data.attempts ?? 0) >= MAX_ATTEMPTS) {
      tx.delete(ref);
      return "locked";
    }
    if (data.code !== submittedCode) {
      tx.update(ref, { attempts: FieldValue.increment(1) });
      return "wrong";
    }
    if (!data.consumedAt) tx.update(ref, { consumedAt: FieldValue.serverTimestamp() });
    return "ok";
  });
  if (result === "missing") throw new HttpsError("not-found", "no_pending_code");
  if (result === "expired") throw new HttpsError("deadline-exceeded", "expired");
  if (result === "locked") throw new HttpsError("resource-exhausted", "too_many_attempts");
  if (result === "wrong") throw new HttpsError("invalid-argument", "wrong_code");
  if (result === "email_changed") throw new HttpsError("failed-precondition", "email_changed");
  await getAuth().updateUser(auth.uid, { emailVerified: true });
  await ref.delete();

  return { ok: true };
});

/* ══════════════════════════════════════════════
   AI PLAN GENERATION — Gemini proxy
   Client never sees the Gemini key; it lives only in
   Secret Manager and is read here, server-side, at call time.
═══════════════════════════════════════════════ */

type AIContentType = "plan" | "suggestion";

interface GenerateAIContentRequest {
  prompt: string;
  type: AIContentType;
}

// Server hardcodes the model list per type — a tampered client cannot
// request an arbitrary/expensive model for a cheap use-case.
const MODELS_BY_TYPE: Record<AIContentType, string[]> = {
  plan: ["gemini-3.6-flash", "gemini-2.5-flash"],
  suggestion: ["gemini-3.6-flash", "gemini-2.5-flash"],
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Re-homed from web/src/services/aiService.ts's executeWithFallback — SAME retry
 * semantics, just server-side now:
 *  - 400/401/invalid_api_key/json parse → unrecoverable, rethrow immediately
 *  - 403                                → try next model
 *  - 503 / overloaded                   → try next model
 *  - 429                                → sleep (attempt+1)*4000ms, retry same model
 *  - anything else                      → try next model
 */
const generateWithFallback = async (
  apiKey: string,
  prompt: string,
  models: string[]
): Promise<string> => {
  const { GoogleGenAI } = await import("@google/genai");
  const genAI = new GoogleGenAI({ apiKey });
  let lastError: Error | undefined;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
        if (!result.text) throw new Error("AI returned an empty response");
        return result.text;
      } catch (err: unknown) {
        const error = err as Error;
        const msg = error.message.toLowerCase();
        lastError = error;

        if (
          msg.includes("400") ||
          msg.includes("401") ||
          msg.includes("invalid_api_key") ||
          msg.includes("json parse")
        ) {
          throw error; // unrecoverable — bubble straight to the outer catch
        }
        if (msg.includes("403")) break; // no access to this model → next model
        if (msg.includes("503") || msg.includes("overloaded")) break; // busy → next model
        if (msg.includes("429")) {
          await sleep((attempt + 1) * 4000);
          continue; // retry same model
        }
        break; // unknown failure → next model
      }
    }
  }
  throw lastError ?? new Error("AI generation failed.");
};

/**
 * CRITICAL: never forward a raw Gemini/SDK error .message to the client.
 * @google/generative-ai fetch-error messages embed the full request URL
 * (`Error fetching from ${url}: [...] ...`) and, depending on SDK
 * version/error path, that URL can carry the API key as a query param.
 * Classify into the same buckets web/src/services/aiService.ts's
 * getFriendlyError() already scans .message for, and return ONLY a fixed,
 * safe string — the raw text is logged server-side (Cloud Logging only),
 * never returned to the browser.
 */
const toSafeClientMessage = (raw: string): string => {
  const m = raw.toLowerCase();
  if (m.includes("json parse")) return "AI response could not be parsed (json parse error).";
  if (m.includes("api") && m.includes("key")) return "AI service configuration error: invalid api key.";
  if (m.includes("429")) return "AI service rate limit exceeded (429).";
  if (m.includes("503") || m.includes("overloaded")) return "AI service overloaded (503).";
  if (m.includes("400") || m.includes("401")) return "AI request error (400).";
  if (m.includes("403")) return "AI model access forbidden (403).";
  return "AI generation failed.";
};

/**
 * Proxies Gemini calls for the three client use-cases in aiService.ts
 * (generateTravelPlan / regenerateDayWithVibe / suggestSingleActivity) so the
 * real Gemini key never reaches the browser bundle. Timeout is generous
 * because the retry/backoff loop can itself sleep up to ~24s per model,
 * across up to 2 models, plus real network latency for JSON-mode generation.
 */
export const generateAIContent = onCall<GenerateAIContentRequest>(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 180, enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }

    const { prompt, type } = request.data ?? ({} as Partial<GenerateAIContentRequest>);

    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError("invalid-argument", "prompt is required.");
    }
    if (type !== "plan" && type !== "suggestion") {
      throw new HttpsError("invalid-argument", "type must be 'plan' or 'suggestion'.");
    }
    // Optional lightweight guardrail (NOT a rate-limit/quota system — just
    // input sanity) against a tampered client sending a pathologically large
    // prompt. Real prompts from buildPrompt()/suggestSingleActivity() are a
    // few KB at most.
    if (prompt.length > 20000) {
      throw new HttpsError("invalid-argument", "prompt too long.");
    }

    await checkRateLimit(request.auth.uid, "generateAIContent");
    if (type === "plan" && PRO_FEATURES_ENABLED.value()) {
      await checkAndIncrementPlanUsage(request.auth.uid);
    }

    const apiKey = GEMINI_API_KEY.value();
    if (!apiKey) {
      logger.error("GEMINI_API_KEY secret not configured");
      throw new HttpsError("failed-precondition", "AI service configuration error: invalid api key.");
    }

    try {
      const text = await generateWithFallback(apiKey, prompt, MODELS_BY_TYPE[type]);
      return { text };
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      logger.error("[generateAIContent] Gemini call failed", { type, raw });
      throw new HttpsError("internal", toSafeClientMessage(raw));
    }
  }
);

/* ══════════════════════════════════════════════
   AI SEYAHAT ASİSTANI — streaming Gemini proxy
═══════════════════════════════════════════════ */

const ASSISTANT_SYSTEM_PROMPT = `Sen Travyon'un akıllı seyahat asistanısın. Adın "Travyon AI".
Kullanıcıya kısa, net ve yararlı seyahat tavsiyeleri ver.
KURALLAR:
- Daima Türkçe konuş.
- Yanıtını 4-6 cümleyle sınırla — çok uzun yazma.
- Şehir/ülke önerirken emoji ekle (🏛️ Roma, 🗼 Paris gibi).
- Madde listesi kullanıyorsan en fazla 4 madde.
- Bütçe sorularında net rakamlar ver.
- Eğer kullanıcının aktif bir planı varsa (aşağıda PLAN BAĞLAMI olarak verilecek), plan detaylarına başvur.
  "3. günümde...", "planımda...", "hangi gün..." gibi sorularda plan bağlamını kullan.
- Seyahatle ilgili olmayan sorulara nazikçe "Bu konuda yardımcı olamam, ama seyahat sorularına bayılıyorum! 😊" de.`;

const ASSISTANT_SYSTEM_PROMPT_EN = `You are Travyon's smart travel assistant, "Travyon AI".
Give concise, practical travel advice.
RULES:
- Always answer in English.
- Limit answers to 4-6 sentences; use no more than 4 bullets.
- Add an emoji when recommending a city or country.
- Give concrete figures for budget questions and clearly label estimates.
- Use PLAN CONTEXT when the user refers to their itinerary or a particular day.
- Politely decline unrelated questions and offer help with travel instead.`;

interface AskAssistantRequest {
  question: string;
  planContext?: string;
  language?: "tr" | "en";
}

/**
 * Yüzen AI sohbet asistanı için streaming Gemini proxy'si. Sistem promptu
 * artık burada, istemciden manipüle edilemez. response.sendChunk her
 * seferinde BİRİKMİŞ tam metni gönderir — istemcideki eski onChunk(full)
 * davranışıyla birebir aynı.
 */
export const askTravelAssistant = onCall<AskAssistantRequest>(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 90, enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request, response) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }

    const { question, planContext, language } = request.data ?? ({} as Partial<AskAssistantRequest>);
    if (typeof question !== "string" || !question.trim()) {
      throw new HttpsError("invalid-argument", "question is required.");
    }
    if (question.length > 4000 || (planContext && planContext.length > 8000)) {
      throw new HttpsError("invalid-argument", "input too long.");
    }

    await checkRateLimit(request.auth.uid, "askTravelAssistant");

    const apiKey = GEMINI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "AI service configuration error: invalid api key.");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey });
    const english = language === "en";
    const userPrompt = [
      planContext ? `${planContext}\n` : "",
      `${english ? "User question" : "Kullanıcı sorusu"}: ${question}`,
    ].join("");

    const tryStream = async (modelName: string): Promise<string> => {
      const result = await genAI.models.generateContentStream({
        model: modelName,
        contents: userPrompt,
        config: { systemInstruction: english ? ASSISTANT_SYSTEM_PROMPT_EN : ASSISTANT_SYSTEM_PROMPT },
      });
      let full = "";
      for await (const chunk of result) {
        full += chunk.text ?? "";
        if (request.acceptsStreaming && response) response.sendChunk(full);
      }
      return full;
    };

    try {
      return await tryStream("gemini-3.6-flash");
    } catch {
      try {
        return await tryStream("gemini-2.5-flash");
      } catch (err2) {
        logger.error("[askTravelAssistant] Gemini call failed", {
          err: err2 instanceof Error ? err2.message : String(err2),
        });
        throw new HttpsError("internal", "AI assistant failed.");
      }
    }
  }
);

/* ══════════════════════════════════════════════
   İLETİŞİM FORMU — genel sayfa, giriş şartı yok
═══════════════════════════════════════════════ */

const CONTACT_EMAIL = "iletisim@travyon.app";
const CONTACT_COOLDOWN_MS = 2 * 60 * 1000; // 2 dakika
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactMessageRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/**
 * İletişim sayfasındaki formu Resend üzerinden gerçek bir e-postaya çevirir.
 * Anonim ziyaretçiler de kullanabilir (giriş şartı yok) — bu yüzden uid
 * bazlı değil, gönderilen e-posta adresine bağlı bir cooldown var.
 */
export const submitContactMessage = onCall<ContactMessageRequest>(
  { secrets: [RESEND_API_KEY, RESEND_FROM], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    const { name, email, subject, message } = request.data ?? ({} as Partial<ContactMessageRequest>);

    if (typeof name !== "string" || !name.trim() || name.length > 100) {
      throw new HttpsError("invalid-argument", "invalid name");
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 200) {
      throw new HttpsError("invalid-argument", "invalid email");
    }
    if (typeof subject !== "string" || !subject.trim() || subject.length > 200) {
      throw new HttpsError("invalid-argument", "invalid subject");
    }
    if (typeof message !== "string" || !message.trim() || message.length > 5000) {
      throw new HttpsError("invalid-argument", "invalid message");
    }

    const hashKey = (value: string) => createHash("sha256").update(value).digest("base64url");
    const cooldownRef = db.collection("contactCooldowns").doc(`email_${hashKey(email.toLowerCase())}`);
    const ipRef = db.collection("contactCooldowns").doc(`ip_${hashKey(request.rawRequest.ip || "unknown")}`);
    await db.runTransaction(async (tx) => {
      const [existingEmail, existingIp] = await Promise.all([tx.get(cooldownRef), tx.get(ipRef)]);
      const now = Date.now();
      const emailLastSent = existingEmail.data()?.lastSentAt?.toMillis?.() ?? 0;
      const ipLastSent = existingIp.data()?.lastSentAt?.toMillis?.() ?? 0;
      if (
        (existingEmail.exists && now - emailLastSent < CONTACT_COOLDOWN_MS) ||
        (existingIp.exists && now - ipLastSent < CONTACT_COOLDOWN_MS)
      ) {
        throw new HttpsError("resource-exhausted", "cooldown");
      }
      tx.set(cooldownRef, { lastSentAt: FieldValue.serverTimestamp() });
      tx.set(ipRef, { lastSentAt: FieldValue.serverTimestamp() });
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
        to: [CONTACT_EMAIL],
        reply_to: email,
        subject: `[İletişim Formu] ${subject}`,
        html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <p><strong>Ad:</strong> ${escapeHtml(name)}</p>
          <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
          <p><strong>Konu:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Mesaj:</strong></p>
          <p style="white-space:pre-line;">${escapeHtml(message)}</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("[submitContactMessage] Resend gönderim hatası", { status: res.status, text });
      throw new HttpsError("internal", "Mesaj gönderilemedi.");
    }

    return { ok: true };
  }
);

/* ══════════════════════════════════════════════
   HATA RAPORU / PLAN PAYLAŞIMI / TAKİP ETME
   Bunlar önceden doğrudan client → Firestore yazımıydı; Firestore
   Security Rules'ın istek-sıklığı hafızası olmadığı için (rate limit
   uygulayamadığı için) buraya, checkRateLimit() korumasının arkasına
   taşındı. firestore.rules'ta karşılık gelen create kuralları artık
   `if false` — sadece bu fonksiyonlar (Admin SDK, rules'ı atlar) yazabilir.
═══════════════════════════════════════════════ */

interface SubmitBugReportRequest {
  title: string;
  desc: string;
}

export const submitBugReport = onCall<SubmitBugReportRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
  }

  const { title, desc } = request.data ?? ({} as Partial<SubmitBugReportRequest>);
  if (typeof title !== "string" || !title.trim() || title.length > 200) {
    throw new HttpsError("invalid-argument", "invalid title");
  }
  if (typeof desc !== "string" || !desc.trim() || desc.length > 3000) {
    throw new HttpsError("invalid-argument", "invalid desc");
  }

  await checkRateLimit(request.auth.uid, "submitBugReport", "Rate limit exceeded — try again later.");

  await db.collection("bug_reports").doc(`${request.auth.uid}_${Date.now()}`).set({
    uid: request.auth.uid,
    email: request.auth.token.email ?? null,
    title,
    desc,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

interface SharePublicPlanRequest {
  planId: string;
  plan: {
    destination: string;
    dailyPlans: unknown[];
    [key: string]: unknown;
  };
  onboardingData: {
    budget?: number;
    currencySymbol?: string;
    tripPurpose?: string;
    travelType?: string;
    peopleCount?: number;
    pace?: string;
    purposes?: string[];
    earlyBird?: boolean;
    dietaryRestrictions?: string[];
    foodPhilosophy?: string;
    accommodation?: string;
    transport?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  };
  linkOnly?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoundedString = (value: unknown, max: number, required = false): value is string =>
  typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);

const isFiniteInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const isValidLatLng = (value: unknown): value is { lat: number; lng: number } =>
  isRecord(value) && isFiniteInRange(value.lat, -90, 90) && isFiniteInRange(value.lng, -180, 180);

const isShareablePlan = (value: unknown): value is SharePublicPlanRequest["plan"] => {
  if (!isRecord(value) || !isBoundedString(value.destination, 200, true) || !Array.isArray(value.dailyPlans)) {
    return false;
  }
  if (value.dailyPlans.length < 1 || value.dailyPlans.length > 31) return false;
  if (!isBoundedString(value.overallSummary, 10_000)) return false;
  if (!isFiniteInRange(value.totalEstimatedCost, 0, 1_000_000_000)) return false;
  if (!isBoundedString(value.currencySymbol, 10)) return false;
  if (value.cityGuide !== undefined) {
    if (!isRecord(value.cityGuide)) return false;
    if (![value.cityGuide.transportationTips, value.cityGuide.localCustoms, value.cityGuide.generalAdvice]
      .every((text) => isBoundedString(text, 5_000))) return false;
  }

  return value.dailyPlans.every((day, dayIndex) => {
    if (!isRecord(day) || day.dayNumber !== dayIndex + 1 || !isBoundedString(day.date, 32, true)) return false;
    if (!isBoundedString(day.daySummary, 4_000) || !isFiniteInRange(day.totalEstimatedCost, 0, 1_000_000_000)) return false;
    if (!Array.isArray(day.activities) || day.activities.length > 15) return false;
    return day.activities.every((activity) => {
      if (!isRecord(activity)) return false;
      if (!isBoundedString(activity.period, 50, true) || !isBoundedString(activity.placeName, 200, true)) return false;
      if (!isBoundedString(activity.description, 4_000) || !isValidLatLng(activity.coordinates)) return false;
      if (!isFiniteInRange(activity.estimatedCost, 0, 1_000_000_000)) return false;
      if (activity.actualCost !== undefined && !isFiniteInRange(activity.actualCost, 0, 1_000_000_000)) return false;
      return activity.note === undefined || isBoundedString(activity.note, 2_000);
    });
  });
};

const isOptionalBoundedString = (value: unknown, max: number): boolean =>
  value === undefined || isBoundedString(value, max);

const isOptionalStringArray = (value: unknown, maxItems: number, maxItemLength: number): boolean =>
  value === undefined || (
    Array.isArray(value) && value.length <= maxItems && value.every((item) => isBoundedString(item, maxItemLength))
  );

const isValidOnboardingMetadata = (value: unknown): value is SharePublicPlanRequest["onboardingData"] => {
  if (!isRecord(value)) return false;
  if (value.budget !== undefined && !isFiniteInRange(value.budget, 0, 1_000_000_000)) return false;
  if (value.peopleCount !== undefined && (!Number.isInteger(value.peopleCount) || !isFiniteInRange(value.peopleCount, 1, 100))) return false;
  if (value.earlyBird !== undefined && typeof value.earlyBird !== "boolean") return false;
  if (![value.currencySymbol, value.tripPurpose, value.travelType, value.pace, value.foodPhilosophy,
    value.accommodation, value.transport].every((item) => isOptionalBoundedString(item, 100))) return false;
  if (!isOptionalStringArray(value.purposes, 20, 100) || !isOptionalStringArray(value.dietaryRestrictions, 20, 100)) return false;
  if (![value.startDate, value.endDate].every((item) => isOptionalBoundedString(item, 32))) return false;
  return true;
};

/**
 * socialService.ts'teki shareplan()/sharePlanAsLink()'in taşındığı yer —
 * ikisi de aynı fonksiyon, sadece linkOnly=true iken feedVisible:false ekleniyor.
 * userDisplayName/userPhotoURL istemciden GÜVENİLMİYOR — Admin SDK ile
 * kullanıcının güncel Auth kaydından çekiliyor (sahte isim/foto engellenir).
 */
export const sharePublicPlan = onCall<SharePublicPlanRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
  }

  const { planId, plan, onboardingData, linkOnly } = request.data ?? ({} as Partial<SharePublicPlanRequest>);
  if (typeof planId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(planId)) {
    throw new HttpsError("invalid-argument", "invalid planId");
  }
  if (!isShareablePlan(plan)) {
    throw new HttpsError("invalid-argument", "invalid plan");
  }
  if (!isValidOnboardingMetadata(onboardingData)) {
    throw new HttpsError("invalid-argument", "invalid onboardingData");
  }
  if (linkOnly !== undefined && typeof linkOnly !== "boolean") {
    throw new HttpsError("invalid-argument", "invalid linkOnly");
  }
  if (Buffer.byteLength(JSON.stringify({ plan, onboardingData }), "utf8") > 750_000) {
    throw new HttpsError("invalid-argument", "plan payload is too large");
  }

  await checkRateLimit(request.auth.uid, "sharePublicPlan", "Rate limit exceeded — try again later.");

  const [authUser, userSnap] = await Promise.all([
    getAuth().getUser(request.auth.uid),
    db.collection("users").doc(request.auth.uid).get(),
  ]);
  const privacy = userSnap.data();
  if (!linkOnly && privacy?.plansPublic !== true) {
    throw new HttpsError("permission-denied", "Topluluk plan paylaşımı ayarlardan açılmalı.");
  }

  const exposeIdentity = privacy?.profilePublic === true;
  const trustedPhotoURL = typeof privacy?.photoURL === "string" && privacy.photoURL.startsWith("https://")
    ? privacy.photoURL
    : (authUser.photoURL ?? null);
  const docData: Record<string, unknown> = {
    userId: request.auth.uid,
    userDisplayName: exposeIdentity ? (authUser.displayName ?? "Gezgin") : "Gezgin",
    userPhotoURL: exposeIdentity ? trustedPhotoURL : null,
    destination: plan.destination,
    dailyPlanCount: plan.dailyPlans.length,
    budget: onboardingData.budget ?? 0,
    currencySymbol: onboardingData.currencySymbol ?? "₺",
    tripPurpose: onboardingData.tripPurpose ?? "",
    feedVisible: linkOnly !== true,
    profilePublic: exposeIdentity,
    travelType: onboardingData.travelType ?? "",
    peopleCount: onboardingData.peopleCount ?? 1,
    pace: onboardingData.pace ?? "",
    purposes: onboardingData.purposes ?? [],
    earlyBird: onboardingData.earlyBird ?? false,
    dietaryRestrictions: onboardingData.dietaryRestrictions ?? [],
    foodPhilosophy: onboardingData.foodPhilosophy ?? "",
    accommodation: onboardingData.accommodation ?? "",
    transport: onboardingData.transport ?? "",
    startDate: onboardingData.startDate ?? "",
    endDate: onboardingData.endDate ?? "",
    planData: plan,
  };
  let newlyPublished = false;
  try {
    const planRef = db.collection("publicPlans").doc(planId);
    newlyPublished = await db.runTransaction(async (tx) => {
      const existing = await tx.get(planRef);
      if (existing.exists && existing.data()?.userId !== request.auth?.uid) {
        throw new HttpsError("permission-denied", "Bu plan kimliği başka bir kullanıcıya ait.");
      }
      const previous = existing.data();
      tx.set(planRef, {
        ...docData,
        createdAt: previous?.createdAt ?? FieldValue.serverTimestamp(),
        avgRating: previous?.avgRating ?? 0,
        ratingCount: previous?.ratingCount ?? 0,
      });
      return linkOnly !== true && previous?.feedVisible !== true;
    });
  } catch (err) {
    logger.error("[sharePublicPlan] Firestore yazım hatası", {
      err: err instanceof Error ? err.message : String(err),
    });
    throw new HttpsError("internal", "Plan paylaşılamadı.");
  }

  if (newlyPublished) {
    await notifyFollowersAboutPlan(request.auth.uid, planId).catch((error) => {
      logger.warn("[sharePublicPlan] follower notification failed", {
        uid: request.auth?.uid,
        planId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return { ok: true };
});

interface UnsharePublicPlanRequest { planId: string }

export const unsharePublicPlan = onCall<UnsharePublicPlanRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  const planId = request.data?.planId;
  if (typeof planId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(planId)) {
    throw new HttpsError("invalid-argument", "invalid planId");
  }
  await checkRateLimit(request.auth.uid, "unsharePublicPlan", "Rate limit exceeded.");
  const planRef = db.collection("publicPlans").doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) return { ok: true };
  if (planSnap.data()?.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Bu plan size ait değil.");
  }
  const ratings = await db.collection("planRatings").where("planId", "==", planId).get();
  const writer = db.bulkWriter();
  for (const rating of ratings.docs) writer.delete(rating.ref);
  writer.delete(planRef);
  await writer.close();
  return { ok: true };
});

/** Profil adı/fotoğrafı istemciden kabul edilmez; Auth kaydından yayılır. */
export const syncSharedPlansIdentity = onCall({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  await checkRateLimit(request.auth.uid, "syncSharedPlansIdentity", "Rate limit exceeded.");

  const [authUser, userSnap, plansSnap] = await Promise.all([
    getAuth().getUser(request.auth.uid),
    db.collection("users").doc(request.auth.uid).get(),
    db.collection("publicPlans").where("userId", "==", request.auth.uid).get(),
  ]);
  const writer = db.bulkWriter();
  const exposeIdentity = userSnap.data()?.profilePublic === true;
  const trustedPhotoURL = typeof userSnap.data()?.photoURL === "string" && userSnap.data()?.photoURL.startsWith("https://")
    ? userSnap.data()?.photoURL
    : (authUser.photoURL ?? null);
  for (const planDoc of plansSnap.docs) {
    const updates: Record<string, unknown> = {
      userDisplayName: exposeIdentity ? (authUser.displayName ?? "Gezgin") : "Gezgin",
      userPhotoURL: exposeIdentity ? trustedPhotoURL : null,
      profilePublic: exposeIdentity,
    };
    // Eski sürümde feedVisible alanı yoktu. Kullanıcı plan paylaşımına izin
    // verdiyse eski genel paylaşımı görünür, vermediyse bağlantıya özel yap.
    if (planDoc.data().feedVisible === undefined) {
      updates.feedVisible = userSnap.data()?.plansPublic === true;
    }
    writer.update(planDoc.ref, updates);
  }
  await writer.close();
  return { ok: true };
});

interface RatePublicPlanRequest { planId: string; rating: number }

export const ratePublicPlan = onCall<RatePublicPlanRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
  }
  const { planId, rating } = request.data ?? ({} as Partial<RatePublicPlanRequest>);
  if (typeof planId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(planId)) {
    throw new HttpsError("invalid-argument", "invalid planId");
  }
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) {
    throw new HttpsError("invalid-argument", "rating must be an integer from 1 to 5");
  }
  await checkRateLimit(request.auth.uid, "ratePublicPlan", "Rate limit exceeded.");

  const planRef = db.collection("publicPlans").doc(planId);
  const ratingRef = db.collection("planRatings").doc(`${planId}_${request.auth.uid}`);
  const outcome = await db.runTransaction(async (tx) => {
    const [planSnap, existingRating] = await Promise.all([tx.get(planRef), tx.get(ratingRef)]);
    if (!planSnap.exists) throw new HttpsError("not-found", "Plan bulunamadı.");

    const planData = planSnap.data() ?? {};
    let count = Math.max(0, Number(planData.ratingCount) || 0);
    let sum = Math.max(0, Number(planData.avgRating) || 0) * count;
    if (existingRating.exists) {
      sum = sum - (Number(existingRating.data()?.rating) || 0) + rating!;
    } else {
      sum += rating!;
      count += 1;
    }
    const newAvg = count > 0 ? Math.min(5, Math.max(0, sum / count)) : 0;
    tx.set(ratingRef, {
      planId,
      userId: request.auth!.uid,
      rating,
      createdAt: existingRating.data()?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(planRef, { avgRating: newAvg, ratingCount: count });
    return {
      newAvg,
      newCount: count,
      ownerUid: typeof planData.userId === "string" ? planData.userId : "",
      firstRating: !existingRating.exists,
    };
  });
  if (outcome.firstRating && outcome.ownerUid && outcome.ownerUid !== request.auth.uid) {
    await deliverPush(outcome.ownerUid, communityPush.rating(planId));
  }
  return { newAvg: outcome.newAvg, newCount: outcome.newCount };
});

interface FollowUserActionRequest {
  targetUid: string;
}

export const followUserAction = onCall<FollowUserActionRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
  }

  const { targetUid } = request.data ?? ({} as Partial<FollowUserActionRequest>);
  if (typeof targetUid !== "string" || !targetUid.trim()) {
    throw new HttpsError("invalid-argument", "invalid targetUid");
  }
  if (targetUid === request.auth.uid) {
    throw new HttpsError("invalid-argument", "cannot follow yourself");
  }

  await checkRateLimit(request.auth.uid, "followUserAction", "Rate limit exceeded — try again later.");

  try {
    await getAuth().getUser(targetUid);
  } catch {
    throw new HttpsError("not-found", "Kullanıcı bulunamadı.");
  }
  const targetSettings = await db.collection("users").doc(targetUid).get();
  if (!targetSettings.exists || targetSettings.data()?.followPublic !== true) {
    throw new HttpsError("permission-denied", "Bu kullanıcı takip isteklerini kapatmış.");
  }

  const followRef = db.collection("userFollows")
    .doc(request.auth.uid)
    .collection("following")
    .doc(targetUid);
  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(followRef);
    if (existing.exists) return false;
    tx.create(followRef, {
      followerUid: request.auth!.uid,
      targetUid,
      followedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (created) await deliverPush(targetUid, communityPush.follow());

  return { ok: true };
});

interface PublicProfileRequest { targetUid: string }

export const getPublicProfile = onCall<PublicProfileRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  const targetUid = request.data?.targetUid;
  if (typeof targetUid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(targetUid)) {
    throw new HttpsError("invalid-argument", "invalid targetUid");
  }
  await checkRateLimit(request.auth.uid, "getPublicProfile", "Rate limit exceeded.");

  const settings = await db.collection("users").doc(targetUid).get();
  if (targetUid !== request.auth.uid && settings.data()?.profilePublic !== true) {
    return { exists: true, isPublic: false };
  }
  try {
    const target = await getAuth().getUser(targetUid);
    return {
      exists: true,
      isPublic: true,
      displayName: target.displayName ?? "Gezgin",
      photoURL: typeof settings.data()?.photoURL === "string" && settings.data()?.photoURL.startsWith("https://")
        ? settings.data()?.photoURL
        : (target.photoURL ?? null),
    };
  } catch {
    return { exists: false, isPublic: false };
  }
});

interface PrivacySettingsRequest {
  profilePublic: boolean;
  plansPublic: boolean;
  followPublic: boolean;
  locationEnabled: boolean;
  locationHistory: boolean;
  analyticsEnabled: boolean;
}

/** Gizlilik ayarlarını kaydeder ve profil görünürlüğünü mevcut paylaşımlara uygular. */
export const updatePrivacySettings = onCall<PrivacySettingsRequest>({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  const data = request.data ?? ({} as Partial<PrivacySettingsRequest>);
  const keys: (keyof PrivacySettingsRequest)[] = [
    "profilePublic", "plansPublic", "followPublic", "locationEnabled",
    "locationHistory", "analyticsEnabled",
  ];
  if (keys.some((key) => typeof data[key] !== "boolean")) {
    throw new HttpsError("invalid-argument", "invalid privacy settings");
  }
  if (data.locationEnabled === false && data.locationHistory === true) {
    throw new HttpsError("invalid-argument", "location history requires location access");
  }
  await checkRateLimit(request.auth.uid, "updatePrivacySettings", "Rate limit exceeded.");

  await db.collection("users").doc(request.auth.uid).set(data, { merge: true });
  const [plansSnap, authUser, userSnap] = await Promise.all([
    db.collection("publicPlans").where("userId", "==", request.auth.uid).get(),
    getAuth().getUser(request.auth.uid),
    db.collection("users").doc(request.auth.uid).get(),
  ]);
  const userPhotoURL = userSnap.data()?.photoURL;
  const storedPhoto = typeof userPhotoURL === "string" && userPhotoURL.startsWith("https://")
    ? userPhotoURL
    : (typeof authUser.photoURL === "string" && authUser.photoURL.startsWith("https://") ? authUser.photoURL : null);
  const writer = db.bulkWriter();
  for (const planDoc of plansSnap.docs) {
    const update: Record<string, unknown> = {
      profilePublic: data.profilePublic,
      userDisplayName: data.profilePublic ? (authUser.displayName ?? "Gezgin") : "Gezgin",
      userPhotoURL: data.profilePublic ? storedPhoto : null,
    };
    // Paylaşım kapatılınca mevcut topluluk kayıtları bağlantıya özel hale gelir.
    if (data.plansPublic === false) update.feedVisible = false;
    else if (planDoc.data().feedVisible === undefined) update.feedVisible = true;
    writer.update(planDoc.ref, update);
  }
  await writer.close();
  return { ok: true };
});

/** Hesaba bağlı uygulama verilerini temizler, ardından Firebase Auth hesabını siler. */
export const deleteMyAccount = onCall({ enforceAppCheck: SHOULD_ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  const authTimeSeconds = Number(request.auth.token.auth_time) || 0;
  if (!authTimeSeconds || Date.now() / 1000 - authTimeSeconds > 5 * 60) {
    throw new HttpsError("failed-precondition", "Hesabı silmeden önce yeniden giriş yapmalısınız.");
  }
  await checkRateLimit(request.auth.uid, "deleteMyAccount", "Rate limit exceeded.");

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (isProActive(userSnap.data())) {
    throw new HttpsError("failed-precondition", "Aktif abonelik önce iptal edilmeli.");
  }

  const [plansSnap, ratingsSnap, incomingFollows, followRoots, bugReports, checkouts, subscriptions, payments, pushDevices, pushDeliveries] = await Promise.all([
    db.collection("publicPlans").where("userId", "==", uid).get(),
    db.collection("planRatings").where("userId", "==", uid).get(),
    db.collectionGroup("following").where("targetUid", "==", uid).get(),
    db.collection("userFollows").listDocuments(),
    db.collection("bug_reports").where("uid", "==", uid).get(),
    db.collection("subscriptionCheckouts").where("uid", "==", uid).get(),
    db.collection("subscriptionsByRef").where("uid", "==", uid).get(),
    db.collection("payments").where("uid", "==", uid).get(),
    db.collection("mobilePushDevices").where("uid", "==", uid).get(),
    db.collection("mobilePushDeliveries").where("uid", "==", uid).get(),
  ]);

  const writer = db.bulkWriter();
  const deletedRatingIds = new Set<string>();
  for (const planDoc of plansSnap.docs) {
    const planRatings = await db.collection("planRatings").where("planId", "==", planDoc.id).get();
    for (const ratingDoc of planRatings.docs) {
      deletedRatingIds.add(ratingDoc.id);
      writer.delete(ratingDoc.ref);
    }
    writer.delete(planDoc.ref);
  }
  for (const ratingDoc of ratingsSnap.docs) {
    if (!deletedRatingIds.has(ratingDoc.id)) writer.delete(ratingDoc.ref);
  }
  for (const snap of [incomingFollows, bugReports, checkouts, subscriptions, payments, pushDevices, pushDeliveries]) {
    for (const item of snap.docs) writer.delete(item.ref);
  }
  // targetUid alanı eklenmeden önce oluşmuş takip kayıtları collectionGroup
  // sorgusuna girmez. Her takip kökündeki doğrudan hedef kaydını da silerek
  // eski verilerin takipçi hesaplarında yetim kalmasını önleriz.
  for (const followRoot of followRoots) {
    if (followRoot.id !== uid) writer.delete(followRoot.collection("following").doc(uid));
  }
  for (const subscription of subscriptions.docs) {
    writer.delete(db.collection("pendingWebhookEvents").doc(subscription.id));
  }
  writer.delete(codeDocRef(uid));
  for (const fnName of Object.keys(RATE_LIMITS)) {
    writer.delete(db.collection("rateLimits").doc(`${uid}_${fnName}`));
  }
  await writer.close();

  // Kullanıcının takip alt koleksiyonu dahil tüm profil ağacı temizlenir.
  await db.recursiveDelete(db.collection("userFollows").doc(uid));
  await db.recursiveDelete(userRef);
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` }).catch((error) => {
    logger.warn("[deleteMyAccount] Storage cleanup failed", {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  await getAuth().deleteUser(uid);
  return { ok: true };
});

/* ══════════════════════════════════════════════
   iyzico PRO ABONELİK ÖDEMESİ
   Akış: initiateSubscriptionCheckout (onCall) → iyzico hosted checkout →
   subscriptionCallback (onRequest, redirect doğrulama) VE/VEYA
   subscriptionWebhook (onRequest, tekrarlayan ödeme/başarısızlık bildirimi).
   İkisi de aynı activateSubscription() yardımcısını kullanır — kod tekrarı
   ve callback/webhook arasında davranış ayrışması önlenir.
═══════════════════════════════════════════════ */

const IDENTITY_NUMBER_RE = /^\d{11}$/;

/** IYZWSv2 — resmi iyzipay SDK'sı bu v2/subscription uçlarını desteklemiyor,
 *  bu yüzden imzalama Node'un yerleşik crypto'suyla elle yapılıyor. */
const iyzicoAuthHeader = (
  apiKey: string,
  secretKey: string,
  uriPath: string,
  bodyJson: string,
): { authorization: string; randomKey: string } => {
  const randomKey = `${Date.now()}${Math.random().toString().slice(2, 12)}`;
  const signature = createHmac("sha256", secretKey)
    .update(randomKey + uriPath + bodyJson)
    .digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    authorization: `IYZWSv2 ${Buffer.from(authString).toString("base64")}`,
    randomKey,
  };
};

/** iyzico v2 API'sine imzalı ham fetch. POST'lar (para hareketi başlatanlar)
 *  ASLA otomatik tekrar denenmez — timeout'ta retry çift abonelik/çift
 *  ücretlendirme riski taşır. Sadece GET (retrieve) çağıranlar serbestçe
 *  tekrarlanabilir. */
const iyzicoRequest = async <T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> => {
  const apiKey = IYZICO_API_KEY.value();
  const secretKey = IYZICO_SECRET_KEY.value();
  const baseUrl = IYZICO_BASE_URL.value();
  const bodyJson = body ? JSON.stringify(body) : "";
  const { authorization, randomKey } = iyzicoAuthHeader(apiKey, secretKey, path, bodyJson);

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-iyzi-rnd": randomKey,
    },
    body: body ? bodyJson : undefined,
  });

  const json = await res.json().catch(() => null) as (Record<string, unknown> & { status?: string }) | null;
  if (!res.ok || !json || json.status !== "success") {
    logger.error("[iyzico] request failed", { path, httpStatus: res.status, json });
    throw new Error(`iyzico_request_failed:${path}`);
  }
  return json as T;
};

/** X-IYZ-SIGNATURE-V3 doğrulaması — bu, herkese açık webhook uç noktasını
 *  sahte isteklerden koruyan TEK mekanizma. Uzunluk farkı varsa
 *  timingSafeEqual'i ÇAĞIRMADAN reddet (aksi halde exception atar). */
const verifyIyzicoWebhookSignature = (
  headerSignature: string | undefined,
  secretKey: string,
  merchantId: string,
  eventType: string,
  subscriptionReferenceCode: string,
  orderReferenceCode: string,
  customerReferenceCode: string,
): boolean => {
  if (!headerSignature) return false;
  const input = merchantId + secretKey + eventType + subscriptionReferenceCode + orderReferenceCode + customerReferenceCode;
  const computed = createHmac("sha256", secretKey).update(input).digest("hex");
  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(headerSignature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

/**
 * Callback (redirect doğrulama) ve webhook'un (tekrarlayan ödeme bildirimi)
 * İKİSİ de aynı ilk ödeme için tetiklenebilir — payments/{orderReferenceCode}
 * dokümanının transaction içinde var olup olmadığı kontrolü doğal bir dedupe
 * guard'ı: aynı ödeme iki kez işlenmez. proSince yalnızca İLK aktivasyonda
 * yazılır; lastPaymentAt ve currentPeriodEnd her başarılı ödemede güncellenir.
 */
const activateSubscription = async (
  uid: string,
  params: { subscriptionReferenceCode: string; orderReferenceCode: string },
): Promise<void> => {
  const userRef = db.collection("users").doc(uid);
  const paymentRef = db.collection("payments").doc(params.orderReferenceCode);

  await db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (paymentSnap.exists) return; // zaten işlendi — idempotent no-op

    const userSnap = await tx.get(userRef);
    const userData = userSnap.data() ?? {};
    const currentPeriodEnd = new Date(Date.now() + 30 * DAY_MS);

    const update: Record<string, unknown> = {
      isPro: true,
      subscriptionReferenceCode: params.subscriptionReferenceCode,
      subscriptionStatus: "active",
      subscriptionProvider: "iyzico",
      lastPaymentAt: FieldValue.serverTimestamp(),
      currentPeriodEnd,
    };
    if (!userData.proSince) update.proSince = FieldValue.serverTimestamp();

    tx.set(userRef, update, { merge: true });
    tx.set(paymentRef, {
      uid,
      subscriptionReferenceCode: params.subscriptionReferenceCode,
      provider: "iyzico",
      amount: "49.90",
      currency: "TRY",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
};

/**
 * Provider-neutral entitlement read model for web, Google Play and App Store.
 * Store receipts must later be verified server-side before these protected
 * fields are written; this callable never trusts client purchase claims.
 */
export const getSubscriptionEntitlement = onCall(
  { enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    await checkRateLimit(
      request.auth.uid,
      "getSubscriptionEntitlement",
      "Çok sık abonelik kontrolü yapıldı. Biraz sonra tekrar dene.",
    );
    const user = (await db.collection("users").doc(request.auth.uid).get()).data();
    const periodEnd = user?.currentPeriodEnd as { toMillis?: () => number } | undefined;
    return {
      active: isProActive(user),
      status: typeof user?.subscriptionStatus === "string"
        ? user.subscriptionStatus
        : "inactive",
      provider: typeof user?.subscriptionProvider === "string"
        ? user.subscriptionProvider
        : null,
      productId: typeof user?.subscriptionProductId === "string"
        ? user.subscriptionProductId
        : null,
      currentPeriodEndMs: periodEnd?.toMillis?.() ?? null,
    };
  },
);

/** İyzico'nun kuyrukladığı, henüz eşlemesi bulunamamış bir webhook olayı
 *  varsa (callback'ten önce gelmiş) uygular ve kuyruktan siler. */
const drainPendingWebhookEvent = async (uid: string, subscriptionReferenceCode: string): Promise<void> => {
  const pendingRef = db.collection("pendingWebhookEvents").doc(subscriptionReferenceCode);
  const pendingSnap = await pendingRef.get();
  if (!pendingSnap.exists) return;

  const pending = pendingSnap.data()!;
  if (pending.eventType === "subscription.order.success") {
    await activateSubscription(uid, {
      subscriptionReferenceCode,
      orderReferenceCode: pending.orderReferenceCode as string,
    });
  } else if (pending.eventType === "subscription.order.failure") {
    await db.collection("users").doc(uid).set({ subscriptionStatus: "past_due" }, { merge: true });
  }
  await pendingRef.delete();
};

interface InitiateCheckoutRequest {
  identityNumber: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

interface IyzicoCheckoutInitializeResponse {
  status: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  subscriptionReferenceCode?: string;
}

/**
 * "Yükselt" butonunun tetiklediği fonksiyon. Fatura bilgileri (TCKN/telefon/
 * adres) client'tan gelir — iyzico'nun customer nesnesi bunları zorunlu
 * kılıyor ve Firebase Auth'ta karşılığı yok. Ad/soyad/e-posta ise Auth
 * kaydından alınır (client'tan güvenilmez).
 */
export const initiateSubscriptionCheckout = onCall<InitiateCheckoutRequest>(
  { secrets: [IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_PRICING_PLAN_REF], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (!PRO_FEATURES_ENABLED.value()) {
      throw new HttpsError("failed-precondition", "Pro özellikleri henüz kullanıma açık değil.");
    }
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }

    const { identityNumber, phone, address, city, country } =
      request.data ?? ({} as Partial<InitiateCheckoutRequest>);
    if (typeof identityNumber !== "string" || !IDENTITY_NUMBER_RE.test(identityNumber)) {
      throw new HttpsError("invalid-argument", "invalid identityNumber");
    }
    if (typeof phone !== "string" || phone.trim().length < 6 || phone.length > 20) {
      throw new HttpsError("invalid-argument", "invalid phone");
    }
    if (typeof address !== "string" || !address.trim() || address.length > 500) {
      throw new HttpsError("invalid-argument", "invalid address");
    }
    if (typeof city !== "string" || !city.trim() || city.length > 100) {
      throw new HttpsError("invalid-argument", "invalid city");
    }
    if (typeof country !== "string" || !country.trim() || country.length > 100) {
      throw new HttpsError("invalid-argument", "invalid country");
    }

    const uid = request.auth.uid;
    await checkRateLimit(uid, "initiateSubscriptionCheckout", "Rate limit exceeded — try again later.");

    const userSnap = await db.collection("users").doc(uid).get();
    if (isProActive(userSnap.data())) {
      throw new HttpsError("failed-precondition", "already_subscribed");
    }

    const authUser = await getAuth().getUser(uid);
    const email = authUser.email;
    if (!email) throw new HttpsError("failed-precondition", "Hesapta e-posta bulunamadı.");
    const fullName = (authUser.displayName || "Travyon Kullanici").trim();
    const [name, ...rest] = fullName.split(/\s+/);
    const surname = rest.join(" ") || name;

    let result: IyzicoCheckoutInitializeResponse;
    try {
      result = await iyzicoRequest<IyzicoCheckoutInitializeResponse>(
        "POST",
        "/v2/subscription/checkoutform/initialize",
        {
          locale: "tr",
          conversationId: `${uid}_${Date.now()}`,
          pricingPlanReferenceCode: IYZICO_PRICING_PLAN_REF.value(),
          subscriptionInitialStatus: "ACTIVE",
          callbackUrl: `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/subscriptionCallback`,
          customer: {
            name,
            surname,
            email,
            gsmNumber: phone,
            identityNumber,
            billingAddress: { contactName: fullName, address, city, country },
          },
        },
      );
    } catch (err) {
      logger.error("[initiateSubscriptionCheckout] iyzico call failed", {
        err: err instanceof Error ? err.message : String(err),
      });
      throw new HttpsError("internal", "Ödeme başlatılamadı.");
    }

    if (!result.token) {
      logger.error("[initiateSubscriptionCheckout] no token in response", { result });
      throw new HttpsError("internal", "Ödeme başlatılamadı.");
    }

    await db.collection("subscriptionCheckouts").doc(result.token).set({
      uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Initialize yanıtı referans kodunu baştan veriyorsa eşlemeyi hemen yaz —
    // webhook callback'ten önce gelirse eşleme zaten hazır olur (yarış durumu önlenir).
    if (result.subscriptionReferenceCode) {
      await db.collection("subscriptionsByRef").doc(result.subscriptionReferenceCode).set({ uid });
    }

    return {
      checkoutFormContent: result.checkoutFormContent ?? null,
      paymentPageUrl: result.paymentPageUrl ?? null,
    };
  },
);

interface IyzicoCheckoutRetrieveResponse {
  status: string;
  paymentStatus?: string;
  subscriptionReferenceCode?: string;
  orderReferenceCode?: string;
}

/**
 * iyzico kullanıcıyı buraya yönlendirir (GET query veya POST form-body ile
 * token gelebilir — ikisi de kontrol edilir). Redirect'in kendisine ASLA
 * güvenilmez; sonuç her zaman iyzico'nun retrieve uç noktasından
 * SUNUCU TARAFINDA doğrulanır.
 */
export const subscriptionCallback = onRequest(
  { secrets: [IYZICO_API_KEY, IYZICO_SECRET_KEY], cors: false, maxInstances: 5 },
  async (req, res) => {
    const fail = () => res.redirect(302, `${SITE_URL}/settings?checkout=failed`);
    try {
      const token = (req.query.token as string | undefined) || (req.body?.token as string | undefined);
      if (!token) { fail(); return; }

      const result = await iyzicoRequest<IyzicoCheckoutRetrieveResponse>(
        "GET",
        `/v2/subscription/checkoutform/${encodeURIComponent(token)}`,
      );

      if (result.paymentStatus !== "SUCCESS" || !result.subscriptionReferenceCode) {
        fail(); return;
      }

      const checkoutSnap = await db.collection("subscriptionCheckouts").doc(token).get();
      const uid = checkoutSnap.data()?.uid as string | undefined;
      if (!uid) {
        logger.error("[subscriptionCallback] no checkout mapping for token", { token });
        fail(); return;
      }

      await db.collection("subscriptionsByRef").doc(result.subscriptionReferenceCode).set({ uid });
      await activateSubscription(uid, {
        subscriptionReferenceCode: result.subscriptionReferenceCode,
        orderReferenceCode: result.orderReferenceCode ?? result.subscriptionReferenceCode,
      });
      await drainPendingWebhookEvent(uid, result.subscriptionReferenceCode);

      res.redirect(302, `${SITE_URL}/settings?checkout=success`);
    } catch (err) {
      logger.error("[subscriptionCallback] failed", { err: err instanceof Error ? err.message : String(err) });
      fail();
    }
  },
);

/**
 * iyzico paneline "Abonelik Bildirimleri" URL'i olarak kayıt edilecek uç
 * nokta — her tekrarlayan ödeme başarısı/başarısızlığında çağrılır.
 * İmza doğrulanmadan HİÇBİR Firestore erişimi yapılmaz.
 */
export const subscriptionWebhook = onRequest(
  { secrets: [IYZICO_SECRET_KEY, IYZICO_MERCHANT_ID], cors: false, maxInstances: 5 },
  async (req, res) => {
    try {
      if (req.method !== "POST") { res.status(405).send("method not allowed"); return; }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const eventType = body.iyziEventType as string | undefined;
      const subscriptionReferenceCode = body.subscriptionReferenceCode as string | undefined;
      const orderReferenceCode = body.orderReferenceCode as string | undefined;
      const customerReferenceCode = body.customerReferenceCode as string | undefined;
      const headerSignature = req.get("X-IYZ-SIGNATURE-V3");

      if (!eventType || !subscriptionReferenceCode || !orderReferenceCode || !customerReferenceCode) {
        res.status(400).send("missing fields"); return;
      }

      const valid = verifyIyzicoWebhookSignature(
        headerSignature,
        IYZICO_SECRET_KEY.value(),
        IYZICO_MERCHANT_ID.value(),
        eventType,
        subscriptionReferenceCode,
        orderReferenceCode,
        customerReferenceCode,
      );
      if (!valid) {
        logger.error("[subscriptionWebhook] invalid signature", { eventType, subscriptionReferenceCode });
        res.status(401).send("invalid signature"); return;
      }

      const mapSnap = await db.collection("subscriptionsByRef").doc(subscriptionReferenceCode).get();
      const uid = mapSnap.data()?.uid as string | undefined;

      if (!uid) {
        // Eşleme henüz yok (callback bu event'ten sonra koşacak olabilir) —
        // kuyruğa al, 200 dön. iyzico'yu sonsuz retry'a zorlamamak kritik.
        await db.collection("pendingWebhookEvents").doc(subscriptionReferenceCode).set({
          eventType, orderReferenceCode, customerReferenceCode,
          createdAt: FieldValue.serverTimestamp(),
        });
        res.status(200).send("queued"); return;
      }

      if (eventType === "subscription.order.success") {
        await activateSubscription(uid, { subscriptionReferenceCode, orderReferenceCode });
      } else if (eventType === "subscription.order.failure") {
        // isPro hemen kapatılmaz — currentPeriodEnd'e kadar erişim sürer,
        // bkz. isProActive(). Yenileme hiç gelmezse erişim doğal olarak biter.
        await db.collection("users").doc(uid).set({ subscriptionStatus: "past_due" }, { merge: true });
      }

      res.status(200).send("ok");
    } catch (err) {
      logger.error("[subscriptionWebhook] failed", { err: err instanceof Error ? err.message : String(err) });
      res.status(500).send("error");
    }
  },
);

/**
 * "İptal Et" butonu. iyzico'nun cancel çağrısı BAŞARILI olmadan yerel durum
 * DEĞİŞTİRİLMEZ. isPro hemen false yapılmaz — ürün metni (settings.subscription
 * .cancel.desc) zaten "dönem sonunda ücretsiz plana geçilir" diyor; erişim
 * currentPeriodEnd'e kadar sürer (bkz. isProActive()).
 */
export const cancelSubscription = onCall(
  { secrets: [IYZICO_API_KEY, IYZICO_SECRET_KEY], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    const uid = request.auth.uid;
    await checkRateLimit(uid, "cancelSubscription", "Rate limit exceeded — try again later.");

    const userSnap = await db.collection("users").doc(uid).get();
    const referenceCode = userSnap.data()?.subscriptionReferenceCode as string | undefined;
    if (!referenceCode) throw new HttpsError("failed-precondition", "no_active_subscription");

    try {
      await iyzicoRequest(
        "POST",
        `/v2/subscription/subscriptions/${encodeURIComponent(referenceCode)}/cancel`,
        { reason: "Kullanici istegi" },
      );
    } catch (err) {
      logger.error("[cancelSubscription] iyzico cancel failed", {
        err: err instanceof Error ? err.message : String(err),
      });
      throw new HttpsError("internal", "İptal işlemi başarısız.");
    }

    await db.collection("users").doc(uid).set({ subscriptionStatus: "cancelling" }, { merge: true });

    return { ok: true };
  },
);

/* ══════════════════════════════════════════════
   GOOGLE MAPS REST PROXY (Geocoding + Directions)
   Google, "HTTP referrer" kısıtlamalı anahtarların bu REST servisleriyle
   kullanılmasını yasaklıyor ("API keys with referer restrictions cannot be
   used with this API") — tarayıcıdaki Maps JS anahtarı burada işe yaramaz.
   Bu yüzden GOOGLE_MAPS_SERVER_KEY (kısıtlamasız/IP-kısıtlı, istemciye hiç
   gönderilmez) ile sunucu tarafında proxy'liyoruz.
═══════════════════════════════════════════════ */

const GOOGLE_MAPS_REST_BASE = "https://maps.googleapis.com/maps/api";

export const getMobileAccommodation = onCall(
  { secrets: [GOOGLE_MAPS_SERVER_KEY], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    const query = validateAccommodationQuery(request.data);
    await checkRateLimit(request.auth.uid, "getMobileAccommodation", "Çok sık arama yapıldı. Biraz sonra tekrar deneyin.");
    return lookupAccommodation(query, GOOGLE_MAPS_SERVER_KEY.value());
  },
);

export const getMobilePlacePhoto = onCall(
  { secrets: [GOOGLE_MAPS_SERVER_KEY], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK, timeoutSeconds: 20 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }
    const name = validateMobilePhotoName(request.data);
    await checkRateLimit(request.auth.uid, "getMobilePlacePhoto", "Çok sık fotoğraf sorgulandı. Biraz sonra tekrar deneyin.");
    return lookupMobilePhoto(name, GOOGLE_MAPS_SERVER_KEY.value());
  },
);

export const getMobilePlaceDetails = onCall(
  { secrets: [GOOGLE_MAPS_SERVER_KEY], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }
    const query = validateMobilePlaceQuery(request.data);
    await checkRateLimit(request.auth.uid, "getMobilePlaceDetails", "Çok sık sorgu yapıldı. Biraz sonra tekrar deneyin.");
    return lookupMobilePlace(query, GOOGLE_MAPS_SERVER_KEY.value());
  },
);

interface GeocodeAddressRequest {
  address: string;
  bias?: { lat: number; lng: number };
}
interface GeocodeAddressResult {
  lat: number;
  lng: number;
}

export const geocodeAddress = onCall<GeocodeAddressRequest>(
  { secrets: [GOOGLE_MAPS_SERVER_KEY], enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }

    const { address, bias } = request.data ?? ({} as Partial<GeocodeAddressRequest>);
    if (typeof address !== "string" || !address.trim() || address.length > 300) {
      throw new HttpsError("invalid-argument", "invalid address");
    }

    await checkRateLimit(request.auth.uid, "geocodeAddress", "Rate limit exceeded — try again later.");

    const url = new URL(`${GOOGLE_MAPS_REST_BASE}/geocode/json`);
    url.searchParams.set("address", address);
    url.searchParams.set("key", GOOGLE_MAPS_SERVER_KEY.value());
    url.searchParams.set("language", "tr");
    if (bias !== undefined && !isValidLatLng(bias)) {
      throw new HttpsError("invalid-argument", "invalid bias coordinates");
    }
    if (bias) {
      const d = 0.15; // ~15 km
      url.searchParams.set("bounds", `${bias.lat - d},${bias.lng - d}|${bias.lat + d},${bias.lng + d}`);
    }

    try {
      const res = await fetch(url.toString());
      const data = await res.json() as {
        status: string;
        error_message?: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      };

      if (data.status !== "OK" || !data.results.length) {
        if (data.status !== "ZERO_RESULTS") {
          logger.error("[geocodeAddress] Google status not OK", { status: data.status, errorMessage: data.error_message });
        }
        return { result: null };
      }

      const { lat, lng } = data.results[0].geometry.location;
      return { result: { lat, lng } as GeocodeAddressResult };
    } catch (err) {
      logger.error("[geocodeAddress] fetch failed", { err: err instanceof Error ? err.message : String(err) });
      throw new HttpsError("internal", "Geocoding failed.");
    }
  },
);

type TravelModeKey = "driving" | "transit" | "walking" | "cycling";
const REST_MODE_BY_KEY: Record<TravelModeKey, string> = {
  driving: "driving", transit: "transit", walking: "walking", cycling: "bicycling",
};

interface DirectionsPair {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}
interface GetDirectionsRequest {
  pairs: DirectionsPair[];
}
type DirectionsResultRow = Record<TravelModeKey, number | null>;

/** Tek bir mod için Directions REST çağrısı — süreyi dakika cinsinden döner. */
const fetchDirectionDurationMin = async (
  apiKey: string,
  pair: DirectionsPair,
  modeKey: TravelModeKey,
): Promise<number | null> => {
  const url = new URL(`${GOOGLE_MAPS_REST_BASE}/directions/json`);
  url.searchParams.set("origin", `${pair.origin.lat},${pair.origin.lng}`);
  url.searchParams.set("destination", `${pair.destination.lat},${pair.destination.lng}`);
  url.searchParams.set("mode", REST_MODE_BY_KEY[modeKey]);
  url.searchParams.set("key", apiKey);
  if (modeKey === "driving") {
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("traffic_model", "best_guess");
  }

  try {
    const res = await fetch(url.toString());
    const data = await res.json() as {
      status: string;
      routes: Array<{ legs: Array<{
        duration?: { value: number };
        duration_in_traffic?: { value: number };
      }> }>;
    };
    if (data.status !== "OK" || !data.routes.length) return null;
    const leg = data.routes[0].legs[0];
    const durationSec = modeKey === "driving" ? (leg?.duration_in_traffic?.value ?? leg?.duration?.value) : leg?.duration?.value;
    return durationSec ? Math.ceil(durationSec / 60) : null;
  } catch (err) {
    logger.error("[getDirections] fetch failed", { modeKey, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
};

/**
 * Bir günün TÜM aktivite-çiftleri × TÜM ulaşım modları için seyahat
 * sürelerini TEK çağrıda hesaplar (DailyPlanView'in eski istemci-taraflı
 * DirectionsService döngüsünün yerine geçti) — sunucu tarafında paralel
 * çalıştırılır, tek round-trip.
 */
export const getDirections = onCall<GetDirectionsRequest>(
  { secrets: [GOOGLE_MAPS_SERVER_KEY], timeoutSeconds: 60, enforceAppCheck: SHOULD_ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
    }

    const { pairs } = request.data ?? ({} as Partial<GetDirectionsRequest>);
    if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > 15) {
      throw new HttpsError("invalid-argument", "invalid pairs");
    }
    for (const p of pairs) {
      if (!isValidLatLng(p?.origin) || !isValidLatLng(p?.destination)) {
        throw new HttpsError("invalid-argument", "invalid pair coordinates");
      }
    }

    await checkRateLimit(request.auth.uid, "getDirections", "Rate limit exceeded — try again later.");

    const apiKey = GOOGLE_MAPS_SERVER_KEY.value();
    const modeKeys = Object.keys(REST_MODE_BY_KEY) as TravelModeKey[];

    const results: DirectionsResultRow[] = await Promise.all(
      pairs.map(async (pair) => {
        const durations = await Promise.all(modeKeys.map((m) => fetchDirectionDurationMin(apiKey, pair, m)));
        const row = {} as DirectionsResultRow;
        modeKeys.forEach((m, i) => { row[m] = durations[i]; });
        return row;
      }),
    );

    return { results };
  },
);
