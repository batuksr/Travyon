import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/presentation/plan_loading_view.dart';

Widget loadingHost({
  bool dark = false,
  bool english = false,
  bool reduceMotion = false,
  bool accessibleNavigation = false,
  double scale = 1,
  int elapsed = 0,
}) => MaterialApp(
  theme: dark ? AppTheme.dark : AppTheme.light,
  locale: Locale(english ? 'en' : 'tr'),
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      textScaler: TextScaler.linear(scale),
      disableAnimations: reduceMotion,
      accessibleNavigation: accessibleNavigation,
    ),
    child: child!,
  ),
  home: Scaffold(
    body: SafeArea(
      child: PlanLoadingView(
        destination: 'San Cristóbal de las Casas, México',
        elapsedSeconds: elapsed,
      ),
    ),
  ),
);

void main() {
  for (final english in [false, true]) {
    for (final dark in [false, true]) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets('loading fits $size at large text en=$english dark=$dark', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            loadingHost(dark: dark, english: english, scale: 2, elapsed: 125),
          );
          await tester.pump(const Duration(seconds: 2));
          expect(
            find.text(
              english
                  ? 'Preparing your itinerary for San Cristóbal de las Casas, México…'
                  : 'San Cristóbal de las Casas, México için rotan hazırlanıyor…',
            ),
            findsOneWidget,
          );
          expect(find.text('02:05'), findsOneWidget);
          final guidance = find.text(
            english
                ? 'Please keep the screen open.'
                : 'Lütfen ekranı açık tut.',
          );
          await tester.ensureVisible(guidance);
          await tester.pump();
          expect(guidance.hitTestable(), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  testWidgets(
    'wordmark animates, respects motion preferences and disposes its ticker',
    (tester) async {
      final sheen = find.byKey(const ValueKey('plan-loading-sheen'));
      Animation<double> animation() =>
          tester.widget<AnimatedBuilder>(sheen).animation as Animation<double>;
      await tester.pumpWidget(loadingHost());
      final initial = animation().value;
      await tester.pump(const Duration(seconds: 2));
      expect(animation().value, isNot(initial));

      await tester.pumpWidget(loadingHost(reduceMotion: true));
      await tester.pumpAndSettle();
      final still = animation().value;
      await tester.pump(const Duration(seconds: 4));
      expect(animation().value, still);
      expect(tester.binding.hasScheduledFrame, isFalse);

      await tester.pumpWidget(loadingHost());
      final resumed = animation().value;
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(animation().value, isNot(resumed));

      await tester.pumpWidget(loadingHost(accessibleNavigation: true));
      await tester.pumpAndSettle();
      expect(tester.binding.hasScheduledFrame, isFalse);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'loading content stays compact and guidance stays at the bottom',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(loadingHost(reduceMotion: true));
      await tester.pumpAndSettle();
      final content = tester.getRect(
        find.byKey(const ValueKey('plan-loading-content')),
      );
      expect(content.height, lessThanOrEqualTo(160));
      expect((content.center.dy - 422).abs(), lessThan(40));
      expect(
        tester.getBottomLeft(find.text('Lütfen ekranı açık tut.')).dy,
        closeTo(820, 1),
      );
      expect(tester.takeException(), isNull);
    },
  );
}
