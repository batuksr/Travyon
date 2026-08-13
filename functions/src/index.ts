import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const db = getFirestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Resend'de doğrulanmış bir gönderim domaini olmadan sadece hesap sahibinin
// kendi mailine (onboarding@resend.dev ile) gönderim yapılabilir.
// Domain doğrulandıktan sonra RESEND_FROM'u kendi domaininize göre güncelleyin.
const RESEND_FROM = defineSecret("RESEND_FROM");

// Gemini API anahtarı — istemciye ASLA gönderilmez, sadece burada okunur.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const RESEND_COOLDOWN_MS = 45 * 1000; // 45 saniye
const MAX_ATTEMPTS = 5;
const DAILY_SEND_LIMIT = 8; // normal kullanım için bol, script suistimalini engeller
const DAY_MS = 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════
   RATE LIMITING — kullanıcı (uid) başına, fonksiyon başına
   sabit-pencere sayaç. emailVerificationCodes'daki cooldown
   deseniyle aynı fikir, ama transaction ile: AI uçları paralel/
   sık istek alabilir, düz oku-sonra-yaz burada yarış durumuna açık olurdu.
═══════════════════════════════════════════════ */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 dakika
const RATE_LIMITS: Record<string, number> = {
  generateAIContent: 15,
  askTravelAssistant: 25,
  submitBugReport: 5,
  sharePublicPlan: 10,
  followUserAction: 30,
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
    let dailyCount = 1;
    let dailyWindowStart = Date.now();

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

      // Günlük gönderim tavanı — cooldown'u tek başına aşan bir script'in
      // günde binlerce e-posta tetiklemesini (Resend maliyeti) önler.
      const existingDayStart = data.dailyWindowStart?.toMillis?.() ?? 0;
      if (Date.now() - existingDayStart < DAY_MS) {
        if ((data.dailyCount ?? 0) >= DAILY_SEND_LIMIT) {
          throw new HttpsError("resource-exhausted", "daily_limit");
        }
        dailyCount = (data.dailyCount ?? 0) + 1;
        dailyWindowStart = existingDayStart;
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
      dailyCount,
      dailyWindowStart: new Date(dailyWindowStart),
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
  plan: ["gemini-2.5-flash", "gemini-1.5-flash"],
  suggestion: ["gemini-2.5-pro"],
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Re-homed from src/services/aiService.ts's executeWithFallback — SAME retry
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
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: Error | undefined;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
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
 * Classify into the same buckets src/services/aiService.ts's
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
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 180 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

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

interface AskAssistantRequest {
  question: string;
  planContext?: string;
}

/**
 * Yüzen AI sohbet asistanı için streaming Gemini proxy'si. Sistem promptu
 * artık burada, istemciden manipüle edilemez. response.sendChunk her
 * seferinde BİRİKMİŞ tam metni gönderir — istemcideki eski onChunk(full)
 * davranışıyla birebir aynı.
 */
export const askTravelAssistant = onCall<AskAssistantRequest>(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 90 },
  async (request, response) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");

    const { question, planContext } = request.data ?? ({} as Partial<AskAssistantRequest>);
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const fullPrompt = [
      ASSISTANT_SYSTEM_PROMPT,
      planContext ? `\n${planContext}` : "",
      `\nKullanıcı sorusu: ${question}`,
    ].join("");

    const tryStream = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContentStream(fullPrompt);
      let full = "";
      for await (const chunk of result.stream) {
        full += chunk.text();
        if (request.acceptsStreaming && response) response.sendChunk(full);
      }
      return full;
    };

    try {
      return await tryStream("gemini-2.5-flash");
    } catch {
      try {
        return await tryStream("gemini-1.5-flash");
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
  { secrets: [RESEND_API_KEY, RESEND_FROM] },
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

    const cooldownRef = db
      .collection("contactCooldowns")
      .doc(Buffer.from(email.toLowerCase()).toString("base64url"));
    const existing = await cooldownRef.get();
    if (existing.exists) {
      const lastSentAt = existing.data()?.lastSentAt?.toMillis?.() ?? 0;
      if (Date.now() - lastSentAt < CONTACT_COOLDOWN_MS) {
        throw new HttpsError("resource-exhausted", "cooldown");
      }
    }
    await cooldownRef.set({ lastSentAt: FieldValue.serverTimestamp() });

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

export const submitBugReport = onCall<SubmitBugReportRequest>(async (request) => {
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

/**
 * socialService.ts'teki shareplan()/sharePlanAsLink()'in taşındığı yer —
 * ikisi de aynı fonksiyon, sadece linkOnly=true iken feedVisible:false ekleniyor.
 * userDisplayName/userPhotoURL istemciden GÜVENİLMİYOR — Admin SDK ile
 * kullanıcının güncel Auth kaydından çekiliyor (sahte isim/foto engellenir).
 */
export const sharePublicPlan = onCall<SharePublicPlanRequest>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Giriş yapmalısınız.");
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError("failed-precondition", "E-posta doğrulaması gerekli.");
  }

  const { planId, plan, onboardingData, linkOnly } = request.data ?? ({} as Partial<SharePublicPlanRequest>);
  if (typeof planId !== "string" || !planId.trim() || planId.length > 200) {
    throw new HttpsError("invalid-argument", "invalid planId");
  }
  if (!plan || typeof plan.destination !== "string" || !Array.isArray(plan.dailyPlans)) {
    throw new HttpsError("invalid-argument", "invalid plan");
  }
  if (!onboardingData || typeof onboardingData !== "object") {
    throw new HttpsError("invalid-argument", "invalid onboardingData");
  }

  await checkRateLimit(request.auth.uid, "sharePublicPlan", "Rate limit exceeded — try again later.");

  const authUser = await getAuth().getUser(request.auth.uid);

  const docData: Record<string, unknown> = {
    userId: request.auth.uid,
    userDisplayName: authUser.displayName ?? "Gezgin",
    userPhotoURL: authUser.photoURL ?? null,
    destination: plan.destination,
    dailyPlanCount: plan.dailyPlans.length,
    budget: onboardingData.budget ?? 0,
    currencySymbol: onboardingData.currencySymbol ?? "₺",
    tripPurpose: onboardingData.tripPurpose ?? "",
    createdAt: FieldValue.serverTimestamp(),
    avgRating: 0,
    ratingCount: 0,
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
  if (linkOnly) docData.feedVisible = false;

  try {
    await db.collection("publicPlans").doc(planId).set(docData);
  } catch (err) {
    logger.error("[sharePublicPlan] Firestore yazım hatası", {
      err: err instanceof Error ? err.message : String(err),
    });
    throw new HttpsError("internal", "Plan paylaşılamadı.");
  }

  return { ok: true };
});

interface FollowUserActionRequest {
  targetUid: string;
}

export const followUserAction = onCall<FollowUserActionRequest>(async (request) => {
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

  await db
    .collection("userFollows")
    .doc(request.auth.uid)
    .collection("following")
    .doc(targetUid)
    .set({ followedAt: FieldValue.serverTimestamp() });

  return { ok: true };
});
