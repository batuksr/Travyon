import 'help_content.generated.dart';

enum HelpSection { faq, privacy, terms, contact }

class HelpContent {
  HelpContent(String language)
    : _data = sharedHelpContent[language] ?? sharedHelpContent['tr']!;

  final Map<String, dynamic> _data;
  String text(String key) => _data[key] as String;
  String tab(HelpSection section) => _data['tabs'][section.name] as String;
  Map<String, dynamic> page(HelpSection section) =>
      _data[section.name] as Map<String, dynamic>;
  List<Map<String, dynamic>> sections(HelpSection section) =>
      (page(section)['sections'] as List).cast<Map<String, dynamic>>();
}

// Mobile-specific answers supplement (rather than replace) the shared web FAQ.
const mobileFaqItems = [
  (
    'Tercihlerim eski planımı değiştirir mi?',
    'Hayır. Seyahat varsayılanları yalnızca yeni oluşturduğun planın başlangıç seçimlerini belirler.',
  ),
  (
    'Cüzdanım toplulukta görünür mü?',
    'Hayır. Cüzdan kayıtları sana özeldir. Topluluk paylaşımı seçtiğin rotayı yayınlar.',
  ),
  (
    'Pasaport bilgim nerede saklanır?',
    'Ülke ve geçerlilik tarihi bu cihazda hesabına özel saklanır. Pasaport numarası istenmez.',
  ),
  (
    'Harita neden açılmıyor?',
    'İnternet bağlantını kontrol et. Geliştirme sürümünde Google Maps anahtarıyla yeniden başlatılması gerekebilir.',
  ),
];
