# 🧭 Travyon — Yapay Zeka Destekli Seyahat Planlayıcı

Travyon; yurt dışına seyahat eden kullanıcıları önce derinlemesine tanıyan, ardından bu kişisel profile göre coğrafi olarak optimize edilmiş, tamamen kişiye özel günlük seyahat planları oluşturan bir web uygulamasıdır.

Google Maps, TripAdvisor veya Wanderlog gibi araçlar yalnızca destinasyon ve tarih bilgisiyle herkese benzer planlar üretir. Travyon ise kullanıcının tatil amacını, günlük temposunu, yeme-içme profilini ve konfor tercihlerini öğrenerek plan oluşturur ve bu planı akıllı rota optimizasyonuyla şehrin coğrafyasına göre sıralar.

> "Diğer uygulamalar destinasyon sorar. Travyon insanı tanır — sonra şehri de onun için optimize eder."

## ✨ Öne Çıkan Özellikler

- **Kişiselleştirilmiş Onboarding** — 4 kategoride (temel bilgiler, tatil amacı/tempo, yeme-içme profili, konfor/ulaşım) sorularla kullanıcı profili çıkarılır.
- **Coğrafi Rota Optimizasyonu** — Haversine formülü ile ön filtreleme, ardından greedy nearest-neighbor + 2-opt yaklaşımıyla günlük aktiviteler mantıklı bir sırada dizilir.
- **Dinamik Vibe Sistemi** — 😴 Dinlenme, 🌧️ Hava (anlık hava durumuna göre), 💰 Tasarruf ve 🎉 Keşif modlarıyla plan tek tıkla yeniden şekillenir.
- **Bütçe Takip Sistemi** — Toplam bütçe kategorilere (yemek, konaklama, aktivite, ulaşım) bölünür ve gerçek harcamalarla karşılaştırılır.
- **Topluluk & Paylaşım** — Kullanıcılar planlarını topluluğa açabilir, başka planları inceleyebilir.
- **Seyahat Kontrol Listesi ve PWA desteği** — Uygulama ana ekrana kurulabilir; AI ve harita işlevleri internet bağlantısı gerektirir.
- **AI Asistan Widget'ı** — Aktif plan bağlamını kullanarak Türkçe ve İngilizce seyahat sorularını yanıtlar.

> Pro ve Team paketleri beta süresince devre dışıdır. Temel plan oluşturma beta boyunca limitsizdir; ücretli paketler lansmandan önce ayrıca tamamlanıp test edilecektir.

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
| --- | --- |
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS, Framer Motion |
| State Yönetimi | Zustand |
| Backend / BaaS | Firebase (Auth, Firestore, Storage, App Check, Cloud Functions) |
| Yapay Zeka | Google Gemini API (`@google/genai`, yalnızca sunucu tarafında) |
| Harita & Konum | Google Maps JavaScript API, `@react-google-maps/api` |
| Hava Durumu | Weather API entegrasyonu |
| 3D / Görsel | Three.js, `@react-three/fiber`, `@react-three/drei` |
| PWA | `vite-plugin-pwa` |

## 📁 Proje Yapısı

```
web/                  # React web uygulaması
├── src/              # Sayfalar, bileşenler, servisler ve Zustand store'ları
├── public/           # Web fontları, videolar ve statik dosyalar
├── tests/            # Vitest web testleri
├── index.html
└── vite.config.ts

mobile/               # Flutter Android/iOS uygulaması
├── lib/               # Mobil özellikler ve Firebase veri katmanı
├── android/
├── ios/
└── test/

functions/            # Firebase Cloud Functions backend'i
scripts/              # Ortak geliştirme ve emulator komutları
firebase.json         # Firestore, Storage, Hosting ve Functions bağlantıları
firestore.rules       # Ortak veritabanı güvenlik kuralları
storage.rules         # Ortak dosya güvenlik kuralları
```

Optimize production videoları `web/public/videos/` altında sürüm kontrolüne ve derlemeye dahildir. Sıkıştırılmamış ve kullanılmayan kaynaklar `web/source-media/` altında yerel olarak tutulur; Git'e ve production derlemesine dahil edilmez.

## 🚀 Kurulum

### Gereksinimler

- Node.js 22 (Cloud Functions çalışma zamanıyla eşleşmesi önerilir)
- npm

### Adımlar

```bash
# Depoyu klonla
git clone https://github.com/batuksr/Travyon.git
cd Travyon

# Bağımlılıkları yükle
npm install
npm --prefix functions install
```

`web/.env` dosyasını oluşturup aşağıdaki değişkenleri kendi anahtarlarınla doldur:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_MAPS_API_KEY=
VITE_RECAPTCHA_SITE_KEY=
VITE_SENTRY_DSN=
```

### Çalışma modları

Ortam ayarlarını `web/.env.local` içinde elle açıp kapatmak gerekmez. Kullanılacak
Firebase ortamını doğrudan komut belirler.

#### LOCAL — günlük geliştirme

Bu modda web ve mobil aynı yerel Firestore, Functions ve Storage emülatörlerini
kullanır. Authentication gerçek Firebase üzerinde kalır; bu nedenle iki istemcide
de aynı Google/e-posta hesabıyla giriş yapılabilir.

```powershell
# Terminal 1 — yerel Firebase backend (UI: http://127.0.0.1:4000)
npm.cmd run emulators

# Terminal 2 — web (http://localhost:5173)
npm.cmd run dev

# Terminal 3 — Android uygulaması
cd mobile
flutter.bat run -d emulator-5554 --dart-define=TRAVYON_FIREBASE_MODE=local --dart-define-from-file=maps-config.local.json
```

#### CLOUD — gerçek Firebase ile kontrol

```powershell
# Web
npm.cmd run dev:cloud

# Android/iOS
cd mobile
flutter.bat run -d emulator-5554 --dart-define-from-file=maps-config.local.json
```

`npm run build` ve mağaza için alınan Flutter release derlemeleri varsayılan olarak
gerçek Firebase'i kullanır. LOCAL emülatör verileri production verilerini değiştirmez.

Windows başlangıç betiği, güncel Java gereksinimi için Android Studio ile gelen
JBR'yi otomatik olarak kullanır. AI, harita REST ve e-posta fonksiyonları yerelde
çalışırken ilgili üçüncü taraf servislerine ağ isteği göndermeye devam eder.

Callable fonksiyonlar production'da App Check doğrulaması ister. Firebase Console'da web uygulaması için reCAPTCHA v3 kaydı oluşturulmalı ve `VITE_RECAPTCHA_SITE_KEY` bu kayıtla eşleşmelidir. Yerel geliştirmede tarayıcı konsolunda üretilen App Check debug token'ını Firebase Console'a ekleyin.

Sunucu anahtarları istemci `.env` dosyasına yazılmaz; Secret Manager üzerinden ayarlanır:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GOOGLE_MAPS_SERVER_KEY
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RESEND_FROM
```

Pro ödeme akışı şimdilik `PRO_FEATURES_ENABLED=false` ile kapalıdır. Lansman öncesinde iyzico secret'ları, webhook/callback ve sandbox uçtan uca testi tamamlanmadan bu parametre açılmamalıdır.

### Diğer komutlar

```bash
npm run build     # Production build (tsc -b && vite build)
npm run lint      # ESLint kontrolü
npm test          # Vitest regresyon testleri
npm run preview   # Production build'i yerelde önizle
npm --prefix functions run build
```

## 🔥 Firebase Kuralları

Firestore ve Storage güvenlik kuralları `firestore.rules` ve `storage.rules` dosyalarında tanımlıdır; `firebase.json` üzerinden deploy edilebilir:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 🔒 Gizlilik

Uygulama, kullanıcıların diyet tercihleri, fiziksel uygunlukları ve bütçeleri gibi hassas verilerini işlediği için KVKK/GDPR uyumluluğu göz önünde bulundurularak geliştirilmiştir. Detaylar için uygulama içindeki Gizlilik sayfasına bakabilirsin.

## 📄 Lisans

Bu proje bir Mühendislik Tasarımı dersi kapsamında geliştirilmiştir.
