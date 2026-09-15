import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/core/theme/app_theme_controller.dart';
import 'package:travyon/core/widgets/app_dialog.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/presentation/plan_route_map.dart';
import 'package:travyon/features/plans/presentation/plan_stop_card.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';
import 'package:travyon/features/settings/presentation/theme_settings_page.dart';

import 'account_pages_test.dart' show AccountSettings, page;
import 'plan_route_map_test.dart' show FakePlaces, point;
import 'widget_test.dart' show FakeAuthRepository;

Widget themeHost(
  Widget child,
  AppThemeController controller, {
  String language = 'tr',
  double scale = 1,
}) => AppThemeScope(
  controller: controller,
  child: ListenableBuilder(
    listenable: controller,
    builder: (context, _) => MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: controller.mode,
      locale: Locale(language),
      supportedLocales: const [Locale('tr'), Locale('en')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: child,
    ),
  ),
);

double contrast(Color a, Color b) {
  final values = [a.computeLuminance(), b.computeLuminance()]..sort();
  return (values.last + .05) / (values.first + .05);
}

void main() {
  test('missing platform storage cannot block app startup', () async {
    final controller = await AppThemeController.load();
    expect(controller.mode, ThemeMode.system);
    await controller.setMode(ThemeMode.dark);
    expect(controller.mode, ThemeMode.dark);
    controller.dispose();
  });
  test(
    'all saved modes restore; unknown or unreadable storage follows system',
    () async {
      for (final saved in [null, 'unexpected', 'light', 'dark', 'system']) {
        final controller = await AppThemeController.load(
          read: () async => saved,
          write: (_) async {},
        );
        expect(controller.mode, switch (saved) {
          'light' => ThemeMode.light,
          'dark' => ThemeMode.dark,
          _ => ThemeMode.system,
        });
        controller.dispose();
      }
      final controller = await AppThemeController.load(
        read: () async => throw StateError('unavailable'),
        write: (_) async {},
      );
      expect(controller.mode, ThemeMode.system);
      controller.dispose();
    },
  );

  test(
    'theme persists without an account and survives controller reload',
    () async {
      String? saved;
      final controller = await AppThemeController.load(
        read: () async => saved,
        write: (value) async => saved = value,
      );
      await controller.setMode(ThemeMode.dark);
      expect(saved, 'dark');
      final restored = await AppThemeController.load(
        read: () async => saved,
        write: (_) async {},
      );
      expect(restored.mode, ThemeMode.dark);
      controller.dispose();
      restored.dispose();
    },
  );

  test('rapid changes write in order and storage failure does not break appearance', () async {
    final firstWrite = Completer<void>();
    final writes = <String>[];
    final controller = await AppThemeController.load(
      read: () async => null,
      write: (value) async {
        writes.add(value);
        if (value == 'dark') await firstWrite.future;
        if (value == 'light') throw StateError('storage unavailable');
      },
    );
    final first = controller.setMode(ThemeMode.dark);
    final second = controller.setMode(ThemeMode.light);
    final third = controller.setMode(ThemeMode.system);
    expect(controller.mode, ThemeMode.system);
    await Future<void>.delayed(Duration.zero);
    expect(writes, ['dark']);
    firstWrite.complete();
    await Future.wait([first, second, third]);
    expect(writes, ['dark', 'light', 'system']);
    expect(controller.mode, ThemeMode.system);
    controller.dispose();
  });

  test('dark text and semantic accents retain readable contrast', () {
    const colors = AppPalette.dark;
    for (final background in [
      colors.background,
      colors.surface,
      colors.greenTint,
      colors.orangeTint,
      colors.redTint,
    ]) {
      for (final foreground in [colors.text, colors.muted, colors.forest]) {
        expect(contrast(foreground, background), greaterThanOrEqualTo(4.5));
      }
    }
    expect(contrast(colors.onAccent, colors.accent), greaterThanOrEqualTo(4.5));
    expect(contrast(colors.danger, colors.redTint), greaterThanOrEqualTo(4.5));
    expect(AppTheme.dark.bottomSheetTheme.backgroundColor, colors.surface);
    expect(AppTheme.dark.dialogTheme.backgroundColor, colors.surface);
    expect(AppTheme.dark.navigationBarTheme.backgroundColor, colors.surface);
  });

  testWidgets(
    'real app follows system brightness and keeps open routes when theme changes',
    (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      final controller = AppThemeController.testing();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        TravyonApp(
          authRepository: FakeAuthRepository(session: null),
          themeController: controller,
        ),
      );
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(Scaffold).first)).brightness,
        Brightness.dark,
      );
      await tester.ensureVisible(find.byKey(const ValueKey('welcome-sign-in')));
      await tester.tap(find.byKey(const ValueKey('welcome-sign-in')));
      await tester.pumpAndSettle();
      expect(find.text('Tekrar hoş geldin'), findsOneWidget);
      await tester.enterText(
        find.byType(TextField).first,
        'traveler@example.test',
      );
      await controller.setMode(ThemeMode.light);
      await tester.pumpAndSettle();
      expect(find.text('Tekrar hoş geldin'), findsOneWidget);
      expect(find.text('traveler@example.test'), findsOneWidget);
      expect(
        Theme.of(tester.element(find.byType(Scaffold).last)).brightness,
        Brightness.light,
      );
      await controller.setMode(ThemeMode.system);
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(Scaffold).last)).brightness,
        Brightness.dark,
      );
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(Scaffold).last)).brightness,
        Brightness.light,
      );
      expect(tester.takeException(), isNull);
    },
  );

  for (final language in ['tr', 'en']) {
    for (final size in [const Size(320, 640), const Size(640, 360)]) {
      testWidgets(
        'theme choices remain usable in $language at $size with large text',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final controller = AppThemeController.testing();
          addTearDown(controller.dispose);
          await tester.pumpWidget(
            themeHost(
              const ThemeSettingsPage(),
              controller,
              language: language,
              scale: 2,
            ),
          );
          await tester.pumpAndSettle();
          for (final mode in [
            ThemeMode.dark,
            ThemeMode.light,
            ThemeMode.system,
          ]) {
            final choice = find.byKey(ValueKey('theme-${mode.name}'));
            await tester.ensureVisible(choice);
            await tester.pumpAndSettle();
            await tester.tap(choice);
            await tester.pumpAndSettle();
            expect(controller.mode, mode);
            expect(tester.takeException(), isNull);
          }
          expect(
            find.text(
              language == 'en' ? 'Make it your own' : 'Sana uygun görünüm',
            ),
            findsOneWidget,
          );
          expect(
            find.text(language == 'en' ? 'System setting' : 'Sistem ayarı'),
            findsOneWidget,
          );
          expect(
            find.text(language == 'en' ? 'Dark' : 'Karanlık'),
            findsOneWidget,
          );
        },
      );
    }
  }

  testWidgets('settings header has no actions and theme opens from its menu', (
    tester,
  ) async {
    final repository = AccountSettings();
    final controller = AppThemeController.testing();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      themeHost(
        SettingsPage(uid: 'me', repository: repository, onSignOut: () async {}),
        controller,
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.widget<AppBar>(find.byType(AppBar)).actions, isNull);
    await tester.scrollUntilVisible(
      find.text('Tema'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tema'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('theme-dark')));
    await tester.tap(find.byKey(const ValueKey('theme-dark')));
    await tester.pumpAndSettle();
    expect(controller.mode, ThemeMode.dark);
    expect(repository.saves, 0);
    expect(tester.takeException(), isNull);
  });

  for (final kind in ['profile', 'email', 'password']) {
    testWidgets('$kind forms use dark surfaces without changing data', (
      tester,
    ) async {
      final repository = AccountSettings();
      final controller = AppThemeController.testing(ThemeMode.dark);
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        themeHost(page(kind, repository), controller, language: 'en'),
      );
      await tester.pumpAndSettle();
      final context = tester.element(find.byType(Scaffold));
      expect(
        Theme.of(context).scaffoldBackgroundColor,
        AppPalette.dark.background,
      );
      expect(
        Theme.of(context).inputDecorationTheme.fillColor,
        AppPalette.dark.surface,
      );
      expect(repository.saves, 0);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'stop cards and confirmation use dark surfaces and keep actions',
    (tester) async {
      final controller = AppThemeController.testing(ThemeMode.dark);
      addTearDown(controller.dispose);
      var notes = 0;
      await tester.pumpWidget(
        themeHost(
          Scaffold(
            body: PlanStopCard(
              stop: PlanStop({
                'placeName': 'Kolezyum',
                'estimatedCost': 20,
                'description': 'Roma',
              }, 0),
              symbol: '€',
              busy: false,
              canMoveUp: false,
              canMoveDown: true,
              onComplete: () {},
              onAction: (_) => notes++,
            ),
          ),
          controller,
        ),
      );
      await tester.pumpAndSettle();
      final material = tester.widget<Material>(
        find
            .descendant(
              of: find.byType(PlanStopCard),
              matching: find.byType(Material),
            )
            .first,
      );
      expect(material.color, AppPalette.dark.surface);
      final number = tester.widget<Text>(find.text('1'));
      expect(
        number.style!.color,
        AppPalette.dark.tone(const Color(0xFFA74F21)),
      );
      await tester.tap(find.text('Not ekle'));
      expect(notes, 1);
      final context = tester.element(find.byType(PlanStopCard));
      final dialog = showAppConfirmation(
        context,
        title: 'Çıkış yapılsın mı?',
        message: 'Kayıtlı planların hesabında kalır.',
        confirmLabel: 'Çıkış yap',
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<Dialog>(find.byType(Dialog)).backgroundColor,
        AppPalette.dark.surface,
      );
      final button = tester.widget<FilledButton>(
        find.byKey(const ValueKey('dialog-confirm')),
      );
      expect(
        contrast(
          button.style!.foregroundColor!.resolve({})!,
          button.style!.backgroundColor!.resolve({})!,
        ),
        greaterThanOrEqualTo(4.5),
      );
      await tester.tap(find.byKey(const ValueKey('dialog-cancel')));
      await tester.pumpAndSettle();
      expect(await dialog, isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('route map changes style without losing selected stop', (
    tester,
  ) async {
    final controller = AppThemeController.testing(ThemeMode.light);
    addTearDown(controller.dispose);
    GoogleMap? map;
    await tester.pumpWidget(
      themeHost(
        Scaffold(
          body: SizedBox(
            height: 500,
            child: PlanRouteMap(
              day: PlanDay({
                'activities': [
                  point('Kolezyum', 41.89, 12.49),
                  point('Pantheon', 41.90, 12.47),
                ],
              }, 0),
              placesRepository: FakePlaces(),
              onDirections: (_) {},
              mapBuilder: (value) {
                map = value;
                return const SizedBox.expand();
              },
            ),
          ),
        ),
        controller,
      ),
    );
    await tester.pumpAndSettle();
    final lightStyle = map!.style;
    map!.markers.last.onTap!();
    await tester.pumpAndSettle();
    await controller.setMode(ThemeMode.dark);
    await tester.pumpAndSettle();
    expect(map!.style, isNot(lightStyle));
    expect(jsonDecode(map!.style!), isA<List<dynamic>>());
    expect(map!.style, contains('#2b241d'));
    expect(find.text('Pantheon'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
