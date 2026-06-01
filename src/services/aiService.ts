import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OnboardingData } from "../store/useOnboardingStore";
import { optimizeRouteTSP } from "../utils/geoOptimization";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- YARDIMCI FONKSİYONLAR (HELPERS) ---

/* Production'da console çıktısı yok — sadece DEV modunda logla */
const log  = import.meta.env.DEV ? (...a: unknown[]) => console.log(...a)  : () => {};
const warn = import.meta.env.DEV ? (...a: unknown[]) => console.warn(...a) : () => {};

const getFriendlyError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes('429'))
    return 'İstek limiti aşıldı — 1 dakika bekleyip tekrar deneyin.';
  if (m.includes('503') || m.includes('overloaded'))
    return 'Yapay zeka sunucusu şu an meşgul — birkaç saniye sonra tekrar deneyin.';
  if (m.includes('api') && m.includes('key'))
    return 'Servis yapılandırma hatası — lütfen yöneticinizle iletişime geçin.';
  if (m.includes('json parse') || m.includes('geçersiz plan'))
    return 'Plan verisi işlenemedi — tekrar deneyin, farklı bir sonuç gelebilir.';
  return 'Plan oluşturulamadı — lütfen tekrar deneyin.';
};

const executeWithFallback = async (prompt: string): Promise<string> => {
  // Sadece flash — free tier'da pro çalışmaz, gereksiz başarısız denemeleri önler.
  // Flash de meşgulse yedek olarak 1.5-flash denenir (o da ücretsiz).
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        log(`[AI] ${modelName} deneniyor (Deneme ${attempt + 1}/3)...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        log(`[AI] ✅ ${modelName} başarılı!`);
        return result.response.text();
      } catch (err: unknown) {
        const error = err as Error;
        const msg = error.message.toLowerCase();
        warn(`[AI] ❌ ${modelName} (Deneme ${attempt + 1}) başarısız: ${error.message}`);
        lastError = error;

        // 400/401 = geçersiz istek veya API anahtarı → hiçbir model çözemez, direkt fırlat
        if (msg.includes('400') || msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('json parse')) {
          throw error;
        }

        // 403 = bu model için erişim yok → sonraki modeli dene
        if (msg.includes('403')) {
          log(`[AI] 403 erişim reddi — "${modelName}" atlanıyor, sonraki modele geçiliyor`);
          break;
        }

        // 503 = sunucu meşgul → sonraki modele geç
        if (msg.includes('503') || msg.includes('overloaded')) {
          log(`[AI] 503/overloaded — "${modelName}" atlanıyor, alternatif modele geçiliyor`);
          break;
        }

        // 429 = rate limit → bekle ve aynı modeli tekrar dene
        if (msg.includes('429')) {
          const waitMs = (attempt + 1) * 4000;
          log(`[AI] ⏳ Rate limit — ${waitMs / 1000}s bekleniyor...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
};

// Kırılmaz JSON Ayrıştırıcı
const extractAndParseJSON = <T>(rawText: string): T => {
  let extractedJson = rawText;
  try {
    extractedJson = extractedJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstCurly = extractedJson.indexOf('{');
    const firstBracket = extractedJson.indexOf('[');

    let startIndex = -1;
    if (firstCurly !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstCurly, firstBracket);
    } else if (firstCurly !== -1) {
      startIndex = firstCurly;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex !== -1) {
      const isArray = extractedJson[startIndex] === '[';
      const openChar = isArray ? '[' : '{';
      const closeChar = isArray ? ']' : '}';

      extractedJson = extractedJson.substring(startIndex);
      let openCount = 0;
      for (let i = 0; i < extractedJson.length; i++) {
        if (extractedJson[i] === openChar) openCount++;
        if (extractedJson[i] === closeChar) {
          openCount--;
          if (openCount === 0) {
            extractedJson = extractedJson.substring(0, i + 1);
            break;
          }
        }
      }
    }
    return JSON.parse(extractedJson) as T;
  } catch (e) {
    warn("JSON parse hatası. Ham metin:", rawText);
    throw new Error("Yapay zeka geçerli bir veri formatı döndüremedi. (JSON Parse Error)");
  }
};

// TSP ve Zaman (Period) Senkronizasyonu
const PERIOD_ORDER = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'];

/** Varış saatine göre günün başlayacağı period index'i döner */
const getStartPeriodIndex = (
  dayDate: string,
  arrivalDate: string,
  arrivalTime: string,
): number => {
  if (dayDate === arrivalDate && arrivalTime) {
    const hour = parseInt(arrivalTime.split(':')[0]);
    if (hour < 9)  return 0; // Sabah
    if (hour < 12) return 1; // Öğle
    if (hour < 17) return 2; // Öğleden Sonra
    if (hour < 21) return 3; // Akşam
    return 4;                 // Gece
  }
  return 0;
};

/**
 * Dönüş saatine göre günün en geç period index'ini döner.
 * -1 → ayrılış 08:00'den önce, bu gün hiç aktivite olmamalı.
 */
/**
 * Dönüş saatine göre günün en geç period index'ini döner.
 * -1 → ayrılış 08:00'den önce, bu gün hiç aktivite olmamalı.
 * Dönüş günü kullanıcının boşa gitmemesi için daha geniş pencere:
 *   < 08 → yok | < 12 → Sabah | < 16 → Öğle | < 19 → Öğleden Sonra | ≥ 19 → Akşam
 */
const getMaxPeriodIndex = (
  dayDate: string,
  departureDate: string,
  departureTime: string,
): number => {
  if (dayDate === departureDate && departureTime) {
    const hour = parseInt(departureTime.split(':')[0]);
    if (hour < 8)  return -1; // çok erken → aktivite yok
    if (hour < 12) return 0;  // max "Sabah"
    if (hour < 16) return 1;  // max "Öğle"
    if (hour < 19) return 2;  // max "Öğleden Sonra"
    return 3;                 // max "Akşam" (gece uçuşu)
  }
  return PERIOD_ORDER.length - 1;
};

/* ── Yemek sıralama: TSP sonrası yemekleri doğru konuma koy ───────────
   Sabah / Öğle / Öğleden Sonra  → yemek/kafe başa
   Akşam / Gece                  → yemek/restoran sona
──────────────────────────────────────────────────────────────────── */
const MEAL_KEYWORDS = [
  // Türkçe
  'kafe', 'kahvaltı', 'restoran', 'fırın', 'pastane', 'lokanta',
  'börek', 'kebap', 'pideci', 'çay bahçesi',
  // Fransızca / İtalyanca / İspanyolca
  'café', 'boulangerie', 'patisserie', 'bistro', 'brasserie',
  'trattoria', 'osteria', 'ristorante', 'pizzeria', 'crêperie', 'taverna',
  // İngilizce
  'cafe', 'restaurant', 'bakery', 'breakfast', 'brunch', 'diner', 'bar & kitchen',
];

const isMealActivity = (act: DailyActivity): boolean => {
  const text = `${act.placeName} ${act.description}`.toLowerCase();
  return MEAL_KEYWORDS.some(kw => text.includes(kw));
};

/* Kahvaltıya özgü kelimeler — gün öğleden başlıyorsa bunları düşürürüz */
const BREAKFAST_KEYWORDS = [
  'kahvaltı', 'kahvalti', 'breakfast', 'brunch', 'serpme',
  'fırın', 'firin', 'poğaça', 'pogaca', 'simit', 'börek', 'borek',
  'pastane', 'bakery', 'boulangerie', 'patisserie',
];
const isBreakfastActivity = (act: DailyActivity): boolean => {
  const text = `${act.placeName} ${act.description}`.toLowerCase();
  return BREAKFAST_KEYWORDS.some(kw => text.includes(kw));
};

/**
 * Period içinde yemek aktivitelerini kullanıcı alışkanlığına göre sıralar:
 *  • Sabah / Öğle / Öğleden Sonra → önce yemek, sonra gezinti
 *  • Akşam / Gece                 → önce gezinti, sonra yemek
 */
const sortMealsInPeriod = (acts: DailyActivity[], period: string): DailyActivity[] => {
  if (acts.length <= 1) return acts;
  const periodIdx    = PERIOD_ORDER.indexOf(period);
  const isEvening    = periodIdx >= 3; // Akşam veya Gece

  const meals  = acts.filter(a =>  isMealActivity(a));
  const others = acts.filter(a => !isMealActivity(a));
  if (meals.length === 0) return acts;

  return isEvening
    ? [...others, ...meals]   // gezinti → yemek
    : [...meals,  ...others]; // kahvaltı/öğle → gezinti
};

/**
 * Aktiviteleri period grupları içinde TSP ile optimize eder.
 * Sorun #1 + #2 çözümü:
 *  • Dönüş günü artık doğru şekilde kırpılıyor.
 *  • TSP tüm listeyi değil, her period grubunu kendi içinde optimize ediyor;
 *    böylece AI'ın period ataması ile coğrafi sıralama çelişmiyor.
 *  • TSP sonrası yemek aktiviteleri her period içinde doğru konuma alınır.
 */
const optimizeActivitiesForDay = (
  activities: DailyActivity[],
  dayDate: string,
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  departureTime: string,
): DailyActivity[] => {
  const startIdx = getStartPeriodIndex(dayDate, arrivalDate, arrivalTime);
  const maxIdx   = getMaxPeriodIndex(dayDate, departureDate, departureTime);

  if (maxIdx < 0) return []; // dönüş 08:00'den önce → aktivite yok

  // Period gruplarını oluştur
  const groups = new Map<string, DailyActivity[]>();
  for (const p of PERIOD_ORDER) groups.set(p, []);

  const fallbackPeriod = PERIOD_ORDER[startIdx];
  for (const act of activities) {
    const pIdx = PERIOD_ORDER.indexOf(act.period);
    if (pIdx >= startIdx && pIdx <= maxIdx) {
      groups.get(act.period)!.push(act);
    } else if (pIdx < startIdx) {
      // Gün Sabah'tan başlamıyor (öğlen/öğleden sonra varış) ve bu bir kahvaltı mekanı
      // → öğle yemeğinin yanına kahvaltı koymak mantıksız, düşür
      if (fallbackPeriod !== 'Sabah' && isBreakfastActivity(act)) {
        warn(`[Optimize] Kahvaltı düşürüldü (gün ${fallbackPeriod}'den başlıyor): ${act.placeName}`);
        continue;
      }
      // Varıştan önce atanmış → ilk geçerli periode taşı (max 2, geri kalanı düşür)
      const fallbackGroup = groups.get(fallbackPeriod)!;
      if (fallbackGroup.length < 2) {
        fallbackGroup.push(act);
      } else {
        warn(`[Optimize] Aktivite düşürüldü (varış öncesi, limit aşıldı): ${act.placeName}`);
      }
    } else {
      // pIdx > maxIdx → dönüşten sonra, düşür
      warn(`[Optimize] Aktivite düşürüldü (dönüş sonrası period): ${act.placeName} (${act.period})`);
    }
  }

  // Her grup: TSP (coğrafi sıra) → yemek yerleştirme → period damgası
  // lastPos: bir önceki periyodun bitiş koordinatı → yeni periyod en yakın aktiviteden başlar
  const result: DailyActivity[] = [];
  let lastPos: { lat: number; lng: number } | undefined = undefined;
  for (let i = startIdx; i <= maxIdx; i++) {
    const period = PERIOD_ORDER[i];
    const groupActs = groups.get(period) ?? [];
    if (groupActs.length === 0) continue;
    const tspSorted  = optimizeRouteTSP(groupActs, lastPos);
    const mealSorted = sortMealsInPeriod(tspSorted, period); // yemek pozisyonu düzelt
    for (const act of mealSorted) {
      result.push({ ...act, period });
    }
    // Bu periyodun son aktivitesinin konumunu bir sonraki periyod için sakla
    lastPos = mealSorted[mealSorted.length - 1]?.coordinates;
  }

  return result;
};

/* ══════════════════════════════════════════════
   Google Geocoding API — Nominatim'den çok daha
   doğru koordinatlar (özellikle turistik mekanlar)
═══════════════════════════════════════════════ */
const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const a2 = s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
};

const MAX_GEOCODE_DEVIATION_KM = 15;

/* Önbellek — aynı yer için tekrar istek atmayı önler (max 500 entry) */
const MAX_CACHE_SIZE = 500;
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

const setCacheEntry = (key: string, value: { lat: number; lng: number } | null) => {
  if (geocodeCache.size >= MAX_CACHE_SIZE) {
    // En eski girişi sil (insertion-order guarantee)
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey !== undefined) geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, value);
};

const fetchGoogleCoordinates = async (
  placeName: string,
  destination: string,
  bias?: { lat: number; lng: number }   // AI koordinatı — yakındaki sonuçları önceliklendir
): Promise<{ lat: number; lng: number } | null> => {
  const trimmedPlace = placeName.trim();
  const trimmedDest  = destination.trim();
  if (!trimmedPlace) return null;

  // 1. "Mekan Adı, Şehir" şeklinde ara (en doğru sonuç)
  const query1 = trimmedDest ? `${trimmedPlace}, ${trimmedDest}` : trimmedPlace;
  // Önbellek anahtarı bias bölgesini de içersin (aynı isim farklı semtte olabilir)
  const biasKey = bias ? `@${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : '';
  const cacheKey1 = (query1 + biasKey).toLowerCase();

  if (geocodeCache.has(cacheKey1)) {
    return geocodeCache.get(cacheKey1)!;
  }

  const doRequest = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const url = new URL(GOOGLE_GEOCODING_URL);
      url.searchParams.set('address', address);
      url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
      url.searchParams.set('language', 'tr');
      // Konum yanlılığı: AI koordinatının ~±15 km çevresine öncelik ver
      if (bias) {
        const d = 0.15; // ~15 km
        url.searchParams.set('bounds', `${bias.lat - d},${bias.lng - d}|${bias.lat + d},${bias.lng + d}`);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        warn(`[Geocoding] Google HTTP ${res.status} — "${address}"`);
        return null;
      }

      const data = await res.json() as {
        status: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      };

      if (data.status !== 'OK' || !data.results.length) {
        warn(`[Geocoding] Google status=${data.status} — "${address}"`);
        return null;
      }

      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } catch (e) {
      warn(`[Geocoding] Google fetch hatası — "${address}":`, e);
      return null;
    }
  };

  // 1. Şehirle birlikte ara
  let result = await doRequest(query1);
  setCacheEntry(cacheKey1, result);
  if (result) {
    log(`[Geocoding] ✅ Google "${trimmedPlace}" → ${result.lat}, ${result.lng}`);
    return result;
  }

  // 2. Yalnızca mekan adıyla ara (fallback)
  if (trimmedDest) {
    const cacheKey2 = (trimmedPlace + biasKey).toLowerCase();
    if (geocodeCache.has(cacheKey2)) return geocodeCache.get(cacheKey2)!;
    result = await doRequest(trimmedPlace);
    setCacheEntry(cacheKey2, result);
    if (result) {
      log(`[Geocoding] ✅ Google fallback "${trimmedPlace}" → ${result.lat}, ${result.lng}`);
      return result;
    }
  }

  warn(`[Geocoding] ⚠️ "${trimmedPlace}" bulunamadı — AI koordinatı korunuyor`);
  return null;
};

const validateCoordinates = async (
  activities: DailyActivity[],
  destination: string
): Promise<DailyActivity[]> => {
  const trimmedDestination = destination.trim();

  if (!trimmedDestination || activities.length === 0) {
    return activities;
  }

  const validatedActivities: DailyActivity[] = [];

  for (const activity of activities) {
    try {
      // AI koordinatını bias olarak geç — Google'ın uzak/yanlış eşleşmesini önler
      const hasAiCoord = Math.abs(activity.coordinates.lat) > 0.001 || Math.abs(activity.coordinates.lng) > 0.001;
      const verifiedCoordinates = await fetchGoogleCoordinates(
        activity.placeName,
        trimmedDestination,
        hasAiCoord ? activity.coordinates : undefined,
      );

      if (verifiedCoordinates) {
        const distKm = haversineKm(activity.coordinates, verifiedCoordinates);
        if (distKm <= MAX_GEOCODE_DEVIATION_KM) {
          // Google sonucu mantıklı mesafede → kullan
          validatedActivities.push({
            ...activity,
            coordinates: { lat: verifiedCoordinates.lat, lng: verifiedCoordinates.lng },
          });
          log(`[Geocoding] ✅ ${activity.placeName} → ${verifiedCoordinates.lat}, ${verifiedCoordinates.lng} (${distKm.toFixed(1)} km)`);
        } else {
          // Sapma > 30 km → muhtemelen farklı şehirde aynı isimli yer bulundu, AI'ı koru
          validatedActivities.push(activity);
          warn(`[Geocoding] ⚠️ ${activity.placeName}: ${distKm.toFixed(1)} km sapma > ${MAX_GEOCODE_DEVIATION_KM} km — AI koordinatı korunuyor`);
        }
      } else {
        validatedActivities.push(activity);
        log(`[Geocoding] ⚠️ Koordinat bulunamadı, AI değeri korundu: ${activity.placeName}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`[Geocoding] Aktivite atlandı, AI koordinatı korundu (${activity.placeName}): ${message}`);
      validatedActivities.push(activity);
    }
  }

  return validatedActivities;
};

/* ── Race-condition koruması ──────────────────────────────────────────
   Her yeni validation başlatıldığında version artar.
   Eski bir job tamamlandığında version farklıysa state'i güncellemez.
──────────────────────────────────────────────────────────────────── */
let _validationVersion = 0;

const validateDayCoordinatesInBackground = (
  day: DailyPlan,
  destination: string,
  onDayUpdate: (day: DailyPlan) => void
): void => {
  const myVersion = ++_validationVersion;

  void (async () => {
    try {
      const trimmedDestination = destination.trim();
      if (!trimmedDestination || day.activities.length === 0) return;

      log(`[Geocoding] Gün ${day.dayNumber} arka plan koordinat doğrulaması başladı...`);

      const activities = await validateCoordinates(day.activities, trimmedDestination);
      if (_validationVersion !== myVersion) return; // iptal: daha yeni bir job var

      const dayCost = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      onDayUpdate({ ...day, activities, totalEstimatedCost: dayCost });

      log(`[Geocoding] Gün ${day.dayNumber} arka plan koordinat doğrulaması tamamlandı.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`[Geocoding] Gün ${day.dayNumber} arka plan doğrulama başarısız: ${message}`);
    }
  })();
};

export const validateAllCoordinatesInBackground = (
  plan: TravelPlanResponse,
  onPlanUpdate: (plan: TravelPlanResponse) => void
): void => {
  const myVersion = ++_validationVersion;

  void (async () => {
    try {
      const destination = plan.destination.trim() || plan.destination;
      if (!destination || plan.dailyPlans.length === 0) return;

      log('[Geocoding] Arka plan koordinat doğrulaması başladı...');

      const updatedDailyPlans: DailyPlan[] = [];

      for (let dayIndex = 0; dayIndex < plan.dailyPlans.length; dayIndex++) {
        if (_validationVersion !== myVersion) return; // iptal

        const day = plan.dailyPlans[dayIndex];
        const activities = await validateCoordinates(day.activities, destination);

        if (_validationVersion !== myVersion) return; // iptal

        const dayCost = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
        updatedDailyPlans.push({ ...day, activities, totalEstimatedCost: dayCost });

        const partialDailyPlans = [
          ...updatedDailyPlans,
          ...plan.dailyPlans.slice(dayIndex + 1),
        ];
        onPlanUpdate({
          ...plan,
          dailyPlans: partialDailyPlans,
          totalEstimatedCost: partialDailyPlans.reduce((s, d) => s + d.totalEstimatedCost, 0),
        });
      }

      log('[Geocoding] Arka plan koordinat doğrulaması tamamlandı.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`[Geocoding] Arka plan doğrulama başarısız: ${message}`);
    }
  })();
};

const CITY_MAP: Array<{ keywords: string[]; context: string }> = [
  {
    keywords: ['floransa', 'florence', 'firenze'],
    context: 'Floransa için: Uffizi Galerisi, Duomo, Ponte Vecchio, Piazzale Michelangelo kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['milano', 'milan'],
    context: 'Milano için: Duomo, Galleria Vittorio Emanuele, Son Akşam Yemeği, Brera kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['roma', 'rome'],
    context: 'Roma için: Kolezyum, Trevi Çeşmesi (Aşk Çeşmesi), Pantheon, Vatikan kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['paris'],
    context: 'Paris için: Eyfel Kulesi, Louvre Müzesi, Notre Dame, Montmartre kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['istanbul'],
    context: 'İstanbul için: Ayasofya, Sultanahmet Camii, Topkapı Sarayı, Kapalıçarşı, Boğaz Turu kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['londra', 'london'],
    context: 'Londra için: Big Ben, London Eye, Tower Bridge, British Museum kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['tokyo', 'tokio'],
    context: 'Tokyo için: Senso-ji, Shibuya Crossing, Fushimi Inari, teamLab kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['barcelona'],
    context: 'Barcelona için: Sagrada Familia, Park Güell, La Boqueria, Gothic Quarter kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['new york', 'nyc', 'manhattan'],
    context: 'New York için: Central Park, Met Museum, Brooklyn Bridge, Times Square kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['dubai'],
    context: 'Dubai için: Burj Khalifa, Dubai Mall, Gold Souk, Desert Safari kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['amsterdam'],
    context: 'Amsterdam için: Rijksmuseum, Anne Frank Huis, Canal Tour, Van Gogh Museum kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['prag', 'prague', 'praha'],
    context: 'Prag için: Charles Bridge, Old Town Square, Prague Castle, Kafka Museum kesinlikle dahil edilmelidir.',
  },
];

const matchesCityKeyword = (dest: string, keyword: string): boolean => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return false;
  if (normalizedKeyword.includes(' ')) {
    return dest.includes(normalizedKeyword);
  }
  return dest.includes(normalizedKeyword);
};

const getFlexiblePeriodSchedulingRule = (
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  departureTime: string
): string => `Kesin saatler (14:30 gibi) ASLA kullanma. Sadece period adlarını kullan: 'Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'.
VARIŞ GÜNÜ (${arrivalDate}, saat ${arrivalTime}):
- Varış 06:00–11:59 arası → "Sabah"tan başla, 4-5 aktivite üret
- Varış 12:00–13:59 arası → "Öğle"den başla, 3-4 aktivite üret
- Varış 14:00–17:59 arası → "Öğleden Sonra"dan başla, SADECE 2-3 aktivite üret
- Varış 18:00–20:59 arası → "Akşam"dan başla, SADECE 1-2 aktivite üret
- Varış 21:00 ve sonrası → "Gece"den başla, 1 aktivite (hafif yemek)
⚠️ KAHVALTI KURALI: Kahvaltı / fırın / poğaça / serpme kahvaltı mekanları SADECE "Sabah" periyodunda olabilir. Eğer gün "Öğle" veya daha geç başlıyorsa (öğleden sonra varış) KAHVALTI mekanı EKLEME — o günün ilk yemeği ÖĞLE YEMEĞİ (restoran/lokanta) olmalı. Kahvaltıdan hemen sonra öğle yemeği ASLA koyma.
DÖNÜŞ GÜNÜ (${departureDate}, saat ${departureTime}):
- Ayrılış 08:00'den önce → O günü plana EKLEME
- Ayrılış 08:00–11:59 → "Sabah" 1 aktivite max (kahvaltı)
- Ayrılış 12:00–15:59 → "Sabah" 2 aktivite
- Ayrılış 16:00 ve sonrası → "Sabah" + "Öğle" 3 aktivite
⚠️ DÖNÜŞ GÜNÜ MESAFE KURALI: Kişi o gün yola çıkacak. Aktiviteler MUTLAKA konaklama/şehir merkezine YAKIN (max 10-15 dk) olmalı. Şehir dışı uzak geziler (şelale, kasaba, doğa rotası, 30+ dk mesafedeki yerler) ASLA dönüş gününe KOYMA. Düşük tempo, rahat, valiz toplamaya zaman bırakan bir gün olsun.
NORMAL GÜNLER: "Sabah"tan başla, tam 5-6 aktivite üret.`;

const getCityContext = (destination: string): string => {
  const dest = destination.toLowerCase();

  for (const entry of CITY_MAP) {
    if (entry.keywords.some((keyword) => matchesCityKeyword(dest, keyword))) {
      return entry.context;
    }
  }

  return 'Şehrin en ikonik 1 numaralı simgelerini plana KESİNLİKLE dahil et.';
};

// --- TİPLER (INTERFACES) ---

export interface DailyActivity {
  period: string; // 'Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'
  placeName: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  estimatedCost: number;
  actualCost?: number;
  note?: string;
}

export interface DailyPlan {
  dayNumber: number;
  date: string;
  activities: DailyActivity[];
  daySummary: string;
  totalEstimatedCost: number;
}

export interface CityGuide {
  transportationTips: string;
  localCustoms: string;
  generalAdvice: string;
}

export interface TravelPlanResponse {
  destination: string;
  overallSummary: string;
  totalEstimatedCost: number;
  currencySymbol: string;
  cityGuide: CityGuide;
  dailyPlans: DailyPlan[];
}

// --- PROMPT OLUŞTURUCU ---

const calculateTripDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
};

const buildPrompt = (data: OnboardingData): string => {
  const tripDays = calculateTripDays(data.startDate, data.endDate);
  const dailyBudget = Math.round(data.budget / tripDays);
  const perPersonBudget = Math.round(data.budget / Math.max(data.peopleCount, 1));
  const cityMustSee = getCityContext(data.destination);

  const mealBudgetLabels: Record<string, string> = {
    low: 'Düşük ($) — sokak lezzetleri, ekonomik mekanlar',
    medium: 'Orta ($$) — dengeli restoranlar',
    high: 'Yüksek ($$$) — fine dining ve özel mekanlar',
  };
  const mealBudgetLabel = mealBudgetLabels[data.mealBudget] || data.mealBudget || 'Belirtilmedi';

  const travelTypeMap: Record<string, string> = {
    solo_macera:    'Solo Macera — Tek başına esnek keşif; hostel sosyal alanları, yerel buluşma noktaları, güvenli ama otantik deneyimler öner. Plan esnek tutulsun.',
    romantik:       'Romantik Çift Tatili — Sakin restoranlar, gün batımı noktaları, kalabalıktan uzak mekanlar. Çift fotoğrafı için ikonik spotlar ekle.',
    balayi:         'Balayı — LÜKS ve ÖZEL odak. Romantik akşam yemekleri, özel deneyimler, fotoğraflık anlar. Kalabalık turistik alanlardan kaçın; sakin ve şık mekanlar seç.',
    aile:           'Aile Tatili (çocuklarla) — Çocuk dostu mekanlar, interaktif müzeler, parklar, kısa yürüyüş mesafeleri. Plan çok yorucu olmasın; öğleden sonra dinlenme bırak.',
    arkadas_grubu:  'Arkadaş Grubu Seyahati — Gece hayatı, barlar, grup aktiviteleri, paylaşımlı deneyimler öncelikli. Sosyal ve eğlenceli mekanlar seç.',
    is_seyahati:    'İş Seyahati — Verimli ve pratik. Otel civarı kısa aktiviteler, sabah/akşam boş zamanlara odaklan. Fazla yorucu plan yapma; iş enerjisi korunsun.',
    sehir_kacamagi: 'Kısa Şehir Kaçamağı (max 2-3 gün) — En öncelikli klassikleri ve en ikonik yerleri öner. Dinlenme ile keşif dengesini kur; her şeyi sığdırmaya çalışma.',
    klasik_tatil:   'Klasik Turistik Tatil — Top atraksiyonlar, mutlaka görülmesi gerekenler, fotoğraflık yerler. Ziyaretçi dostu mekanlar ve net rota.',
  };
  const travelTypeLabel = travelTypeMap[data.travelType] || 'Genel tatil';

  const purposeMap: Record<string, string> = {
    culture:   'Kültür ve Tarih (müzeler, anıtlar, tarihi yerler)',
    relax:     'Dinlenme ve Spa (yavaş tempo, manzaralı kafeler, parklar)',
    nightlife: 'Gece Hayatı (barlar, kulüpler, canlı müzik)',
    nature:    'Doğa ve Macera (trekking, doğa yürüyüşü, açık hava)',
  };

  // Backward compat: eski 'tripPurpose' string → yeni 'purposes' array
  const effectivePurposes: string[] =
    data.purposes && data.purposes.length > 0
      ? data.purposes
      : data.tripPurpose ? [data.tripPurpose] : [];

  // Özel durum sinyalleri — seçili ilgi alanlarına göre zorunlu aktivite talimatları
  const purposeSpecialRules: string[] = [];
  if (effectivePurposes.includes('nightlife')) {
    purposeSpecialRules.push('Gece Hayatı seçildi → plana MUTLAKA 21:00 sonrası bar/kulüp aktivitesi ekle.');
  }
  if (effectivePurposes.includes('nature')) {
    purposeSpecialRules.push('Doğa & Macera seçildi → plana MUTLAKA gündüz doğa aktivitesi ekle (yürüyüş, park, doğa rotası).');
  }
  if (effectivePurposes.includes('culture')) {
    purposeSpecialRules.push('Kültür & Tarih seçildi → plana MUTLAKA en az 1 müze veya tarihi alan ekle.');
  }
  if (effectivePurposes.includes('relax')) {
    purposeSpecialRules.push('Dinlenme seçildi → plana MUTLAKA en az 1 sakin mola/spa/park aktivitesi ekle.');
  }

  // Öncelik ağırlıklı ilgi alanı talimatı
  const purposeLabel = (() => {
    if (effectivePurposes.length === 0) return 'Belirtilmedi';
    if (effectivePurposes.length === 1) {
      return `Kullanıcının tek ilgi alanı: ${purposeMap[effectivePurposes[0]] || effectivePurposes[0]}. Plan AĞIRLIKLI olarak buna odaklı olsun.`;
    }
    if (effectivePurposes.length === 2) {
      return `Kullanıcının ilgi alanları (öncelik sırasına göre):
  1. ${purposeMap[effectivePurposes[0]] || effectivePurposes[0]} — ANA ilgi, plan %60 buna ayrılsın
  2. ${purposeMap[effectivePurposes[1]] || effectivePurposes[1]} — İKİNCİL ilgi, plan %40 buna ayrılsın
Her günü tek tip yapma, iki ilgiyi dengeli dağıt.`;
    }
    return `Kullanıcının ilgi alanları (öncelik sırasına göre):
  1. ${purposeMap[effectivePurposes[0]] || effectivePurposes[0]} — ANA, plan %50
  2. ${purposeMap[effectivePurposes[1]] || effectivePurposes[1]} — %30
  3. ${purposeMap[effectivePurposes[2]] || effectivePurposes[2]} — %20
Her günü tek tip yapma, KARMA günler oluştur. Örnek: sabah kültür, öğleden sonra doğa, akşam gece hayatı gibi.`;
  })();

  const paceMap: Record<string, string> = {
    // Yeni değerler
    rahat:  'RAHAT tempo — Günde MAX 4 km yürüyüş, 2-3 ana aktivite. Aktiviteler arası taksi/transit kullan, yürüme rotaları kısa tut. Bolca kafe/mola ekle. Yorucu günler yapma.',
    normal: 'NORMAL tempo — Günde 6-8 km yürüyüş, 3-4 ana aktivite. Yürüme + transit dengeli. Standart turist planı.',
    aktif:  'AKTİF tempo — Günde 10-15 km yürüyüş kabul edilebilir. 5-6 aktivite. Yürüyerek bağlantılı rotalar oluştur. Tepe çıkışları, uzun mahalle turları ekle. Aktivite sayısında limit koyma.',
    esnek:  'ESNEK tempo — Şehre ve güne göre karar ver. Genelde normal-aktif arası planla; sıcaklık 30°C+ ise tempoyu düşür, yağmur varsa kapalı mekan öncelikli yap.',
    // Geriye dönük uyumluluk (eski planlar için)
    yavaş: 'YAVAŞ tempo (günde 3-4 aktivite, uzun molalar)',
    orta:  'ORTA tempo (günde 5-6 aktivite, dengeli)',
    yoğun: 'YOĞUN tempo (günde 6-7 aktivite, hızlı geçişler)',
  };

  const foodPhilosophyMap: Record<string, string> = {
    iconic:      'İkonik Lezzetler — Şehrin meşhur, herkesin bildiği lezzet duraklarını planla. Yerel sembol yemekler, şehrin en bilinen restoranları.',
    hidden_gems: 'Gizli Keşifler — Az bilinen, yerel mahallelerde saklı mekanlar öner. Turistlerin gittiği yerlerden kaçın; fırıncı esnafı, yerel lokantalı arka sokaklar.',
    fine_dining: 'Fine Dining — Kaliteli, özenli restoranlar. Sunum, servis ve ambiyans önemli. Michelin ve üst segment rehberlerdeki mekanlar öncelikli.',
    street_food: 'Sokak Yemeği — Tezgah lezzetleri, pazar yiyecekleri, yerel atıştırmalıklar. Otur-kalk kafe yerine yürürken yenilen lezzetler.',
    mixed:       'Karışık / Sürpriz — Her öğün farklı bir deneyim: bir öğün ikonik, bir öğün sokak lezzeti, bir öğün keşif. Monoton kalıplardan kaçın.',
  };

  // YEMEK FELSEFESİ + BÜTÇE ÇAKIŞMA KURALI:
  // foodPhilosophy=fine_dining VE mealBudget=low → bütçe kısıtı önceliklidir; uygun fiyatlı ama kaliteli bistro/brasserie öner
  // foodPhilosophy=street_food VE mealBudget=high → yüksek kaliteli/ödüllü sokak yemeği mekanları (gourmet street food) öner
  // Her durumda mealBudget alanı felsefeden DAHA önceliklidir — bütçe aşan öneriler yapma
  const effectiveFoodPhilosophy = data.foodPhilosophy
    ? foodPhilosophyMap[data.foodPhilosophy] || data.foodPhilosophy
    : 'Belirtilmedi — standart karışık plan yap';

  const accommodationMap: Record<string, string> = {
    hotel:  'OTEL — Kullanıcı otel tarzında kalıyor (konfor, standart konaklama). Plan içinde otele dönüş veya dinlenme molaları doğal olabilir.',
    airbnb: 'AİRBNB/EV — Kullanıcının kendi alanı ve mutfak erişimi var. Plan içinde market alışverişi, kahvaltı kendin hazırlama gibi seçenekler doğal olabilir. Mahalleyi derinlemesine tanıma fırsatları öner.',
    hostel: 'HOSTEL — Kullanıcı sosyal, paylaşımlı ortamda kalıyor. Plan içinde hostel sosyal aktiviteleri, free walking tour katılımı veya diğer gezginlerle buluşma noktaları öner.',
    resort: 'RESORT/TATİL KÖYÜ — Kullanıcı resort\'ta kalıyor (her şey dahil, sakin). Plan içinde resort\'tan kısa kaçamaklar, yakın çevre keşfi, spa zamanları doğal olabilir.',
  };

  // KRİTİK KURAL — konaklama tipinden yemek bütçesi veya aktivite lüksü VARSAYILMAZ.
  // Konaklama tipi yalnızca konaklamanın bağlamı için kullanılır.
  // • Yemek bütçesi → SADECE mealBudgetLabel alanından al
  // • Aktivite tarzı → SADECE travelType ve purposes alanlarından al

  const transportMap: Record<string, string> = {
    public: 'Kullanıcı TOPLU TAŞIMA kullanacak. Aktiviteleri METRO/OTOBÜS hatlarına yakın seç. Her şehir için transit kart/pass bilgisi ver (örn Roma Pass, Paris Navigo, İstanbul Istanbulkart). Ulaşım önerilerinde spesifik hat ve durak belirt (örn "Termini\'den A metro hattı ile Barberini durağı, 3 dk").',
    walk:   'Kullanıcı YÜRÜYEREK gezecek. Günlük aktiviteleri max 1.5-2 km yarıçapında kümele; aynı mahallede tut. Mekanlar arası yürüme süresini ve mesafeyi belirt (örn "5 dk yürüme, ~400 m"). Uzak mekanları aynı güne koyma. Gün içinde toplam yürüyüş 5-6 km\'yi geçmesin.',
    taxi:   'Kullanıcı TAKSİ/UBER kullanacak. Mesafe önemli değil — coğrafi olarak optimize et ama yürüme şartı yok. Her aktivite arası tahmini taksi/Uber ücretini belirt (örn "Termini → Vatikan ~€15"). Şehrin uzak noktaları aynı güne konabilir.',
    car:    'Kullanıcı ARABA kullanacak (kiralık veya kendi aracı). KRİTİK BİLGİLER ver: 1) Şehir merkezinde park yeri durumu — kısıtlı bölgeleri uyar (örn Roma ZTL/Zona a Traffico Limitato bölgelerini SAKINDIRMA, ceza kesilir); 2) Her aktivite için yakın park önerisi ve tahmini ücret; 3) ŞEHİR DIŞI gezi fırsatlarını muhakkak öner (örn Roma → Tivoli, Castel Gandolfo; Paris → Versailles, Giverny); 4) Trafik yoğun saatleri belirt ve o saatlerde araç yerine toplu taşıma öner; 5) Konaklama için otopark varlığını sorgulat veya yakın otopark öner; 6) Araba sayesinde ulaşılabilen ama toplu taşımayla zor olan yerleri özellikle vurgula.',
  };

  return `
[ROL TANIMI]
Sen ${data.destination} şehrini bizzat yaşamış, yerel rehber seviyesinde tanıyan bir seyahat planlayıcısısın. Kullanıcının profiline göre TUTARLI bir plan üreteceksin — lüks ile sokak lezzetlerini, dinlenme ile maceraya, hızlı ile yavaşı birbirine karıştırmayacaksın.

[ÇIKTI FORMATI]
SADECE geçerli JSON. Markdown, açıklama, kod bloğu YOK.

═══════════════════════════════════════════════
KULLANICI PROFİLİ
═══════════════════════════════════════════════
🌍 Destinasyon: ${data.destination}
📅 Tarihler: ${data.startDate} → ${data.endDate} (${tripDays} gün)
🛬 Varış: ${data.startDate} saat ${data.arrivalTime}
🛫 Dönüş: ${data.endDate} saat ${data.departureTime}
👥 Grup: ${data.peopleCount} kişi
💰 Toplam Bütçe: ${data.budget} ${data.currencyCode}
   ↳ Kişi başı: ~${perPersonBudget} ${data.currencyCode}
   ↳ Günlük tavsiye: ~${dailyBudget} ${data.currencyCode}/gün

🧳 Seyahat Türü: ${travelTypeLabel}
🎯 İlgi Alanları: ${purposeLabel}
${purposeSpecialRules.length > 0 ? `⚠️ ZORUNLU AKTİVİTE KURALLARI:\n${purposeSpecialRules.map(r => `- ${r}`).join('\n')}` : ''}
⚡ Tempo: ${paceMap[data.pace] || data.pace}
🌅 Erken Kalkma: ${data.earlyBird ? 'EVET — sabah 7-8 başlayabilir' : 'HAYIR — sabah 9-10 başlanmalı'}
🍽️ Beslenme: ${data.dietaryRestrictions.join(', ') || 'Kısıtlama yok'}
🍴 Yemek Felsefesi: ${effectiveFoodPhilosophy}
💵 Öğün Bütçesi: ${mealBudgetLabel} (BÜTÇEYİ ASLA AŞMA — felsefe bütçeyle çelişirse bütçeye uyu)
🏨 Konaklama: ${data.hasReservation
  ? (() => {
      const hasCoords = data.accommodationLat && data.accommodationLng;
      return `Rezervasyon mevcut — "${data.accommodationAddress}"${hasCoords ? ` [koordinat: ${(data.accommodationLat as number).toFixed(6)}, ${(data.accommodationLng as number).toFixed(6)}]` : ''}`;
    })()
  : (accommodationMap[data.accommodation] || data.accommodation)}
${data.hasReservation && data.accommodationLat && data.accommodationLng ? `
📍 KULLANICI KONAKLAMA KONUMU (KRİTİK):
- Adres: ${data.accommodationAddress}
- Koordinatlar: ${(data.accommodationLat as number).toFixed(6)}, ${(data.accommodationLng as number).toFixed(6)}
→ Her günün rotasını BU KOORDİNATTAN başlat.
→ Aktiviteleri bu konuma göre coğrafi olarak optimize et; yakın mekanları önceliklendir.
→ Akşam dönüşünde bu noktaya yakın aktiviteler bırak.
→ Aktiviteler arası mesafeleri bu noktayı merkez kabul ederek hesapla.` : ''}
🚇 Ulaşım: ${transportMap[data.transport] || data.transport}
═══════════════════════════════════════════════

Kullanıcı profili ile MEKAN seçimi UYUMLU olmalı:

✅ DOĞRU EŞLEŞMELER:
- mealBudget=low  → Sokak lezzetleri, ekonomik mekanlar (konaklama tipine BAKMAKSIZIN)
- mealBudget=high → Fine dining, kaliteli restoranlar (konaklama tipine BAKMAKSIZIN)
- purposes içinde relax + pace=rahat → Sahil kafeleri, spa, parklar
- purposes içinde nightlife + pace=aktif → Bar tour, gece kulüpleri
- purposes içinde birden fazla alan → karma günler oluştur (sabah kültür, akşam gece hayatı)
- transport=walk → Birbirine yakın mekanlar seçilmeli
- earlyBird=true → İlk aktivite 08:00-09:00 (Sabah)
- earlyBird=false → İlk aktivite 10:00 sonrası (Öğle)
- travelType=balayi → Fine dining, özel mekanlar (SADECE mealBudget=high ile birlikte)
- accommodation=hostel → Sosyal aktiviteler, free walking tour, ortak buluşma noktaları öner (yemek bütçesinden BAĞIMSIZ)

❌ ASLA YAPMA:
- mealBudget=low için Michelin restoran önerme (foodPhilosophy=fine_dining olsa bile)
- mealBudget=high için ucuz fastfood önerme (foodPhilosophy=street_food ise → gourmet/ödüllü sokak lezzetleri öner)
- mealBudget=low için pahalı yemek önerip "küçük porsiyon al" demek
- transport=walk seçildiyse şehrin uzak ucuna mekan koyma
- purposes içinde 'relax' varsa yoğun müze maratonu yapma
- purposes içinde 'nightlife' varsa tüm gün kapanış 21:00 olan yer önerme

═══════════════════════════════════════════════
ZORUNLU İÇERİK KURALLARI
═══════════════════════════════════════════════

1️⃣ İKONİK MEKANLAR (atlanmaz):
${cityMustSee}
Bu mekanları MUTLAKA listele. Bütçe yetmezse "Dışarıdan fotoğraf molası" olarak ekle, estimatedCost=0.

2️⃣ AKTİVİTE TÜRLERİ (sadece şunlar):
✅ KABUL: Müze, Restoran, Park, Tarihi mekan, Çarşı, Galeri, Kilise/Cami, Meydan, Manzara noktası, Plaj, Bar/Kafe, Tema park, Bahçe, Kale, Köprü
❌ RED: Otele dönüş, Dinlenme, Çıkış, Taksi/Metro/Yürüyüş transferi, Hazırlık, Paketleme, Uçuş

3️⃣ AÇIKLAMA YAZIM KURALLARI:
- Her description: 2-3 cümle, 150-250 karakter
- "Sonra şuraya geç" gibi sıralama referansı YOK
- "İnsider tip" stilinde: "Sabah erken git, kuyruğa girme", "Mutlaka X menüsünü dene", "İkinci kat manzarayı kaçırma"
- Spesifik detay ver: oda numarası, kat, hangi sokakta vs

4️⃣ MALİYET KURALLARI:
- ${data.peopleCount} kişilik grup TOPLAM maliyeti
- Müze/aktivite girişi + yiyecek varsa içecek dahil
- Günlük hedef: ~${dailyBudget} ${data.currencyCode}
- Toplam bütçe ${data.budget} ${data.currencyCode} sınırını GEÇMEMELI
- Bütçeyi günler arası DENGELI dağıt (1. gün %50 yığma!)

5️⃣ GÜN İÇİ AKTİVİTE SAYISI:
${getFlexiblePeriodSchedulingRule(data.startDate, data.arrivalTime, data.endDate, data.departureTime)}

⚠️ ÖNEMLİ: Eğer varış akşam 18:00+ ise SADECE 1-2 aktivite üret, "günde 3 öğün" kuralı o gün uygulanmaz.

6️⃣ ÖĞÜN DAĞILIMI (varış/dönüş günü hariç):
- Sabah/Öğle periyodunda: 1 kahvaltı yeri (kafe/fırın)
- Öğle/Öğleden Sonra: 1 öğle yemeği yeri (restoran)
- Akşam: 1 akşam yemeği yeri (restoran)
- mealBudget tercihine göre sınıf seç

7️⃣ COĞRAFI MANTIK:
- Aynı gün içinde mekanlar 5km yarıçap içinde olsun
- Şehrin doğu/batı uçlarını aynı güne KOYMA
- Lat/Lng GERÇEK koordinatlar (denizde nokta olmaz)
- Bilmediğin mekanlar için ünlü gerçek mekanlar tercih et
- ŞEHİR DIŞI / UZAK GEZİLERİN GÜN DAĞILIMI (KRİTİK): Şehre 30+ dk mesafedeki uzak geziler (şelale, kasaba, doğa rotası, day-trip) SADECE seyahatin ORTA günlerine konur. İLK GÜN (varış) ve SON GÜN (dönüş) ASLA uzak geziye ayrılmaz — bu günler şehir merkezine yakın, düşük tempolu olmalı. Mantık: kişi vardığı ve ayrıldığı gün uzağa gidip dönemez; uzak yerler tatilin ortasında, enerji ve zaman varken gezilir.

8️⃣ GÜNLÜK YEMEKLERİN SIRASI (activities dizisindeki sıra bu kuralı yansıtmalı):
- Sabah periyodu: kahvaltı/kafe/fırın mekânı DAİMA DİZİNİN İLK ELEMANı olsun; ardından turistik aktiviteler
- Öğle veya Öğleden Sonra periyodu: öğle yemeği mekânı DİZİNİN BAŞINA gelsin
- Akşam periyodu: turistik aktiviteler önce, akşam yemeği/restoran mekânı DAİMA DİZİNİN SON ELEMANı olsun
- Gece periyodu: bar/restoran mekânı sona gelsin
Coğrafi rota optimizasyonu bu sıralamadan SONRA düşünülür, yemek sıralaması önceliklidir.

═══════════════════════════════════════════════
ÇIKTI YAPISI (EXACT FORMAT)
═══════════════════════════════════════════════

{
  "destination": "${data.destination}",
  "overallSummary": "EXACT 2 cümle. Şehri ve plan temasını özetle.",
  "totalEstimatedCost": 0,
  "currencySymbol": "${data.currencySymbol}",
  "cityGuide": {
    "transportationTips": "3-4 cümle. Ulaşım kartı/bilet fiyatı, en kullanışlı hat, taksi tavsiyesi",
    "localCustoms": "3-4 cümle. Bahşiş, selamlama, restoran adabı, yapılmaması gerekenler",
    "generalAdvice": "3-4 cümle. Su, prizler, sim kart, güvenlik, geleneksel ipuçları"
  },
  "dailyPlans": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "daySummary": "EXACT 1 cümle. O günün ana teması.",
      "totalEstimatedCost": 0,
      "activities": [
        {
          "period": "Sabah | Öğle | Öğleden Sonra | Akşam | Gece",
          "placeName": "Gerçek tam isim (yerel dil + parantez içinde Türkçe varsa)",
          "description": "2-3 cümle, insider tip içerir",
          "coordinates": { "lat": 0.0, "lng": 0.0 },
          "estimatedCost": 0
        }
      ]
    }
  ]
}

═══════════════════════════════════════════════
İYİ vs KÖTÜ ÖRNEKLER
═══════════════════════════════════════════════

✅ İYİ Açıklama Örneği:
"Demir leydinin gerçek hissini yakalamak için 2. kata çıkın (3. kat genelde uzun kuyruk yapar). Trocadero tarafından çekilen fotoğraflar her zaman en iyisidir. Akşam 21:00'de ışıklandırma şovu kaçırılmamalı."

❌ KÖTÜ Açıklama Örneği:
"Eyfel Kulesi Paris'in sembolüdür. Eğlenceli bir aktivite."

✅ İYİ Mekan Adı:
"Le Comptoir de la Tour (Eyfel manzaralı bistro)"

❌ KÖTÜ Mekan Adı:
"Eyfel yakınında bir restoran"

✅ İYİ daySummary:
"Tarihi yarımadanın kalbinde Bizans ve Osmanlı miraslarını keşif."

❌ KÖTÜ daySummary:
"Bugün çok güzel olacak ve Roma şehrinde birçok güzel mekanı gezerek tarihi atmosferin tadını çıkaracaksınız."

ŞIMDI BU KURALLARA HARFİYEN UYAN PLANI ÜRET.
`;
};

// --- TEK AKTİVİTE ÖNERİCİ ---

export const suggestSingleActivity = async (
  destination: string,
  period: string,
  userRequest: string,
  existingPlaces: string[],
  currencyCode: string,
  currencySymbol: string,
  nearbyCoords?: { lat: number; lng: number },  // o günkü aktivitelerin merkezi
): Promise<DailyActivity> => {
  if (!apiKey) throw new Error(getFriendlyError('invalid_api_key'));

  const avoidList = existingPlaces.length > 0
    ? `\nZaten planda olanlar — BUNLARI ÖNERME:\n${existingPlaces.map(p => `- ${p}`).join('\n')}`
    : '';

  const proximityRule = nearbyCoords
    ? `\n⚠️ KRİTİK MESAFE KURALI: Önerilen yer, günün diğer aktivitelerine yakın olmalı.
Günün aktivitelerinin merkezi: lat=${nearbyCoords.lat.toFixed(4)}, lng=${nearbyCoords.lng.toFixed(4)}
Bu koordinata en fazla 3 km uzaklıkta bir yer öner. Şehrin uzak köşelerine gitme.`
    : '';

  const prompt = `Sen ${destination} şehrini bizzat yaşamış yerel rehber seviyesinde bir seyahat uzmanısın.
Kullanıcı "${period}" periyoduna şunu eklemek istiyor: "${userRequest}"
${avoidList}${proximityRule}

Tek bir aktivite JSON nesnesi döndür — başka hiçbir şey yazma:
{
  "period": "${period}",
  "placeName": "Gerçek ve tam yer adı (yerel dilde + parantezde Türkçe varsa)",
  "description": "2-3 cümle, insider tip içeren Türkçe açıklama. Spesifik detay ver.",
  "coordinates": { "lat": gerçek_enlem_sayı, "lng": gerçek_boylam_sayı },
  "estimatedCost": makul_sayısal_değer
}

Kurallar:
- coordinates ${destination} şehrinde gerçek bir yere ait olmalı (0,0 olamaz)
- estimatedCost ${currencyCode} cinsinden, 1 kişi için mantıklı değer
- description'da "Sonra şuraya git" gibi sıralama referansı olmasın
- SADECE JSON döndür`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: { responseMimeType: 'application/json' },
  });

  try {
    const result = await model.generateContent(prompt);
    const activity = extractAndParseJSON<DailyActivity>(result.response.text());
    if (!activity.placeName || !activity.coordinates?.lat) {
      throw new Error('Geçersiz aktivite formatı');
    }
    return { ...activity, period, currencySymbol } as DailyActivity;
  } catch (err) {
    throw new Error(getFriendlyError((err as Error).message));
  }
};

// --- ANA SERVİSLER ---

export const generateTravelPlan = async (
  data: OnboardingData,
  onPlanUpdate: (plan: TravelPlanResponse) => void
): Promise<TravelPlanResponse> => {
  if (!apiKey) throw new Error(getFriendlyError('invalid_api_key'));

  const prompt = buildPrompt(data);

  try {
    const textResult = await executeWithFallback(prompt);
    const parsedData = extractAndParseJSON<TravelPlanResponse>(textResult);

    // --- Temel yapı doğrulaması (AI yanlış format dönerse erken hata ver) ---
    if (!Array.isArray(parsedData.dailyPlans) || parsedData.dailyPlans.length === 0) {
      throw new Error('Geçersiz plan formatı: günlük planlar eksik');
    }
    for (let i = 0; i < parsedData.dailyPlans.length; i++) {
      const day = parsedData.dailyPlans[i];
      if (!Array.isArray(day.activities)) {
        throw new Error(`Gün ${i + 1} için aktivite listesi geçersiz`);
      }
      for (let j = 0; j < day.activities.length; j++) {
        const act = day.activities[j];
        if (!act.placeName || typeof act.placeName !== 'string') {
          throw new Error(`Gün ${i + 1}, aktivite ${j + 1}: placeName eksik`);
        }
        if (
          !act.coordinates ||
          typeof act.coordinates.lat !== 'number' ||
          typeof act.coordinates.lng !== 'number'
        ) {
          throw new Error(`Gün ${i + 1}, aktivite ${j + 1} (${act.placeName}): koordinat eksik`);
        }
        if (typeof act.estimatedCost !== 'number') {
          // Zorlama yerine sıfırla — AI bazen string döndürebilir
          act.estimatedCost = Number(act.estimatedCost) || 0;
        }
      }
    }

    // --- Güvenli immutable yapı oluştur ---
    let finalTotalCost = 0;
    const processedDailyPlans: DailyPlan[] = [];

    for (const day of parsedData.dailyPlans) {
      // Period grubu içinde TSP + varış/dönüş günü kırpma
      const activities = optimizeActivitiesForDay(
        day.activities,
        day.date,
        data.startDate,
        data.arrivalTime,
        data.endDate,
        data.departureTime,
      );
      const dayCost = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      finalTotalCost += dayCost;
      processedDailyPlans.push({ ...day, activities, totalEstimatedCost: dayCost });
    }

    // Orijinal parsedData'yı mutate etmiyoruz — yeni nesne döndür
    const resultPlan: TravelPlanResponse = {
      ...parsedData,
      dailyPlans: processedDailyPlans,
      totalEstimatedCost: finalTotalCost,
    };

    validateAllCoordinatesInBackground(resultPlan, onPlanUpdate);

    return resultPlan;
  } catch (error: unknown) {
    const errMsg = (error as Error).message || 'Bilinmeyen bir hata oluştu.';
    throw new Error(getFriendlyError(errMsg));
  }
};

export const regenerateDayWithVibe = async (
  dayPlan: DailyPlan,
  allDayPlans: DailyPlan[],        // ← tüm günler: tekrar önleme için
  destination: string,
  vibeId: string,
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  departureTime: string,
  onDayUpdate: (day: DailyPlan) => void
): Promise<DailyPlan> => {
  if (!apiKey) throw new Error(getFriendlyError('invalid_api_key'));

  const vibeMap: Record<string, string> = {
    'rest':    '😴 Dinlenme Modu (Yorucu olmayan kafeler, parklar, spa, yavaş tempo)',
    'indoor':  '🌧️ Hava/Kapalı Alan Modu (Müzeler, kapalı çarşılar, sergiler, restoranlar)',
    'budget':  '💰 Tasarruf Modu (Çok ucuz veya ücretsiz aktiviteler, sokak lezzetleri)',
    'explore': '🎉 Keşif Modu (Macera, trekking, sokakları arşınlama, yoğun tempo)',
  };

  const cityMustSee = getCityContext(destination);

  /* Diğer günlerde ziyaret edilmiş mekanlar — tekrar önleme listesi */
  const visitedLines = allDayPlans
    .filter(d => d.dayNumber !== dayPlan.dayNumber)
    .flatMap(d =>
      d.activities.map(a => `  - ${a.placeName} (Gün ${d.dayNumber} – ${a.period})`)
    );

  const visitedBlock = visitedLines.length > 0
    ? `\n⛔ ZATEN ZİYARET EDİLMİŞ MEKANLAR — KESİNLİKLE TEKRARLAMA:\n${visitedLines.join('\n')}\nBu mekanlar plandan çıkartıldı; eşdeğer veya daha az bilinen alternatiflerini öner.\n`
    : '';

  const prompt = `
Sen uzman bir seyahat danışmanısın. Kullanıcı ${destination} şehrinde ${allDayPlans.length} günlük bir gezi yapıyor.
${allDayPlans.length > 1 ? `Toplam gezi planı ${allDayPlans.length} günden oluşuyor; bu istek Gün ${dayPlan.dayNumber}'ı yeniden oluşturmak için.` : ''}
Aşağıdaki 1 günlük seyahat planını "${vibeMap[vibeId] || vibeId}" moduna göre tamamen yeniden yaz.
${visitedBlock}
KURAL 1: Mekanları yeni moda uygun olarak tamamen değiştir.
KURAL 2: MUST-SEE / İKONİK SİMGELER ÖNCELİĞİ: Eğer o şehirde dünyaca ünlü ikonik bir simge varsa, daha önce ziyaret edilmemişse ve moda uygunsa mutlaka ekle. Bütçe yetmiyorsa dışarıdan fotoğraf molası olarak ekle (0€). ${cityMustSee}
KURAL 3: GERÇEKÇİ MALİYETLER: Aktivite maliyetlerini mantıklı belirle.
KURAL 4: OTEL VE KONAKLAMA EKLENEMEZ! Plan içine "Otele dönüş", "Dinlenme", "Otelden çıkış" gibi maddeler ASLA EKLEME.
KURAL 5: ULAŞIM EKLENEMEZ! Günlük planın (activities) içine ASLA "Taksi Transferi", "Yürüyüş", "Metro" gibi yolculuk adımları ekleme.
KURAL 6: BAĞLAMSIZ AÇIKLAMALAR ZORUNLU! Aktivite açıklamalarında ASLA bir önceki veya bir sonraki mekana atıfta bulunma.
KURAL 7: ESNEK ZAMANLAMA VE AKTİVİTE SAYISI (KRİTİK):
${getFlexiblePeriodSchedulingRule(arrivalDate, arrivalTime, departureDate, departureTime)}
${dayPlan.date !== departureDate ? '- Normal günlerde 3 öğün şarttır. Sandviççiler, fırınlar, sokak lezzetleri ekle.' : '- Bu dönüş günüdür; dönüş saatine göre kaç aktivite sığıyorsa o kadar ekle, 3 öğün zorunluluğu yok.'}
KURAL 8: Koordinatlar (Lat/Lng) GERÇEĞİ yansıtmalı.
KURAL 9: SADECE JSON ÇIKTISI VER. Mevcut JSON formatının BİREBİR aynısını (tek bir DailyPlan objesi) döndür.

ÖRNEK AKTİVİTE ÇIKTISI:
{ "period": "Sabah", "placeName": "Eyfel Kulesi", "description": "Demir leydinin ihtişamı...", "coordinates": { "lat": 48.8584, "lng": 2.2945 }, "estimatedCost": 28 }

MEVCUT PLAN (bu günün mevcut versiyonu — tamamen değiştirilecek):
${JSON.stringify(dayPlan, null, 2)}
`;

  try {
    const textResult = await executeWithFallback(prompt);
    const newDayPlan = extractAndParseJSON<DailyPlan>(textResult);

    const activities = optimizeActivitiesForDay(
      newDayPlan.activities,
      dayPlan.date,
      arrivalDate,
      arrivalTime,
      departureDate,
      departureTime,
    );
    const dayCost = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);

    const resultDay: DailyPlan = {
      ...newDayPlan,
      dayNumber: dayPlan.dayNumber,
      date: dayPlan.date,
      activities,
      totalEstimatedCost: dayCost,
    };

    validateDayCoordinatesInBackground(resultDay, destination, onDayUpdate);

    return resultDay;
  } catch (error: unknown) {
    const errMsg = (error as Error).message || 'Bilinmeyen bir hata oluştu.';
    throw new Error(getFriendlyError(errMsg));
  }
};
