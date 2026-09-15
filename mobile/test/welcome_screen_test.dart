import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/bootstrap/presentation/mobile_bootstrap_page.dart';
import 'package:travyon/features/bootstrap/presentation/welcome_travel_scene.dart';

import 'widget_test.dart' show FakeAuthRepository;

Widget host(Widget child, {String language = 'tr', double scale = 1}) =>
    MaterialApp(
      theme: AppTheme.light,
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
    );

void main() {
  for (final language in ['tr', 'en']) {
    for (final size in [
      const Size(320, 640),
      const Size(411, 731),
      const Size(640, 360),
    ]) {
      testWidgets(
        'welcome keeps both actions usable at $size / $language / large text',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          var signs = 0, registrations = 0;
          await tester.pumpWidget(
            host(
              MobileBootstrapPage(
                onStart: () => signs++,
                onRegister: () => registrations++,
              ),
              language: language,
              scale: 2,
            ),
          );
          await tester.pumpAndSettle();
          expect(find.byType(WelcomeTravelScene), findsOneWidget);
          expect(find.textContaining('Firebase'), findsNothing);
          expect(find.textContaining('backend'), findsNothing);
          expect(
            find.text(
              language == 'en'
                  ? 'Your next journey starts here.'
                  : 'Bir sonraki yolculuğun burada.',
            ),
            findsOneWidget,
          );
          for (final key in ['welcome-sign-in', 'welcome-register']) {
            final button = find.byKey(ValueKey(key));
            await tester.ensureVisible(button);
            await tester.pumpAndSettle();
            await tester.tap(button);
            await tester.pumpAndSettle();
          }
          expect(signs, 1);
          expect(registrations, 1);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'initialization failure blocks actions without exposing technical details',
    (tester) async {
      var calls = 0;
      await tester.pumpWidget(
        host(
          MobileBootstrapPage(
            initializationError: StateError('internal configuration details'),
            onStart: () => calls++,
            onRegister: () => calls++,
          ),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'We can’t connect right now. Try closing and reopening the app.',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('internal configuration'), findsNothing);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const ValueKey('welcome-sign-in')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<OutlinedButton>(
              find.byKey(const ValueKey('welcome-register')),
            )
            .onPressed,
        isNull,
      );
      expect(calls, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'create account opens registration directly and back restores welcome',
    (tester) async {
      await tester.pumpWidget(
        TravyonApp(authRepository: FakeAuthRepository(session: null)),
      );
      await tester.pumpAndSettle();
      final register = find.byKey(const ValueKey('welcome-register'));
      await tester.ensureVisible(register);
      await tester.pumpAndSettle();
      await tester.tap(register);
      await tester.pumpAndSettle();
      expect(find.text('Yolculuğun burada başlıyor'), findsOneWidget);
      expect(find.text('Ad soyad'), findsOneWidget);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(find.byType(MobileBootstrapPage), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
