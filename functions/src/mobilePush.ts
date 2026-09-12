import { createHash } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import type { Message } from "firebase-admin/messaging";

export type PushAction = "register" | "unregister" | "test";
export interface PushInput { action: PushAction; token: string; platform?: "android" | "ios" }
export interface PushDevice { uid: string; token: string; platform: string; updatedAt: number }
export interface PushStore {
  bind(id: string, device: PushDevice): Promise<void>;
  read(id: string): Promise<PushDevice | undefined>;
  removeOwned(id: string, uid: string): Promise<void>;
}

export function parsePushInput(data: unknown): PushInput {
  const d = data as Partial<PushInput> | null;
  if (!d || !["register", "unregister", "test"].includes(d.action ?? "") ||
      typeof d.token !== "string" || !/^[A-Za-z0-9_:-]{20,4096}$/.test(d.token)) {
    throw new HttpsError("invalid-argument", "Geçersiz bildirim isteği.");
  }
  if (d.action === "register" && d.platform !== "android" && d.platform !== "ios") {
    throw new HttpsError("invalid-argument", "Desteklenmeyen cihaz.");
  }
  return { action: d.action!, token: d.token, platform: d.platform };
}

export const pushDeviceId = (token: string): string => createHash("sha256").update(token).digest("hex");

// No destinations, profile names, wallet data or client-authored text on the
// lock screen. This endpoint can only test the caller's currently bound device.
export function pushTestMessage(token: string): Message {
  return {
    token,
    notification: { title: "Travyon", body: "Test bildirimin ulaştı. Telefon bildirimlerin çalışıyor." },
    data: { screen: "notifications", kind: "test" },
    android: { priority: "high", ttl: 60_000 },
    apns: {
      headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 60) },
      payload: { aps: { sound: "default" } },
    },
  };
}

export async function runMobilePush(input: PushInput, uid: string, options: {
  enabled: boolean; emulator: boolean; store: PushStore;
  send: (message: Message) => Promise<unknown>;
}): Promise<{ ok: true }> {
  if (options.emulator) throw new HttpsError("failed-precondition", "LOCAL modunda telefon bildirimleri kapalı.");
  // Cleanup must remain possible after the feature's kill switch is turned off.
  if (!options.enabled && input.action !== "unregister") {
    throw new HttpsError("failed-precondition", "Telefon bildirimleri sunucuda henüz etkinleştirilmedi.");
  }
  const id = pushDeviceId(input.token);
  if (input.action === "register") {
    await options.store.bind(id, { uid, token: input.token, platform: input.platform!, updatedAt: Date.now() });
  } else if (input.action === "unregister") {
    await options.store.removeOwned(id, uid);
  } else {
    const device = await options.store.read(id);
    if (!device || device.uid !== uid) throw new HttpsError("permission-denied", "Önce bu cihazda bildirimleri etkinleştir.");
    try {
      await options.send(pushTestMessage(device.token));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        await options.store.removeOwned(id, uid);
        throw new HttpsError("failed-precondition", "Cihaz kaydı eskimiş. Bildirimleri kapatıp yeniden aç.");
      }
      // Do not echo SDK errors (which may contain registration tokens).
      throw new HttpsError("unavailable", "Bildirim gönderilemedi. Firebase Messaging ve APNs yapılandırmasını kontrol et.");
    }
  }
  return { ok: true };
}
