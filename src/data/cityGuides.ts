export type GuideLocale = 'tr' | 'en';
export type LocalizedText = Record<GuideLocale, string>;

export interface GuideItem {
  title: LocalizedText;
  description: LocalizedText;
}

export interface CityGuideData {
  slug: string;
  cityKey: string;
  city: LocalizedText;
  country: LocalizedText;
  destination: LocalizedText;
  image: string;
  video: string;
  officialUrl: string;
  tagline: LocalizedText;
  introduction: LocalizedText;
  idealStay: LocalizedText;
  bestSeason: LocalizedText;
  language: LocalizedText;
  currency: LocalizedText;
  highlights: GuideItem[];
  foods: GuideItem[];
  neighborhoods: GuideItem[];
  transport: LocalizedText[];
  dayRoute: GuideItem[];
}

const text = (tr: string, en: string): LocalizedText => ({ tr, en });
const item = (titleTr: string, titleEn: string, descriptionTr: string, descriptionEn: string): GuideItem => ({
  title: text(titleTr, titleEn),
  description: text(descriptionTr, descriptionEn),
});

export const CITY_GUIDES: CityGuideData[] = [
  {
    slug: 'roma',
    cityKey: 'roma',
    city: text('Roma', 'Rome'),
    country: text('İtalya', 'Italy'),
    destination: text('Roma, İtalya', 'Rome, Italy'),
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/roma.mp4',
    officialUrl: 'https://www.turismoroma.it/en',
    tagline: text('Antik dünyanın izlerini mahalle yaşamı ve güçlü mutfak gelenekleriyle birleştiren açık hava müzesi.', 'An open-air museum where ancient history meets neighborhood life and a deeply rooted food culture.'),
    introduction: text('Roma en iyi, yakın bölgeleri aynı güne gruplayarak ve tarihi merkezi yürüyerek keşfederek yaşanır. Antik Roma, Vatikan ve Trastevere için ayrı zaman blokları ayırmak rotayı daha rahat hale getirir.', 'Rome works best when nearby areas are grouped into the same day and the historic center is explored on foot. Separate time blocks for Ancient Rome, the Vatican and Trastevere keep the route relaxed.'),
    idealStay: text('3–4 gün', '3–4 days'),
    bestSeason: text('Nisan–Haziran, Eylül–Ekim', 'April–June, September–October'),
    language: text('İtalyanca', 'Italian'),
    currency: text('Euro (€)', 'Euro (€)'),
    highlights: [
      item('Kolezyum ve Roma Forumu', 'Colosseum & Roman Forum', 'Antik Roma’nın siyasi ve gündelik yaşamını aynı bölgede keşfet.', 'Explore the political and everyday heart of Ancient Rome in one area.'),
      item('Pantheon ve Piazza Navona', 'Pantheon & Piazza Navona', 'Mimarlık, meydan kültürü ve Barok Roma’yı yürüyüş rotasında birleştir.', 'Combine architecture, piazza life and Baroque Rome on one walk.'),
      item('Trevi Çeşmesi ve İspanyol Merdivenleri', 'Trevi Fountain & Spanish Steps', 'Kalabalık artmadan sabah erken saatlerde iki simgeyi peş peşe gör.', 'See two icons back-to-back early in the morning before crowds build.'),
      item('Vatikan Müzeleri ve Aziz Petrus', 'Vatican Museums & St Peter’s', 'Yoğun ziyaret için yarım gün ayır ve rezervasyonu önceden kontrol et.', 'Set aside half a day and check reservation requirements in advance.'),
    ],
    foods: [
      item('Carbonara', 'Carbonara', 'Yumurta, pecorino, guanciale ve karabiberle hazırlanan Roma klasiği.', 'A Roman classic built around egg, pecorino, guanciale and black pepper.'),
      item('Cacio e pepe', 'Cacio e pepe', 'Az malzemeyle güçlü lezzet sunan pecorino ve karabiberli makarna.', 'A deceptively simple pasta driven by pecorino and black pepper.'),
      item('Supplì', 'Supplì', 'Mozzarellalı kızarmış pirinç kroketi; hızlı bir sokak lezzeti molası.', 'A fried rice croquette with mozzarella, ideal for a quick street-food stop.'),
    ],
    neighborhoods: [
      item('Monti', 'Monti', 'Kolezyum yakınında küçük dükkânlar, kafeler ve akşam hareketliliği.', 'Independent shops, cafés and evening energy close to the Colosseum.'),
      item('Trastevere', 'Trastevere', 'Dar sokaklar, meydanlar ve geleneksel trattorialar için akşam rotası.', 'An evening area for narrow lanes, piazzas and traditional trattorias.'),
      item('Prati', 'Prati', 'Vatikan yakınında daha düzenli caddeler, alışveriş ve yerel yemek seçenekleri.', 'Orderly streets, shopping and local dining near the Vatican.'),
    ],
    transport: [
      text('Tarihi merkez kompakt; birçok önemli durak arasında yürümek en pratik seçenektir.', 'The historic center is compact, and walking is often the easiest option between major stops.'),
      text('Metro ana bölgeleri bağlar; otobüs ve tramvaylar aradaki boşlukları tamamlar.', 'The metro connects key areas, while buses and trams fill the gaps.'),
      text('Havalimanı–merkez yolculuğunda tren ve otobüs seçeneklerini varış saatine göre karşılaştır.', 'Compare train and bus options from the airport based on your arrival time.'),
    ],
    dayRoute: [
      item('08:30 · Kolezyum', '08:30 · Colosseum', 'Güne Antik Roma bölgesinde başla.', 'Start the day in Ancient Rome.'),
      item('11:30 · Monti', '11:30 · Monti', 'Mahalle sokaklarında kahve ve erken öğle molası.', 'Pause for coffee and an early lunch in the neighborhood.'),
      item('14:00 · Pantheon ve Trevi', '14:00 · Pantheon & Trevi', 'Merkezi meydanları birbirine bağlayan yürüyüş.', 'A walk connecting the central piazzas.'),
      item('19:00 · Trastevere', '19:00 · Trastevere', 'Akşamı geleneksel Roma yemekleriyle tamamla.', 'Finish with traditional Roman food.'),
    ],
  },
  {
    slug: 'paris',
    cityKey: 'paris',
    city: text('Paris', 'Paris'),
    country: text('Fransa', 'France'),
    destination: text('Paris, Fransa', 'Paris, France'),
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/paris.mp4',
    officialUrl: 'https://parisjetaime.com/eng/',
    tagline: text('Müzeler, mahalle kafeleri ve Seine kıyısındaki yürüyüşlerle katman katman keşfedilen şehir.', 'A city best uncovered layer by layer through museums, neighborhood cafés and walks along the Seine.'),
    introduction: text('Paris’te her güne birbirine yakın iki bölge seçmek ulaşım süresini azaltır. Büyük müzeleri kısa mahalle yürüyüşleri ve park molalarıyla dengelemek geziyi daha keyifli kılar.', 'Choose two nearby areas per day to reduce transit time. Balance major museums with neighborhood walks and park breaks for a better rhythm.'),
    idealStay: text('4–5 gün', '4–5 days'),
    bestSeason: text('Nisan–Haziran, Eylül–Ekim', 'April–June, September–October'),
    language: text('Fransızca', 'French'),
    currency: text('Euro (€)', 'Euro (€)'),
    highlights: [
      item('Eyfel Kulesi ve Trocadéro', 'Eiffel Tower & Trocadéro', 'Klasik şehir manzarası için iki yakayı aynı yürüyüşte birleştir.', 'Combine both viewpoints in one walk for the classic city panorama.'),
      item('Louvre ve Tuileries', 'Louvre & Tuileries', 'Müze ziyaretinden sonra bahçe ve Seine kıyısında nefes al.', 'Follow the museum with a slower break in the gardens and by the Seine.'),
      item('Notre-Dame ve Latin Mahallesi', 'Notre-Dame & Latin Quarter', 'Île de la Cité’den kitapçılara ve küçük sokaklara uzanan rota.', 'Walk from Île de la Cité into bookshops and intimate streets.'),
      item('Montmartre ve Sacré-Cœur', 'Montmartre & Sacré-Cœur', 'Yokuşlu sokakları, atölyeleri ve şehir manzarasını birlikte keşfet.', 'Explore hillside lanes, studios and a broad city view.'),
    ],
    foods: [
      item('Kruvasan', 'Croissant', 'Sabah erken saatte mahalle fırınından taze ve sade dene.', 'Try one fresh and plain from a neighborhood bakery in the morning.'),
      item('Soğan çorbası', 'French onion soup', 'Karamelize soğan ve peynirli ekmekle hazırlanan klasik bistro lezzeti.', 'A bistro classic with caramelized onion and cheese-topped bread.'),
      item('Krep', 'Crêpe', 'Tatlı veya tuzlu seçenekleriyle yürürken kolay bir mola.', 'An easy sweet or savory stop while exploring.'),
    ],
    neighborhoods: [
      item('Le Marais', 'Le Marais', 'Tarihi sokaklar, galeriler, butik mağazalar ve canlı kafeler.', 'Historic streets, galleries, boutiques and lively cafés.'),
      item('Saint-Germain-des-Prés', 'Saint-Germain-des-Prés', 'Klasik kafeler, kitapçılar ve Seine’e yakın zarif sokaklar.', 'Classic cafés, bookshops and elegant streets near the Seine.'),
      item('Montmartre', 'Montmartre', 'Sabah erken saatlerde daha sakin görülen sanatçı mahallesi.', 'An artists’ quarter best experienced early before it gets busy.'),
    ],
    transport: [
      text('Metro ve RER geniş bir ağ sunar; yürüyüşle birleştirildiğinde çoğu rota kolaylaşır.', 'The Metro and RER form a broad network that works best when combined with walking.'),
      text('Aynı gün içinde Seine’in tek yakasında kalan bölgeleri grupla.', 'Group neighborhoods on the same bank of the Seine into one day.'),
      text('Havalimanı bağlantılarında resmî uygulamalardan güncel hat ve bakım bilgisini kontrol et.', 'Check official apps for current airport routes and maintenance information.'),
    ],
    dayRoute: [
      item('09:00 · Louvre çevresi', '09:00 · Louvre area', 'Müze veya avlu ile güne başla.', 'Begin with the museum or its courtyards.'),
      item('12:30 · Le Marais', '12:30 · Le Marais', 'Mahalle içinde öğle yemeği ve kısa keşif.', 'Stop for lunch and a neighborhood wander.'),
      item('15:30 · Notre-Dame', '15:30 · Notre-Dame', 'Adalar ve Seine kıyısı boyunca yürü.', 'Walk the islands and the riverbanks.'),
      item('19:30 · Saint-Germain', '19:30 · Saint-Germain', 'Günü bistro ve akşam yürüyüşüyle bitir.', 'End with a bistro and an evening stroll.'),
    ],
  },
  {
    slug: 'tokyo',
    cityKey: 'tokyo',
    city: text('Tokyo', 'Tokyo'),
    country: text('Japonya', 'Japan'),
    destination: text('Tokyo, Japonya', 'Tokyo, Japan'),
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/tokyo.mp4',
    officialUrl: 'https://www.gotokyo.org/en/',
    tagline: text('Tapınak sessizliğinden neon sokaklara, her mahallesinde bambaşka ritim sunan dev metropol.', 'A vast metropolis that shifts from temple calm to neon energy from one neighborhood to the next.'),
    introduction: text('Tokyo’yu tek merkez gibi düşünmek yerine mahalle kümeleri halinde planla. Doğu, batı ve merkez bölgelerini farklı günlere ayırmak tren yolculuklarını ve yön bulmayı kolaylaştırır.', 'Plan Tokyo as clusters of neighborhoods rather than one center. Splitting east, west and central areas across different days simplifies train travel and navigation.'),
    idealStay: text('5–7 gün', '5–7 days'),
    bestSeason: text('Mart–Mayıs, Ekim–Kasım', 'March–May, October–November'),
    language: text('Japonca', 'Japanese'),
    currency: text('Japon yeni (¥)', 'Japanese yen (¥)'),
    highlights: [
      item('Sensō-ji ve Asakusa', 'Sensō-ji & Asakusa', 'Eski Tokyo atmosferi, tapınak yaklaşımı ve geleneksel dükkânlar.', 'Old Tokyo atmosphere, a temple approach and traditional shops.'),
      item('Meiji Tapınağı ve Harajuku', 'Meiji Shrine & Harajuku', 'Orman sessizliğinden genç moda sokaklarına kısa geçiş.', 'A quick transition from forest calm to youth-fashion streets.'),
      item('Shibuya', 'Shibuya', 'Kavşak, yüksek şehir manzaraları ve akşam enerjisi.', 'The crossing, elevated city views and evening energy.'),
      item('Tsukiji ve Ginza', 'Tsukiji & Ginza', 'Sabah yemek keşfini tasarım, alışveriş ve mimariyle birleştir.', 'Pair a morning food visit with design, shopping and architecture.'),
    ],
    foods: [
      item('Sushi', 'Sushi', 'Tezgâh deneyiminden kaiten seçeneklerine kadar bütçeye göre çeşitlenir.', 'Ranges from counter experiences to casual conveyor-belt options.'),
      item('Ramen', 'Ramen', 'Bölgesel et suyu ve erişte stillerini küçük uzman dükkânlarda dene.', 'Explore regional broths and noodle styles at focused specialty shops.'),
      item('Tempura', 'Tempura', 'Hafif hamurlu deniz ürünü ve sebzeleri mümkünse taze servisle tadın.', 'Try lightly battered seafood and vegetables served fresh.'),
    ],
    neighborhoods: [
      item('Asakusa', 'Asakusa', 'Geleneksel sokaklar ve nehir kıyısına yakın daha sakin bir üs.', 'A calmer base near traditional streets and the river.'),
      item('Shinjuku', 'Shinjuku', 'Büyük ulaşım bağlantısı, alışveriş ve gece hayatı.', 'A major transport hub with shopping and nightlife.'),
      item('Shimokitazawa', 'Shimokitazawa', 'İkinci el dükkânları, küçük sahneler ve bağımsız kafeler.', 'Vintage shops, small music venues and independent cafés.'),
    ],
    transport: [
      text('Tren ve metro ana ulaşım biçimidir; dijital veya fiziksel IC kart işleri kolaylaştırır.', 'Trains and subways are the main modes; a digital or physical IC card simplifies transfers.'),
      text('Aktarma sayısını azaltmak için aynı hat üzerindeki mahalleleri birlikte planla.', 'Group neighborhoods along the same line to reduce transfers.'),
      text('Yoğun işe gidiş-geliş saatlerinde büyük istasyonlar daha kalabalık olur.', 'Major stations are more crowded during commuter rush hours.'),
    ],
    dayRoute: [
      item('08:00 · Tsukiji', '08:00 · Tsukiji', 'Güne pazar çevresinde kahvaltıyla başla.', 'Begin with breakfast around the market.'),
      item('11:00 · Meiji ve Harajuku', '11:00 · Meiji & Harajuku', 'Tapınak ve moda sokaklarını birleştir.', 'Combine the shrine with fashion streets.'),
      item('15:00 · Shibuya', '15:00 · Shibuya', 'Kavşak, mağazalar ve seyir noktaları.', 'Explore the crossing, shops and viewpoints.'),
      item('19:00 · Shinjuku', '19:00 · Shinjuku', 'Ramen ve gece ışıklarıyla günü tamamla.', 'Finish with ramen and city lights.'),
    ],
  },
  {
    slug: 'istanbul',
    cityKey: 'istanbul',
    city: text('İstanbul', 'Istanbul'),
    country: text('Türkiye', 'Türkiye'),
    destination: text('İstanbul, Türkiye', 'Istanbul, Türkiye'),
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/istanbul.mp4',
    officialUrl: 'https://istanbul.goturkiye.com/',
    tagline: text('İki kıtayı vapur sesleri, tarih katmanları ve güçlü bir sokak lezzeti kültürüyle birleştiren şehir.', 'A city joining two continents through ferry sounds, layers of history and a vivid street-food culture.'),
    introduction: text('İstanbul’da aynı gün içinde çok uzak semtleri birleştirmek yerine Tarihi Yarımada, Beyoğlu ve Anadolu Yakası’nı ayrı rotalar olarak düşün. Vapur yolculuklarını yalnızca ulaşım değil, deneyimin parçası yap.', 'Treat the Historic Peninsula, Beyoğlu and the Asian side as separate routes instead of crossing long distances in one day. Make ferry rides part of the experience.'),
    idealStay: text('4–5 gün', '4–5 days'),
    bestSeason: text('Nisan–Haziran, Eylül–Ekim', 'April–June, September–October'),
    language: text('Türkçe', 'Turkish'),
    currency: text('Türk lirası (₺)', 'Turkish lira (₺)'),
    highlights: [
      item('Sultanahmet Meydanı', 'Sultanahmet Square', 'Ayasofya, Sultanahmet Camii ve Yerebatan Sarnıcı’nı aynı bölgede keşfet.', 'Explore Hagia Sophia, the Blue Mosque and Basilica Cistern in one area.'),
      item('Galata ve Karaköy', 'Galata & Karaköy', 'Yokuşlu sokaklar, tasarım dükkânları ve sahil yürüyüşü.', 'Hillside streets, design shops and a waterfront walk.'),
      item('Boğaz vapuru', 'Bosphorus ferry', 'Şehir siluetini denizden görmek için en doğal ulaşım deneyimi.', 'The most natural way to see the city skyline from the water.'),
      item('Kadıköy ve Moda', 'Kadıköy & Moda', 'Pazar, yerel lokantalar ve sahil boyunca daha gündelik İstanbul.', 'Markets, local eateries and an everyday side of Istanbul by the coast.'),
    ],
    foods: [
      item('Simit ve çay', 'Simit & tea', 'Vapur veya mahalle fırını çevresinde sade bir İstanbul klasiği.', 'A simple Istanbul classic by a ferry pier or neighborhood bakery.'),
      item('Meze ve balık', 'Meze & fish', 'Paylaşımlı küçük tabaklar ve mevsim balığıyla uzun akşam yemeği.', 'A long dinner of shared small plates and seasonal fish.'),
      item('Esnaf lokantası', 'Tradesmen’s restaurant', 'Günlük tencere yemeklerini uygun ve yerel bir öğünde keşfet.', 'Discover daily home-style dishes in an affordable local meal.'),
    ],
    neighborhoods: [
      item('Balat ve Fener', 'Balat & Fener', 'Renkli sokaklar, yokuşlar ve tarihî yapılar; yürüyüşe uygun.', 'Colorful streets, hills and historic buildings made for walking.'),
      item('Kadıköy', 'Kadıköy', 'Pazar, plakçılar, kafeler ve güçlü mahalle yaşamı.', 'A market, record shops, cafés and strong neighborhood life.'),
      item('Beşiktaş', 'Beşiktaş', 'Vapur bağlantıları, kahvaltı sokakları ve hareketli meydan.', 'Ferry links, breakfast streets and a lively square.'),
    ],
    transport: [
      text('İstanbulkart metro, tramvay, otobüs ve vapur ağında ortak kullanım sağlar.', 'Istanbulkart works across metro, tram, bus and ferry networks.'),
      text('Trafiğin yoğun olduğu saatlerde raylı sistem ve vapur daha öngörülebilirdir.', 'Rail and ferry routes are more predictable during heavy traffic.'),
      text('Tarihi Yarımada’da T1 tramvayı ve yürüyüş birçok ana durağı birbirine bağlar.', 'The T1 tram and walking connect many key stops on the Historic Peninsula.'),
    ],
    dayRoute: [
      item('08:30 · Sultanahmet', '08:30 · Sultanahmet', 'Kalabalık artmadan tarihî merkezde başla.', 'Start in the historic center before crowds build.'),
      item('12:30 · Eminönü', '12:30 · Eminönü', 'Çarşı, öğle yemeği ve Galata Köprüsü.', 'Markets, lunch and Galata Bridge.'),
      item('15:00 · Karaköy ve Galata', '15:00 · Karaköy & Galata', 'Yokuşları yavaş tempoda keşfet.', 'Explore the hills at a relaxed pace.'),
      item('19:00 · Kadıköy', '19:00 · Kadıköy', 'Vapurla geçip günü pazar çevresinde bitir.', 'Cross by ferry and finish around the market.'),
    ],
  },
  {
    slug: 'barcelona',
    cityKey: 'barcelona',
    city: text('Barcelona', 'Barcelona'),
    country: text('İspanya', 'Spain'),
    destination: text('Barcelona, İspanya', 'Barcelona, Spain'),
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/barselona.mp4',
    officialUrl: 'https://www.barcelonaturisme.com/en/home',
    tagline: text('Modernist mimariyi Akdeniz sahili, pazar kültürü ve canlı mahallelerle birleştiren kent.', 'A city combining Modernist architecture with the Mediterranean coast, market culture and lively neighborhoods.'),
    introduction: text('Barcelona’da Gaudí yapılarını rezervasyon saatlerine göre planla; Gotik Bölge, El Born ve sahili yürüyüş rotasında birleştir. Şehir merkezinde mahalleler arası geçişler kısa olduğu için tempo kolayca dengelenir.', 'Plan Gaudí sites around reservation times, then connect the Gothic Quarter, El Born and the waterfront on foot. Short distances between central neighborhoods make pacing easy.'),
    idealStay: text('3–4 gün', '3–4 days'),
    bestSeason: text('Nisan–Haziran, Eylül–Ekim', 'April–June, September–October'),
    language: text('Katalanca, İspanyolca', 'Catalan, Spanish'),
    currency: text('Euro (€)', 'Euro (€)'),
    highlights: [
      item('Sagrada Família', 'Sagrada Família', 'Gaudí’nin simge yapısı için zamanlı bilet seçeneğini önceden kontrol et.', 'Check timed-entry options in advance for Gaudí’s landmark.'),
      item('Park Güell', 'Park Güell', 'Mozaikler, park yolları ve şehir manzarasını bir arada gör.', 'Combine mosaics, garden paths and city views.'),
      item('Gotik Bölge ve El Born', 'Gothic Quarter & El Born', 'Ortaçağ sokaklarından tasarım dükkânları ve pazarlara uzanan rota.', 'A route from medieval streets to design shops and markets.'),
      item('Montjuïc ve sahil', 'Montjuïc & waterfront', 'Müze, bahçe ve deniz havasını daha sakin bir güne yay.', 'Spread museums, gardens and sea air across a slower day.'),
    ],
    foods: [
      item('Pa amb tomàquet', 'Pa amb tomàquet', 'Domates, zeytinyağı ve ekmekle hazırlanan temel Katalan lezzeti.', 'A Catalan staple of tomato, olive oil and bread.'),
      item('Tapas', 'Tapas', 'Tek mekânda uzun oturmak yerine birkaç küçük durakla çeşitlendir.', 'Sample variety through several small stops rather than one long meal.'),
      item('Crema catalana', 'Crema catalana', 'Narenciye ve tarçın aromalı, karamelize yüzeyli yerel tatlı.', 'A local custard with citrus, cinnamon and a caramelized top.'),
    ],
    neighborhoods: [
      item('Gràcia', 'Gràcia', 'Küçük meydanlar, yerel kafeler ve daha sakin akşamlar.', 'Small squares, local cafés and calmer evenings.'),
      item('El Born', 'El Born', 'Tarihî sokaklar, kültür durakları ve yaratıcı dükkânlar.', 'Historic lanes, cultural stops and creative shops.'),
      item('Barceloneta', 'Barceloneta', 'Sahil yürüyüşü ve deniz ürünleri için kıyı mahallesi.', 'A waterfront neighborhood for seaside walks and seafood.'),
    ],
    transport: [
      text('Metro merkezi bölgeler arasında hızlıdır; kısa mesafelerde yürüyüş daha keyiflidir.', 'The Metro is fast between central areas, while walking is better for short distances.'),
      text('Gaudí duraklarını aynı gün planlarken rezervasyon saatleri arasında ulaşım payı bırak.', 'Leave travel time between reserved Gaudí sites on the same day.'),
      text('Havalimanı bağlantılarında tren, metro ve otobüsü konaklama konumuna göre karşılaştır.', 'Compare train, metro and bus airport links based on where you stay.'),
    ],
    dayRoute: [
      item('09:00 · Sagrada Família', '09:00 · Sagrada Família', 'Güne rezervasyonlu ana ziyaretle başla.', 'Begin with the day’s reserved landmark.'),
      item('12:00 · Gràcia', '12:00 · Gràcia', 'Meydanlarda öğle molası ve mahalle yürüyüşü.', 'Pause for lunch and a neighborhood walk.'),
      item('15:00 · Gotik Bölge', '15:00 · Gothic Quarter', 'Tarihî merkezi El Born yönüne keşfet.', 'Explore the old center toward El Born.'),
      item('19:00 · Barceloneta', '19:00 · Barceloneta', 'Sahil ve akşam yemeğiyle günü bitir.', 'End with the waterfront and dinner.'),
    ],
  },
  {
    slug: 'newyork',
    cityKey: 'newyork',
    city: text('New York', 'New York'),
    country: text('ABD', 'USA'),
    destination: text('New York, ABD', 'New York, USA'),
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=82&w=1800&auto=format&fit=crop',
    video: '/videos/newyork.mp4',
    officialUrl: 'https://www.nyctourism.com/',
    tagline: text('Mahalleleri, müzeleri, sahneleri ve hiç durmayan sokak ritmiyle her gün başka yüzünü gösteren şehir.', 'A city revealing a different face each day through neighborhoods, museums, stages and nonstop street energy.'),
    introduction: text('New York’u bölge bölge planlamak metroda geçirilen süreyi azaltır. Aşağı Manhattan, Midtown, Central Park çevresi ve Brooklyn için ayrı gün blokları oluşturmak en rahat yaklaşımdır.', 'Plan New York by area to reduce subway time. Separate day blocks for Lower Manhattan, Midtown, Central Park and Brooklyn make the trip easier.'),
    idealStay: text('5–7 gün', '5–7 days'),
    bestSeason: text('Nisan–Haziran, Eylül–Kasım', 'April–June, September–November'),
    language: text('İngilizce', 'English'),
    currency: text('ABD doları ($)', 'US dollar ($)'),
    highlights: [
      item('Özgürlük Heykeli ve Aşağı Manhattan', 'Statue of Liberty & Lower Manhattan', 'Liman manzarası, finans bölgesi ve tarihî sokakları aynı güne ekle.', 'Combine harbor views, the Financial District and historic streets.'),
      item('Central Park ve The Met', 'Central Park & The Met', 'Müze yoğunluğunu park yürüyüşüyle dengele.', 'Balance a museum-heavy visit with a park walk.'),
      item('Times Square ve Broadway', 'Times Square & Broadway', 'Işıkları akşam gör; gösteri planlıyorsan saat çevresinde rota kur.', 'See the lights after dark and plan around showtime if attending a performance.'),
      item('High Line ve Chelsea', 'High Line & Chelsea', 'Yükseltilmiş park, galeriler ve pazar çevresinde kolay yürüyüş.', 'An easy walk through an elevated park, galleries and market stops.'),
    ],
    foods: [
      item('New York pizzası', 'New York slice', 'İnce tabanlı büyük dilimi ayaküstü klasik bir öğün olarak dene.', 'Try the large thin-crust slice as a classic quick meal.'),
      item('Bagel', 'Bagel', 'Krem peynirli veya füme balıklı seçenekle güne yerel başla.', 'Start local with cream cheese or a smoked-fish filling.'),
      item('Cheesecake', 'Cheesecake', 'Yoğun dokulu New York usulünü paylaşmalık bir tatlı olarak seç.', 'Choose the dense New York style as a dessert worth sharing.'),
    ],
    neighborhoods: [
      item('Greenwich Village', 'Greenwich Village', 'Kıvrımlı sokaklar, küçük sahneler ve kafeler.', 'Winding streets, intimate venues and cafés.'),
      item('Williamsburg', 'Williamsburg', 'Bağımsız dükkânlar, sahil manzarası ve gece hayatı.', 'Independent shops, waterfront views and nightlife.'),
      item('Harlem', 'Harlem', 'Müzik tarihi, kültür kurumları ve güçlü mahalle mutfağı.', 'Music history, cultural institutions and a strong food scene.'),
    ],
    transport: [
      text('Metro çoğu bölgeyi gün boyu bağlar; hat değişikliklerini yolculuk öncesi kontrol et.', 'The subway connects most areas throughout the day; check service changes before traveling.'),
      text('Manhattan’da cadde ve sokak numaraları yürüyerek yön bulmayı kolaylaştırır.', 'Numbered avenues and streets make walking in Manhattan easier to navigate.'),
      text('Havalimanı rotasını bagaj, saat ve konaklama bölgesine göre tren, otobüs veya taksiyle karşılaştır.', 'Compare train, bus and taxi airport routes based on luggage, time and where you stay.'),
    ],
    dayRoute: [
      item('08:30 · Central Park', '08:30 · Central Park', 'Kalabalık artmadan park yürüyüşü.', 'Walk the park before crowds build.'),
      item('10:30 · The Met', '10:30 · The Met', 'Seçili galerilere odaklanan kısa müze planı.', 'Focus on selected galleries for a manageable museum visit.'),
      item('15:00 · Fifth Avenue', '15:00 · Fifth Avenue', 'Midtown simgeleri boyunca güneye ilerle.', 'Head south through Midtown landmarks.'),
      item('19:00 · Broadway çevresi', '19:00 · Broadway area', 'Akşam yemeği, gösteri veya şehir ışıkları.', 'Dinner, a show or the city lights.'),
    ],
  },
];

export const getCityGuide = (slug?: string) => CITY_GUIDES.find((guide) => guide.slug === slug);
