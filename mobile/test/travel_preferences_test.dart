import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_locale_controller.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/settings/data/settings_fields.dart';
import 'package:travyon/features/settings/presentation/account_widgets.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'account_pages_test.dart' show AccountSettings, enter, tap;
import 'welcome_screen_test.dart' show host;

SettingsSection section(String id) =>
    settingsSections.firstWhere((s) => s.id == id);
Widget page(String id, AccountSettings repo) =>
    SettingsEditor(section: section(id), repository: repo);

Widget appearanceHost(
  AccountSettings repo,
  AppLocaleController locale,
  AppUnitController units,
) => AppLocaleScope(
  controller: locale,
  child: AppUnitScope(
    controller: units,
    child: AnimatedBuilder(
      animation: locale,
      builder: (context, _) => MaterialApp(
        theme: AppTheme.light,
        locale: locale.locale,
        supportedLocales: const [Locale('tr'), Locale('en')],
        localizationsDelegates: const [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        home: page('appearance', repo),
      ),
    ),
  ),
);

void main() {
  testWidgets('settings introductions keep description and app bar title', (
    tester,
  ) async {
    final repo = AccountSettings();
    await tester.pumpWidget(host(page('passport', repo)));
    await tester.pumpAndSettle();
    final intro = find.byType(AccountHeader);
    expect(intro, findsOneWidget);
    expect(
      find.descendant(of: intro, matching: find.byType(Text)),
      findsOneWidget,
    );
    expect(
      find.descendant(of: intro, matching: find.byType(Icon)),
      findsNothing,
    );
    expect(find.text('Yolculuk öncesi bir kontrol.'), findsNothing);
    expect(
      find.text('Pasaportunun son geçerlilik tarihini burada takip et.'),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.text(section('passport').title),
      ),
      findsOneWidget,
    );
    expect(repo.saves, 0);
    expect(tester.takeException(), isNull);
  });

  for (final id in ['travel', 'passport', 'timezone', 'appearance']) {
    for (final language in ['tr', 'en']) {
      for (final size in [const Size(320, 640), const Size(640, 360)]) {
        testWidgets('$id $language fits $size at 200% text and with keyboard', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetViewInsets);
          final repo = AccountSettings();
          await tester.pumpWidget(
            host(page(id, repo), language: language, scale: 2),
          );
          await tester.pumpAndSettle();
          expect(repo.loads, 1);
          expect(
            find.text(
              AppLocalizations(Locale(language)).text(section(id).title),
            ),
            findsWidgets,
          );
          if (id != 'appearance') {
            await enter(tester, switch (id) {
              'travel' => 'preference-defaultBudget',
              'passport' => 'preference-country',
              _ => 'preference-timezone',
            }, id == 'travel' ? '2400' : 'Example');
          }
          tester.view.viewInsets = const FakeViewPadding(bottom: 160);
          await tester.pumpAndSettle();
          await tester.ensureVisible(
            find.byKey(const ValueKey('preferences-save')),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(repo.saves, 0);
        });
      }
    }

    testWidgets(
      '$id keeps edits on failure and protects back navigation while saving',
      (tester) async {
        final repo = AccountSettings()..fail = true;
        final locale = AppLocaleController.testing();
        final units = AppUnitController.testing();
        addTearDown(locale.dispose);
        addTearDown(units.dispose);
        await tester.pumpWidget(
          AppLocaleScope(
            controller: locale,
            child: AppUnitScope(
              controller: units,
              child: host(
                Scaffold(
                  body: Builder(
                    builder: (context) => TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(builder: (_) => page(id, repo)),
                      ),
                      child: const Text('Open'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        if (id == 'appearance') {
          await tap(tester, 'distanceKm-false');
        } else {
          await enter(tester, switch (id) {
            'travel' => 'preference-defaultBudget',
            'passport' => 'preference-country',
            _ => 'preference-timezone',
          }, id == 'travel' ? '3200' : 'Example');
        }
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(find.text('Değişikliklerden vazgeç?'), findsOneWidget);
        await tester.tap(find.text('Düzenlemeye dön'));
        await tester.pumpAndSettle();
        await tap(tester, 'preferences-save');
        expect(find.text('Kaydedilemedi; tekrar dene.'), findsOneWidget);
        expect(repo.saves, 1);
        expect(repo.lastSave, isNull);
        repo.fail = false;
        repo.pending = Completer<void>();
        await tap(tester, 'preferences-save', settle: false);
        expect(repo.saves, 2);
        await tester.binding.handlePopRoute();
        await tester.pump();
        expect(find.text('Değişikliklerden vazgeç?'), findsNothing);
        expect(find.byType(SettingsEditor), findsOneWidget);
        final button = tester.widget<FilledButton>(
          find.descendant(
            of: find.byKey(const ValueKey('preferences-save')),
            matching: find.byType(FilledButton),
          ),
        );
        expect(button.onPressed, isNull);
        repo.pending!.complete();
        await tester.pumpAndSettle();
        expect(
          repo.lastSave!.keys.toSet(),
          section(id).fields.map((f) => f.key).toSet(),
        );
        expect(find.text('Değişikliklerin kaydedildi.'), findsOneWidget);
        await tester.tap(find.byTooltip('Geri'));
        await tester.pumpAndSettle();
        expect(find.text('Open'), findsOneWidget);
        expect(find.byType(SettingsEditor), findsNothing);
      },
    );

    testWidgets(
      '$id load failure prevents writing defaults and supports retry',
      (tester) async {
        final repo = AccountSettings()..loadFails = true;
        await tester.pumpWidget(host(page(id, repo)));
        await tester.pumpAndSettle();
        expect(find.text('Ayarlar yüklenemedi.'), findsOneWidget);
        expect(find.byKey(const ValueKey('preferences-save')), findsNothing);
        repo.loadFails = false;
        await tester.tap(find.text('Tekrar dene'));
        await tester.pumpAndSettle();
        expect(repo.loads, 2);
        expect(find.byKey(const ValueKey('preferences-save')), findsOneWidget);
        expect(repo.saves, 0);
      },
    );
  }

  testWidgets(
    'travel choices save canonical web defaults and bound group size',
    (tester) async {
      final repo = AccountSettings();
      await tester.pumpWidget(host(page('travel', repo), language: 'en'));
      await tester.pumpAndSettle();
      await enter(tester, 'preference-defaultBudget', '2500');
      await tap(tester, 'preference-defaultCurrency');
      await tester.tap(find.text('EUR — €').last);
      await tester.pumpAndSettle();
      await tap(tester, 'people-decrease');
      expect(
        tester
            .widget<IconButton>(find.byKey(const ValueKey('people-decrease')))
            .onPressed,
        isNull,
      );
      for (var i = 0; i < 14; i++) {
        await tap(tester, 'people-increase');
      }
      expect(
        tester
            .widget<IconButton>(find.byKey(const ValueKey('people-increase')))
            .onPressed,
        isNull,
      );
      await tap(tester, 'defaultPace-rahat');
      expect(find.text('Relaxed'), findsOneWidget);
      expect(find.text('Bol mola, sakin keşif'), findsNothing);
      expect(find.text('kişi'), findsNothing);
      await tap(tester, 'preferences-save');
      expect(repo.lastSave, {
        'defaultBudget': '2500',
        'defaultCurrency': 'EUR — €',
        'defaultPeopleCount': '15',
        'defaultPace': 'rahat',
      });
    },
  );

  testWidgets(
    'appearance previews draft units/language and applies only after successful save',
    (tester) async {
      final repo = AccountSettings()..fail = true;
      final locale = AppLocaleController.testing();
      final units = AppUnitController.testing();
      addTearDown(locale.dispose);
      addTearDown(units.dispose);
      await tester.pumpWidget(appearanceHost(repo, locale, units));
      await tester.pumpAndSettle();
      expect(find.text('2,4 km'), findsOneWidget);
      await tap(tester, 'language-English');
      await tap(tester, 'distanceKm-false');
      await tap(tester, 'tempCelsius-false');
      expect(find.text('1.5 mi'), findsOneWidget);
      expect(find.text('75°F'), findsOneWidget);
      expect(locale.locale.languageCode, 'tr');
      expect(units.distanceKm, isTrue);
      await tap(tester, 'preferences-save');
      expect(locale.locale.languageCode, 'tr');
      expect(units.tempCelsius, isTrue);
      repo.fail = false;
      await tap(tester, 'preferences-save');
      expect(repo.lastSave, {
        'language': 'English',
        'distanceKm': false,
        'tempCelsius': false,
      });
      expect(locale.locale.languageCode, 'en');
      expect(units.distanceKm, isFalse);
      expect(units.tempCelsius, isFalse);
      expect(find.text('Language and units'), findsOneWidget);
      expect(find.text('Your changes have been saved.'), findsOneWidget);
      expect(find.text('Mesafe birimi'), findsNothing);
    },
  );

  testWidgets(
    'passport calendar, expiry warning and clearing use only local fields',
    (tester) async {
      final repo = AccountSettings()
        ..values['passport'] = {'country': 'Türkiye', 'expiry': '2020-01-01'};
      await tester.pumpWidget(host(page('passport', repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('Turkey'), findsOneWidget);
      expect(find.text('The saved expiry date has passed.'), findsOneWidget);
      expect(
        find.textContaining('Stored privately on this device only.'),
        findsOneWidget,
      );
      await tester.ensureVisible(find.byTooltip('Choose a date'));
      await tester.tap(find.byTooltip('Choose a date'));
      await tester.pumpAndSettle();
      expect(find.byType(DatePickerDialog), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      await tap(tester, 'expiry-clear');
      expect(find.text('Add the expiry date.'), findsOneWidget);
      await tap(tester, 'preferences-save');
      expect(repo.lastSave, {'country': 'Türkiye', 'expiry': ''});
    },
  );

  testWidgets(
    'passport calendar day count includes today without timezone drift',
    (tester) async {
      final repo = AccountSettings()
        ..values['passport'] = {
          'country': 'Türkiye',
          'expiry': dateKey(DateTime.now()),
        };
      await tester.pumpWidget(host(page('passport', repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('The saved expiry date is today.'), findsOneWidget);
    },
  );

  testWidgets(
    'timezone picker searches, preserves custom values and saves web key',
    (tester) async {
      final repo = AccountSettings()..values['timezone'] = 'Custom/Existing';
      await tester.pumpWidget(host(page('timezone', repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('Custom/Existing'), findsOneWidget);
      await tap(tester, 'timezone-choose');
      expect(find.text('Custom/Existing'), findsWidgets);
      await tester.enterText(
        find.byKey(const ValueKey('timezone-search')),
        'İstanbul',
      );
      await tester.pumpAndSettle();
      expect(find.text('Europe/Istanbul'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('timezone-search')),
        'none match',
      );
      await tester.pumpAndSettle();
      expect(find.text('No matching time zones.'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('timezone-search')),
        'new york',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('America/New York'));
      await tester.pumpAndSettle();
      expect(find.text('America/New_York (UTC-5)'), findsOneWidget);
      expect(repo.saves, 0);
      await tap(tester, 'preferences-save');
      expect(repo.lastSave, {'timezone': 'America/New_York (UTC-5)'});
    },
  );

  testWidgets(
    'timezone picker fits narrow screen with large text and keyboard',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpWidget(
        host(page('timezone', AccountSettings()), language: 'en', scale: 2),
      );
      await tester.pumpAndSettle();
      await tap(tester, 'timezone-choose');
      tester.view.viewInsets = const FakeViewPadding(bottom: 260);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('timezone-search')),
        'rome',
      );
      await tester.pumpAndSettle();
      expect(find.text('Europe/Rome'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
