import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/auth/presentation/auth_page.dart';

import 'widget_test.dart' show FakeAuthRepository;

class FormAuthFake extends FakeAuthRepository {
  FormAuthFake() : super(session: null);
  int emails = 0, registrations = 0, googleCalls = 0, appleCalls = 0;
  String? resetEmail;
  final emailRequest = Completer<void>();
  final googleRequest = Completer<void>();

  @override
  Future<void> signIn({required String email, required String password}) {
    emails++;
    return emailRequest.future;
  }

  @override
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) {
    registrations++;
    return emailRequest.future;
  }

  @override
  Future<void> signInWithGoogle() {
    googleCalls++;
    return googleRequest.future;
  }

  @override
  Future<void> signInWithApple() async {
    appleCalls++;
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    resetEmail = email;
    throw StateError('internal reset error');
  }
}

Widget authHost(
  AuthRepository repository, {
  AuthMode mode = AuthMode.signIn,
  bool dark = false,
  String language = 'tr',
  double scale = 1,
}) => MaterialApp(
  theme: dark ? AppTheme.dark : AppTheme.light,
  locale: Locale(language),
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: child!,
  ),
  home: AuthPage(repository: repository, initialMode: mode),
);

Finder field(String name) => find.byKey(ValueKey('auth-$name'));

Future<void> tapAction(
  WidgetTester tester,
  String name, {
  bool pending = false,
}) async {
  await tester.ensureVisible(field(name));
  await tester.pump();
  await tester.tap(field(name));
  if (pending) {
    await tester.pump();
  } else {
    await tester.pumpAndSettle();
  }
}

void main() {
  for (final mode in AuthMode.values) {
    for (final dark in [false, true]) {
      for (final language in ['tr', 'en']) {
        testWidgets(
          'auth fits keyboard and large text: $mode $dark $language',
          (tester) async {
            tester.view.physicalSize = language == 'tr'
                ? const Size(320, 740)
                : const Size(640, 360);
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetViewInsets);
            final repo = FormAuthFake();
            await tester.pumpWidget(
              authHost(
                repo,
                mode: mode,
                dark: dark,
                language: language,
                scale: 2,
              ),
            );
            await tester.pumpAndSettle();
            await tester.enterText(field('email'), 'traveler@example.com');
            tester.view.viewInsets = const FakeViewPadding(bottom: 180);
            await tester.pumpAndSettle();
            for (final name in [
              'password',
              'submit',
              'google',
              'switch-mode',
            ]) {
              await tester.ensureVisible(field(name));
              await tester.pumpAndSettle();
              expect(field(name).hitTestable(), findsOneWidget);
              expect(tester.takeException(), isNull);
            }
            tester.view.resetViewInsets();
            await tester.pumpAndSettle();
            await tapAction(tester, 'switch-mode');
            expect(find.text('traveler@example.com'), findsOneWidget);
            expect(repo.emails + repo.registrations + repo.googleCalls, 0);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'registration requires consent and prevents duplicate Google requests',
    (tester) async {
      final repo = FormAuthFake();
      await tester.pumpWidget(authHost(repo, mode: AuthMode.register));
      await tester.pumpAndSettle();
      await tester.enterText(field('name'), 'Gezgin');
      await tester.enterText(field('email'), 'traveler@example.com');
      await tester.enterText(field('password'), 'test-password');
      await tapAction(tester, 'submit');
      expect(repo.registrations, 0);
      expect(
        find.text('Devam etmek için kullanım koşullarını kabul et.'),
        findsOneWidget,
      );
      await tapAction(tester, 'google');
      expect(repo.googleCalls, 0);

      await tapAction(tester, 'terms');
      await tapAction(tester, 'google', pending: true);
      expect(repo.googleCalls, 1);
      expect(tester.widget<OutlinedButton>(field('google')).onPressed, isNull);
      expect(tester.widget<TextButton>(field('switch-mode')).onPressed, isNull);
      expect(tester.widget<FilledButton>(field('submit')).onPressed, isNull);
      expect(
        find.descendant(
          of: field('google'),
          matching: find.byType(CircularProgressIndicator),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: field('submit'),
          matching: find.byType(CircularProgressIndicator),
        ),
        findsNothing,
      );
      expect(tester.widget<TextFormField>(field('email')).enabled, isFalse);

      repo.googleRequest.completeError(
        const AuthFailure('Google ile giriş yapılamadı. Lütfen tekrar dene.'),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextFormField>(field('email')).controller!.text,
        'traveler@example.com',
      );
      expect(tester.widget<CheckboxListTile>(field('terms')).value, isTrue);
      expect(
        tester.widget<OutlinedButton>(field('google')).onPressed,
        isNotNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('validation and failed sign in preserve inputs for retry', (
    tester,
  ) async {
    final repo = FormAuthFake();
    await tester.pumpWidget(authHost(repo));
    await tester.pumpAndSettle();
    await tester.enterText(field('email'), 'invalid');
    await tester.enterText(field('password'), 'short');
    await tapAction(tester, 'submit');
    expect(repo.emails, 0);
    expect(find.text('Geçerli bir e-posta adresi gir.'), findsOneWidget);
    expect(find.text('Şifren en az 8 karakter olmalı.'), findsOneWidget);

    await tester.enterText(field('email'), 'traveler@example.com');
    await tester.enterText(field('password'), 'test-password');
    await tapAction(tester, 'submit', pending: true);
    expect(repo.emails, 1);
    expect(tester.widget<FilledButton>(field('submit')).onPressed, isNull);
    repo.emailRequest.completeError(
      const AuthFailure('İşlem tamamlanamadı. Lütfen tekrar dene.'),
    );
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextFormField>(field('password')).controller!.text,
      'test-password',
    );
    expect(tester.widget<FilledButton>(field('submit')).onPressed, isNotNull);

    await tapAction(tester, 'reset-password');
    expect(repo.resetEmail, 'traveler@example.com');
    expect(find.textContaining('internal reset'), findsNothing);
    expect(
      find.text('İşlem tamamlanamadı. Lütfen tekrar dene.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Apple sign in is offered on iOS', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    final repo = FormAuthFake();
    await tester.pumpWidget(authHost(repo));
    await tester.pumpAndSettle();

    expect(field('apple'), findsOneWidget);
    await tapAction(tester, 'apple');
    expect(repo.appleCalls, 1);
    expect(tester.takeException(), isNull);
    debugDefaultTargetPlatformOverride = null;
  });
}
