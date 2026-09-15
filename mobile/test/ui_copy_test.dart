import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';

void main() {
  test('everyday screens avoid redundant cross-platform explanations', () {
    final redundant = RegExp(
      r'webde|webte|web ve mobil|web ile ortak|web hesab|web ve telefon|telefonunda|aynı hesap|her cihazdan',
      caseSensitive: false,
    );
    final paths = Directory('lib/features')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) {
          final path = file.path.replaceAll('\\', '/');
          // Shared FAQ/legal content and development diagnostics are not
          // marketing captions. Keep safety and device-storage notices intact.
          return path.endsWith('.dart') &&
              (path.contains('/presentation/') ||
                  path.endsWith('/settings_fields.dart') ||
                  path.endsWith('/help_content.dart'));
        });
    for (final file in paths) {
      final copy = file
          .readAsLinesSync()
          .where((line) => !line.trimLeft().startsWith('//'))
          .join('\n');
      expect(redundant.hasMatch(copy), isFalse, reason: file.path);
    }
  });

  test('simplified copy has English translations and preserves important warnings', () {
    const strings = AppLocalizations(Locale('en'));
    const copy = {
      'Keşfetmek istediğin şehri seç, ilk rotanı birlikte oluşturalım.':
          'Choose a city to explore and let’s create your first route.',
      'Hesabını oluştur, bir sonraki yolculuğunu planla.':
          'Create your account and plan your next journey.',
      'E-posta adresini değiştirmek için yeni adresini doğrula.':
          'Verify your new address to change your email.',
      'Güçlü bir şifre seçerek hesabını güvende tut.':
          'Keep your account secure with a strong password.',
      'Tercih ettiğin saat dilimini şehir adıyla bul.':
          'Find your preferred time zone by city name.',
      'Şehir veya bölgeye göre seçim': 'Choose by city or region',
      'Dil ve birim seçimlerin kaydettikten sonra uygulanır.':
          'Your language and unit choices take effect after saving.',
      'Planlardaki tarihler destinasyonun plan tarihleri olarak gösterilir.':
          'Dates in plans are shown as the destination’s planned dates.',
      'Yalnızca fatura düzenlenmesi için gerekiyorsa doldur.':
          'Complete this only when it is required for invoicing.',
      'Pasaport bilgim nerede saklanır?':
          'Where is my passport information stored?',
      'Yalnızca bu cihazda, hesabına özel tutulur. Pasaport numaranı kaydetmiyoruz. Bu alan vize veya giriş koşullarını doğrulamaz.': 'Stored privately on this device only. We do not save your passport number. This does not verify visa or entry requirements.',
      'Plan paylaşımını kapatmak mevcut paylaşımlarını bağlantıya özel yapar; bağlantıya sahip kişiler açabilir.': 'Disabling plan sharing makes existing shares link-only; anyone with the link can open them.',
      '“{title}” cüzdanından kaldırılacak. Bu işlem geri alınamaz.':
          '“{title}” will be removed from your wallet. This cannot be undone.',
      'Plan hesabından silinir; varsa paylaşımı kaldırılır. Cüzdan kayıtların arşivlenmiş plan grubunda korunur. Plan silme geri alınamaz.': 'The plan will be deleted from your account and any share will be removed. Wallet items are preserved under archived plans. Deleting a plan cannot be undone.',
    };
    for (final entry in copy.entries) {
      expect(strings.text(entry.key), entry.value);
    }
  });
}
