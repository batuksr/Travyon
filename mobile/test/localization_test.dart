import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/core/localization/app_locale_controller.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';

void main() {
  test('language setting values map to stable supported locales', () {
    expect(localeForLanguageSetting('Türkçe'), const Locale('tr'));
    expect(localeForLanguageSetting('English'), const Locale('en'));
    expect(localeForLanguageSetting('en'), const Locale('en'));
    expect(localeForLanguageSetting('unexpected'), const Locale('tr'));
    expect(languageSettingFor(const Locale('en')), 'English');
  });

  test('English catalog translates fixed, parameterized and dynamic copy', () {
    const strings = AppLocalizations(Locale('en'));
    expect(strings.text('Planlar'), 'Plans');
    expect(
      strings.text(
        'Hazırlık ilerlemesi yüzde {progress}',
        values: {'progress': 42},
      ),
      'Checklist progress: 42 percent',
    );
    expect(strings.text('Merhaba, Batu!'), 'Hello, Batu!');
    expect(strings.text('3 gün · 12 durak'), '3 days · 12 stops');
    expect(strings.text('13 Eylül 2026'), '13 September 2026');
    expect(strings.text('13 Ara 2026'), '13 Dec 2026');
    expect(strings.text('Ara'), 'Search');
    expect(strings.text('2. Gün · 13 Eylül'), 'Day 2 · 13 September');
    expect(
      strings.text('3 gün · 12 durak · €300 tahmini'),
      '3 days · 12 stops · €300 estimated',
    );
    expect(
      strings.text('€40 harcandı · €260 kaldı'),
      '€40 spent · €260 remaining',
    );
    expect(strings.text('★ 4.8  ·  10 değerlendirme'), '★ 4.8 · 10 reviews');
    expect(
      strings.text('İlk yolculuğun\nnereden başlasın?'),
      'Where should your first\njourney begin?',
    );
    expect(
      strings.text('Bir sonraki yolculuğuna buradan devam et.'),
      'Continue your next journey from here.',
    );
    expect(strings.text('İlk rotana yer aç'), 'Start your first route');
    expect(strings.text('Seyahatin'), 'Your trip');
    expect(strings.text('Genel cüzdan'), 'General wallet');
    expect(strings.text('İlk biletini ekle'), 'Add your first ticket');
    expect(strings.text('YENİ BİR YOLCULUK'), 'A NEW JOURNEY');
    expect(
      strings.text('2 yolculuk, keşfedilecek yeni hikâyeler.'),
      '2 journeys, with new stories to discover.',
    );
    expect(
      strings.text('İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.'),
      'Could not complete the action. Check your connection and try again.',
    );
    expect(
      strings.text(
        'Adım {number}: {label}, şu anki adım',
        values: {'number': 2, 'label': strings.text('Tercihler')},
      ),
      'Step 2: Preferences, current step',
    );
    expect(
      strings.text(
        'Kişi başı günlük yaklaşık {amount}',
        values: {'amount': '€50'},
      ),
      'Approximately €50 per person per day',
    );
    expect(strings.text('Roma'), 'Roma');
  });

  test('English plan generation keeps schema tokens stable', () {
    final data = OnboardingData()
      ..outputLanguage = 'en'
      ..destination = 'Rome, Italy'
      ..startDate = '2026-10-10'
      ..endDate = '2026-10-12';
    final prompt = data.prompt();
    expect(prompt, contains('descriptions and travel tips in English'));
    expect(prompt, contains('period sadece Sabah, Öğle'));
  });

  testWidgets('English locale updates bootstrap and authentication screens', (
    tester,
  ) async {
    final locale = AppLocaleController.testing(const Locale('en'));
    await tester.pumpWidget(
      TravyonApp(
        localeController: locale,
        authRepository: _SignedOutAuthRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Your next journey starts here.'), findsOneWidget);
    expect(find.text('Firebase connection is ready'), findsNothing);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('welcome-sign-in')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('welcome-sign-in')));
    await tester.pumpAndSettle();
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Sign in'), findsNWidgets(2));
    expect(find.text('Continue with Google'), findsOneWidget);

    await tester.tap(find.text('Sign up'));
    await tester.pumpAndSettle();
    expect(find.text('Your journey starts here'), findsOneWidget);
    expect(find.text('Full name'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('changing the controller rebuilds the app immediately', (
    tester,
  ) async {
    final locale = AppLocaleController.testing();
    await tester.pumpWidget(
      TravyonApp(
        localeController: locale,
        authRepository: _SignedOutAuthRepository(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Hesap oluştur'), findsOneWidget);

    await locale.setLanguage('English', persist: false);
    await tester.pumpAndSettle();
    expect(find.text('Create an account'), findsOneWidget);
  });

  testWidgets('English locale covers the authenticated app shell', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(420, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      TravyonApp(
        localeController: AppLocaleController.testing(const Locale('en')),
        authRepository: _SessionAuthRepository(),
        travelPlansRepository: _EmptyPlansRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hello, Batu!'), findsOneWidget);
    final navigation = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(
      navigation.destinations.map(
        (widget) => (widget as NavigationDestination).label,
      ),
      ['Home', 'Plans', '', 'Wallet', 'Community'],
    );
    expect(tester.takeException(), isNull);
  });
}

class _SignedOutAuthRepository implements AuthRepository {
  @override
  Stream<AuthSession?> watchSession() => Stream.value(null);

  @override
  Future<void> refreshSession() async {}

  @override
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> sendEmailVerification() async {}

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signOut() async {}
}

class _SessionAuthRepository extends _SignedOutAuthRepository {
  @override
  Stream<AuthSession?> watchSession() => Stream.value(
    const AuthSession(
      uid: 'test-user',
      email: 'traveler@example.com',
      displayName: 'Batu Traveler',
      emailVerified: true,
    ),
  );
}

class _EmptyPlansRepository implements TravelPlansRepository {
  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) =>
      Stream.value(const []);

  @override
  Future<void> updateStop(
    String uid,
    String planId,
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? actualCost,
  }) async {}
}
