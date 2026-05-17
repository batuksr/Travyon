import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OnboardingData } from "../store/useOnboardingStore";
import { optimizeRouteTSP } from "../utils/geoOptimization";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- YARDIMCI FONKSİYONLAR (HELPERS) ---

const executeWithFallback = async (prompt: string): Promise<string> => {
  const models = ["gemini-2.5-flash"];
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
        console.warn(`[AI] ❌ ${modelName} (Deneme ${attempt + 1}) başarısız: ${error.message}`);
        lastError = error;

        if (error.message.includes('503') || error.message.includes('429') || error.message.includes('overloaded')) {
          const waitMs = (attempt + 1) * 4000; // 4s, 8s, 12s
          console.log(`[AI] ⏳ ${waitMs / 1000}s bekleniyor...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
};

// DRY Prensibi: JSON çıkarma işlemini tek bir fonksiyonda topladık
const extractAndParseJSON = <T>(rawText: string): T => {
  let extractedJson = rawText;
  try {
    extractedJson = extractedJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstCurly = extractedJson.indexOf('{');
    if (firstCurly !== -1) {
      extractedJson = extractedJson.substring(firstCurly);
      let openBraces = 0;
      for (let i = 0; i < extractedJson.length; i++) {
        if (extractedJson[i] === '{') openBraces++;
        if (extractedJson[i] === '}') {
          openBraces--;
          if (openBraces === 0) {
            extractedJson = extractedJson.substring(0, i + 1);
            break;
          }
        }
      }
    }
    return JSON.parse(extractedJson) as T;
  } catch (e) {
    console.error("JSON parse hatası. Ham metin:", rawText);
    throw new Error("Yapay zeka geçerli bir veri formatı döndüremedi.");
  }
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

export const generateTravelPlan = async (data: OnboardingData): Promise<TravelPlanResponse> => {
  if (!apiKey) throw new Error("API Anahtarı bulunamadı. Lütfen .env dosyanızı kontrol edin.");

  const prompt = `
[PERSONA & GÖREV]
Sen dünya çapında ödüllü, lüks ve butik seyahatler tasarlayan elit bir seyahat danışmanı yapay zekasısın. 
Amacın kullanıcılara unutulmaz, dengeli ve kültürel olarak zengin bir seyahat deneyimi tasarlamaktır.
Eğer kullanıcı Paris, Roma, Londra, İstanbul gibi turistik değeri yüksek büyük şehirlere gidiyorsa, plana KESİNLİKLE o şehrin "Must-See" ikonik simgelerini eklemelisin.
Sıradan turist tuzakları yerine aralara yerel halkın bildiği gizli kalmış mekanları (hidden gems) da mantıklı bir coğrafi sırayla yedirmelisin. Sadece rastgele kafeler önerme.

UYARI: Çıktı sadece ve sadece geçerli bir JSON olmalıdır. Markdown veya açıklayıcı metin İÇERMEMELİDİR.

KULLANICI PROFİLİ:
- Destinasyon: ${data.destination}
- Tarihler: ${data.startDate} ile ${data.endDate}
- Varış: ${data.startDate} (Saat: ${data.arrivalTime})
- Dönüş: ${data.endDate} (Saat: ${data.departureTime})
- Toplam Bütçe: ${data.budget} ${data.currencyCode}
- Seyahat Amacı: ${data.tripPurpose}
- Temposu: ${data.pace} (Buna KESİN uyulmalı!)
- Erken Kalkma: ${data.earlyBird ? "Evet, erken kalkabilir" : "Hayır, uykusunu almalı"}
- Beslenme Kısıtlamaları: ${data.dietaryRestrictions.join(', ') || "Yok"}
- Şehir İçi Ulaşım: ${data.transport}

KURALLAR:
1. BÜTÇE KONTROLÜ & MAKSİMİZASYONU (KRİTİK): Kullanıcının verdiği toplam bütçeyi (${data.budget} ${data.currencyCode}) sadece bir üst sınır olarak değil, ulaşılması gereken bir HEDEF olarak gör. Kullanıcı bu parayı harcamak istiyor! Eğer bütçede büyük bir boşluk kalıyorsa, plana ucuz sokak lezzetleri yerine 'Fine Dining' (Lüks) restoranlar, ücretsiz parklar yerine ücretli 'Özel Müzeler / Tekne Turları / Rehberli Aktiviteler' ekleyerek bütçenin en az %90 - %95'ini dolu dolu kullan. Kullanıcıya ayırdığı bütçenin karşılığını en premium şekilde ver, parayı cebinde bırakmaya çalışma. (Ancak yine de toplam limiti 1 Euro bile ASLA aşma!) Maliyet hesabını tamamen ${data.currencyCode} (${data.currencySymbol}) birimi üzerinden kurgula.
2. BİYOLOJİK İHTİYAÇLAR: Tasarruf Modunda bile günde 3 öğün yemek ZORUNLUDUR. Bütçeyi düşürmek için fırınlar, sokak lezzetleri veya dilim pizzacılar öner. Ancak Bütçe Maksimizasyonu kuralı önceliklidir; bütçe varsa lüks yemekler tercih et.
3. KESİNTİSİZ GÜN: Günler (varış/dönüş hariç) en az 5-6 aktivite olmalı. Gün içinde büyük boşluklar bırakma.
4. KOORDİNAT DOĞRULUĞU: Lat/Lng koordinatları GERÇEK DÜNYA verileriyle eşleşmeli. Kara yapılarını denizin ortasına koyma.
5. ZENGİN AÇIKLAMALAR: Uzman tur rehberi gibi samimi, "insider tips" (tüyolar) veren cümleler kur.
6. ESNEK ZAMANLAMA (PERIODS): Kullanıcıları strese sokacak kesin saatler (Örn: 14:30) ASLA kullanma.
   - Bunun yerine şu periyotları kullan: 'Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'.
   - Varış/Ayrılış saatlerine KESİN uy: Eğer varış saati (${data.arrivalTime}) 14:00 ise, o gün için "Sabah" veya "Öğle" periyodu üretme, planı "Öğleden Sonra"dan başlat.
   - Eğer ayrılış saati (${data.departureTime}) 12:00 ise, o gün için "Öğle" ve sonrasını üretme.
7. SIRALAMA: Aktiviteleri gün içine mantıklı bir sırayla diz. (Örn: Sabah -> Öğle -> Akşam).
8. ULAŞIM KURALI (KRİTİK): Şehir içi ulaşım biletleri, metro kartları, günlük pass'ler veya genel ulaşım tavsiyelerini ASLA "activities" (günlük plan) içine koordinatlı bir mekan olarak ekleme! Bu bilgiler sadece "cityGuide" objesinde yer almalıdır. Haritaya ulaşım aracı iğneleme.
9. ŞEHİR REHBERİ (CITY GUIDE): Seyahat edilen şehirle ilgili ulaşım tüyoları (transportationTips), yerel adetler ve bahşiş kültürü (localCustoms) ve genel faydalı bilgiler (generalAdvice) içeren doyurucu ve uzman bir rehber hazırla.

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

    // Her bir gün için TSP rotasını optimize et
    parsedData.dailyPlans = parsedData.dailyPlans.map(day => ({
      ...day,
      activities: optimizeRouteTSP(day.activities)
    }));

    return parsedData;
  } catch (error: unknown) {
    const errMsg = (error as Error).message || "Bilinmeyen bir hata oluştu.";
    throw new Error("Yapay Zeka API Hatası: " + errMsg);
  }
};

export const regenerateDayWithVibe = async (dayPlan: DailyPlan, destination: string, vibeId: string): Promise<DailyPlan> => {
  if (!apiKey) throw new Error("API Anahtarı bulunamadı.");

  const vibeMap: Record<string, string> = {
    'rest': '😴 Dinlenme Modu (Yorucu olmayan kafeler, parklar, spa, yavaş tempo)',
    'indoor': '🌧️ Hava/Kapalı Alan Modu (Müzeler, kapalı çarşılar, sergiler, restoranlar)',
    'budget': '💰 Tasarruf Modu (Çok ucuz veya ücretsiz aktiviteler, sokak lezzetleri)',
    'explore': '🎉 Keşif Modu (Macera, trekking, sokakları arşınlama, yoğun tempo)'
  };

  const prompt = `
Sen uzman bir seyahat danışmanısın. Kullanıcı ${destination} şehrinde. 
Aşağıdaki 1 günlük seyahat planını "${vibeMap[vibeId] || vibeId}" moduna göre tamamen yeniden yaz.

KURAL 1: Mekanları yeni moda uygun olarak tamamen değiştir.
KURAL 2: ESNEK PERİYOTLARA UY!
  - Kesin saatler kullanma. Sadece 'Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece' periyotlarını kullan.
  - Tasarruf modunda bile günde 3 öğün şarttır. Sandviççiler, fırınlar, sokak lezzetleri ekle.
KURAL 3: Koordinatlar (Lat/Lng) GERÇEĞİ yansıtmalı.
KURAL 4: Plan en az 5-6 aktiviteden oluşacak, günü boş bırakma.
KURAL 5: Mekanları sabahtan geceye doğru KRONOLOJİK mantıklı bir sırayla diz (Sabah -> Öğle -> Akşam vb.).
KURAL 6: SADECE JSON ÇIKTISI VER. Mevcut JSON formatının BİREBİR aynısını (tek bir DailyPlan objesi) döndür.

MEVCUT PLAN:
${JSON.stringify(dayPlan, null, 2)}
`;

  try {
    const textResult = await executeWithFallback(prompt);
    const newDayPlan = extractAndParseJSON<DailyPlan>(textResult);

    // Yeni mekanları mesafeye göre TSP ile yeniden optimize et
    newDayPlan.activities = optimizeRouteTSP(newDayPlan.activities);

    return newDayPlan;
  } catch (error: unknown) {
    const errMsg = (error as Error).message || "Bilinmeyen bir hata oluştu.";
    throw new Error("AI Vibe Değişimi Hatası: " + errMsg);
  }
};