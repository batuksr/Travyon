import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
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

      await tester.tap(find.text('Planlar'));
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
    await tester.pumpAndSettle();

    expect(find.text('Hayalindeki seyahat artık cebinde.'), findsOneWidget);
    expect(find.text('Firebase bağlantısı hazır'), findsOneWidget);
    expect(find.text('Mobil yolculuğa başla'), findsOneWidget);
  });

  testWidgets('opens sign in and registration flow', (tester) async {
    await tester.pumpWidget(
      TravyonApp(authRepository: FakeAuthRepository(session: null)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Mobil yolculuğa başla'));
    await tester.pumpAndSettle();

    expect(find.text('Tekrar hoş geldin'), findsOneWidget);
    expect(find.text('Giriş yap'), findsNWidgets(2));
    expect(find.text('Google ile devam et'), findsOneWidget);

    await tester.tap(find.text('Kayıt ol'));
    await tester.pumpAndSettle();

    expect(find.text('Yolculuğun burada başlıyor'), findsOneWidget);
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

    expect(find.text('Merhaba, Batu!'), findsOneWidget);
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
        travelPlansRepository: FakeTravelPlansRepository(const [
          TravelPlanSummary(
            id: 'plan-1',
            destination: 'Sevilla, İspanya',
            customName: 'Endülüs Kaçamağı',
            startDate: '2026-09-18',
            endDate: '2026-09-20',
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

    expect(find.text('YAKLAŞAN YOLCULUK'), findsOneWidget);
    expect(find.text('Endülüs Kaçamağı'), findsWidgets);
    expect(find.text('Sevilla, İspanya'), findsWidgets);
    expect(find.textContaining('12 durak'), findsOneWidget);
  });

  testWidgets('shows a safe state when Firebase initialization fails', (
    tester,
  ) async {
    await tester.pumpWidget(
      TravyonApp(initializationError: StateError('test')),
    );

    expect(find.text('Firebase başlatılamadı'), findsOneWidget);
    expect(find.text('Bağlantı bekleniyor'), findsOneWidget);
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
