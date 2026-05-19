import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OnboardingData } from "../store/useOnboardingStore";
import { optimizeRouteTSP } from "../utils/geoOptimization";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- YARDIMCI FONKSİYONLAR (HELPERS) ---

const getFriendlyError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes('429')) return 'Sunucu şu an yoğun, 1 dakika sonra tekrar deneyin.';
  if (m.includes('503') || m.includes('overloaded')) {
    return 'Yapay zeka sunucusu meşgul, lütfen tekrar deneyin.';
  }
  if (m.includes('api') && m.includes('key')) return 'Servis yapılandırma hatası.';
  if (m.includes('json parse')) {
    return 'Plan verisi işlenemedi, lütfen tekrar deneyin.';
  }
  return 'Plan oluşturulamadı, lütfen tekrar deneyin.';
};

const executeWithFallback = async (prompt: string): Promise<string> => {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[AI] ${modelName} deneniyor (Deneme ${attempt + 1}/3)...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        console.log(`[AI] ✅ ${modelName} başarılı!`);
        return result.response.text();
      } catch (err: unknown) {
        const error = err as Error;
        const msg = error.message.toLowerCase();
        console.warn(`[AI] ❌ ${modelName} (Deneme ${attempt + 1}) başarısız: ${error.message}`);
        lastError = error;

        // Kritik hatalarda veya JSON çözülemediğinde boşuna tekrar deneme yapıp zaman kaybetme
        if (msg.includes('400') || msg.includes('401') || msg.includes('403') || msg.includes('invalid_api_key') || msg.includes('json parse')) {
          throw error;
        }

        if (msg.includes('503') || msg.includes('429') || msg.includes('overloaded')) {
          const waitMs = (attempt + 1) * 4000; // 4s, 8s, 12s
          console.log(`[AI] ⏳ ${waitMs / 1000}s bekleniyor...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          break; // Bilinmeyen başka bir hataysa döngüyü kır
        }
      }
    }
  }
  throw lastError;
};

// Kırılmaz (Fragile-Free) JSON Ayrıştırıcı
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
    console.error("JSON parse hatası. Ham metin:", rawText);
    throw new Error("Yapay zeka geçerli bir veri formatı döndüremedi. (JSON Parse Error)");
  }
};

// TSP ve Zaman (Period) Senkronizasyonu
const PERIOD_ORDER = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'];

const getStartPeriodIndex = (
  dayDate: string,
  arrivalDate: string,
  arrivalTime: string,
  _departureDate: string,
  _departureTime: string
): number => {
  if (dayDate === arrivalDate && arrivalTime) {
    const hour = parseInt(arrivalTime.split(':')[0]);
    if (hour < 9) return 0; // Sabah
    if (hour < 12) return 1; // Öğle
    if (hour < 17) return 2; // Öğleden Sonra
    if (hour < 21) return 3; // Akşam
    return 4; // Gece
  }
  return 0; // Normal gün ve dönüş günü sabahtan başlar
};

const reassignPeriods = (
  activities: DailyActivity[],
  dayDate: string,
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  departureTime: string
): DailyActivity[] => {
  const startIndex = getStartPeriodIndex(
    dayDate,
    arrivalDate,
    arrivalTime,
    departureDate,
    departureTime
  );
  return activities.map((act, i) => ({
    ...act,
    period: PERIOD_ORDER[Math.min(startIndex + i, PERIOD_ORDER.length - 1)],
  }));
};

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'TravelPlannerApp/1.0';
const NOMINATIM_REQUEST_DELAY_MS = 1100;

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name?: string;
}

const nominatimDelay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const searchNominatimQuery = async (
  query: string
): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(
        `[Geocoding] Nominatim HTTP ${response.status} — sorgu: "${query}"`
      );
      return null;
    }

    const results = (await response.json()) as NominatimSearchResult[];

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const firstResult = results[0];
    const lat = parseFloat(firstResult.lat);
    const lng = parseFloat(firstResult.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn(`[Geocoding] Geçersiz koordinat döndü: "${query}"`);
      return null;
    }

    return { lat, lng };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Geocoding] İstek başarısız ("${query}"): ${message}`);
    return null;
  }
};

const fetchNominatimCoordinates = async (
  placeName: string,
  destination: string
): Promise<{ lat: number; lng: number } | null> => {
  const trimmedPlace = placeName.trim();
  const trimmedDestination = destination.trim();

  if (!trimmedPlace) {
    return null;
  }

  const queries: string[] = [];

  if (trimmedDestination) {
    queries.push(`${trimmedPlace}, ${trimmedDestination}`);
  }
  queries.push(trimmedPlace);

  const uniqueQueries = [...new Set(queries.filter((q) => q.length > 0))];

  let isFirstQuery = true;

  for (const query of uniqueQueries) {
    if (!isFirstQuery) {
      await nominatimDelay(NOMINATIM_REQUEST_DELAY_MS);
    }
    isFirstQuery = false;

    const coordinates = await searchNominatimQuery(query);

    if (coordinates) {
      console.log(
        `[Geocoding] ✅ "${query}" → ${coordinates.lat}, ${coordinates.lng}`
      );
      return coordinates;
    }

    console.warn(`[Geocoding] Sonuç bulunamadı: "${query}"`);
  }

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
  let isFirstRequest = true;

  for (const activity of activities) {
    if (!isFirstRequest) {
      await nominatimDelay(NOMINATIM_REQUEST_DELAY_MS);
    }
    isFirstRequest = false;

    try {
      const verifiedCoordinates = await fetchNominatimCoordinates(
        activity.placeName,
        trimmedDestination
      );

      if (verifiedCoordinates) {
        validatedActivities.push({
          ...activity,
          coordinates: {
            lat: verifiedCoordinates.lat,
            lng: verifiedCoordinates.lng,
          },
        });
        console.log(
          `[Geocoding] ✅ ${activity.placeName} → ${verifiedCoordinates.lat}, ${verifiedCoordinates.lng}`
        );
      } else {
        validatedActivities.push(activity);
        console.log(
          `[Geocoding] ⚠️ Orijinal koordinat korundu: ${activity.placeName}`
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Geocoding] Aktivite atlandı, orijinal koordinat korundu (${activity.placeName}): ${message}`
      );
      validatedActivities.push(activity);
    }
  }

  return validatedActivities;
};

const validateDayCoordinatesInBackground = (
  day: DailyPlan,
  destination: string,
  onDayUpdate: (day: DailyPlan) => void
): void => {
  void (async () => {
    try {
      const trimmedDestination = destination.trim();
      if (!trimmedDestination || day.activities.length === 0) {
        return;
      }

      console.log(
        `[Geocoding] Gün ${day.dayNumber} için arka plan koordinat doğrulaması başladı...`
      );

      const activities = await validateCoordinates(day.activities, trimmedDestination);
      const dayCost = activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );

      onDayUpdate({
        ...day,
        activities,
        totalEstimatedCost: dayCost,
      });

      console.log(
        `[Geocoding] Gün ${day.dayNumber} arka plan koordinat doğrulaması tamamlandı.`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Geocoding] Gün ${day.dayNumber} arka plan doğrulama başarısız, orijinal koordinatlar korunuyor: ${message}`
      );
    }
  })();
};

export const validateAllCoordinatesInBackground = (
  plan: TravelPlanResponse,
  onPlanUpdate: (plan: TravelPlanResponse) => void
): void => {
  void (async () => {
    try {
      const destination = plan.destination.trim() || plan.destination;

      if (!destination || plan.dailyPlans.length === 0) {
        return;
      }

      console.log('[Geocoding] Arka plan koordinat doğrulaması başladı...');

      const updatedDailyPlans: DailyPlan[] = [];

      for (let dayIndex = 0; dayIndex < plan.dailyPlans.length; dayIndex++) {
        const day = plan.dailyPlans[dayIndex];
        const activities = await validateCoordinates(day.activities, destination);
        const dayCost = activities.reduce(
          (sum, act) => sum + (act.estimatedCost || 0),
          0
        );

        updatedDailyPlans.push({
          ...day,
          activities,
          totalEstimatedCost: dayCost,
        });

        const partialDailyPlans = [
          ...updatedDailyPlans,
          ...plan.dailyPlans.slice(dayIndex + 1),
        ];
        const partialTotalCost = partialDailyPlans.reduce(
          (sum, d) => sum + d.totalEstimatedCost,
          0
        );

        onPlanUpdate({
          ...plan,
          dailyPlans: partialDailyPlans,
          totalEstimatedCost: partialTotalCost,
        });
      }

      const finalTotalCost = updatedDailyPlans.reduce(
        (sum, d) => sum + d.totalEstimatedCost,
        0
      );

      onPlanUpdate({
        ...plan,
        dailyPlans: updatedDailyPlans,
        totalEstimatedCost: finalTotalCost,
      });

      console.log('[Geocoding] Arka plan koordinat doğrulaması tamamlandı.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Geocoding] Arka plan doğrulama başarısız, orijinal plan korunuyor: ${message}`
      );
    }
  })();
};

const CITY_MAP: Array<{ keywords: string[]; context: string }> = [
  {
    keywords: ['floransa', 'florence', 'firenze'],
    context:
      'Floransa için: Uffizi Galerisi, Duomo, Ponte Vecchio, Piazzale Michelangelo kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['milano', 'milan'],
    context:
      'Milano için: Duomo, Galleria Vittorio Emanuele, Son Akşam Yemeği, Brera kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['roma', 'rome', 'rom '],
    context:
      'Roma için: Kolezyum, Trevi Çeşmesi (Aşk Çeşmesi), Pantheon, Vatikan kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['paris'],
    context:
      'Paris için: Eyfel Kulesi, Louvre Müzesi, Notre Dame, Montmartre kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['istanbul'],
    context:
      'İstanbul için: Ayasofya, Sultanahmet Camii, Topkapı Sarayı, Kapalıçarşı, Boğaz Turu kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['londra', 'london'],
    context:
      'Londra için: Big Ben, London Eye, Tower Bridge, British Museum kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['tokyo', 'tokio'],
    context:
      'Tokyo için: Senso-ji, Shibuya Crossing, Fushimi Inari, teamLab kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['barcelona'],
    context:
      'Barcelona için: Sagrada Familia, Park Güell, La Boqueria, Gothic Quarter kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['new york', 'nyc', 'manhattan'],
    context:
      'New York için: Central Park, Met Museum, Brooklyn Bridge, Times Square kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['dubai'],
    context:
      'Dubai için: Burj Khalifa, Dubai Mall, Gold Souk, Desert Safari kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['amsterdam'],
    context:
      'Amsterdam için: Rijksmuseum, Anne Frank Huis, Canal Tour, Van Gogh Museum kesinlikle dahil edilmelidir.',
  },
  {
    keywords: ['prag', 'prague', 'praha'],
    context:
      'Prag için: Charles Bridge, Old Town Square, Prague Castle, Kafka Museum kesinlikle dahil edilmelidir.',
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
DÖNÜŞ GÜNÜ (${departureDate}, saat ${departureTime}):
- Ayrılış 08:00'den önce → O günü plana EKLEME
- Ayrılış 08:00–11:59 → "Sabah" 1 aktivite max (kahvaltı)
- Ayrılış 12:00–15:59 → "Sabah" 2 aktivite
- Ayrılış 16:00 ve sonrası → "Sabah" + "Öğle" 3 aktivite
NORMAL GÜNLER: "Sabah"tan başla, tam 5-6 aktivite üret.`;

// Şehirlere Özel İçerik (Must-See Context)
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

// --- ANA SERVİSLER ---

export const generateTravelPlan = async (
  data: OnboardingData,
  onPlanUpdate: (plan: TravelPlanResponse) => void
): Promise<TravelPlanResponse> => {
  if (!apiKey) throw new Error(getFriendlyError('invalid_api_key'));

  const cityMustSee = getCityContext(data.destination);
  const perPersonBudget = Math.round(data.budget / Math.max(data.peopleCount, 1));
  const mealBudgetLabels: Record<string, string> = {
    low: 'Düşük ($) — sokak lezzetleri, ekonomik mekanlar',
    medium: 'Orta ($$) — dengeli restoranlar',
    high: 'Yüksek ($$$) — fine dining ve özel mekanlar',
  };
  const mealBudgetLabel = mealBudgetLabels[data.mealBudget] || data.mealBudget || 'Belirtilmedi';

  const prompt = `
[PERSONA & GÖREV]
Sen dünya çapında ödüllü, lüks ve butik seyahatler tasarlayan elit bir seyahat danışmanı yapay zekasısın. 
Amacın kullanıcılara unutulmaz, dengeli ve kültürel olarak zengin bir seyahat deneyimi tasarlamaktır.
Sıradan turist tuzakları yerine aralara yerel halkın bildiği gizli kalmış mekanları (hidden gems) da mantıklı bir coğrafi sırayla yedirmelisin. Sadece rastgele kafeler önerme.

UYARI: Çıktı sadece ve sadece geçerli bir JSON olmalıdır. Markdown veya açıklayıcı metin İÇERMEMELİDİR.

KULLANICI PROFİLİ:
- Destinasyon: ${data.destination}
- Tarihler: ${data.startDate} ile ${data.endDate}
- Varış: ${data.startDate} (Saat: ${data.arrivalTime})
- Dönüş: ${data.endDate} (Saat: ${data.departureTime})
- Toplam Bütçe: ${data.budget} ${data.currencyCode}
- Kişi Sayısı: ${data.peopleCount} kişi
- Kişi Başı Bütçe: ${perPersonBudget} ${data.currencyCode}
- Seyahat Amacı: ${data.tripPurpose}
- Temposu: ${data.pace}
- Erken Kalkma: ${data.earlyBird ? "Evet, erken kalkabilir" : "Hayır, uykusunu almalı"}
- Beslenme Kısıtlamaları: ${data.dietaryRestrictions.join(', ') || "Yok"}
- Öğün Başı Bütçe Tercihi: ${mealBudgetLabel}
- Konaklama Tercihi: ${data.accommodation || "Belirtilmedi"}
- Şehir İçi Ulaşım: ${data.transport}

KURALLAR:
1. MUST-SEE / İKONİK SİMGELER ÖNCELİĞİ (ÇOK KRİTİK): ${cityMustSee} Kullanıcının tatili kaç gün olursa olsun, bu ikonik simgeleri atlayıp sadece yerel/gizli mekanlardan oluşan bir plan YAPAMAZSIN. Eğer kullanıcının bütçesi bu ikonik mekanlara çıkmaya yetmiyorsa bile, mekanı listeye ekle ve açıklamasında "Dışarıdan izleme/Fotoğraf molası - €0" olarak belirt. Şehrin imza mekanlarını plana koymamak KABUL EDİLEMEZ.
2. GERÇEKÇİ MALİYETLER: Aktivite maliyetlerini ${data.peopleCount} kişilik grup için gerçekçi hesapla (bilet, yemek vb. toplam grup maliyeti). Toplam plan bütçesi ${data.budget} ${data.currencyCode} ve kişi başı ~${perPersonBudget} ${data.currencyCode} sınırına uy. Öğün başı bütçe tercihine (${mealBudgetLabel}) göre restoran seç.
3. OTEL VE KONAKLAMA KISITLAMASI (KRİTİK): Kullanıcının otel/konaklama konumu bilinmemektedir. Bu yüzden GÜNLÜK PLANA (activities) ASLA "Otele dönüş", "Otelde dinlenme", "Otelden çıkış" gibi maddeler EKLEME. Tüm aktiviteler gerçek, ziyaret edilebilir POI (Point of Interest - Müze, Restoran, Park vb.) olmalıdır.
4. BAĞLAMSIZ AÇIKLAMA METİNLERİ (ZORUNLU): Aktivite açıklamalarını (description) yazarken ASLA bir önceki veya bir sonraki mekana atıfta bulunma. (Örn: "Eyfel'den sonra buraya geçin" YAZMA!). Çünkü mekanların sırası daha sonra algoritmik olarak değiştirilecektir. Sadece o anki mekanın güzelliğini, ne yenileceğini veya ne yapılacağını bağımsız bir şekilde anlat. Uzman tur rehberi gibi samimi, "insider tips" (tüyolar) veren cümleler kur.
5. ULAŞIM KISITI (TEKRAR KRİTİK): Günlük planın (activities) içine ASLA "Taksi Transferi", "Metro Yolculuğu", "Yürüyüş" gibi ulaşım eylemlerini bir koordinat/mekan gibi ekleme. Aktiviteler sadece varış noktaları olmalıdır. Şehir içi ulaşım biletleri, metro kartları, günlük pass'ler veya genel ulaşım tavsiyeleri ASLA plana koordinatlı bir mekan olarak girmemeli; bu bilgiler sadece "cityGuide" objesinde kalmalıdır. Haritaya ulaşım aracı iğneleme!
6. BİYOLOJİK İHTİYAÇLAR: Günde 3 öğün yemek ZORUNLUDUR. Fırınlar, kafeler veya lüks restoranlar ile öğünleri mutlaka belirle.
7. KESİNTİSİZ GÜN: Günler (varış/dönüş hariç) en az 5-6 aktivite olmalı. Gün içinde büyük boşluklar bırakma.
8. KOORDİNAT DOĞRULUĞU: Lat/Lng koordinatları GERÇEK DÜNYA verileriyle eşleşmeli. Kara yapılarını denizin ortasına koyma.
9. ESNEK ZAMANLAMA VE AKTİVİTE SAYISI KURALI (KRİTİK):
${getFlexiblePeriodSchedulingRule(data.startDate, data.arrivalTime, data.endDate, data.departureTime)}
10. ŞEHİR REHBERİ (CITY GUIDE): Seyahat edilen şehirle ilgili ulaşım tüyoları, yerel adetler ve genel faydalı bilgiler içeren doyurucu bir rehber hazırla.

ÖRNEK AKTİVİTE ÇIKTISI (BİREBİR UYULACAK): 
{ "period": "Sabah", "placeName": "Eyfel Kulesi", "description": "Demir leydinin ihtişamı...", "coordinates": { "lat": 48.8584, "lng": 2.2945 }, "estimatedCost": 28 }

BEKLENEN JSON YAPISI:
{
  "destination": "Şehrin Tam Adı",
  "overallSummary": "2-3 cümlelik motive edici şık özet",
  "totalEstimatedCost": 1500,
  "currencySymbol": "${data.currencySymbol}",
  "cityGuide": {
    "transportationTips": "Paris'te metro ağı en hızılı ulaşım aracıdır. Günlük 'Navigo' kartı alarak tasarruf edebilirsiniz (14€).",
    "localCustoms": "Restoranlarda bahşiş hesaba dahildir ancak küçük bir üstü bırakmak nezakettir. 'Bonjour' demeden söze başlamayın.",
    "generalAdvice": "Çeşme suyu içilebilir ve temizdir. Montmartre bölgesinde yankesiciliğe karşı dikkatli olun."
  },
  "dailyPlans": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "daySummary": "Bugünün teması",
      "totalEstimatedCost": 150,
      "activities": [
        {
          "period": "Sabah",
          "placeName": "Gerçek Mekan Adı",
          "description": "Rehber tadında detaylı açıklama.",
          "coordinates": { "lat": 41.9028, "lng": 12.4964 },
          "estimatedCost": 25
        }
      ]
    }
  ]
}
`;

  try {
    const textResult = await executeWithFallback(prompt);
    const parsedData = extractAndParseJSON<TravelPlanResponse>(textResult);

    // Matematiksel Güvenlik Katmanı: Yapay zekanın maliyet verisine güvenme, yeniden hesapla.
    let finalTotalCost = 0;
    
    const processedDailyPlans: DailyPlan[] = [];

    for (const day of parsedData.dailyPlans) {
      // 1. Koordinatları optimize et (Mesafe bazlı sırala)
      let activities = optimizeRouteTSP(day.activities);

      // 2. Sıralanmış verilere periyotları (Sabah, Öğle vb.) mantıklı şekilde tekrar dağıt
      activities = reassignPeriods(
        activities,
        day.date,
        data.startDate,
        data.arrivalTime,
        data.endDate,
        data.departureTime
      );

      // 3. Günlük maliyeti hesapla (geocoding arka planda yapılır)
      const dayCost = activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
      finalTotalCost += dayCost;

      processedDailyPlans.push({
        ...day,
        activities,
        totalEstimatedCost: dayCost,
      });
    }

    parsedData.dailyPlans = processedDailyPlans;

    // Toplam plan maliyetini ez (override)
    parsedData.totalEstimatedCost = finalTotalCost;

    validateAllCoordinatesInBackground(parsedData, onPlanUpdate);

    return parsedData;
  } catch (error: unknown) {
    const errMsg = (error as Error).message || 'Bilinmeyen bir hata oluştu.';
    throw new Error(getFriendlyError(errMsg));
  }
};

export const regenerateDayWithVibe = async (
  dayPlan: DailyPlan,
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
    'rest': '😴 Dinlenme Modu (Yorucu olmayan kafeler, parklar, spa, yavaş tempo)',
    'indoor': '🌧️ Hava/Kapalı Alan Modu (Müzeler, kapalı çarşılar, sergiler, restoranlar)',
    'budget': '💰 Tasarruf Modu (Çok ucuz veya ücretsiz aktiviteler, sokak lezzetleri)',
    'explore': '🎉 Keşif Modu (Macera, trekking, sokakları arşınlama, yoğun tempo)'
  };

  const cityMustSee = getCityContext(destination);

  const prompt = `
Sen uzman bir seyahat danışmanısın. Kullanıcı ${destination} şehrinde. 
Aşağıdaki 1 günlük seyahat planını "${vibeMap[vibeId] || vibeId}" moduna göre tamamen yeniden yaz.

KURAL 1: Mekanları yeni moda uygun olarak tamamen değiştir.
KURAL 2: MUST-SEE / İKONİK SİMGELER ÖNCELİĞİ (ÇOK KRİTİK): Eğer o şehirde dünyaca ünlü ikonik bir simge varsa ve plana uygunsa mutlaka ekle. Bütçe yetmiyorsa dışarıdan fotoğraf molası olarak ekle (0€). ${cityMustSee}
KURAL 3: GERÇEKÇİ MALİYETLER: Aktivite maliyetlerini mantıklı belirle.
KURAL 4: OTEL VE KONAKLAMA EKLENEMEZ! Plan içine "Otele dönüş", "Dinlenme", "Otelden çıkış" gibi maddeler ASLA EKLEME. Bütün maddeler gerçek POI (Point of Interest) olmalıdır.
KURAL 5: ULAŞIM EKLENEMEZ! Günlük planın (activities) içine ASLA "Taksi Transferi", "Yürüyüş", "Metro" gibi yolculuk adımları ekleme. Ulaşım araçlarını haritaya iğneleme.
KURAL 6: BAĞLAMSIZ AÇIKLAMALAR ZORUNLU! Aktivite açıklamalarında ASLA bir önceki veya bir sonraki mekana atıfta bulunma. Sıralamalar algoritmik olarak değişecektir. Sadece o anki mekanı anlat.
KURAL 7: ESNEK ZAMANLAMA VE AKTİVİTE SAYISI (KRİTİK):
${getFlexiblePeriodSchedulingRule(arrivalDate, arrivalTime, departureDate, departureTime)}
- Günde 3 öğün şarttır. Sandviççiler, fırınlar, sokak lezzetleri ekle.
KURAL 8: Koordinatlar (Lat/Lng) GERÇEĞİ yansıtmalı.
KURAL 9: SADECE JSON ÇIKTISI VER. Mevcut JSON formatının BİREBİR aynısını (tek bir DailyPlan objesi) döndür.

ÖRNEK AKTİVİTE ÇIKTISI (BİREBİR UYULACAK): 
{ "period": "Sabah", "placeName": "Eyfel Kulesi", "description": "Demir leydinin ihtişamı...", "coordinates": { "lat": 48.8584, "lng": 2.2945 }, "estimatedCost": 28 }

MEVCUT PLAN:
${JSON.stringify(dayPlan, null, 2)}
`;

  try {
    const textResult = await executeWithFallback(prompt);
    const newDayPlan = extractAndParseJSON<DailyPlan>(textResult);

    // Yeni mekanları mesafeye göre TSP ile yeniden optimize et ve periyotları senkronize et
    let activities = optimizeRouteTSP(newDayPlan.activities);
    activities = reassignPeriods(
      activities,
      dayPlan.date,
      arrivalDate,
      arrivalTime,
      departureDate,
      departureTime
    );
    // Matematiksel güvenlik
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