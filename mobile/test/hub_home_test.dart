import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/hub/data/hub_content.dart';
import 'package:travyon/features/hub/presentation/hub_home.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';

TravelPlanSummary trip(String id, String start, String end) =>
    TravelPlanSummary(
      id: id,
      destination: 'Roma, İtalya',
      customName: id,
      startDate: start,
      endDate: end,
      dayCount: 3,
      activityCount: 12,
      estimatedCost: 100,
      currencySymbol: '€',
      isFavorite: false,
      createdAt: null,
    );

void main() {
  Future<void> reveal(WidgetTester tester, String text) async {
    await tester.scrollUntilVisible(
      find.text(text),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text(text).hitTestable(), findsOneWidget);
  }

  test(
    'weekend prefill is local-date safe across Sunday and year boundaries',
    () {
      expect(weekendDraft(DateTime(2026, 9, 11)).startDate, '2026-09-12');
      expect(weekendDraft(DateTime(2026, 9, 12, 23)).endDate, '2026-09-13');
      expect(weekendDraft(DateTime(2026, 9, 13)).startDate, '2026-09-19');
      expect(weekendDraft(DateTime(2026, 12, 31)).endDate, '2027-01-03');
    },
  );

  test(
    'current trip precedes nearest upcoming; past and undated are not upcoming',
    () {
      final now = DateTime(2026, 9, 12, 23);
      final active = trip('active', '2026-09-11', '2026-09-13');
      final upcoming = trip('next', '2026-09-18', '2026-09-20');
      final past = trip('old', '2025-01-01', '2025-01-02');
      expect(featuredHubPlan([upcoming, active, past], now), active);
      expect(featuredHubPlan([past, upcoming], now), upcoming);
      expect(hubTripLabel(active, now), 'BUGÜNKÜ ROTAN');
      expect(hubTripLabel(past, now), 'YOLCULUK DEFTERİN');
      expect(hubTripLabel(trip('undated', '', ''), now), 'YOLCULUK DEFTERİN');
      expect(featuredHubPlan([], now), isNull);
      expect(isTravelingToday(active, DateTime(2026, 9, 13, 23)), isTrue);
      expect(isTravelingToday(active, DateTime(2026, 9, 14)), isFalse);
    },
  );

  Future<void> home(
    WidgetTester tester, {
    List<TravelPlanSummary> plans = const [],
    Stream<List<CommunityPlan>>? feed,
    ValueChanged<OnboardingData?>? onCreate,
    ValueChanged<TravelPlanSummary>? onOpen,
    VoidCallback? onPlans,
    VoidCallback? onCommunity,
    ValueChanged<String>? onPublicPlan,
    double width = 390,
    double scale = 1,
    bool failed = false,
    Locale locale = const Locale('tr'),
  }) async {
    tester.view.reset();
    tester.view.physicalSize = Size(width, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        locale: locale,
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
        home: Scaffold(
          body: HubHome(
            now: DateTime(2026, 9, 12),
            plans: failed
                ? AsyncSnapshot.withError(
                    ConnectionState.done,
                    StateError('offline'),
                  )
                : AsyncSnapshot.withData(ConnectionState.active, plans),
            community: feed ?? Stream.value([]),
            onCreate: onCreate ?? (_) {},
            onOpen: onOpen ?? (_) {},
            onPlans: onPlans ?? () {},
            onCommunity: onCommunity ?? () {},
            onPublicPlan: onPublicPlan ?? (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'empty home offers one primary CTA and no zero stats or empty feed',
    (tester) async {
      var calls = 0;
      await home(tester, onCreate: (_) => calls++);
      expect(find.text('İlk planımı oluştur'), findsOneWidget);
      expect(find.text('Henüz kayıtlı planın yok'), findsNothing);
      expect(find.text('Gezginlerden ilham al'), findsNothing);
      expect(find.text('Popüler duraklar'), findsOneWidget);
      expect(find.text('Tümünü gör'), findsNothing);
      await tester.tap(find.text('İlk planımı oluştur'));
      expect(calls, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('empty home welcome card is fully localized in English', (
    tester,
  ) async {
    await home(tester, locale: const Locale('en'));
    expect(
      find.text('Where should your first\njourney begin?'),
      findsOneWidget,
    );
    expect(
      find.text(
        'Choose your city. Let’s build a daily route around your tastes and pace.',
      ),
      findsOneWidget,
    );
    expect(find.text('Create my first plan'), findsOneWidget);
    expect(find.textContaining('İlk yolculuğun'), findsNothing);
  });

  testWidgets('city and weekend actions pass editable onboarding seeds', (
    tester,
  ) async {
    OnboardingData? seed;
    await home(tester, onCreate: (value) => seed = value);
    await tester.ensureVisible(find.text('Roma'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Roma'));
    expect(seed?.destination, 'Roma, İtalya');
    expect(seed?.startDate, isEmpty);
    await tester.ensureVisible(find.text('Bu hafta sonu kaç'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bu hafta sonu kaç'));
    expect(seed?.startDate, '2026-09-12');
    expect(seed?.endDate, '2026-09-13');
    expect(seed?.destination, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'search selects a city, supports custom destinations and can cancel',
    (tester) async {
      OnboardingData? seed;
      await home(tester, onCreate: (value) => seed = value);
      final search = find.byKey(const ValueKey('hub-destination-search'));
      final query = find.byKey(const ValueKey('hub-destination-query'));

      await tester.tap(search);
      await tester.pumpAndSettle();
      await tester.enterText(query, 'izmir');
      await tester.pumpAndSettle();
      await tester.tap(find.text('İzmir, Türkiye'));
      await tester.pumpAndSettle();
      expect(seed?.destination, 'İzmir, Türkiye');
      expect(seed?.startDate, isEmpty);

      seed = null;
      await tester.tap(search);
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Kapat'));
      await tester.pumpAndSettle();
      expect(seed, isNull);

      await tester.tap(search);
      await tester.pumpAndSettle();
      await tester.enterText(query, 'Datça, Türkiye');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('hub-custom-destination')));
      await tester.pumpAndSettle();
      expect(seed?.destination, 'Datça, Türkiye');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'category choices prefill interests without inventing travel dates',
    (tester) async {
      OnboardingData? seed;
      await home(tester, onCreate: (value) => seed = value);
      await reveal(tester, 'Doğa');
      await tester.tap(find.text('Doğa'));
      expect(seed?.purposes, ['nature']);
      expect(seed?.startDate, isEmpty);
      expect(seed?.destination, isEmpty);
      await reveal(tester, 'Şehir Kaçamağı');
      await tester.tap(find.text('Şehir Kaçamağı'));
      expect(seed?.travelType, 'sehir_kacamagi');
      expect(seed?.purposes, ['culture']);
      expect(tester.takeException(), isNull);
    },
  );

  for (final size in [const Size(320, 740), const Size(640, 360)]) {
    testWidgets('destination picker fits keyboard and double text at $size', (
      tester,
    ) async {
      await home(tester, width: size.width, scale: 2);
      tester.view.physicalSize = size;
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('hub-destination-search')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('hub-destination-query')),
        'Datça',
      );
      tester.view.viewInsets = const FakeViewPadding(bottom: 180);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final result = find.byKey(const ValueKey('hub-custom-destination'));
      await tester.ensureVisible(result);
      await tester.pumpAndSettle();
      expect(result.hitTestable(), findsOneWidget);
    });
  }

  testWidgets('city suggestion opens preview before starting a plan', (
    tester,
  ) async {
    OnboardingData? seed;
    await home(tester, onCreate: (value) => seed = value);
    await reveal(tester, 'Bana şehir öner');
    await tester.tap(find.text('Bana şehir öner'));
    await tester.pumpAndSettle();
    expect(seed, isNull);
    await tester.tap(find.text('Bu şehri planla'));
    await tester.pumpAndSettle();
    expect(hubCities.map((c) => c.destination), contains(seed?.destination));
    expect(tester.takeException(), isNull);
  });

  testWidgets('featured trip opens and saved plans remain accessible', (
    tester,
  ) async {
    final active = trip('active', '2026-09-11', '2026-09-13');
    TravelPlanSummary? opened;
    var allPlans = false;
    await home(
      tester,
      plans: [active],
      onOpen: (p) => opened = p,
      onPlans: () => allPlans = true,
    );
    expect(find.text('Aktif seyahat'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('hub-featured-plan')));
    expect(opened, active);
    await tester.tap(find.text('Tüm planların (1)'));
    expect(allPlans, isTrue);
    expect(find.text('İlk planımı oluştur'), findsNothing);
  });

  testWidgets(
    'community uses visible real plans and respects private author names',
    (tester) async {
      String? opened;
      var communityOpened = false;
      final entries = List.generate(
        5,
        (i) => CommunityPlan('$i', {
          'destination': 'Rota $i',
          'feedVisible': i != 0,
          'profilePublic': false,
          'userDisplayName': 'Private name',
          'planData': {
            'dailyPlans': [{}, {}],
          },
        }),
      );
      await home(
        tester,
        feed: Stream.value(entries),
        onPublicPlan: (id) => opened = id,
        onCommunity: () => communityOpened = true,
      );
      await tester.scrollUntilVisible(
        find.text('Topluluğu keşfet'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Rota 0'), findsNothing);
      expect(find.text('Rota 4'), findsNothing);
      expect(find.textContaining('Private name'), findsNothing);
      await tester.ensureVisible(find.text('Rota 1'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Rota 1'));
      expect(opened, '1');
      await tester.ensureVisible(find.text('Topluluğu keşfet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Topluluğu keşfet'));
      expect(communityOpened, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('feed error is isolated; plan error is not a false empty state', (
    tester,
  ) async {
    await home(tester, feed: Stream.error(StateError('offline')), failed: true);
    expect(find.text('İlk planımı oluştur'), findsNothing);
    expect(find.text('Planlarıma git'), findsOneWidget);
    expect(find.text('Gezginlerden ilham al'), findsNothing);
    expect(find.text('Nereye gidiyoruz?'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final width in [320.0, 390.0]) {
    testWidgets('no overflow at width $width and double text scale', (
      tester,
    ) async {
      await home(tester, width: width, scale: 2);
      await reveal(tester, 'Bana şehir öner');
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Bana şehir öner'));
      await tester.pumpAndSettle();
      expect(find.text('Bu şehri planla'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
