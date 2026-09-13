import '../../onboarding/data/onboarding_data.dart';

class SettingField {
  const SettingField(
    this.key,
    this.label, {
    this.initial = '',
    this.options,
    this.toggle = false,
    this.number = false,
    this.date = false,
    this.required = false,
    this.max = 100,
  });
  final String key, label;
  final Object initial;
  final Map<String, String>? options;
  final bool toggle, number, date, required;
  final int max;
}

class SettingsSection {
  const SettingsSection(this.id, this.title, this.fields, {this.note = ''});
  final String id, title, note;
  final List<SettingField> fields;
}

const settingsCurrencies = {
  'TRY — ₺': 'TRY — ₺',
  r'USD — $': r'USD — $',
  'EUR — €': 'EUR — €',
  'GBP — £': 'GBP — £',
  'JPY — ¥': 'JPY — ¥',
};
const settingsSections = [
  SettingsSection('profile', 'Profil bilgileri', [
    SettingField('displayName', 'Ad soyad', required: true),
    SettingField('username', 'Kullanıcı adı', max: 50),
    SettingField('phone', 'Telefon', max: 30),
    SettingField('birthDate', 'Doğum tarihi', date: true),
    SettingField('nationality', 'Uyruk', initial: 'Türkiye'),
    SettingField(
      'gender',
      'Cinsiyet',
      options: {
        '': 'Belirtmek istemiyorum',
        'Erkek': 'Erkek',
        'Kadın': 'Kadın',
        'Diğer': 'Diğer',
        'Belirtmek istemiyorum': 'Belirtmek istemiyorum',
      },
    ),
    SettingField('address', 'Adres', max: 300),
  ]),
  SettingsSection(
    'travel',
    'Seyahat varsayılanları',
    [
      SettingField(
        'defaultBudget',
        'Varsayılan bütçe',
        initial: '15000',
        required: true,
        number: true,
        max: 12,
      ),
      SettingField(
        'defaultCurrency',
        'Para birimi',
        initial: 'TRY — ₺',
        options: settingsCurrencies,
      ),
      SettingField(
        'defaultPace',
        'Gezi temposu',
        initial: 'normal',
        options: paces,
      ),
      SettingField(
        'defaultPeopleCount',
        'Kişi sayısı',
        initial: '2',
        required: true,
        number: true,
        max: 2,
      ),
    ],
    note: 'Yeni planların bu tercihlerle başlar. Mevcut planlarının bütçesi ve para birimi değişmez.',
  ),
  SettingsSection(
    'passport',
    'Pasaport hatırlatıcısı',
    [
      SettingField(
        'country',
        'Pasaport ülkesi',
        initial: 'Türkiye',
        required: true,
      ),
      SettingField('expiry', 'Son geçerlilik tarihi', date: true),
    ],
    note: 'Yalnızca bu cihazda, hesabına özel tutulur; web ile eşitlenmez. Pasaport numaranı kaydetmiyoruz. Bu alan vize veya giriş koşullarını doğrulamaz.',
  ),
  SettingsSection(
    'timezone',
    'Saat dilimi',
    [
      SettingField(
        'timezone',
        'Saat dilimi',
        initial: 'Europe/Istanbul (UTC+3)',
        max: 100,
        required: true,
      ),
    ],
    note: 'Web ile ortak hesap tercihi. Mobil planlardaki tarihler destinasyonun plan tarihleri olarak gösterilir. Örnek: Europe/Istanbul (UTC+3).',
  ),
  SettingsSection(
    'appearance',
    'Dil ve birimler',
    [
      SettingField(
        'language',
        'Hesap dili',
        initial: 'Türkçe',
        options: {'Türkçe': 'Türkçe', 'English': 'English'},
      ),
      SettingField(
        'distanceKm',
        'Mesafeleri kilometre göster',
        initial: true,
        toggle: true,
      ),
      SettingField(
        'tempCelsius',
        'Sıcaklığı Celsius göster',
        initial: true,
        toggle: true,
      ),
    ],
    note: 'Bu tercihler web hesabında da saklanır ve iki uygulama arasında eşitlenir. Dil, rota mesafeleri, hava durumu ve bildirimler seçtiğin biçime hemen geçer.',
  ),
  SettingsSection(
    'notifications',
    'Bildirim tercihleri',
    [
      SettingField(
        'appPlanNotif',
        'Plan bildirimleri',
        initial: true,
        toggle: true,
      ),
      SettingField(
        'appCommunityNotif',
        'Topluluk bildirimleri',
        initial: true,
        toggle: true,
      ),
      SettingField(
        'appUpdateNotif',
        'Uygulama yenilikleri',
        initial: false,
        toggle: true,
      ),
      SettingField(
        'emailPlanNotif',
        'E-postayla plan bilgileri',
        initial: true,
        toggle: true,
      ),
      SettingField(
        'emailWeeklyDigest',
        'Haftalık özet e-postası',
        initial: true,
        toggle: true,
      ),
      SettingField(
        'emailPromoNotif',
        'Kampanya e-postaları',
        initial: false,
        toggle: true,
      ),
    ],
    note: 'Plan bildirimleri seyahat hatırlatmalarını; topluluk bildirimleri takip, puan ve yeni paylaşım mesajlarını açıp kapatır. Telefon push bildirimleri ayrıca cihaz izni ve production sunucu aktivasyonu ister. E-posta gönderimi henüz bağlı değildir.',
  ),
  SettingsSection(
    'dataPrivacy',
    'Veri ve konum gizliliği',
    [
      SettingField(
        'analyticsEnabled',
        'Kullanım analizine izin ver',
        initial: false,
        toggle: true,
      ),
    ],
    note: 'Mobil uygulama şu anda konum geçmişi toplamaz. Bu tercih cihazın konum iznini değiştirmez. Diğer gizlilik tercihlerin korunur.',
  ),
  SettingsSection(
    'billing',
    'Fatura bilgileri',
    [
      SettingField(
        'identityNumber',
        'T.C. kimlik numarası',
        max: 11,
        number: true,
        required: true,
      ),
      SettingField('billingCity', 'Fatura şehri', required: true),
    ],
    note: 'Webdeki faturalandırma alanlarıyla ortaktır. Yalnızca fatura düzenlenmesi için gerekiyorsa doldur.',
  ),
];

String? validateSetting(SettingField field, String value) {
  final text = value.trim();
  if (field.required && text.isEmpty) return 'Bu alanı doldur.';
  if (text.length > field.max) return 'En fazla ${field.max} karakter gir.';
  if (field.key == 'defaultBudget') {
    final n = double.tryParse(text);
    if (n == null || !n.isFinite || n < 100 || n > 1000000000) {
      return '100 ile 1.000.000.000 arasında bir bütçe gir.';
    }
  }
  if (field.key == 'defaultPeopleCount') {
    final n = int.tryParse(text);
    if (n == null || n < 1 || n > 15) return '1–15 kişi seç.';
  }
  if (field.key == 'identityNumber' && !RegExp(r'^\d{11}$').hasMatch(text)) {
    return '11 rakam gir.';
  }
  if (field.date && text.isNotEmpty) {
    final parsed = DateTime.tryParse(text);
    if (parsed == null || dateKey(parsed) != text) {
      return 'Geçerli bir tarih seç.';
    }
    final today = DateTime.now();
    if (field.key == 'birthDate' && parsed.isAfter(today)) {
      return 'Doğum tarihi gelecekte olamaz.';
    }
  }
  return null;
}

Map<String, dynamic> settingsPatch(
  SettingsSection section,
  Map<String, dynamic> values,
) => {
  for (final f in section.fields)
    f.key: f.toggle
        ? values[f.key] == true
        : _canonicalSettingValue(f, '${values[f.key] ?? f.initial}'.trim()),
};

String _canonicalSettingValue(SettingField field, String value) {
  if ((field.key == 'nationality' || field.key == 'country') &&
      value == 'Turkey') {
    return 'Türkiye';
  }
  return value;
}
