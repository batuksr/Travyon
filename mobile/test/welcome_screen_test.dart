import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/bootstrap/presentation/mobile_bootstrap_page.dart';

import 'widget_test.dart' show FakeAuthRepository;

Widget host(
  Widget child, {
  String language = 'tr',
  double scale = 1,
  bool reduceMotion = true,
}) => MaterialApp(
  theme: AppTheme.light,
  locale: Locale(language),
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      textScaler: TextScaler.linear(scale),
      disableAnimations: reduceMotion,
    ),
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
          expect(
            find.byKey(const ValueKey('welcome-logo-animation')),
            findsOneWidget,
          );
          expect(find.text('Planla. Keşfet. Yola çık.'), findsNothing);
          expect(find.textContaining('Firebase'), findsNothing);
          expect(find.textContaining('backend'), findsNothing);
          expect(
            find.text(
              language == 'en'
                  ? 'Your next journey starts here.'
                  : 'Bir sonraki yolculuğun burada.',
            ),
            findsNothing,
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
            .widget<TextButton>(find.byKey(const ValueKey('welcome-register')))
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
      // The welcome sheen repeats; advance frames without waiting for idle.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      final register = find.byKey(const ValueKey('welcome-register'));
      await tester.ensureVisible(register);
      await tester.pump();
      await tester.tap(register);
      await tester.pumpAndSettle();
      expect(find.text('Hesap oluştur'), findsOneWidget);
      expect(find.text('Ad soyad'), findsOneWidget);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      await tester.tap(find.byTooltip('Geri'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(MobileBootstrapPage), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'welcome sheen keeps moving after a cycle and respects reduced motion',
    (tester) async {
      final logo = find.byKey(const ValueKey('welcome-logo-animation'));
      AnimationController controller() =>
          tester.widget<AnimatedBuilder>(logo).animation as AnimationController;
      await tester.pumpWidget(
        host(const MobileBootstrapPage(), reduceMotion: false),
      );
      await tester.pump(const Duration(seconds: 9));
      expect(controller().isAnimating, isTrue);
      final progress = controller().value;
      await tester.pump(const Duration(milliseconds: 500));
      expect(controller().value, isNot(progress));

      await tester.pumpWidget(host(const MobileBootstrapPage()));
      await tester.pumpAndSettle();
      expect(controller().isAnimating, isFalse);
      expect(tester.binding.hasScheduledFrame, isFalse);

      await tester.pumpWidget(
        host(const MobileBootstrapPage(), reduceMotion: false),
      );
      await tester.pump();
      expect(controller().isAnimating, isTrue);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.binding.hasScheduledFrame, isFalse);
      expect(tester.takeException(), isNull);
    },
  );
}
