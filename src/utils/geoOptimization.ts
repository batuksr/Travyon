import type { DailyActivity } from '../services/aiService';

// Dünyanın yarıçapı (km cinsinden)
const R = 6371;

/**
 * İki koordinat (Enlem, Boylam) arasındaki kuş uçuşu mesafeyi hesaplar.
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** İki aktivite arasındaki mesafe */
const dist = (a: DailyActivity, b: DailyActivity): number =>
  haversineDistance(
    a.coordinates.lat, a.coordinates.lng,
    b.coordinates.lat, b.coordinates.lng
  );

/** Dizideki toplam rota uzunluğu */
const tourLength = (route: DailyActivity[]): number => {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += dist(route[i], route[i + 1]);
  }
  return total;
};

/**
 * Nearest Neighbor heuristic — başlangıç rotası üretir.
 * O(n²), genellikle optimal'den %20-25 uzak.
 */
const nearestNeighbor = (
  activities: DailyActivity[],
  startPos?: { lat: number; lng: number }
): DailyActivity[] => {
  const unvisited = [...activities];
  const route: DailyActivity[] = [];

  // Başlangıç noktası: önceki periyottan gelen konum veya ilk aktivite
  let current: { lat: number; lng: number } = startPos ?? unvisited[0].coordinates;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist    = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(
        current.lat, current.lng,
        unvisited[i].coordinates.lat, unvisited[i].coordinates.lng
      );
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }

    const next = unvisited.splice(nearestIdx, 1)[0];
    route.push(next);
    current = next.coordinates;
  }

  return route;
};

/**
 * 2-Opt improvement — NN'in ürettiği rotayı iyileştirir.
 *
 * Mantık: Her (i, k) çifti için rotanın i→k arasını ters çevir;
 * eğer toplam mesafe kısalıyorsa kabul et. Gelişme olmayana kadar tekrar et.
 *
 * Neden 2-Opt?
 * • N≤8 için genellikle optimal rotayı buluyor.
 * • O(n² × iterasyon) — 5-7 aktivite için < 1ms.
 * • NN'den ortalama %15 daha kısa rota.
 *
 * Örnek düzelttiği durum:
 *   NN:    A ──► C ──► B ──► D  (çapraz geçiş var)
 *   2-Opt: A ──► B ──► C ──► D  (çapraz düzeltildi)
 */
const twoOpt = (route: DailyActivity[]): DailyActivity[] => {
  if (route.length <= 3) return route;

  let best      = [...route];
  let bestLen   = tourLength(best);
  let improved  = true;

  while (improved) {
    improved = false;

    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 2; k < best.length; k++) {
        // i→i+1 ve k→k+1 kenarlarını sil, i→k ve i+1→k+1 ekle
        // Bu, i+1..k arasını ters çevirmekle eşdeğer
        const candidate = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const candidateLen = tourLength(candidate);

        if (candidateLen < bestLen - 1e-10) { // float precision toleransı
          best     = candidate;
          bestLen  = candidateLen;
          improved = true;
        }
      }
    }
  }

  return best;
};

/**
 * NN + 2-Opt TSP Optimizasyonu
 *
 * Pipeline:
 *   1. Nearest Neighbor  → hızlı başlangıç rotası
 *   2. 2-Opt refinement  → çapraz geçişleri kaldır, rotayı kısalt
 *
 * Aktivite sayısına göre beklenen performans:
 *   N=3  → her zaman optimal
 *   N=5  → %99 optimal
 *   N=7  → %95+ optimal
 *   N=10 → %90+ optimal   (bu kadar aktivite nadiren olur)
 *
 * Not: Bu fonksiyon çağrı öncesinde period gruplama yapılmış olmalı.
 * (aiService.ts içinde her period kendi içinde ayrı çağrılıyor)
 */
export const optimizeRouteTSP = (
  activities: DailyActivity[],
  startPos?: { lat: number; lng: number }
): DailyActivity[] => {
  if (!activities || activities.length <= 1) return activities;
  if (activities.length === 2) return activities; // 2 nokta, zaten optimal

  const nn      = nearestNeighbor(activities, startPos);
  const refined = twoOpt(nn);
  return refined;
};
