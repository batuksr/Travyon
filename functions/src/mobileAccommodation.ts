import { HttpsError } from "firebase-functions/v2/https";

type Point = { lat: number; lng: number };
type Query = { sessionToken: string } & (
  { action: "suggest"; input: string; destination: string; bias?: Point } |
  { action: "resolve"; placeId: string }
);
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(value);
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const validPoint = (value: unknown): value is Point => {
  const point = record(value);
  return typeof point.lat === "number" && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
    typeof point.lng === "number" && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
};
export function validateAccommodationQuery(data: unknown): Query {
  const q = record(data);
  if (!q || typeof q.sessionToken !== "string" || !/^[A-Za-z0-9_-]{16,36}$/.test(q.sessionToken)) {
    throw new HttpsError("invalid-argument", "Geçersiz arama oturumu.");
  }
  if (q.action === "resolve" && validId(q.placeId)) return { action: "resolve", placeId: q.placeId, sessionToken: q.sessionToken };
  if (q.action !== "suggest" || typeof q.input !== "string" || q.input.trim().length < 3 || q.input.length > 300 ||
      typeof q.destination !== "string" || !q.destination.trim() || q.destination.length > 200) {
    throw new HttpsError("invalid-argument", "En az üç karakter ve geçerli destinasyon girin.");
  }
  const b = q.bias;
  if (b !== undefined && !validPoint(b)) {
    throw new HttpsError("invalid-argument", "Geçersiz arama konumu.");
  }
  return { action: "suggest", input: q.input.trim(), destination: q.destination.trim(), sessionToken: q.sessionToken,
    ...(validPoint(b) ? { bias: { lat: b.lat, lng: b.lng } } : {}) };
}

export async function lookupAccommodation(data: unknown, key: string, request: typeof fetch = fetch) {
  const q = validateAccommodationQuery(data);
  if (!key) throw new HttpsError("failed-precondition", "Harita sunucu anahtarı tanımlanmamış.");
  const suggest = q.action === "suggest";
  const path = q.action === "resolve"
    ? `places/${encodeURIComponent(q.placeId)}?languageCode=tr&sessionToken=${encodeURIComponent(q.sessionToken)}`
    : "places:autocomplete";
  try {
    const response = await request(`https://places.googleapis.com/v1/${path}`, {
      method: suggest ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": suggest ? "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text" : "id,formattedAddress,location" },
      ...(q.action === "suggest" ? { body: JSON.stringify({
        input: q.bias ? q.input : `${q.input}, ${q.destination}`,
        languageCode: "tr", sessionToken: q.sessionToken, includeQueryPredictions: false,
        ...(q.bias ? { locationBias: { circle: { center: { latitude: q.bias.lat, longitude: q.bias.lng }, radius: 50000 } } } : {}),
      }) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new HttpsError("failed-precondition", "Sunucu anahtarının Places API (New) iznini ve faturalandırmayı kontrol edin.");
      if (response.status === 429) throw new HttpsError("resource-exhausted", "Arama sınırına ulaşıldı. Biraz sonra tekrar deneyin.");
      throw new HttpsError("unavailable", "Konaklama bilgisi alınamadı.");
    }
    const result = record(await response.json());
    if (suggest) {
      const rows: unknown[] = Array.isArray(result.suggestions) ? result.suggestions : [];
      return { suggestions: rows.slice(0, 5).flatMap((row) => {
        const p = record(record(row).placePrediction);
        const text = record(p.text).text;
        if (!validId(p.placeId) || typeof text !== "string") return [];
        const format = record(p.structuredFormat);
        const title = record(format.mainText).text;
        const subtitle = record(format.secondaryText).text;
        return [{ placeId: p.placeId, title: typeof title === "string" ? title : text,
          subtitle: typeof subtitle === "string" ? subtitle : "" }];
      }) };
    }
    const location = record(result.location);
    const lat = location.latitude, lng = location.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
        typeof result.formattedAddress !== "string" || !result.formattedAddress.trim()) {
      throw new HttpsError("not-found", "Bu yerin adresi bulunamadı. Başka bir sonuç seçin.");
    }
    return { address: result.formattedAddress, lat, lng };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    // Do not expose keyed request URLs or upstream payloads.
    throw new HttpsError("unavailable", "Konaklama aramasına ulaşılamadı. Tekrar deneyin.");
  }
}
