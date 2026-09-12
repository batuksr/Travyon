import type { Firestore } from "firebase-admin/firestore";
import type { Messaging, MulticastMessage } from "firebase-admin/messaging";
import { pushDeviceId } from "./mobilePush";

export type PushPreference = "appPlanNotif" | "appCommunityNotif" | "appUpdateNotif";

export interface MobilePushEvent {
  kind: string;
  preference: PushPreference;
  title: { tr: string; en: string };
  body: { tr: string; en: string };
  data?: Record<string, string>;
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const chunks = <T>(values: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const isEnglish = (language: unknown): boolean =>
  language === "English" || language === "en";

export function buildEventMessage(
  event: MobilePushEvent,
  tokens: string[],
  english: boolean,
): MulticastMessage {
  return {
    tokens,
    notification: {
      title: english ? event.title.en : event.title.tr,
      body: english ? event.body.en : event.body.tr,
    },
    data: {
      screen: "notifications",
      kind: event.kind,
      ...event.data,
    },
    android: { priority: "high", ttl: 24 * 60 * 60 * 1000 },
    apns: {
      headers: {
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
      },
      payload: { aps: { sound: "default" } },
    },
  };
}

/**
 * Sends a privacy-safe event to every registered device owned by a user.
 * Destination names, profile names and user-authored text intentionally never
 * appear on the lock screen. Stale FCM registrations are removed immediately.
 */
export async function sendMobilePushEvent(
  db: Firestore,
  messaging: Messaging,
  uid: string,
  event: MobilePushEvent,
  enabled: boolean,
): Promise<{ sent: number; skipped: boolean }> {
  if (!enabled) return { sent: 0, skipped: true };

  const [user, devices] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("mobilePushDevices").where("uid", "==", uid).get(),
  ]);
  if (user.data()?.[event.preference] === false || devices.empty) {
    return { sent: 0, skipped: true };
  }

  const tokens = [...new Set(devices.docs
    .map((document) => document.data().token)
    .filter((token): token is string => typeof token === "string" && token.length > 0))];
  if (tokens.length === 0) return { sent: 0, skipped: true };

  let sent = 0;
  const staleTokens: string[] = [];
  for (const batch of chunks(tokens, 500)) {
    const response = await messaging.sendEachForMulticast(
      buildEventMessage(event, batch, isEnglish(user.data()?.language)),
    );
    sent += response.successCount;
    response.responses.forEach((item, index) => {
      if (!item.success && INVALID_TOKEN_CODES.has(item.error?.code ?? "")) {
        staleTokens.push(batch[index]);
      }
    });
  }
  if (staleTokens.length > 0) {
    const writer = db.bulkWriter();
    for (const token of staleTokens) {
      writer.delete(db.collection("mobilePushDevices").doc(pushDeviceId(token)));
    }
    await writer.close();
  }
  return { sent, skipped: false };
}

export const communityPush = {
  follow: (): MobilePushEvent => ({
    kind: "community_follow",
    preference: "appCommunityNotif",
    title: { tr: "Travyon topluluğu", en: "Travyon community" },
    body: {
      tr: "Yeni bir gezgin seni takip etmeye başladı.",
      en: "A new traveler started following you.",
    },
  }),
  rating: (planId: string): MobilePushEvent => ({
    kind: "community_rating",
    preference: "appCommunityNotif",
    title: { tr: "Planın değerlendirildi", en: "Your plan was rated" },
    body: {
      tr: "Toplulukta paylaştığın plan yeni bir değerlendirme aldı.",
      en: "A plan you shared received a new rating.",
    },
    data: { planId },
  }),
  sharedPlan: (planId: string): MobilePushEvent => ({
    kind: "community_shared_plan",
    preference: "appCommunityNotif",
    title: { tr: "Toplulukta yeni rota", en: "A new community route" },
    body: {
      tr: "Takip ettiğin bir gezgin yeni bir plan paylaştı.",
      en: "A traveler you follow shared a new plan.",
    },
    data: { planId },
  }),
};

export const tripReminderPush = (planId: string, days: number): MobilePushEvent => ({
  kind: "trip_reminder",
  preference: "appPlanNotif",
  title: { tr: "Yolculuğun yaklaşıyor", en: "Your trip is coming up" },
  body: days === 1
    ? {
        tr: "Yolculuğun yarın başlıyor. Planını ve cüzdanını kontrol et.",
        en: "Your trip starts tomorrow. Check your plan and travel wallet.",
      }
    : {
        tr: `Yolculuğuna ${days} gün kaldı. Hazırlıklarını gözden geçir.`,
        en: `${days} days until your trip. Review your preparations.`,
      },
  data: { planId, days: String(days) },
});
