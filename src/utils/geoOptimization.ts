import type { DailyActivity } from '../services/aiService';

// Dünyanın yarıçapı (km cinsinden)
const R = 6371;

/**
 * İki koordinat (Enlem, Boylam) arasındaki kuş uçuşu mesafeyi hesaplar.
 * @param lat1 Başlangıç noktası enlemi
 * @param lon1 Başlangıç noktası boylamı
 * @param lat2 Varış noktası enlemi
 * @param lon2 Varış noktası boylamı
 * @returns Mesafe (Kilometre cinsinden)
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // KM
};

/**
 * Esnek Zaman Çizelgesi (Flexible Itinerary) Optimizasyonu
 * 
 * Mantık:
 * 1. Aktiviteleri periyotlarına göre grupla (Sabah, Öğle, Öğleden Sonra, Akşam, Gece).
 * 2. Her periyot içinde Greedy TSP çalıştırarak en kısa rotayı bul.
 * 3. Grupları kronolojik sırayla birleştirerek son listeyi döndür.
 */
export const optimizeRouteTSP = (activities: DailyActivity[]): DailyActivity[] => {
  if (!activities || activities.length <= 1) return activities;

  // Periyot önceliği (Sıralama için)
  const PERIOD_PRIORITY: Record<string, number> = {
    'Sabah': 1,
    'Öğle': 2,
    'Öğleden Sonra': 3,
    'Akşam': 4,
    'Gece': 5
  };

  // 1. Aktiviteleri periyotlarına göre grupla
  const grouped: Record<string, DailyActivity[]> = {};
  activities.forEach(act => {
    const p = act.period || 'Sabah';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(act);
  });

  // 2. Mevcut periyotları kronolojik sıraya diz
  const sortedPeriods = Object.keys(grouped).sort((a, b) => 
    (PERIOD_PRIORITY[a] || 99) - (PERIOD_PRIORITY[b] || 99)
  );

  const finalRoute: DailyActivity[] = [];
  let currentPos: { lat: number; lng: number } | null = null;

  // 3. Her periyot için kendi içinde TSP çalıştır
  for (const period of sortedPeriods) {
    const unvisited = [...grouped[period]];
    
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      // Eğer önceki periyottan geliyorsak oradan devam et, yoksa periyodun ilk elemanını seç
      if (currentPos) {
        for (let i = 0; i < unvisited.length; i++) {
          const dist = haversineDistance(
            currentPos.lat, currentPos.lng,
            unvisited[i].coordinates.lat, unvisited[i].coordinates.lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
          }
        }
      }

      const nearestActivity = unvisited.splice(nearestIndex, 1)[0];
      finalRoute.push(nearestActivity);
      currentPos = nearestActivity.coordinates;
    }
  }

  return finalRoute;
};
