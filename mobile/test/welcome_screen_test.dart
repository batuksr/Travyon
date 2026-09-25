import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/features/help/presentation/help_center_page.dart';
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
        'welcome keeps actions usable at $size / $language / large text',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          var signs = 0, registrations = 0, socialCalls = 0;
          await tester.pumpWidget(
            host(
              MobileBootstrapPage(
                onStart: () => signs++,
                onRegister: () => registrations++,
                onGoogle: () async => socialCalls++,
                onApple: () async => socialCalls++,
              ),
              language: language,
              scale: 2,
            ),
          );
          await tester.pumpAndSettle();
          expect(find.byKey(const ValueKey('welcome-plane')), findsOneWidget);
          expect(
            find.byKey(const ValueKey('welcome-travel-photo')),
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
          for (final key in ['welcome-google', 'welcome-apple']) {
            await tester.ensureVisible(find.byKey(ValueKey(key)));
            await tester.pumpAndSettle();
          }
          expect(socialCalls, 0);
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
            onGoogle: () async => calls++,
            onApple: () async => calls++,
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
            .widget<TextButton>(find.byKey(const ValueKey('welcome-sign-in')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.byKey(const ValueKey('welcome-register')),
            )
            .onPressed,
        isNull,
      );
      expect(calls, 0);
      for (final key in ['welcome-google', 'welcome-apple']) {
        expect(
          tester.widget<FilledButton>(find.byKey(ValueKey(key))).onPressed,
          isNull,
        );
      }
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'create account opens registration directly and back restores welcome',
    (tester) async {
      await tester.pumpWidget(
        TravyonApp(authRepository: FakeAuthRepository(session: null)),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      final register = find.byKey(const ValueKey('welcome-register'));
      await tester.ensureVisible(register);
      await tester.pump();
      await tester.tap(register);
      await tester.pumpAndSettle();
      expect(find.text('Yeni rotalara\nmerhaba de.'), findsOneWidget);
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

  for (final apple in [false, true]) {
    testWidgets('social consent, busy state and retry apple=$apple', (
      tester,
    ) async {
      var calls = 0;
      Completer<void>? pending = Completer<void>();
      Future<void> signIn() async {
        calls++;
        await pending?.future;
      }

      await tester.pumpWidget(
        host(
          MobileBootstrapPage(
            onGoogle: signIn,
            onApple: signIn,
            onRegister: () {},
            onStart: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      final button = find.byKey(
        ValueKey(apple ? 'welcome-apple' : 'welcome-google'),
      );
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(calls, 0);
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(calls, 0);
      await tester.tap(button);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(calls, 1);
      expect(tester.widget<FilledButton>(button).onPressed, isNull);
      expect(
        tester
            .widget<FilledButton>(
              find.byKey(const ValueKey('welcome-register')),
            )
            .onPressed,
        isNull,
      );
      pending.completeError(
        const AuthFailure('İşlem tamamlanamadı. Lütfen tekrar dene.'),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('İşlem tamamlanamadı. Lütfen tekrar dene.'),
        findsOneWidget,
      );
      pending = null;
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
      await tester.pumpAndSettle();
      expect(calls, 2);
      expect(tester.widget<FilledButton>(button).onPressed, isNotNull);
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }

  testWidgets(
    'Android Apple button explains availability without authenticating',
    (tester) async {
      var calls = 0;
      await tester.pumpWidget(
        host(MobileBootstrapPage(onApple: () async => calls++)),
      );
      await tester.pumpAndSettle();
      final button = find.byKey(const ValueKey('welcome-apple'));
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(
        find.text('Apple ile giriş yalnızca iPhone ve iPad’de kullanılabilir.'),
        findsOneWidget,
      );
      expect(calls, 0);
      await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(button).onPressed, isNotNull);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets('welcome photo is bundled, static and legal links open', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(const MobileBootstrapPage(), reduceMotion: false),
    );
    await tester.pumpAndSettle();
    final photo = tester.widget<Image>(
      find.byKey(const ValueKey('welcome-travel-photo')),
    );
    expect(photo.image, isA<AssetImage>());
    expect(find.byType(ShaderMask), findsNothing);
    await tester.pump(const Duration(seconds: 9));
    expect(tester.binding.hasScheduledFrame, isFalse);
    for (final section in [HelpSection.terms, HelpSection.privacy]) {
      final link = find.byKey(ValueKey('welcome-${section.name}'));
      await tester.ensureVisible(link);
      await tester.tap(link);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<HelpCenterPage>(find.byType(HelpCenterPage))
            .initialSection,
        section,
      );
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('welcome Google action is wired to the auth repository', (
    tester,
  ) async {
    final repo = _SocialRepository();
    await tester.pumpWidget(TravyonApp(authRepository: repo));
    await tester.pumpAndSettle();
    final google = find.byKey(const ValueKey('welcome-google'));
    await tester.ensureVisible(google);
    await tester.tap(google);
    await tester.pumpAndSettle();
    expect(repo.googleCalls, 0);
    await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
    await tester.pumpAndSettle();
    expect(repo.googleCalls, 1);
  });
}

class _SocialRepository extends FakeAuthRepository {
  _SocialRepository() : super(session: null);
  int googleCalls = 0;
  @override
  Future<void> signInWithGoogle() async => googleCalls++;
}
