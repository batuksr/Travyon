# Güvenlik sıkılaştırması — 13 Eylül 2026

13 Eylül 2026 tarihinde kullanıcı onayıyla aşağıdaki sunucu düzeltmeleri
`travyon-5fb01` projesine yayınlandı. Anahtar yenilemesi yapılmadı;
web/mobil istemci değişiklikleri henüz ayrı bir sürüm olarak dağıtılmadı.

## Canlı yayın ve kontrol sonucu

- `updatePrivacySettings` ve `sharePublicPlan`: `europe-west1` bölgesinde
  13:52 (Türkiye saati) itibarıyla yeni sürümleri `ACTIVE`.
- Storage kuralları 13:51'de yayınlandı; canlı ruleset içeriğinin yerel
  `storage.rules` ile eşleştiği ayrıca doğrulandı.
- `MOBILE_PUSH_ENABLED=false` ve `PRO_FEATURES_ENABLED=false` korundu.
  Başka fonksiyonlar veya Hosting yayınlanmadı.
- Yayın sonrası iki fonksiyona yapılan oturumsuz, App Check tokensız boş
  istekler `401 UNAUTHENTICATED` ile reddedildi; kullanıcı verisi oluşturulmadı.
- Canlı `publicPlans` koleksiyonu: 0 belge. Yapılandırılmış
  `travyon-5fb01.firebasestorage.app` bucket'ı: 0 dosya. Bu kontrolde
  temizlenecek eski paylaşım veya tokenlı özel dosya bulunmadı.
  Yerel emülatörler, başka bucket'lar ve geçmiş yedekler bu taramaya dahil değil.
- Android Play Integrity, iOS DeviceCheck ve web reCAPTCHA App Check
  yapılandırmaları API'den okunabildi. Android production debug derlemesi,
  yalnızca test süresince kaydedilen ve sonrasında silinen debug tokenıyla
  emülatörde uçtan uca doğrulandı.
- Firebase Android/iOS/web anahtarlarında API ve uygulama kısıtlamaları var.
  Android Maps anahtarı Android uygulama ve Maps SDK ile sınırlı.
  Sunucu Maps ve Gemini anahtarları ayrı API listelerine sahip; uygulama
  kısıtlamaları yok. Anahtar değerleri okunmadı veya ekrana yazılmadı.

Kontrolü tekrar çalıştırmak için mevcut Firebase CLI oturumuyla kökte
`node scripts/audit-live-security.mjs` kullanılır. Script yalnızca okur,
kişisel içerik ve anahtar/token değerlerini raporlamaz. Tarama en fazla
1000 belge/dosya inceler; `complete` alanı kapsamın tamamlanıp tamamlanmadığını
gösterir.

## Kapsam

- Gizlilik ayarları yalnızca izin verilen boolean alanları kabul eder.
  Abonelik/kota gibi kullanıcı tarafından değiştirilemeyecek alanlar reddedilir.
- Yeni topluluk ve bağlantı paylaşımları izinli plan alanlarından oluşturulur;
  kişisel notlar, gerçek harcamalar ve tamamlanma durumu paylaşılmaz.
- Storage'da `users/{uid}/avatar.jpg` oturum açmış topluluk üyelerince okunabilir.
  Yalnızca sahibi JPEG ve 512 KB altındaki avatarı oluşturabilir/güncelleyebilir
  veya silebilir. Diğer kullanıcı dosyaları yalnızca sahibince okunabilir;
  listeleme ve henüz desteklenmeyen özel dosya yazımları kapalıdır.
- Mobil App Check, Firebase başlangıcında bildirim bayrağından bağımsız çalışır.
  Local modda kapalıdır; production bağlantısındaki debug derlemeler debug
  provider, release Android Play Integrity ve release iOS DeviceCheck kullanır.

## Test

Node bağımlılıkları kurulu, Firebase CLI ve Java 21 erişilebilirken kök dizinde:

```powershell
npm --prefix functions test
npm test
firebase emulators:exec --config firebase.storage-tests.json --project demo-travyon-security --only storage "node --test scripts/test-storage-rules.mjs"
```

Storage testi ayrı portlarda geçici bir demo emülatörü kullanır. Canlı projeye
bağlanmaz; yalnızca kendi oluşturduğu sentetik dosyaları temizler.

Mobil klasöründe:

```powershell
flutter test test/mobile_app_check_test.dart
flutter analyze
```

## Kalan doğrulamalar

1. Android emülatöründe Google yeniden giriş, plan oluşturma/paylaşma ve avatar
   yükleme akışları doğrulandı. Release öncesinde Play Integrity doğrulaması fiziksel
   Android cihazda ayrıca yapılmalı. Production debug derlemeler için gereken debug
   tokenını depoya veya paylaşılan loga koyma ve test bitince Firebase'den kaldır.
2. Bu canlı taramada eski paylaşım bulunmadı. Daha sonra emülatör veya yedekten
   veri taşınırsa yeniden kontrol edilmeli; yeni sanitizer geçmiş belgeleri
   kendiliğinden düzeltmez.
3. Önceden üretilmiş tokenlı Storage indirme bağlantıları bu kural değişikliğiyle
   iptal olmaz. Özel dosyalar için böyle bağlantılar varsa ayrı envanter ve onaylı
   token iptali gerekir. Avatar bağlantıları paylaşılabilir olarak kalır.
4. Sunucu ve Storage yayını tamamlandı. Mobil App Check başlangıç düzeltmesi debug
   APK'da doğrulandı; mağaza/release derlemesi olarak henüz dağıtılmadı. iOS için
   DeviceCheck akışı Mac/Xcode ve fiziksel cihazla ayrıca sınanmalı.

Firebase referansları: [App Check kurulumu](https://firebase.google.com/docs/app-check/flutter/default-providers),
[Storage indirme bağlantıları](https://firebase.google.com/docs/storage/web/download-files).
