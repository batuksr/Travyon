# 🧭 Travyon — Yapay Zeka Destekli Seyahat Planlayıcı

Travyon; yurt dışına seyahat eden kullanıcıları önce derinlemesine tanıyan, ardından bu kişisel profile göre coğrafi olarak optimize edilmiş, tamamen kişiye özel günlük seyahat planları oluşturan bir web uygulamasıdır.

Google Maps, TripAdvisor veya Wanderlog gibi araçlar yalnızca destinasyon ve tarih bilgisiyle herkese benzer planlar üretir. Travyon ise kullanıcının tatil amacını, günlük temposunu, yeme-içme profilini ve konfor tercihlerini öğrenerek plan oluşturur ve bu planı akıllı rota optimizasyonuyla şehrin coğrafyasına göre sıralar.

> "Diğer uygulamalar destinasyon sorar. Travyon insanı tanır — sonra şehri de onun için optimize eder."

## ✨ Öne Çıkan Özellikler

- **Kişiselleştirilmiş Onboarding** — 4 kategoride (temel bilgiler, tatil amacı/tempo, yeme-içme profili, konfor/ulaşım) sorularla kullanıcı profili çıkarılır.
- **Uzlaşı Modu (Multiplayer Onboarding)** — Grup/aile seyahatlerinde her katılımcı kendi tercihlerini girer, plan tüm grubun ortak noktasına göre optimize edilir.
- **Coğrafi Rota Optimizasyonu** — Haversine formülü ile ön filtreleme, ardından greedy nearest-neighbor + 2-opt yaklaşımıyla günlük aktiviteler mantıklı bir sırada dizilir.
- **Dinamik Vibe Sistemi** — 😴 Dinlenme, 🌧️ Hava (anlık hava durumuna göre), 💰 Tasarruf ve 🎉 Keşif modlarıyla plan tek tıkla yeniden şekillenir.
- **Bütçe Takip Sistemi** — Toplam bütçe kategorilere (yemek, konaklama, aktivite, ulaşım) bölünür ve gerçek harcamalarla karşılaştırılır.
- **Topluluk & Paylaşım** — Kullanıcılar planlarını topluluğa açabilir, başka planları inceleyebilir.
- **Seyahat Kontrol Listesi, PWA desteği** — Uygulama internet bağlantısı olmadan da kullanılabilir.
- **AI Asistan Widget'ı** — Plan üzerinde AI ile aktivite ekleme/düzenleme.

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
| --- | --- |
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS, Framer Motion |
| State Yönetimi | Zustand |
| Backend / BaaS | Firebase (Auth + Firestore) |
| Yapay Zeka | Google Gemini API |
| Harita & Konum | Google Maps JavaScript API, `@react-google-maps/api` |
| Hava Durumu | Weather API entegrasyonu |
| 3D / Görsel | Three.js, `@react-three/fiber`, `@react-three/drei` |
| PWA | `vite-plugin-pwa` |

## 📁 Proje Yapısı

```
src/
├── components/   # Yeniden kullanılabilir UI bileşenleri (Sidebar, MapView, DailyPlanView, ...)
├── pages/        # Sayfalar (Home, Onboarding, Dashboard, Community, Settings, ...)
├── services/     # Dış servis entegrasyonları (aiService, firebase, placesService, weatherService, ...)
├── store/        # Zustand store'ları (auth, onboarding, plan, tema, ayarlar, ...)
├── hooks/        # Özel React hook'ları
├── utils/        # Yardımcı fonksiyonlar
├── data/         # Statik veri (şehir listesi vb.)
└── assets/       # Görseller ve statik varlıklar
```

## 🚀 Kurulum

### Gereksinimler

- Node.js 20+
- npm

### Adımlar

```bash
# Depoyu klonla
git clone https://github.com/batuksr/Travyon.git
cd Travyon

# Bağımlılıkları yükle
npm install
```

Proje kök dizininde bir `.env` dosyası oluşturup aşağıdaki değişkenleri kendi anahtarlarınla doldur:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
```

Ardından geliştirme sunucusunu başlat:

```bash
npm run dev
```

### Diğer komutlar

```bash
npm run build     # Production build (tsc -b && vite build)
npm run lint      # ESLint kontrolü
npm run preview   # Production build'i yerelde önizle
```

## 🔥 Firebase Kuralları

Firestore ve Storage güvenlik kuralları `firestore.rules` ve `storage.rules` dosyalarında tanımlıdır; `firebase.json` üzerinden deploy edilebilir:

```bash
firebase deploy --only firestore:rules,storage:rules
```

## 🔒 Gizlilik

Uygulama, kullanıcıların diyet tercihleri, fiziksel uygunlukları ve bütçeleri gibi hassas verilerini işlediği için KVKK/GDPR uyumluluğu göz önünde bulundurularak geliştirilmiştir. Detaylar için uygulama içindeki Gizlilik sayfasına bakabilirsin.

## 📄 Lisans

Bu proje bir Mühendislik Tasarımı dersi kapsamında geliştirilmiştir.
