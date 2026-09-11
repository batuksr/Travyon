# Travyon Mobile

Flutter istemcisi, mevcut React web uygulamasıyla aynı Firebase projesini kullanır.

## Platform kimlikleri

- Android application ID: `com.travyon.app`
- iOS bundle ID: `com.travyon.app`
- Firebase project: `travyon-5fb01`
- Cloud Functions region: `europe-west1`

## LOCAL mod — web ile aynı yerel veriler

```powershell
# Proje kökünde önce backend'i aç:
npm.cmd run emulators

cd mobile
flutter.bat pub get
flutter.bat emulators
flutter.bat emulators --launch Pixel_2_API_35
flutter.bat run -d emulator-5554 --dart-define=TRAVYON_FIREBASE_MODE=local --dart-define-from-file=maps-config.local.json
```

Android emülatörü bilgisayardaki Firebase servislerine otomatik olarak `10.0.2.2`
üzerinden ulaşır. Authentication gerçek Firebase'de; Firestore, Functions ve
Storage yereldedir. Böylece web ile mobil aynı geliştirme verilerini görür.

## PRODUCTION mod — gerçek Firebase

```powershell
cd mobile
flutter.bat run -d emulator-5554 --dart-define-from-file=maps-config.local.json
```

`TRAVYON_FIREBASE_MODE` verilmezse uygulama güvenli biçimde production modunda
başlar. Fiziksel Android cihazla LOCAL mod kullanırken bilgisayarın yerel IP'sini
ayrıca ver:

```powershell
flutter.bat run -d <cihaz-id> --dart-define=TRAVYON_FIREBASE_MODE=local --dart-define=TRAVYON_FIREBASE_EMULATOR_HOST=192.168.1.10 --dart-define-from-file=maps-config.local.json
```

Fiziksel Android telefonda geliştirici seçenekleri ve USB hata ayıklama açıkken
`flutter.bat devices` ile cihaz kimliği görülebilir. iOS derlemesi ve App Store
yayını için macOS üzerinde Xcode gerekir.

## Mimari notu

Web arayüzü `src/` altında yaşamaya devam eder. `mobile/` yalnızca Android ve
iOS arayüzüdür. Authentication, Firestore, Storage ve Cloud Functions iki
istemci arasında ortaktır.

## Tamamlanan mobil akış

### Adım adım plan oluşturma

Hub ve Planlar ekranındaki **Yeni plan oluştur** düğmesi web ile aynı soruları
dört adımda açar: destinasyon/tarihler/kişi/bütçe, seyahat tercihleri,
yeme-içme, konaklama/ulaşım. İlgi alanları en fazla üç ve öncelik sıralıdır;
“Her Şeyi Yerim” diğer beslenme kısıtlarıyla birlikte seçilmez. Profildeki
varsayılan bütçe, kişi sayısı, tempo ve para birimi başlangıçta yüklenir.

Takvim Türkçedir; en fazla 31 günlük plan hazırlanır. Geri dönmek cevapları
korur, formdan çıkarken değişiklik varsa onay istenir. Rezervasyon varsa otel
adı/adresin en az üç karakteri yazılınca Google Places önerileri açılır.
Aramalar 400 ms beklemeli, destinasyon konumuna öncelikli ve oturum tokenlıdır.
Seçilen önerinin açık adresi ve koordinatları `getMobileAccommodation` üzerinden
alınır; metin değiştirilirse önceki koordinatlar temizlenir. Geç gelen eski
sonuçlar yoksayılır. Öneriler diske kaydedilmez, arayüzde Google Maps atfı vardır.
Elle adres girişi de çalışır; konumu yoksa `geocodeAddress` plan oluştururken aranır.

Yeni callable mevcut sunucu anahtarının Places API (New) iznini kullanır;
mobil Maps anahtarını değiştirmeniz gerekmez. LOCAL için `functions` klasöründe
`npm.cmd run build` çalıştırın. Emülatör yeni fonksiyonu yüklemezse kendi
terminalinden yeniden başlatın. Production'da `getMobileAccommodation` ayrıca
deploy edilmelidir; bu çalışma otomatik deploy yapmaz.
Kaynak: [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete),
[Google Maps atıfları](https://developers.google.com/maps/documentation/places/web-service/policies).

Plan mevcut `generateAIContent` callable servisiyle hazırlanır; yeni backend
veya istemciye Gemini anahtarı gerekmez. Model yanıtı gün/tarih/koordinat/maliyet
kontrollerinden geçirilir. Önizlemeden **Kaydet ve rotayı aç** ile
`users/{uid}/plans` koleksiyonuna, web ile aynı alanlarla kaydedilir. Kayıt
hatasında aynı plan kimliğiyle tekrar denenir; AI yeniden çağrılmaz. LOCAL
modda Functions ve Firestore emülatörlerinin açık olması gerekir.

Mobil prompt aynı tercihleri işler, ancak webdeki sonradan rota optimizasyonu
ve arka planda durak koordinatı düzeltme işlemleri henüz port edilmedi.
Gerçek AI yanıt kalitesi, kotalar ve canlı kayıt ayrıca cihazda doğrulanmalıdır.

### Telefon için plan deneyimi

- Hub’daki plan kartları ve “Yolculuğuna devam et” düğmesi detay ekranını açar.
- Hub / Planlar alt menüsü çalışır; henüz hazırlanmayan cüzdan ve topluluk
  sayfalarının işlevsiz sekmeleri gösterilmez.
- Plan detayında Günlük plan, Rota ve Bütçe ayrı görünümlerdir.
- Gün seçimi yatay kaydırılır. Uzun durak açıklamaları “Devamını oku” ile açılır.
- “Gezdim” ve gerçek harcama kayıtları Firestore’a yazılır. Eşzamanlı değişmiş
  duraklar üzerine yazmak yerine hata gösterilir; webin diğer alanları korunur.
- Rota sekmesinde native Google Maps haritası, seçili günün numaralı durakları ve
  dokunarak seçilen mekân kartı bulunur. Gün değişince harita yeniden konumlanır.
- Noktalı çizgiler yalnızca durak sırasını gösterir; sokak bazlı navigasyon rotası
  değildir. Yol tarifi harici Google Maps uygulamasında veya tarayıcıda açılır.
- Harita kayıtlı plan koordinatlarını kullanır; konumu eksik duraklar için
  isimle yol tarifi kullanılabilir.
- İşarete dokununca Google puanı, değerlendirme sayısı, adres, çalışma saatleri ve
  Google'ın sağladığı yorumlar açılır. Tüm yorumlar için Google Maps bağlantısı vardır.
- Mekân fotoğrafları kaydırılabilir galeride gösterilir. `getMobilePlacePhoto`
  yalnızca görünür fotoğraf için geçici Google görsel adresi döndürür; sunucu anahtarı
  istemciye gönderilmez. Fotoğraf sahibi atıfları korunur. Süresi dolan fotoğrafta
  yenileme, güncel fotoğraf referanslarını tekrar getirir; yorumlar ayrı kalır.
  Yorumlar önceden indirilmez veya Firestore'a kaydedilmez; yalnızca panel açılınca sorgulanır.
- Tam plan düzenleyici ve mobil cüzdan bu sürümde bulunmaz.
- Yazma işlemleri bağlantı gerektirir. Kaydetme başarısı ve hatası ekranda bildirilir.

Bu değişiklik yeni bir native paket içerdiği için ilk çalıştırmada hot reload
yerine Flutter uygulamasını durdurup normal LOCAL komutuyla yeniden başlatın.

### Google Maps ve yorum yapılandırması

`maps-config.example.json` şablonundan `maps-config.local.json` oluşturun (Git tarafından
dışlanır). Android için `GOOGLE_MAPS_ANDROID_API_KEY`, iOS için ayrı ve bundle ID
kısıtlamalı `GOOGLE_MAPS_IOS_API_KEY` ekleyin. Sunucu anahtarını bu dosyaya KOYMAYIN.
Komutlarda `--dart-define-from-file=maps-config.local.json` bulunmalıdır. Android
Gradle, anahtarı manifest'e; iOS AppDelegate, iOS anahtarını Google Maps SDK'ya iletir.
Anahtarlar istemci uygulamasında bulunacağından uygulama ve API kısıtlamaları şarttır.
Android: `com.travyon.app` + geliştirme/yayın SHA-1 ve yalnızca Maps SDK for Android.
iOS: `com.travyon.app` ve yalnızca Maps SDK for iOS. iOS derlemesi Mac'te doğrulanmalıdır.

Yorumlar `europe-west1/getMobilePlaceDetails` callable fonksiyonundan gelir. Servis
doğrulanmış kullanıcı, production App Check ve kullanıcı başına hız sınırı uygular.
Mevcut `GOOGLE_MAPS_SERVER_KEY` secret'ının **Places API (New)** izni olmalı; mevcut
Geocoding/Directions izinlerini kaldırmayın. Google projesinde faturalandırma açık
olmalıdır. Arama ve yorum alanları ücretli API çağrıları oluşturabilir.

LOCAL: `functions` klasöründe `npm.cmd run build` ile kodu derleyin. Çalışan Functions
emülatörü yeni fonksiyonu yüklemezse kendi terminalinde durdurup proje kökünden
`npm.cmd run emulators` ile yeniden açın; ikinci bir emülatör başlatmayın.
Production: yeni fonksiyon ayrıca deploy edilmelidir (bu değişiklik otomatik deploy yapmaz).

Kaynaklar: [Google Maps Flutter kurulumu](https://developers.google.com/maps/flutter-package/config),
[Places API kullanım ve atıf kuralları](https://developers.google.com/maps/documentation/places/web-service/policies).

- Web hesabıyla e-posta/şifre girişi
- Google hesabıyla giriş ve kayıt
- Yeni hesap oluşturma ve `users/{uid}` profil belgesini web ile aynı yapıda açma
- Şifre yenileme e-postası
- E-posta doğrulama bağlantısı ve doğrulama kontrolü
- Oturum durumuna göre karşılama, doğrulama ve mobil Hub yönlendirmesi
- Webde kaydedilen özel planları `users/{uid}/plans` üzerinden gerçek zamanlı
  okuyan mobil Hub

Web uygulaması güncel sürümle ilk kez açıldığında tarayıcıdaki mevcut planları
aynı kullanıcıya ait Firestore koleksiyonuna otomatik taşır. Sonraki ekleme,
silme, yeniden adlandırma ve favori değişiklikleri cihazlar arasında eşitlenir.

Firebase App Check paketi kuruludur. Play Integrity ve App Attest kayıtları
Firebase Console'da tamamlandıktan sonra enforcement etkinleştirilmelidir.
