import { HttpsError } from "firebase-functions/v2/https";

export interface MobilePlaceQuery {
  name: string;
  destination: string;
  location?: { lat: number; lng: number };
}

export function validateMobilePlaceQuery(data: unknown): MobilePlaceQuery {
  const input = data as Partial<MobilePlaceQuery> | null;
  if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 300 ||
      typeof input.destination !== "string" || input.destination.length > 200) {
    throw new HttpsError("invalid-argument", "Geçerli bir durak seçin.");
  }
  const point = input.location;
  if (point !== undefined && (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180)) {
    throw new HttpsError("invalid-argument", "Geçersiz konum.");
  }
  return { name: input.name.trim(), destination: input.destination.trim(), ...(point ? { location: point } : {}) };
}

// Fixed endpoints and field masks: callers cannot turn this into an arbitrary
// proxy. No Google content is persisted to Firestore or a server cache.
export async function lookupMobilePlace(query: MobilePlaceQuery, key: string, request: typeof fetch = fetch) {
  if (!key) throw new HttpsError("failed-precondition", "Sunucu harita anahtarı tanımlanmamış.");
  async function google(path: string, mask: string, body?: object): Promise<Record<string, any>> {
    let response: Response;
    try {
      response = await request(`https://places.googleapis.com/v1/${path}`, {
        method: body ? "POST" : "GET",
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new HttpsError("unavailable", "Google mekân bilgisine ulaşılamadı. Tekrar deneyin.");
    }
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new HttpsError("failed-precondition", "Sunucu anahtarının Places API (New) iznini ve faturalandırmayı kontrol edin.");
      }
      if (response.status === 429) throw new HttpsError("resource-exhausted", "Google mekân sorgu sınırına ulaşıldı.");
      throw new HttpsError("unavailable", "Google mekân bilgisi şu an alınamıyor.");
    }
    try { return await response.json(); }
    catch { throw new HttpsError("unavailable", "Google yanıtı okunamadı."); }
  }
  const search = await google("places:searchText", "places.id", {
    textQuery: `${query.name}, ${query.destination}`,
    languageCode: "tr", maxResultCount: 1,
    ...(query.location ? { locationBias: { circle: {
      center: { latitude: query.location.lat, longitude: query.location.lng }, radius: 2000,
    } } } : {}),
  });
  const id = search.places?.[0]?.id;
  if (typeof id !== "string" || !id) return { place: null };
  const place = await google(`places/${encodeURIComponent(id)}?languageCode=tr`, [
    "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount",
    "reviews", "regularOpeningHours", "websiteUri", "googleMapsUri", "attributions", "photos",
  ].join(","));
  // A textual match in another city is not the selected plan stop.
  if (query.location && place.location) {
    const rad = Math.PI / 180;
    const lat = Number(place.location.latitude), lng = Number(place.location.longitude);
    const a = Math.sin((lat - query.location.lat) * rad / 2) ** 2 +
      Math.cos(lat * rad) * Math.cos(query.location.lat * rad) * Math.sin((lng - query.location.lng) * rad / 2) ** 2;
    if (!Number.isFinite(a) || 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a))) > 15) return { place: null };
  }
  return { place };
}

export function validateMobilePhotoName(data: unknown): string {
  const name = (data as { name?: unknown } | null)?.name;
  if (typeof name !== "string" || name.length > 4096 ||
      !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
    throw new HttpsError("invalid-argument", "Geçersiz fotoğraf kaynağı.");
  }
  return name;
}

// Return Google's temporary image URL, never the server key or a keyed URL.
// Called only for the visible gallery photo; photo names/URLs are not persisted.
export async function lookupMobilePhoto(name: string, key: string, request: typeof fetch = fetch) {
  validateMobilePhotoName({ name });
  if (!key) throw new HttpsError("failed-precondition", "Sunucu harita anahtarı tanımlanmamış.");
  try {
    const response = await request(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": key }, signal: AbortSignal.timeout(12000), redirect: "error",
    });
    if (!response.ok) throw new HttpsError("unavailable", "Fotoğraf yüklenemedi. Mekânı yenileyip tekrar deneyin.");
    const data = await response.json() as { photoUri?: unknown };
    if (typeof data.photoUri !== "string") throw new Error("missing photo URI");
    const uri = new URL(data.photoUri);
    const allowed = ["googleusercontent.com", "ggpht.com"].some(host => uri.hostname === host || uri.hostname.endsWith(`.${host}`));
    if (uri.protocol !== "https:" || !allowed || uri.username || uri.password || uri.searchParams.has("key")) {
      throw new Error("unexpected photo URI");
    }
    return { photoUri: uri.toString() };
  } catch {
    throw new HttpsError("unavailable", "Fotoğraf yüklenemedi. Mekânı yenileyip tekrar deneyin.");
  }
}
