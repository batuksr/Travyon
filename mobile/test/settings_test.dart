import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/services.dart'
    show MissingPluginException, PlatformException;
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/settings/data/settings_fields.dart';
import 'package:travyon/features/settings/data/settings_repository.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

class FakeSettings implements SettingsRepository {
  bool fail = false;
  Map<String, dynamic> values = {
    'displayName': 'Batu',
    'email': 'batu@example.com',
    'passwordProvider': true,
    'defaultBudget': '15000',
    'defaultCurrency': 'TRY — ₺',
    'defaultPace': 'normal',
    'defaultPeopleCount': '2',
    'passport': {'country': 'Türkiye', 'expiry': '2030-10-01'},
  };
  Map<String, dynamic>? lastSave;
  int deletes = 0, sends = 0, changes = 0;
  @override
  Future<Map<String, dynamic>> load() async => Map.of(values);
  @override
  Future<void> save(SettingsSection section, Map<String, dynamic> data) async {
    if (fail) throw StateError('Kaydedilemedi; tekrar dene.');
    lastSave = settingsPatch(section, data);
  }

  @override
  Future<void> photo(Uint8List jpeg) async {}
  @override
  Future<void> changeEmail(String email, String password) async {
    changes++;
  }

  @override
  Future<void> changePassword(String oldPassword, String newPassword) async {
    changes++;
  }

  @override
  Future<void> deleteAccount(String password) async {
    deletes++;
  }

  @override
  Future<void> support(
    String subject,
    String message, {
    required bool bug,
  }) async {
    sends++;
    if (fail) throw StateError('Gönderilemedi.');
  }

  @override
  Future<List<Map<String, dynamic>>> payments() async {
    if (fail) throw StateError('Bağlantı yok.');
    return [];
  }

  @override
  Future<String> exportData() async => '{}';
}

Widget host(Widget child, {Locale locale = const Locale('tr')}) => MaterialApp(
  theme: AppTheme.light,
  locale: locale,
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  home: child,
);
SettingsSection section(String id) =>
    settingsSections.firstWhere((s) => s.id == id);

void main() {
  test('English catalog covers every settings field definition', () {
    const strings = AppLocalizations(Locale('en'));
    for (final section in settingsSections) {
      expect(strings.text(section.title), isNot(section.title));
      if (section.note.isNotEmpty) {
        expect(strings.text(section.note), isNot(section.note));
      }
      for (final field in section.fields) {
        expect(strings.text(field.label), isNot(field.label));
      }
    }
    expect(
      settingsPatch(section('profile'), {
        'nationality': 'Turkey',
      })['nationality'],
      'Türkiye',
    );
  });

  testWidgets('profile form and discard dialog are fully English', (
    tester,
  ) async {
    final repo = FakeSettings()
      ..values.addAll({
        'username': '',
        'phone': '',
        'birthDate': '',
        'nationality': 'Türkiye',
        'gender': 'Erkek',
        'address': '',
      });
    await tester.pumpWidget(
      host(
        SettingsEditor(section: section('profile'), repository: repo),
        locale: const Locale('en'),
      ),
    );
    await tester.pumpAndSettle();

    for (final text in [
      'Profile information',
      'Full name',
      'Username',
      'Phone',
      'Date of birth',
      'Nationality',
      'Turkey',
      'Gender',
      'Male',
    ]) {
      expect(find.text(text), findsWidgets);
    }
    expect(find.text('Kullanıcı adı'), findsNothing);
    expect(find.text('Telefon'), findsNothing);
    expect(find.text('Türkiye'), findsNothing);

    await tester.enterText(find.byType(TextFormField).at(1), 'traveler');
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Address'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Discard changes?'), findsOneWidget);
    expect(find.text('Your unsaved changes will be lost.'), findsOneWidget);
    expect(find.text('Discard'), findsOneWidget);
    expect(find.text('Confirm'), findsOneWidget);
    expect(find.textContaining('Değişiklik'), findsNothing);
  });

  test('missing device plugin does not block cloud settings or hide missing passport data', () async {
    final data = await loadPassportMetadata(
      () async => throw PlatformException(code: 'channel-error'),
    );
    expect(data.containsKey('passport'), isFalse);
    expect(data['passportLoadError'], contains('flutter run'));
    expect(settingsError(MissingPluginException()), contains('Hot reload'));
    expect(await loadPassportMetadata(() async => null), {'passport': {}});
    expect(
      (await loadPassportMetadata(() async => 'broken'))['passportLoadError'],
      contains('değiştirilmedi'),
    );
    expect(
      (await loadPassportMetadata(
        () async => '{"country":"Türkiye"}',
      ))['passport'],
      {'country': 'Türkiye'},
    );
  });
  testWidgets('unavailable passport metadata blocks only passport editor', (
    tester,
  ) async {
    final repo = FakeSettings()
      ..values['passportLoadError'] = 'Cihaz eklentisi yüklenemedi.';
    await tester.pumpWidget(
      host(SettingsEditor(section: section('passport'), repository: repo)),
    );
    await tester.pumpAndSettle();
    expect(find.text('Cihaz eklentisi yüklenemedi.'), findsOneWidget);
    expect(find.text('Değişiklikleri kaydet'), findsNothing);
    await tester.pumpWidget(
      host(SettingsPage(uid: 'me', repository: repo, onSignOut: () async {})),
    );
    await tester.pumpAndSettle();
    expect(find.text('Profil bilgileri'), findsOneWidget);
    expect(
      find.textContaining('Diğer ayarlarını kullanabilirsin'),
      findsOneWidget,
    );
  });
  test(
    'settings use web fields, validate values and feed onboarding defaults',
    () {
      final travel = section('travel');
      final patch = settingsPatch(travel, {
        'defaultBudget': '2500',
        'defaultCurrency': 'JPY — ¥',
        'defaultPeopleCount': '3',
        'defaultPace': 'rahat',
        'isPro': true,
      });
      expect(patch.containsKey('isPro'), isFalse);
      final data = OnboardingData()..applyDefaults(patch);
      expect(data.budget, 2500);
      expect(data.peopleCount, 3);
      expect(data.currencyCode, 'JPY');
      expect(validateSetting(travel.fields.first, 'NaN'), isNotNull);
      expect(validateSetting(travel.fields.last, '99'), isNotNull);
      expect(
        section('profile').fields.firstWhere((f) => f.key == 'gender').options,
        contains('Kadın'),
      );
      expect(
        settingsPatch(section('notifications'), {}).containsKey('pushEnabled'),
        isFalse,
      );
    },
  );
  testWidgets('settings home fits narrow screen with large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      host(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(360, 800),
            textScaler: TextScaler.linear(1.3),
          ),
          child: SettingsPage(
            uid: 'me',
            repository: FakeSettings(),
            onSignOut: () async {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Batu'), findsOneWidget);
    expect(find.text('Profil bilgileri'), findsOneWidget);
    await tester.tap(find.byTooltip('Yenile'));
    await tester.pumpAndSettle();
    expect(find.text('Batu'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('travel save validates budget and retains edits after failure', (
    tester,
  ) async {
    final repo = FakeSettings()..fail = true;
    await tester.pumpWidget(
      host(SettingsEditor(section: section('travel'), repository: repo)),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '5');
    await tester.ensureVisible(find.text('Değişiklikleri kaydet'));
    await tester.tap(find.text('Değişiklikleri kaydet'));
    await tester.pumpAndSettle();
    expect(find.textContaining('arasında bir bütçe'), findsOneWidget);
    expect(repo.lastSave, isNull);
    await tester.enterText(find.byType(TextFormField).first, '3200');
    await tester.ensureVisible(find.text('Değişiklikleri kaydet'));
    await tester.tap(find.text('Değişiklikleri kaydet'));
    await tester.pumpAndSettle();
    expect(find.text('Kaydedilemedi; tekrar dene.'), findsOneWidget);
    expect(find.text('3200'), findsOneWidget);
    repo.fail = false;
    await tester.ensureVisible(find.text('Değişiklikleri kaydet'));
    await tester.tap(find.text('Değişiklikleri kaydet'));
    await tester.pumpAndSettle();
    expect(repo.lastSave?['defaultBudget'], '3200');
  });
  testWidgets('password mismatch never calls backend', (tester) async {
    final repo = FakeSettings();
    await tester.pumpWidget(
      host(
        SettingsActionPage(
          action: 'password',
          title: 'Şifre değiştir',
          passwordProvider: true,
          repository: repo,
        ),
      ),
    );
    await tester.enterText(find.byType(TextFormField).at(0), 'password123');
    await tester.enterText(find.byType(TextFormField).at(1), 'different123');
    await tester.enterText(find.byType(TextFormField).at(2), 'oldPassword');
    await tester.ensureVisible(find.text('Devam et'));
    await tester.tap(find.text('Devam et'));
    await tester.pumpAndSettle();
    expect(find.text('Şifreler eşleşmiyor.'), findsOneWidget);
    expect(repo.changes, 0);
  });
  testWidgets('account deletion needs phrase password and final confirmation', (
    tester,
  ) async {
    final repo = FakeSettings();
    await tester.pumpWidget(
      host(
        SettingsActionPage(
          action: 'delete',
          title: 'Hesabımı sil',
          passwordProvider: true,
          repository: repo,
        ),
      ),
    );
    await tester.tap(find.text('Hesabımı kalıcı olarak sil'));
    await tester.pumpAndSettle();
    expect(repo.deletes, 0);
    await tester.enterText(find.byType(TextFormField).first, 'HESABIMI SİL');
    await tester.enterText(find.byType(TextFormField).last, 'oldPassword');
    await tester.ensureVisible(find.text('Hesabımı kalıcı olarak sil'));
    await tester.tap(find.text('Hesabımı kalıcı olarak sil'));
    await tester.pumpAndSettle();
    expect(repo.deletes, 0);
    await tester.tap(find.text('Vazgeç'));
    await tester.pumpAndSettle();
    expect(repo.deletes, 0);
  });
  testWidgets('payment connection failure is not presented as empty history', (
    tester,
  ) async {
    final repo = FakeSettings()..fail = true;
    await tester.pumpWidget(host(PaymentsPage(repository: repo)));
    await tester.pumpAndSettle();
    expect(find.text('Bağlantı yok.'), findsOneWidget);
    repo.fail = false;
    await tester.tap(find.text('Tekrar dene'));
    await tester.pumpAndSettle();
    expect(find.text('Henüz ödeme kaydın yok.'), findsOneWidget);
  });

  testWidgets('support failure keeps text for a retry', (tester) async {
    final repo = FakeSettings()..fail = true;
    await tester.pumpWidget(
      host(
        SettingsActionPage(
          action: 'bug',
          title: 'Hata bildir',
          passwordProvider: true,
          repository: repo,
        ),
      ),
    );
    await tester.enterText(find.byType(TextFormField).first, 'Harita sorunu');
    await tester.enterText(
      find.byType(TextFormField).last,
      'Haritayı açınca boş ekran görüyorum.',
    );
    await tester.ensureVisible(find.text('Gönder'));
    await tester.tap(find.text('Gönder'));
    await tester.pumpAndSettle();
    expect(find.text('Gönderilemedi.'), findsOneWidget);
    expect(find.text('Harita sorunu'), findsOneWidget);
    repo.fail = false;
    await tester.ensureVisible(find.text('Gönder'));
    await tester.tap(find.text('Gönder'));
    await tester.pumpAndSettle();
    expect(repo.sends, 2);
    expect(find.text('Mesajın gönderildi.'), findsOneWidget);
    expect(find.text('Harita sorunu'), findsNothing);
  });

  testWidgets(
    'passport editor reads local metadata without profile overwrite',
    (tester) async {
      final repo = FakeSettings();
      await tester.pumpWidget(
        host(SettingsEditor(section: section('passport'), repository: repo)),
      );
      await tester.pumpAndSettle();
      expect(find.text('2030-10-01'), findsOneWidget);
      await tester.tap(find.text('Değişiklikleri kaydet'));
      await tester.pumpAndSettle();
      expect(repo.lastSave, {'country': 'Türkiye', 'expiry': '2030-10-01'});
    },
  );
}
