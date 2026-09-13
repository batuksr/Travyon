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

Web arayüzü `web/src/` altında yaşamaya devam eder. `mobile/` yalnızca Android ve
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
- Ana Sayfa / Planlar / Plan oluştur / Cüzdan / Topluluk alt menüsü çalışır.
- Plan detayında Günlük plan, Rota, Bütçe ve Hazırlık ayrı görünümlerdir.
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
- Tam plan düzenleyici bu sürümde bulunmaz.
- Yazma işlemleri bağlantı gerektirir. Kaydetme başarısı ve hatası ekranda bildirilir.

Bu değişiklik yeni bir native paket içerdiği için ilk çalıştırmada hot reload
yerine Flutter uygulamasını durdurup normal LOCAL komutuyla yeniden başlatın.

### Seyahat cüzdanı

- Cüzdan sekmesinde dokulu yeşil cüzdan, üstten görünen en fazla üç kart ve
  tarihe/saate göre tüm kayıtların listesi bulunur. Kartlar detay panelini açar.
- Genel cüzdan veya bir seyahat seçilebilir. Silinmiş planların kayıtları
  arşivlenmiş seyahat olarak erişilebilir kalır.
- Uçuş, konaklama, etkinlik, sigorta, belge bilgisi ve diğer kayıtlar eklenebilir,
  düzenlenebilir, onayla silinebilir. Rezervasyon kodu kopyalanabilir; yalnızca
  http(s) bağlantıları açılır. Dosya yükleme veya bilet satın alma yapılmaz.
- Web ve mobil `users/{uid}/wallet/{entryId}` koleksiyonunu paylaşır. Kayıtlar
  sahibine özeldir; planı toplulukta paylaşmak cüzdanı paylaşmaz.
- Webde eskiden kayıtlar yalnızca localStorage içindeydi. Güncel web uygulaması
  açılınca ilgili kullanıcının yerel kayıtları eksikse buluta taşınır. Önce
  migration tamamlanır, sonra bulut dinlenir; başarısızlıkta yerel liste korunur.
  Mevcut bulut kayıtları ezilmez. Başka cihazdaki eski kopyaların silinen kayıtları
  geri getirmemesi için kişisel alanları silinmiş tombstone belgeleri tutulur.
- Kaydetme işlemleri sunucu onayını bekler ve internet/emülatör bağlantısı gerekir.
  Offline cüzdan görüntüsü önbellekten gelebilir; başarısız kayıt formda korunur.
- Yeni Firestore kuralları LOCAL emülatörde kontrol edildi. Production için
  `firebase deploy --only firestore:rules` ayrıca gereklidir; otomatik deploy yok.
  Eski web kayıtlarını taşımak için bunların bulunduğu tarayıcıda güncel web
  uygulamasına aynı hesapla giriş yapın. LOCAL ve production verileri ayrıdır.
- Testler: `flutter.bat test`, kökte `npm.cmd test`; çalışan yerel emülatörle
  `node --test scripts/test-wallet-rules.mjs`. Kural testi yalnızca localhost'a
  gider, ayrı test kullanıcısı ve tek geçici belge oluşturup temizler.

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

Firebase App Check, production bağlantısında bildirimlerden bağımsız başlar.
Android release için Play Integrity, iOS release için DeviceCheck kullanılır.
Production Cloud Functions kodunda App Check zorunludur; ilgili uygulama/provider
kaydı Firebase Console'da tamamlanmalıdır. Debug derlemelerde debug tokenı
kaydedilmelidir. Yerel emülatör modu bu doğrulamayı kullanmaz.

## Mobil topluluk

Alt menüdeki **Topluluk**, web ile aynı `publicPlans`, `userFollows` ve
`planRatings` verilerini kullanır. Keşfet ve en beğenilenler son 50 genel paylaşım
üzerinden gösterilir; bağlantıya özel planlar akışa dahil edilmez.

- Şehir/gezgin arama, takip edilen gezginler ve herkese açık gezgin kartları.
- Salt okunur günlük rota, Google haritası/yer detayları, rehber ve tercihler.
- 1–5 yıldız değerlendirme; tekrar puan vermek mevcut değerlendirmeyi günceller.
- Paylaşımlarım: kayıtlı planı onayla paylaşma/güncelleme ve paylaşımı kaldırma.
- Ayar simgesi: web ile ortak profil, plan paylaşımı ve takip gizliliği.

Mobil paylaşım, mevcut `sharePublicPlan`, `unsharePublicPlan`, `ratePublicPlan`,
`followUserAction`, `getPublicProfile` ve `updatePrivacySettings` fonksiyonlarını
kullanır. Yeni backend fonksiyonu veya kural değişikliği gerekmez; var olan web
fonksiyonları ve `firestore.indexes.json` indeksleri aynı ortamda bulunmalıdır.
LOCAL modunda Firebase emülatörleri açık olmalıdır. Mobildeki ve webdeki ortam
farklıysa aynı topluluk verileri görünmez.

Paylaşım için `plansPublic` izni açık olmalı ve kullanıcı ayrıca planı seçip
onaylamalıdır. Bu izin açılınca planlar kendiliğinden yayınlanmaz. Mobil yayın
şeması cüzdanı, rezervasyon adresini, kişisel durak notlarını, tamamlanma durumunu
ve gerçek harcamaları göndermez. Rota metinlerinde kendin yazdığın kişisel bilgileri
paylaşmadan önce gözden geçir. Özel planın aslı değiştirilmez.

Kontrol: `flutter.bat test test/community_test.dart`.

## Mobil ayarlar

Hub'ın sağ üstündeki dişli simgesi Ayarlar'ı açar. Hesap, seyahat,
bildirim/gizlilik, fatura, destek ve veri işlemleri ayrı ekranlardadır.

- Profil, seyahat varsayılanları ve iletişim tercihleri webdeki `users/{uid}`
  alanlarına yalnızca ilgili alanları birleştirerek yazılır. Yeni plan oluşturma
  bu varsayılanları kullanır; mevcut planların bütçesi dönüştürülmez.
- JPEG profil fotoğrafı mevcut Storage kuralıyla uyumlu olarak 512 KB altında
  olmalıdır. Galeri seçiminde küçültme istenir; JPEG olmayan dosyalar reddedilir.
- Şifre/e-posta değişikliği yeniden kimlik doğrulaması gerektirir. Google girişi
  aynı Firebase kullanıcısını yeniden doğrular, farklı hesaba geçiş yapmaz.
  Yeni e-posta doğrulanmadan mevcut adres değiştirilmez.
- Pasaport hatırlatıcısı yalnızca ülke ve geçerlilik tarihini cihazda,
  kullanıcı kimliğine özel anahtarda tutar. Numara alınmaz; weble eşitlenmez.
- Veri dışa aktarımı hesap/profil, buluttaki özel planlar, cüzdan ve cihazdaki
  pasaport hatırlatıcısını JSON olarak sistem paylaşım ekranına verir. Hassas
  bilgiler içerebilir; yalnızca güvenilir hedefe kaydedilmelidir. Webde kalan
  yerel kontrol listeleri dahil değildir. Paylaşım paketi geçici önbellek dosyası
  oluşturabilir; bu işlem bir şifreli yedekleme sistemi değildir.
- Hesap silme yazılı onay ve yeniden doğrulama ister. LOCAL modunda kapalıdır:
  hybrid yapıdaki gerçek Auth hesabını silip bulut verilerini geride bırakmak
  önlenir. Production'da mevcut `deleteMyAccount` fonksiyonu kullanılır; aktif
  abonelik koşullarını sunucu kontrol eder. Gerçek hesaplarla silme testi yapılmadı.

Henüz bağlı olmayan mağaza içi satın alma özelliği ekranda açıkça belirtilir.
Telefon bildirimlerinin izin/cihaz kaydı/test altyapısı aşağıdaki kontrollü kurulumla açılır.
Türkçe/İngilizce dil tercihi mobil arayüze anında uygulanır, cihazda saklanır ve
oturum açıldığında web hesabındaki `language` alanıyla eşitlenir. Kullanıcının
girdiği plan, şehir ve mekân adları çevrilmez. `distanceKm` ve `tempCelsius`
tercihleri de cihazda saklanır, ortak hesap belgesinden canlı eşitlenir ve rota,
plan, tempo seçenekleri, hava durumu ile bildirimlerde uygulanır. Dil/birim ve
iletişim tercihleri web ve mobil tarafından aynı alanlarla kullanılır. Abonelik
ve ödeme geçmişi salt okunur;
bu ekrandan ödeme alınmaz. Konum geçmişi toplanmaz.

Web sözlükleriyle ortak sabit metinleri yenilemek için `mobile` klasöründe:

```powershell
node tool/generate_mobile_translations.cjs
```

Komut yalnızca mobil kaynakta kullanılan sabit arayüz metinlerini üretir. Mobile
özel ve dinamik çeviriler `lib/core/localization/app_translations.dart` içinde
tutulur. İngilizce seçiliyken yapay zekâ plan istemi de İngilizce çıktı ister;
Firestore sözleşmesinde kullanılan dönem anahtarları değişmeden kalır.

Yeni native paketler nedeniyle yalnızca hot reload yeterli değildir. Çalışan
Flutter oturumunu `q` ile kapatıp `mobile` klasöründen yeniden başlat:

```powershell
flutter.bat run -d emulator-5554 --dart-define=TRAVYON_FIREBASE_MODE=local --dart-define-from-file=maps-config.local.json
```

Kontrol: `flutter.bat test test/settings_test.dart`. iOS derlemesi ve gerçek
cihazdaki galeri/sistem paylaşım ekranı ayrıca doğrulanmalıdır.

Paket kaynakları: [image_picker](https://pub.dev/packages/image_picker),
[share_plus](https://pub.dev/packages/share_plus),
[SharedPreferencesAsync](https://pub.dev/documentation/shared_preferences/latest/shared_preferences/SharedPreferencesAsync-class.html).

## Planlarım ve uygulama içi bildirimler

Alt menüdeki Planlar artık ayrı bir arşiv ekranıdır: şehir/ad arama, favoriler,
yaklaşan/devam eden/geçmiş filtreleri, kayıt veya seyahat tarihine göre sıralama,
yeniden adlandırma, bağlantı kopyalama ve onaylı silme. Favori ve ad değişikliği
aynı `users/{uid}/plans/{id}` belgesinin ilgili alanlarını günceller; rota içeriğini
ezmez. Silmeden önce varsa kullanıcının genel paylaşımı kaldırılır; kaldırma
başarısızsa özel plan silinmez. Cüzdan kayıtları silinmez, arşiv grubunda kalır.

Bağlantı paylaşımı production ortamında `sharePublicPlan` kullanır. Mevcut genel
paylaşım korunur; yeni bağlantıya özel kopya akışa çıkmaz. LOCAL veri için bozuk
production bağlantısı üretilmez. Web bağlantı rotası giriş gerektirir. Aynı
planın eski tarayıcıda kalan yerel kopyasının yeniden taşınması mevcut web
migrasyon davranışına tabidir; burada web senkronizasyonu değiştirilmedi.

Hub'ın sağ üstündeki zil Bildirimler'i açar. Bildirimler gerçek kayıtlı
planlardan üretilir: 0–7 gün içinde yolculuk, 0–14 gün içinde olası rezervasyon,
%20/%50/%80 harcama eşikleri. Rezervasyon hatırlatması isim eşleştirmesidir;
bilet zorunluluğu veya satın alma onayı değildir. Harcama oranının paydası
tahmini plan maliyeti, yoksa ayrılan bütçedir ve bildirimde açıkça yazılır.

Yaklaşan (en fazla 7 gün) veya devam eden ilk konumlu plan için rota noktasının
güncel hava bilgisi alınır. Sadece yaklaşık durak koordinatı Open-Meteo'ya
gönderilir; telefon konumu, kullanıcı kimliği veya rezervasyon bilgileri gönderilmez.
Veri 30 dakika yeniden kullanılabilir, 3 saatten eski veri gösterilmez. Hava
bilgisi alınamazsa diğer bildirimler çalışır. Gelecek seyahat tarihinin tahmini
olarak sunulmaz. Kar/yağmur/fırtına kodları ayrı değerlendirilir. Sıcaklık
bildirimleri `tempCelsius` tercihini uygular.

Bildirim kapatma/geri getirme cihazda kullanıcıya özel saklanır; webdeki
localStorage ile eşitlenmez. Yerel depolama hatası listeyi engellemez fakat
kalıcı kapatma yapılamaz. `appPlanNotif=false` plan bildirimlerini,
`appCommunityNotif=false` takip/puan/yeni paylaşım push mesajlarını kapatır.

Test: `flutter.bat test test/plans_notifications_test.dart`.
Hava API alanları/kodları: [Open-Meteo dokümantasyonu](https://open-meteo.com/en/docs).

## Telefon bildirimleri — kontrollü ilk aşama

### USB ile gerçek Android cihazda LOCAL bağlantı

Firebase emülatörleri bilgisayarda çalışırken, `flutter.bat devices` çıktısındaki
telefon kimliğiyle üç portu USB üzerinden yönlendir (`CIHAZ_KIMLIGI`ni değiştir):

```powershell
$travyonAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $travyonAdb -s CIHAZ_KIMLIGI reverse tcp:8080 tcp:8080
& $travyonAdb -s CIHAZ_KIMLIGI reverse tcp:5001 tcp:5001
& $travyonAdb -s CIHAZ_KIMLIGI reverse tcp:9199 tcp:9199
```

`mobile` klasöründe:

```powershell
flutter.bat run -d CIHAZ_KIMLIGI --dart-define=TRAVYON_FIREBASE_MODE=local --dart-define=TRAVYON_FIREBASE_EMULATOR_HOST=127.0.0.1 --dart-define-from-file=maps-config.local.json
```

`FirebaseEnvironment` üç serviste de `automaticHostMapping: false` kullanır.
Aksi halde FlutterFire Android'de `127.0.0.1` adresini sessizce emülatöre özel
`10.0.2.2` adresine çevirir: Google Auth başarılı olsa bile profil/plan okumaları
başarısız olabilir. Host verilmediğinde Android emülatörü için `10.0.2.2` seçimi
uygulama tarafından yapılmaya devam eder. USB bağlantısı yeniden kurulduğunda
port yönlendirmelerini kontrol et. Adres değişikliğinde uygulamayı tamamen
durdurup yeniden çalıştır; hot reload yeterli değildir.

### Bildirim aktivasyonu

Ayarlar → Telefon bildirimleri: cihaz izni, kayıt, kapatma ve yalnızca kendi
cihazına test gönderimi. Varsayılan derlemede kapalıdır. LOCAL modunda, bayrak
açık olsa bile hem istemci hem sunucu gerçek FCM gönderimini engeller.
Mevcut uygulama içi bildirim ekranı bundan bağımsız çalışır.

Uygulama izni otomatik sormaz; kullanıcı anahtarı açmalıdır. FCM auto-init
Android/iOS'ta kapalı kalır. Token yalnızca izin/cihaz onayı sonrası alınır;
sunucu doğrulaması başarılı olmadan arayüz "kayıtlı" demez. Başarısız sunucu
kaydında kullanıcının açık onayı korunur ve sonraki yenilemede tekrar denenir.
Token yenilenmesi ve çıkış işlemleri sırayla yürütülür. Normal çıkışta sunucu
kaydı kaldırılır veya FCM tokenı geçersizleştirilir; ikisi de başarısızsa hata
gösterilir. Hesap silmenin sunucu temizliği cihaz kayıtlarını da kapsar.

`mobilePushAction` doğrulanmış oturum ve production App Check ister. Cihazlar
sunucuya özel `mobilePushDevices/{sha256(token)}` koleksiyonundadır; aynı token
yalnızca son kayıt yapan hesaba bağlıdır. İstemci koleksiyonu okuyamaz/yazamaz.
Test sınırı hesap başına 10 dakikada 3 istektir. Tokenlar loga yazılmaz.
Kilit ekranı mesajı isim, rota, rezervasyon veya cüzdan bilgisi içermez. Eski
token hataları sunucudan temizlenir. Testin FCM tarafından kabul edilmesi
cihaza teslim garantisi değildir. Test TTL'i 60 saniyedir.

Aktivasyon **henüz yapılmadı**; hesaplar hazır olmadan şu aşamada bayrakları açma:

1. Firebase projesindeki Cloud Messaging API ve uygulama yapılandırmasını
   doğrula. Production callables için App Check cihaz kaydını tamamla.
   App Check, bildirim bayrağından bağımsız olarak Firebase başlangıcında çalışır.
   Production modundaki debug derleme debug provider, release Android Play Integrity,
   release iOS DeviceCheck kullanır. Local emülatör modunda etkinleşmez.
   Bildirimler kapalı olsa da production debug tokenını yalnızca Firebase Console'a
   ekle; depoya, ekran görüntüsüne veya paylaşılan loglara koyma.
2. iOS için Mac/Xcode üzerinde Runner'a Push Notifications capability ekle;
   imzalama profilinin `aps-environment` entitlement'ını doğrula. Firebase'e
   Apple Developer APNs anahtarını yükle. Background modes ve UIScene
   notification delegate kodda hazırdır; bu, imzalama/APNs kurulumunun yerini tutmaz.
3. Sunucu parametresi `MOBILE_PUSH_ENABLED=true` ile **onaylı deployment** yap.
   `mobilePushAction`, cihaz temizliği güncellenen `deleteMyAccount` ve
   Firestore kuralları birlikte yayınlanmalı. Bu çalışma deploy yapmaz.
4. `mobile` klasöründen production test derlemesini tam yeniden başlat:

   ```powershell
   flutter.bat run -d emulator-5554 --dart-define=TRAVYON_FIREBASE_MODE=production --dart-define=TRAVYON_PUSH_ENABLED=true --dart-define-from-file=maps-config.local.json
   ```

   Bu komut **gerçek bulut verilerini** kullanır; test hesabı tercih et.
   Android cihaz/emülatör Google Play services içermelidir. Cihaz kimliğini
   `flutter.bat devices` çıktısına göre değiştir.
5. Ayarlardan izin ver ve test gönder. Önde mesaj uygulama içinde görünür.
   Arka plan testi için düğmeye bastıktan sonra uygulamayı arka plana al;
   gerçek teslimi telefonun bildirim alanında doğrula. Uygulama bildirime
   dokunarak açıldığında oturum kontrolünden sonra Bildirimler ekranına gider.
   Zorla durdurulmuş uygulamanın davranışı ayrı test edilmelidir.

Otomatik sunucu olayları; ilk takip, ilk puan, takip edilen gezginin yeni genel
paylaşımı ile yolculuktan 7 ve 1 gün önceki hatırlatmaları kapsar. Günlük zamanlayıcı
09:00 Europe/Istanbul saatinde çalışır ve `mobilePushDeliveries` ile tekrar gönderimi
önler. Mesajlar kilit ekranında kişi, destinasyon, not veya cüzdan verisi göstermez.
Scheduler deployment için Firebase projesinde faturalandırma/Cloud Scheduler gerekir.
iOS build ve gerçek cihaz FCM teslimi henüz doğrulanmadı. Kapalı bayraklarla
normal LOCAL geliştirmeye aynı komutla devam edebilirsin; yeni native paket
nedeniyle hot reload yerine `q` ve yeniden `flutter.bat run` gerekir.

Testler: `flutter.bat test test/mobile_push_test.dart`; kökten
`npm.cmd --prefix functions test`. Firebase kaynakları:
[Flutter FCM kurulumu](https://firebase.google.com/docs/cloud-messaging/flutter/get-started),
[mesaj alma](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages),
[App Check](https://firebase.google.com/docs/app-check/flutter/default-providers).

## Ortak seyahat kontrol listesi

Web ve mobil kontrol listesi `users/{uid}/plans/{planId}/checklist/state` belgesini
dinler. Eski tarayıcı localStorage kaydı ilk açılışta bir kez Firestore'a taşınır;
sonraki değişiklikler iki istemcide aynı güvenli veri modelinde tutulur. Mobilde plan
detayındaki Hazırlık sekmesi 23 ortak maddeyi, grup ilerlemesini ve çevrimdışı senkron
durumunu gösterir. İstemci yalnızca tanımlı kontrol maddelerini yazabilir.

## Plan bağlantıları

Flutter uygulaması hem `https://travyon-5fb01.web.app/plan/{id}` hem de
`travyon://plan/{id}` biçimini doğrulayıp salt-okunur topluluk planına yönlendirir.
Android intent filter ve test cihazının SHA-256 değeriyle Hosting
`/.well-known/assetlinks.json` hazırdır. Play App Signing açılınca dosyaya Google
Play'in release SHA-256 değeri de eklenmelidir. iOS özel `travyon` şeması hazırdır;
HTTPS Universal Link için Apple Developer hesabı açıldıktan sonra Associated Domains
capability, Team ID ve `apple-app-site-association` dosyası tamamlanmalıdır.

## Yayına hazırlıkta kalan işler

- [x] Otomatik seyahat/topluluk push tetikleyicileri ve tekrar gönderim önleme.
- [x] Türkçe/İngilizce mobil ekran metinleri ve hesapla eşitlenen uygulama dili.
- [x] Mesafe/sıcaklık tercihlerini rota, plan ve hava bildirimlerinde gerçek birim dönüşümüne bağlama.
- [ ] Google Play Console / Apple Developer hesapları ve gerçek abonelik ürünleri.
- [ ] Satın alma, sunucuda makbuz doğrulama, yenileme/iptal/iade bildirimleri ve satın alımı geri yükleme.
- [ ] Gerçek Android ve iPhone üzerinde oturum, Maps, fotoğraf, paylaşım, izin reddi ve bağlantı kaybı testleri.
- [ ] Mac üzerinde iOS imzalama/build; mağaza görselleri, gizlilik beyanları ve test dağıtımları.

Mağaza ödeme ekranı ve Pro yetkisi bu turda değiştirilmedi. Gerçek ürünler ve
sunucu doğrulaması olmadan satın alınmış gibi erişim verilmez. Kayıtlı kart,
Apple anahtarı, servis hesabı JSON'u veya mağaza şifresi depoya eklenmemelidir.

Ortak yetki okuma sözleşmesi `getSubscriptionEntitlement` callable fonksiyonudur.
`isPro`, sağlayıcı, ürün, işlem ve dönem alanları Firestore kurallarıyla istemci
yazımına kapalıdır; mevcut iyzico aktivasyonu sağlayıcı olarak `iyzico` kaydeder.
Gelecekteki Play/App Store makbuzları için `mobileStoreTransactions` ve sunucu
bildirimleri için `mobileStoreNotifications` koleksiyonları da yalnızca Admin SDK'ya
açıktır. Hesaplar ve gerçek ürün kimlikleri alınmadan doğrulama endpoint'i açılmaz.
