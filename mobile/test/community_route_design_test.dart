import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/community/presentation/community_plan_page.dart';
import 'package:travyon/features/community/presentation/community_route_widgets.dart';
import 'package:travyon/features/plans/presentation/plan_information_sheet.dart';
import 'package:travyon/features/plans/presentation/plan_route_map.dart';

import 'community_test.dart' show FakeCommunity, savedPlan;

CommunityPlan route({String owner = 'other', bool public = true}) {
  final plan = Map<String, dynamic>.from(savedPlan()['plan'] as Map);
  plan['totalEstimatedCost'] = 110.25;
  plan['overallSummary'] = List.filled(
    8,
    'Paris sokaklarını keşfet.',
  ).join(' ');
  plan['destination'] = 'Paris, Fransa';
  plan['cityGuide'] = {
    'transportationTips': 'Metro rehberi',
    'localCustoms': 'Yerel öneriler',
    'generalAdvice': 'Ziyaret bilgileri',
  };
  plan['dailyPlans'] = [
    {
      'daySummary': 'İlk günün hikayesi',
      'date': '2026-10-01',
      'activities': [
        {
          'placeName': 'Sainte-Chapelle',
          'description': List.filled(8, 'Vitray pencereleri keşfet.').join(' '),
          'period': 'Sabah',
          'estimatedCost': 13.25,
          'note': 'PRIVATE',
          'actualCost': 987654,
          'completed': true,
          'coordinates': {'lat': 48.855, 'lng': 2.345},
        },
        {
          'placeName': 'Louvre Müzesi',
          'period': 'Öğleden Sonra',
          'description': 'Müze koleksiyonları',
          'estimatedCost': 22,
          'coordinates': {'lat': 48.8606, 'lng': 2.3376},
        },
      ],
    },
    {
      'daySummary': 'İkinci günün hikayesi',
      'date': '2026-10-02',
      'activities': [
        {
          'placeName': 'Montmartre',
          'period': 'Sabah',
          'description': 'Şehir manzarası',
          'estimatedCost': 0,
          'coordinates': {'lat': 48.8867, 'lng': 2.3431},
        },
      ],
    },
  ];
  return CommunityPlan('route1', {
    'userId': owner,
    'profilePublic': public,
    'userDisplayName': public ? 'Gezgin Ada' : 'PRIVATE',
    // Regression: older public documents have the destination only in planData.
    'planData': plan,
    'ratingCount': 2,
    'avgRating': 4.5,
    'peopleCount': 2,
    'travelType': 'couple',
    'pace': 'relaxed',
    'earlyBird': false,
    'accommodation': 'hotel',
    'transport': ['walking', 'public'],
    'purposes': ['culture'],
    'accommodationAddress': 'PRIVATE',
    'wallet': 'PRIVATE',
  });
}

class RouteRepository extends FakeCommunity {
  CommunityPlan? current = route();
  bool unavailable = false;
  int loads = 0, ratingCalls = 0;
  Completer<void>? ratingResult;
  @override
  Stream<CommunityPlan?> plan(String id) async* {
    loads++;
    if (unavailable) throw StateError('offline');
    yield current;
    yield* events.stream;
  }

  @override
  Future<void> rate(String id, int rating) async {
    ratingCalls++;
    rated = rating;
    await ratingResult?.future;
  }
}

Widget host(
  Widget child, {
  String language = 'tr',
  bool dark = false,
  double scale = 1,
  AppUnitController? units,
}) => MaterialApp(
  theme: dark ? AppTheme.dark : AppTheme.light,
  locale: Locale(language),
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: units == null
        ? child!
        : AppUnitScope(controller: units, child: child!),
  ),
  home: child,
);

Finder routeScroll() => find
    .descendant(
      of: find.byKey(const PageStorageKey('community-route-scroll')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> reveal(
  WidgetTester tester,
  Finder target, {
  bool up = false,
}) async {
  await tester.scrollUntilVisible(
    target,
    up ? -220 : 220,
    scrollable: routeScroll(),
    maxScrolls: 80,
  );
  await tester.pumpAndSettle();
}

void viewport(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  test('public route title falls back to nested destination, then journey', () {
    expect(route().destination, 'Paris, Fransa');
    expect(CommunityPlan('x', {'destination': '  Roma  '}).destination, 'Roma');
    expect(
      CommunityPlan('x', {'destination': ' ', 'planData': {}}).destination,
      'Yolculuk',
    );
    expect(route(public: false).author, 'Gezgin');
  });

  for (final language in ['tr', 'en']) {
    for (final dark in [false, true]) {
      for (final size in [const Size(320, 780), const Size(640, 360)]) {
        testWidgets(
          '$language dark=$dark size=$size large text, days and map',
          (tester) async {
            viewport(tester, size);
            final repo = RouteRepository();
            addTearDown(repo.events.close);
            GoogleMap? renderedMap;
            await tester.pumpWidget(
              host(
                CommunityPlanPage(
                  uid: 'me',
                  id: 'route1',
                  repository: repo,
                  mapBuilder: (map) {
                    renderedMap = map;
                    return const SizedBox.expand();
                  },
                ),
                language: language,
                dark: dark,
                scale: 2,
              ),
            );
            await tester.pumpAndSettle();
            expect(find.text('Paris, Fransa'), findsOneWidget);
            expect(
              find.text(language == 'en' ? 'Shared by' : 'Rotayı paylaşan'),
              findsOneWidget,
            );
            expect(tester.takeException(), isNull);
            await reveal(tester, find.byKey(const ValueKey('community-day-1')));
            await tester.tap(find.byKey(const ValueKey('community-day-1')));
            await tester.pumpAndSettle();
            await reveal(tester, find.text('Montmartre'));
            expect(find.text('Montmartre'), findsOneWidget);
            expect(tester.takeException(), isNull);
            await tester.tap(find.byKey(const ValueKey('community-tab-map')));
            await tester.pumpAndSettle();
            expect(find.byType(PlanRouteMap), findsOneWidget);
            expect(
              tester.widget<PlanRouteMap>(find.byType(PlanRouteMap)).day.index,
              1,
            );
            expect(renderedMap!.markers.length, 1);
            expect(renderedMap!.style, contains(dark ? '#2b241d' : '#c9e2e4'));
            expect(tester.takeException(), isNull);
            await tester.tap(find.byKey(const ValueKey('community-day-0')));
            await tester.pumpAndSettle();
            expect(renderedMap!.markers.length, 2);
            await tester.tap(find.byKey(const ValueKey('community-tab-plan')));
            await tester.pumpAndSettle();
            await reveal(
              tester,
              find.byKey(const ValueKey('community-summary-0')),
              up: true,
            );
            expect(
              find.byKey(const ValueKey('community-summary-0')),
              findsOneWidget,
            );
            expect(repo.ratingCalls, 0);
            expect(repo.shares, 0);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'English guide/preferences keep selected day and never expose private fields',
    (tester) async {
      viewport(tester, const Size(360, 800));
      final repo = RouteRepository()..current = route(public: false);
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          CommunityPlanPage(uid: 'me', id: 'route1', repository: repo),
          language: 'en',
          dark: true,
          scale: 1.3,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Traveler'), findsOneWidget);
      expect(
        tester
            .widget<InkWell>(find.byKey(const ValueKey('community-author')))
            .onTap,
        isNull,
      );
      await reveal(tester, find.byKey(const ValueKey('community-day-1')));
      await tester.tap(find.byKey(const ValueKey('community-day-1')));
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byKey(const ValueKey('community-guide')),
        up: true,
      );
      await tester.tap(find.byKey(const ValueKey('community-guide')));
      await tester.pumpAndSettle();
      expect(find.byType(PlanGuideSheet), findsOneWidget);
      expect(find.text('City guide'), findsOneWidget);
      expect(find.text('Metro rehberi'), findsOneWidget);
      expect(find.text('Transport'), findsOneWidget);
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('community-preferences')));
      await tester.pumpAndSettle();
      expect(find.text('Route preferences'), findsOneWidget);
      expect(find.text('2 days'), findsWidgets);
      final preferences = find.byType(CommunityPreferencesSheet);
      final scrollable = find
          .descendant(of: preferences, matching: find.byType(Scrollable))
          .first;
      await tester.scrollUntilVisible(
        find.text('Hotel'),
        160,
        scrollable: scrollable,
      );
      expect(find.text('Hotel'), findsOneWidget);
      expect(find.textContaining('PRIVATE'), findsNothing);
      expect(find.textContaining('2026-10'), findsNothing);
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      await reveal(tester, find.text('Montmartre'));
      expect(find.text('Montmartre'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'readonly stops expand, show local money and distance; directions require a tap',
    (tester) async {
      viewport(tester, const Size(390, 820));
      final repo = RouteRepository();
      addTearDown(repo.events.close);
      final units = AppUnitController.testing(distanceKm: false);
      addTearDown(units.dispose);
      final opened = <Uri>[];
      await tester.pumpWidget(
        host(
          CommunityPlanPage(
            uid: 'me',
            id: 'route1',
            repository: repo,
            onOpenDirections: (uri) async {
              opened.add(uri);
              return false;
            },
          ),
          units: units,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('€110,25'), findsOneWidget);
      await reveal(tester, find.text('Sainte-Chapelle'));
      final stop = find.byType(CommunityRouteStop).first;
      final readMore = find.descendant(
        of: stop,
        matching: find.text('Devamını oku'),
      );
      await reveal(tester, readMore);
      await tester.tap(readMore);
      await tester.pumpAndSettle();
      expect(
        find.descendant(of: stop, matching: find.text('Daha az')),
        findsOneWidget,
      );
      final description = tester.widget<Text>(
        find.textContaining('Vitray pencereleri').first,
      );
      expect(description.maxLines, isNull);
      await reveal(
        tester,
        find.byKey(const ValueKey('community-directions-0')),
      );
      expect(find.text('€13,25'), findsOneWidget);
      expect(opened, isEmpty);
      await tester.tap(find.byKey(const ValueKey('community-directions-0')));
      await tester.pumpAndSettle();
      expect(opened.single.scheme, 'https');
      expect(opened.single.host, 'www.google.com');
      expect(opened.single.queryParameters['destination'], '48.855,2.345');
      expect(find.text('Yol tarifi açılamadı.'), findsOneWidget);
      await reveal(tester, find.byKey(const ValueKey('community-distance')));
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('community-distance')))
            .data,
        allOf(startsWith('↕ '), endsWith(' mi')),
      );
      expect(find.textContaining('PRIVATE'), findsNothing);
      expect(find.textContaining('987654'), findsNothing);
      expect(find.text('Not ekle'), findsNothing);
      expect(find.text('Gezdim'), findsNothing);
      expect(repo.ratingCalls, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'rating waits for success, prevents double taps, and allows retry after failure',
    (tester) async {
      final repo = RouteRepository()..ratingResult = Completer<void>();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(CommunityPlanPage(uid: 'me', id: 'route1', repository: repo)),
      );
      await tester.pumpAndSettle();
      await reveal(tester, find.byTooltip('5 yıldız ver'));
      await tester.tap(find.byTooltip('5 yıldız ver'));
      await tester.pump();
      expect(repo.ratingCalls, 1);
      expect(
        tester
            .widget<IconButton>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is IconButton && widget.tooltip == '4 yıldız ver',
              ),
            )
            .onPressed,
        isNull,
      );
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      repo.ratingResult!.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.textContaining('İşlem tamamlanamadı'), findsOneWidget);
      // Let the failure snackbar finish before asserting the next confirmation.
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<IconButton>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is IconButton && widget.tooltip == '5 yıldız ver',
              ),
            )
            .onPressed,
        isNotNull,
      );
      repo.ratingResult = null;
      await tester.tap(find.byTooltip('4 yıldız ver'));
      await tester.pumpAndSettle();
      expect(repo.ratingCalls, 2);
      expect(repo.rated, 4);
      expect(find.text('Değerlendirmen kaydedildi.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'error retries; live day removal clamps selection and unshare hides route',
    (tester) async {
      final repo = RouteRepository()..unavailable = true;
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          CommunityPlanPage(
            uid: 'me',
            id: 'route1',
            repository: repo,
            mapBuilder: (_) => const SizedBox.expand(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.textContaining('İşlem tamamlanamadı'), findsOneWidget);
      repo.unavailable = false;
      await tester.tap(find.text('Tekrar dene'));
      await tester.pumpAndSettle();
      expect(repo.loads, 2);
      await tester.tap(find.byKey(const ValueKey('community-tab-map')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('community-day-1')));
      await tester.pumpAndSettle();
      final shortened = route();
      final data = shortened.data['planData'] as Map<String, dynamic>;
      data['dailyPlans'] = [(data['dailyPlans'] as List).first];
      repo.events.add(shortened);
      await tester.pumpAndSettle();
      expect(
        tester.widget<PlanRouteMap>(find.byType(PlanRouteMap)).day.index,
        0,
      );
      repo.events.add(null);
      await tester.pumpAndSettle();
      expect(find.textContaining('Bu paylaşım kaldırılmış'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(PlanRouteMap), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'own route cannot be rated and empty plans still show guide and preferences',
    (tester) async {
      final repo = RouteRepository()
        ..current = CommunityPlan('route1', {
          'userId': 'me',
          'profilePublic': false,
          'planData': {'destination': 'Roma'},
        });
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          CommunityPlanPage(uid: 'me', id: 'route1', repository: repo),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const ValueKey('community-rating')));
      expect(find.text('No ratings yet'), findsOneWidget);
      expect(find.byTooltip('Give 5 stars'), findsNothing);
      expect(repo.ratingCalls, 0);
      await reveal(
        tester,
        find.byKey(const ValueKey('community-guide')),
        up: true,
      );
      await tester.tap(find.byKey(const ValueKey('community-guide')));
      await tester.pumpAndSettle();
      expect(
        find.text('No guide information is saved for this trip.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
