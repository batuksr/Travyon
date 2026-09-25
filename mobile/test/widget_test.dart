import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/core/widgets/travyon_ui.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/onboarding/presentation/onboarding_page.dart';

void main() {
  testWidgets(
    'center navigation action opens onboarding and preserves current tab',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        TravyonApp(
          authRepository: FakeAuthRepository(
            session: const AuthSession(
              uid: 'test-user',
              email: 'gezgin@example.com',
              displayName: 'Batu',
              emailVerified: true,
            ),
          ),
          travelPlansRepository: FakeTravelPlansRepository(const []),
        ),
      );
      await tester.pumpAndSettle();
      final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(bar.labelBehavior, NavigationDestinationLabelBehavior.alwaysHide);
      expect(bar.destinations.map((w) => (w as NavigationDestination).label), [
        'Ana Sayfa',
        'Planlar',
        '',
        'Cüzdan',
        'Topluluk',
      ]);
      await tester.tap(find.byKey(const ValueKey('nav-create-plan')));
      await tester.pumpAndSettle();
      expect(find.byType(OnboardingPage), findsOneWidget);
      expect(find.text('Nereye gidiyorsun?'), findsOneWidget);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        0,
      );

      await tester.tap(find.byKey(const ValueKey('nav-plans')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('nav-create-plan')));
      await tester.pumpAndSettle();
      expect(find.byType(OnboardingPage), findsOneWidget);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        1,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('shows the Travyon mobile bootstrap screen when signed out', (
    tester,
  ) async {
    await tester.pumpWidget(
      TravyonApp(authRepository: FakeAuthRepository(session: null)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Bir sonraki yolculuğun burada.'), findsNothing);
    expect(find.text('Firebase bağlantısı hazır'), findsNothing);
    expect(find.text('Giriş yap'), findsOneWidget);
    expect(find.text('Hesap oluştur'), findsOneWidget);
  });

  testWidgets('opens sign in and registration flow', (tester) async {
    await tester.pumpWidget(
      TravyonApp(authRepository: FakeAuthRepository(session: null)),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.ensureVisible(find.byKey(const ValueKey('welcome-sign-in')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('welcome-sign-in')));
    await tester.pumpAndSettle();

    expect(find.text('Yolculuğun\nburada başlıyor.'), findsOneWidget);
    expect(find.byType(TravyonWordmark), findsNothing);
    expect(find.text('Giriş yap'), findsOneWidget);
    expect(find.text('Google ile devam et'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('auth-switch-mode')));
    await tester.tap(find.byKey(const ValueKey('auth-switch-mode')));
    await tester.pumpAndSettle();

    expect(find.text('Yeni rotalara\nmerhaba de.'), findsOneWidget);
    expect(find.byType(TravyonWordmark), findsNothing);
    expect(find.text('Ad soyad'), findsOneWidget);
  });

  testWidgets('shows email verification for an unverified account', (
    tester,
  ) async {
    await tester.pumpWidget(
      TravyonApp(
        authRepository: FakeAuthRepository(
          session: const AuthSession(
            uid: 'test-user',
            email: 'gezgin@example.com',
            displayName: 'Gezgin',
            emailVerified: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('E-postanı doğrula'), findsOneWidget);
    expect(find.textContaining('gezgin@example.com'), findsOneWidget);
  });

  testWidgets('shows mobile hub for a verified account', (tester) async {
    await tester.pumpWidget(
      TravyonApp(
        authRepository: FakeAuthRepository(
          session: const AuthSession(
            uid: 'test-user',
            email: 'gezgin@example.com',
            displayName: 'Batu Gezgin',
            emailVerified: true,
          ),
        ),
        travelPlansRepository: FakeTravelPlansRepository(const []),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Merhaba, Batu!'), findsNothing);
    expect(find.text('Nereye gidiyoruz?'), findsOneWidget);
    expect(find.text('Planlar'), findsOneWidget);
    expect(find.text('İlk planımı oluştur'), findsOneWidget);
  });

  testWidgets('shows cloud plans on the mobile hub', (tester) async {
    await tester.pumpWidget(
      TravyonApp(
        authRepository: FakeAuthRepository(
          session: const AuthSession(
            uid: 'test-user',
            email: 'gezgin@example.com',
            displayName: 'Batu Gezgin',
            emailVerified: true,
          ),
        ),
        travelPlansRepository: FakeTravelPlansRepository([
          TravelPlanSummary(
            id: 'plan-1',
            destination: 'Sevilla, İspanya',
            customName: 'Endülüs Kaçamağı',
            startDate: DateTime.now()
                .add(const Duration(days: 7))
                .toIso8601String()
                .split('T')
                .first,
            endDate: DateTime.now()
                .add(const Duration(days: 9))
                .toIso8601String()
                .split('T')
                .first,
            dayCount: 3,
            activityCount: 12,
            estimatedCost: 190,
            currencySymbol: '€',
            isFavorite: true,
            createdAt: null,
          ),
        ]),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Yaklaşan yolculuk'), findsOneWidget);
    expect(find.text('Endülüs Kaçamağı'), findsWidgets);
    expect(find.text('Sevilla, İspanya'), findsWidgets);
    expect(find.byKey(const ValueKey('hub-featured-plan')), findsOneWidget);
  });

  testWidgets('shows a safe state when Firebase initialization fails', (
    tester,
  ) async {
    await tester.pumpWidget(
      TravyonApp(initializationError: StateError('test')),
    );

    expect(
      find.text(
        'Şu anda bağlantı kurulamıyor. Uygulamayı kapatıp yeniden açmayı dene.',
      ),
      findsOneWidget,
    );
    expect(
      tester
          .widget<TextButton>(find.byKey(const ValueKey('welcome-sign-in')))
          .onPressed,
      isNull,
    );
  });
}

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({required this.session});

  final AuthSession? session;

  @override
  Stream<AuthSession?> watchSession() => Stream.value(session);

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
  Future<void> signInWithApple() async {}

  @override
  Future<void> signOut() async {}
}

class FakeTravelPlansRepository implements TravelPlansRepository {
  FakeTravelPlansRepository(this.plans);

  final List<TravelPlanSummary> plans;

  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) => Stream.value(plans);

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
