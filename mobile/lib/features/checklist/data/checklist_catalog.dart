class TravelChecklistItem {
  const TravelChecklistItem({
    required this.id,
    required this.label,
    required this.tip,
  });

  final String id;
  final String label;
  final String tip;
}

class TravelChecklistGroup {
  const TravelChecklistGroup({
    required this.id,
    required this.title,
    required this.items,
  });

  final String id;
  final String title;
  final List<TravelChecklistItem> items;
}

const travelChecklistGroups = <TravelChecklistGroup>[
  TravelChecklistGroup(
    id: 'documents',
    title: 'Belgeler',
    items: [
      TravelChecklistItem(
        id: 'passport',
        label: 'Pasaport / Kimlik kartı',
        tip: 'Geçerlilik süresini ve bitiş tarihini kontrol et.',
      ),
      TravelChecklistItem(
        id: 'visa',
        label: 'Vize / Seyahat izni',
        tip: 'Hedef ülkenin vize şartlarını önceden araştır.',
      ),
      TravelChecklistItem(
        id: 'ticket',
        label: 'Uçuş bileti (çıktı veya dijital)',
        tip: 'Online check-in yaptıysan biniş kartını indir.',
      ),
      TravelChecklistItem(
        id: 'hotel',
        label: 'Otel / konaklama rezervasyonu',
        tip: 'Rezervasyon onayını e-postana veya telefonuna kaydet.',
      ),
      TravelChecklistItem(
        id: 'insurance',
        label: 'Seyahat sigortası',
        tip: 'Poliçe numarasını telefonuna kaydet.',
      ),
      TravelChecklistItem(
        id: 'emergency',
        label: 'Acil iletişim bilgileri',
        tip: 'Elçilik, yerel acil durum ve sigorta numaralarını kaydet.',
      ),
    ],
  ),
  TravelChecklistGroup(
    id: 'money',
    title: 'Para & Finans',
    items: [
      TravelChecklistItem(
        id: 'cash',
        label: 'Nakit para (yerel para birimi)',
        tip: 'İlk ihtiyaçların için yanında küçük bir tutar bulundur.',
      ),
      TravelChecklistItem(
        id: 'card',
        label: 'Banka kartı yurt dışı bildirimi',
        tip: 'Bankanı seyahat tarihlerin için bilgilendir.',
      ),
      TravelChecklistItem(
        id: 'backup',
        label: 'Yedek kart / acil para',
        tip: 'Ana cüzdanından farklı ve güvenli bir yerde sakla.',
      ),
    ],
  ),
  TravelChecklistGroup(
    id: 'health',
    title: 'Sağlık & Güvenlik',
    items: [
      TravelChecklistItem(
        id: 'medicine',
        label: 'Düzenli ilaçlar (yeterli dozda)',
        tip: 'Reçeteni ve seyahat boyunca yetecek miktarı yanına al.',
      ),
      TravelChecklistItem(
        id: 'firstaid',
        label: 'Temel ilk yardım malzemeleri',
        tip: 'Ağrı kesici, yara bandı ve antiseptik ekle.',
      ),
      TravelChecklistItem(
        id: 'sunscreen',
        label: 'Güneş kremi / böcek ilacı',
        tip: 'Hedefin iklimine uygun koruyucu seç.',
      ),
      TravelChecklistItem(
        id: 'vaccine',
        label: 'Aşı / sağlık sertifikası',
        tip: 'Hedef ülkenin güncel giriş şartlarını kontrol et.',
      ),
    ],
  ),
  TravelChecklistGroup(
    id: 'tech',
    title: 'Teknoloji & Ulaşım',
    items: [
      TravelChecklistItem(
        id: 'charger',
        label: 'Telefon şarj aleti & adaptör',
        tip: 'Hedef ülkenin priz tipini kontrol et.',
      ),
      TravelChecklistItem(
        id: 'powerbank',
        label: 'Taşınabilir şarj cihazı',
        tip: 'Uçuş kurallarını kontrol edip el bagajına yerleştir.',
      ),
      TravelChecklistItem(
        id: 'simcard',
        label: 'Yerel SIM veya dolaşım paketi',
        tip: 'eSIM ve operatör seçeneklerini karşılaştır.',
      ),
      TravelChecklistItem(
        id: 'offline',
        label: 'Çevrimdışı haritayı indir',
        tip: 'İnternet olmadan da rotanı görebilmek için hazırla.',
      ),
      TravelChecklistItem(
        id: 'transport',
        label: 'Ulaşım kartı / transfer planı',
        tip: 'Havalimanından konaklamana ulaşımı önceden planla.',
      ),
    ],
  ),
  TravelChecklistGroup(
    id: 'luggage',
    title: 'Bavul & Kişisel',
    items: [
      TravelChecklistItem(
        id: 'clothes',
        label: 'Hava durumuna uygun kıyafetler',
        tip: 'Güncel tahmine göre katmanlı parçalar hazırla.',
      ),
      TravelChecklistItem(
        id: 'shoes',
        label: 'Rahat yürüyüş ayakkabısı',
        tip: 'Uzun şehir yürüyüşlerine uygun bir çift seç.',
      ),
      TravelChecklistItem(
        id: 'lock',
        label: 'Bagaj kilidi',
        tip: 'Gerekiyorsa TSA uyumlu bir kilit kullan.',
      ),
      TravelChecklistItem(
        id: 'copies',
        label: 'Belge kopyaları (fotoğraf / e-posta)',
        tip: 'Pasaport ve bilet kopyalarını güvenli bir yerde sakla.',
      ),
      TravelChecklistItem(
        id: 'notify',
        label: 'Ev / işyerine haber ver',
        tip: 'Güvendiğin biriyle temel seyahat bilgilerini paylaş.',
      ),
    ],
  ),
];

final Set<String> travelChecklistItemIds = Set.unmodifiable(
  travelChecklistGroups.expand((group) => group.items.map((item) => item.id)),
);

final int travelChecklistTotal = travelChecklistItemIds.length;
