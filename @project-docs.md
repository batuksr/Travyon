Seyahat Planlama Aracı

1. Proje Özeti

Seyahat Planlama Aracı; yurt dışına seyahat eden kullanıcıları önce derin biçimde tanıyan, ardından bu kişisel profile göre kapsamlı, coğrafi olarak optimize edilmiş günlük seyahat planları oluşturan bir web uygulamasıdır. Mevcut seyahat araçlarının temel sorunu: Google Maps, TripAdvisor veya Wanderlog gibi platformlar kullanıcıdan yalnızca destinasyon ve tarih bilgisi alarak herkese benzer planlar üretir. Seyahat Planlama Aracı ise kullanıcının tatil amacını, günlük temposunu, yeme-içme profilini ve konfor tercihlerini öğrenerek tamamen kişiye özel bir plan oluşturur ve bu planı akıllı rota optimizasyonu ile şehrin coğrafyasına göre düzenler.

Temel Fark Yaratan ÖzelliklerAçıklamaKişiselleştirilmiş Onboarding4 kategoride detaylı sorular ile kullanıcı/grup profilinin çıkarılmasıCoğrafi Rota OptimizasyonuTSP algoritması ve Haversine filtrelemesi ile aktivitelerin en mantıklı sıralamada sunulmasıDinamik Vibe SistemiKullanıcı ruh haline ve anlık hava durumuna göre plan uyarlamasıSosyal Kanıt EntegrasyonuGerçek zamanlı popülerlik ve yoğunluk verisiPDF/Offline ExportSeyahat sırasında internet bağlantısı gerektirmeyen erişim

2. Problem Tanımı

2.1 Mevcut Durum

Bir kullanıcı yurt dışına seyahat planlarken ortalama 4–6 farklı platform kullanmak zorunda kalmaktadır:

Google Maps: Yol tarifleri ve mekan arama (kişiselleştirme yok)

TripAdvisor: Yorumlar ve puanlar (günlük program oluşturmaz)

Wanderlog: Rota planlama (coğrafi optimizasyon sınırlı, profil tanımaz)

Booking / Airbnb: Konaklama rezervasyonu (aktivite entegrasyonu yok)

Google Flights: Uçuş arama (seyahat planıyla bağlantısı yok)

Currency Apps: Para birimi dönüştürme (bütçe takibi entegre değil)

2.2 Kullanıcı Acı Noktaları

Farklı platformlar arasında geçiş yapma yorgunluğu

Genel önerilerin kişisel ihtiyaçlara uymadığı hayal kırıklığı

Grup seyahatlerinde farklı diyet kısıtlamalarını ve beklentileri karşılayan ortak bir plan bulmakta güçlük

Bütçenin hangi kategoride ne kadar harcandığının takibinin zorluğu

AI destekli planların coğrafi tutarsızlıkları (şehrin iki ucuna saatler içinde koşturmak)

Gün içinde yorulduğunda veya hava bozduğunda alternatif öneri almak için tüm planı yeniden oluşturmak zorunda kalma

3. Önerilen Çözüm

3.1 Kullanıcıyı Tanıma Akışı (Onboarding) & Uzlaşı Modu

Seyahat Planlama Aracı, plan üretmeden önce kullanıcıyı 4 kategoride sorgular. Bu süreç uygulamanın temel diferansiyasyonunu oluşturur:

Kategori 1 — Temel Seyahat Bilgileri: Destinasyon, gidiş-dönüş tarihleri, şehre varış ve şehirden ayrılış saatleri, toplam bütçe, kişi sayısı.

Uzlaşı Modu (Multiplayer Onboarding): Grup veya aile seyahatlerinde, ana kullanıcı bir "davet linki" oluşturarak diğer kişilerin de kendi profillerini (diyet, tempo vb.) girmesini sağlar. AI, tüm grubun ortak noktasına hitap eden (örn. hem etobur hem vegan seçenekleri olan mekanlar) optimize edilmiş bir plan üretir.

Kategori 2 — Tatil Amacı ve Tempo: Öncelik (Dinlenmek / Kültür / Gece Hayatı vb.), günlük aktivite sayısı (Sakin / Orta / Yoğun), sabah erken kalkma esnekliği.

Kategori 3 — Yeme-İçme Profili: Diyet kısıtları (Vegan / Helal / Gluten-free vb.), mutfak tercihi, öğün başına bütçe, kahvaltı tercihi.

Kategori 4 — Konfor ve Ulaşım: Konaklama tipi, ulaşım tercihi, fiziksel aktivite toleransı.

3.2 Plan Çıktısı

Onboarding tamamlandıktan sonra uygulama; saat bazlı günlük program, interaktif mekan kartları, bütçe takibi, ulaşım talimatları, harita görünümü ve PDF Export gibi bileşenleri içeren kişiselleştirilmiş bir plan üretir.

4. Temel Özellikler

4.1 Maliyet Optimize Edilmiş Coğrafi Rota (TSP)

AI tabanlı plan oluşturmada en yaygın şikayet olan "coğrafi tutarsızlık" sorunu, maliyetleri minimumda tutacak bir Gezgin Satıcı Problemi (TSP) yaklaşımıyla çözülür:

AI tüm gün aktivitelerini belirler.

Mekanlar arası mesafeler önce sunucu/istemci tarafında ücretsiz Haversine formülü (kuş uçuşu mesafe) ile hesaplanır ve filtrelenir.

Greedy nearest-neighbor + 2-opt algoritması bu filtrelenmiş verilerle en mantıklı rotayı bulur.

Sadece ortaya çıkan nihai en iyi rotanın kesin seyahat sürelerini doğrulamak için OSRM / Mapbox Directions API (veya Google Routes) tek seferlik çağrılır.

4.2 Dinamik Vibe Sistemi

Kullanıcı gün içinde yorulabilir, hava değişebilir veya ruh hali farklılaşabilir. Tüm planı baştan yapmak yerine "Vibe" tek tıkla değiştirilir:

😴 Dinlenme Modu: Yoğun aktiviteler kaldırılır, sakin kafe & park önerilir.

🌧️ Hava Modu (Weather API Entegreli): Yağmur durumunda açık hava aktiviteleri anında müze & kapalı alanlara dönüştürülür.

💰 Tasarruf Modu: Ücretli aktiviteler ücretsiz alternatiflerle değiştirilir.

🎉 Keşif Modu: Standart yerler yerine gizli köşeler önerilir.

4.3 Sosyal Kanıt ve Rezervasyon

Mekanların güvenilirliğini artırmak için Foursquare veya Yelp API (ücretsiz katmanları geniş olduğu için MVP aşamasında tercih edilir) kullanılarak yorumlar ve puanlar çekilir. Gerçek zamanlı mekan yoğunluğu verisi (popüler saatler), başlangıç aşamasında API maliyetlerini sıfırlamak adına mock (simüle edilmiş) verilerle sunulur.

4.4 Bütçe Takip Sistemi

Kullanıcının belirlediği toplam bütçe, plan üretimi sırasında kategorilere (Yemek, Konaklama, Aktivite, Ulaşım) bölünür.

Uygulamanın yaptığı "tahmini harcama" planlamasının yanı sıra, kullanıcı manuel bütçe girişi yaparak gün içinde bir mekanda gerçekte ne kadar harcadığını sisteme işleyebilir.

Böylece kalan bütçe dinamik olarak güncellenir ve bütçe aşımı durumunda uygulama sonraki günler için daha ucuz alternatifler önerir.

5. Teknik Mimari

5.1 Teknoloji Yığını

KatmanTeknolojiKullanım AmacıFrontend & StylingReact + TypeScript, Tailwind CSSUI bileşenleri, responsive tasarımBackend / BaaSFirebase (Firestore + Auth)Kullanıcı verisi, plan saklamaAI MotorClaude 3 Haiku / Gemini 1.5 FlashHızlı, düşük maliyetli JSON plan üretimiMekan VerisiFoursquare API / Yelp APIPuanlar, mekan detayları (Düşük maliyet)Rota OptimizasyonuHaversine + Mapbox/OSRM APITSP hesaplama ve seyahat süreleriHarita & HavaGoogle Maps JS API + WeatherAPIGörsel rota, anlık hava durumuPDF ÜretimijsPDF + html2canvasOffline exportHostingVercel / NetlifyFrontend yayına alma (Ücretsiz katman)

5.2 Uygulama Akışı ve Caching (Önbellekleme) Sistemi

Maliyetleri düşürmek ve hızı artırmak için sisteme bir Caching (Önbellekleme) mekanizması dahil edilmiştir.

Kullanıcı formu doldurur.

Sistem Firestore'da kullanıcının profiliyle (örn: Roma, 3 gün, Orta Tempo, Vegan) eşleşen daha önce üretilmiş hazır bir plan olup olmadığını kontrol eder (Caching).

Eşleşme varsa plan anında ve ücretsiz getirilir. Yoksa AI API'sine istek atılır ve dönen JSON veritabanına kaydedilir.

TSP algoritması ile coğrafi sıralama yapılır, harita oluşturulur.

Kullanıcı Vibe butonu ile veya manuel bütçe girerek planı anlık güncelleyebilir.

6. Proje Planı (3 Ay)

Faz 1 (Hafta 1–3): Temel Altyapı, Firebase/Vercel kurulumu, Onboarding UI, AI API (Haiku/Flash) entegrasyonu ve Caching mantığı.

Faz 2 (Hafta 4–7): Haversine + TSP algoritması, Vibe sistemi (Hava durumu entegrasyonu dahil), Harita ve Bütçe (manuel veri girişi) sistemleri.

Faz 3 (Hafta 8–12): PDF Export, Multiplayer (Uzlaşı Modu) testleri, Hata yönetimi, Performans optimizasyonu ve Canlıya alma.

7. Zorluk ve Risk Analizi

RiskOlasılıkEtkiAzaltma StratejisiAPI Maliyet Aşımı (Harita/Yapay Zeka)DüşükYüksekFoursquare/Yelp kullanımı, Routes yerine Haversine filtrelemesi, AI sonuçlarının Firestore'da Caching ile saklanması.AI HalüsinasyonuOrtaYüksekAI çıktılarının JSON yapısı zorunlu kılınacak, üretilen mekanlar Harita API'sinde doğrulanacak.Grup ÇakışmalarıOrtaOrtaUzlaşı modu (Multiplayer onboarding) ile orta yol algoritması devreye sokulacak.

8. Rekabet Analizi

Temel rekabet avantajı: Diğer uygulamalar destinasyon sorar. Seyahat Planlama Aracı insanı tanır — sonra şehri de onun için optimize eder.

TripAdvisor / Wanderlog: Sınırlı kişiselleştirme, statik içerik, manuel sıralama.

Seyahat Planlama Aracı: Uzlaşı modlu 15 boyutlu profil, Haversine + TSP destekli otomatik sıralama, Vibe sistemi, interaktif bütçe takibi.

9. Sürdürülebilirlik ve Gelir Modeli

Projenin API maliyetlerini karşılamak ve kar elde etmek amacıyla aşağıdaki iş modelleri entegre edilecektir:

Affiliate (Satış Ortaklığı) Modeli: Üretilen seyahat planındaki otel konaklamaları (Booking/Airbnb), uçak biletleri (Skyscanner) ve ücretli müze/tur aktiviteleri (GetYourGuide) için yönlendirme linkleri eklenecek ve bu linkler üzerinden komisyon geliri elde edilecektir.

Freemium Model: Caching sisteminden gelen hazır planlar ücretsiz sunulurken, yüksek kişiselleştirme, Vibe değişiklikleri ve PDF Export gibi özellikler Premium kullanıcılara (tek seferlik ödeme veya küçük bir abonelik) açılabilir.

10. Kullanıcı Gizliliği ve Veri Güvenliği (KVKK/GDPR)

Uygulama, kullanıcıların diyet tercihleri, fiziksel uygunlukları ve bütçeleri gibi hassas verilerini işlediği için güvenlik ön plandadır:

Kullanıcı profilleri Firebase Firestore üzerinde şifrelenmiş olarak tutulacaktır.

Kullanıcıdan alınan veriler, yapay zeka modellerine gönderilirken anonimleştirilecek (Kişisel tanımlayıcı isim/e-posta gibi bilgiler prompt'tan çıkarılacaktır).

KVKK ve GDPR yönergelerine uygun olarak "Hesabımı ve Tüm Verilerimi Sil" butonu kullanıcının kontrol paneline eklenecektir.

11. Demo Senaryosu (Örnek Çıktı)

Profil: Elif (28, Yalnız), Roma'ya 5 Gün, Bütçe 1.200 EUR, Varış 10:00. Orta tempo, Vejetaryen.

Gün 2 Özeti:

10:30 - Basilica di Santa Maria in Trastevere (Ücretsiz)

12:00 - Roscioli Salumeria (Vejetaryen Seçenek, ~28 EUR)

13:30 - Campo de' Fiori pazarı (8 dk yürüme mesafesi)

Elif yağmur yağdığını belirtip 'Hava Modu'na geçti -> Pazar iptal edildi, yerine yakındaki Pantheon eklendi.

12. Başarı Kriterleri

Onboarding tamamlama süresi: < 3 dakika

Plan üretim süresi (Caching yoksa): < 8 saniye (Caching varsa anında)

Coğrafi tutarsızlık şikayeti: 0

Test API maliyeti: < 5 USD/ay (Optimizasyonlar sayesinde)

13. Sonuç

Seyahat Planlama Aracı, seyahat planlama alanındaki mevcut araçların temel eksikliğini doğrudan hedef alan bir web uygulamasıdır. Projenin teknik bileşenleri (AI API, TSP algoritması, Firebase, React) zorlayıcı ancak iyi kurgulanmış maliyet düşürücü stratejiler sayesinde tamamen uygulanabilirdir. Coğrafi rota optimizasyonu, uzlaşı modu ve dinamik vibe sistemi uygulamayı rakiplerinden ayırır.

"Diğer uygulamalar destinasyon sorar. Seyahat Planlama Aracı insanı tanır — sonra şehri de onun için optimize eder."