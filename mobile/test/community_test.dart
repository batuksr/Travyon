import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/community/presentation/community_page.dart';
import 'package:travyon/features/community/presentation/community_plan_page.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';

import 'widget_test.dart' show FakeTravelPlansRepository;

Map<String, dynamic> savedPlan() => {
  'wallet': 'PRIVATE',
  'onboardingData': {
    'accommodationAddress': 'PRIVATE',
    'accommodationLat': 41,
    'accommodation': 'hotel',
    'budget': 100,
    'peopleCount': 2,
  },
  'plan': {
    'destination': 'Roma',
    'overallSummary': 'Bir Roma yolculuğu',
    'currencySymbol': '€',
    'totalEstimatedCost': 45,
    'privateField': 'PRIVATE',
    'dailyPlans': [
      {
        'date': '2026-10-01',
        'daySummary': 'İlk gün',
        'note': 'PRIVATE',
        'activities': [
          {
            'placeName': 'Kolezyum',
            'period': 'Sabah',
            'description': 'Antik Roma',
            'estimatedCost': 20,
            'actualCost': 25,
            'note': 'PRIVATE',
            'completed': true,
            'coordinates': {'lat': 41.89, 'lng': 12.49},
          },
        ],
      },
    ],
  },
};

CommunityPlan publicPlan([String owner = 'other']) => CommunityPlan('plan1', {
  'userId': owner,
  'userDisplayName': 'Batu',
  'profilePublic': true,
  'destination': 'Roma',
  'feedVisible': true,
  'avgRating': 4.5,
  'ratingCount': 2,
  'planData': savedPlan()['plan'],
});

class FakeCommunity implements CommunityRepository {
  final events = StreamController<CommunityPlan?>.broadcast();
  bool fail = false;
  int shares = 0, unshares = 0, rated = 0, follows = 0;
  Map<String, bool>? savedPrivacy;
  @override
  Stream<List<CommunityPlan>> feed() =>
      fail ? Stream.error(StateError('offline')) : Stream.value([publicPlan()]);
  @override
  Stream<List<CommunityPlan>> sharedBy(String uid, {bool own = false}) =>
      Stream.value(own ? [] : [publicPlan(uid)]);
  @override
  Stream<CommunityPlan?> plan(String id) async* {
    yield publicPlan();
    yield* events.stream;
  }

  @override
  Stream<Set<String>> following(String uid) => Stream.value({});
  @override
  Future<TravelerProfile> profile(String uid) async => TravelerProfile(uid, {
    'exists': true,
    'isPublic': true,
    'displayName': 'Batu',
  });
  @override
  Future<void> follow(String uid, String target, bool value) async {
    follows++;
  }

  @override
  Future<void> share(String uid, String id) async {
    shares++;
    if (fail) throw StateError('offline');
  }

  @override
  Future<void> unshare(String id) async {
    unshares++;
  }

  @override
  Future<void> rate(String id, int rating) async {
    rated = rating;
  }

  @override
  Future<Map<String, bool>> privacy(String uid) async => {
    for (final key in privacyKeys) key: key == 'analyticsEnabled',
  };
  @override
  Future<void> savePrivacy(Map<String, bool> values) async {
    savedPrivacy = Map.of(values);
  }
}

Widget host(Widget child, {Locale locale = const Locale('tr')}) => MaterialApp(
  locale: locale,
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  theme: AppTheme.light,
  home: Scaffold(body: child),
);

void main() {
  testWidgets(
    'English community handles search recovery and sharing at large text scale',
    (tester) async {
      tester.view.physicalSize = const Size(320, 850);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = FakeCommunity();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          MediaQuery(
            data: const MediaQueryData(
              size: Size(320, 850),
              textScaler: TextScaler.linear(2),
            ),
            child: CommunityPage(
              uid: 'me',
              repository: repo,
              plansRepository: FakeTravelPlansRepository([]),
            ),
          ),
          locale: const Locale('en'),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final feedScroll = find
          .descendant(
            of: find.byType(ListView).first,
            matching: find.byType(Scrollable),
          )
          .first;
      Future<void> reveal(Finder target, {bool up = false}) => tester
          .scrollUntilVisible(target, up ? -220 : 220, scrollable: feedScroll);
      await reveal(find.byType(TextField));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'NoSuchCity');
      await tester.pumpAndSettle();
      await reveal(find.text('No matching routes yet'));
      expect(find.text('No matching routes yet'), findsOneWidget);
      await reveal(find.byTooltip('Clear search'), up: true);
      await tester.tap(find.byTooltip('Clear search'));
      await tester.pumpAndSettle();
      await reveal(find.text('Roma'));
      expect(find.text('Roma'), findsOneWidget);
      await reveal(find.text('My shares'), up: true);
      await tester.tap(find.text('My shares'));
      await tester.pumpAndSettle();
      await reveal(find.text('Your story starts here'));
      expect(find.text('Your story starts here'), findsOneWidget);
      expect(repo.shares, 0);
      expect(tester.takeException(), isNull);
    },
  );

  test('public payload excludes private fields and preserves valid route', () {
    final input = savedPlan();
    final payload = publicSharePayload(input);
    expect(payload.toString(), isNot(contains('PRIVATE')));
    final day = planMap(planList(planMap(payload['plan'])['dailyPlans']).first);
    final stop = planMap(planList(day['activities']).first);
    expect(day['dayNumber'], 1);
    expect(stop['placeName'], 'Kolezyum');
    expect(stop.containsKey('actualCost'), isFalse);
    expect(stop.containsKey('completed'), isFalse);
    expect(planMap(input['plan'])['privateField'], 'PRIVATE');
    expect(() => publicSharePayload({}), throwsStateError);
    expect(communityPreference('hotel'), 'Otel');
    expect(
      CommunityPlan('x', {
        'profilePublic': false,
        'userDisplayName': 'SECRET',
      }).author,
      'Gezgin',
    );
  });

  testWidgets('community search and following empty state fit narrow screens', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repo = FakeCommunity();
    addTearDown(repo.events.close);
    await tester.pumpWidget(
      host(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(360, 800),
            textScaler: TextScaler.linear(1.3),
          ),
          child: CommunityPage(
            uid: 'me',
            repository: repo,
            plansRepository: FakeTravelPlansRepository([]),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Roma'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.enterText(find.byType(TextField), 'Paris');
    await tester.pumpAndSettle();
    expect(find.text('Roma'), findsNothing);
    await tester.ensureVisible(find.text('Takip ettiklerin'));
    await tester.tap(find.text('Takip ettiklerin'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Henüz kimseyi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'sharing needs explicit confirmation and errors keep plan available',
    (tester) async {
      final repo = FakeCommunity();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          CommunityPage(
            uid: 'me',
            repository: repo,
            plansRepository: FakeTravelPlansRepository([
              TravelPlanSummary.fromMap('plan1', savedPlan()),
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Paylaşımlarım'));
      await tester.tap(find.text('Paylaşımlarım'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Paylaş'));
      await tester.tap(find.text('Paylaş'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(repo.shares, 0);
      repo.fail = true;
      await tester.tap(find.text('Paylaş'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Onayla'));
      await tester.pumpAndSettle();
      expect(repo.shares, 1);
      expect(find.textContaining('İşlem tamamlanamadı'), findsOneWidget);
      expect(find.text('Paylaş'), findsOneWidget);
    },
  );

  testWidgets('public detail rates a plan and reacts to removal', (
    tester,
  ) async {
    final repo = FakeCommunity();
    addTearDown(repo.events.close);
    await tester.pumpWidget(
      host(CommunityPlanPage(uid: 'me', id: 'plan1', repository: repo)),
    );
    await tester.pumpAndSettle();
    expect(find.text('Kolezyum'), findsOneWidget);
    expect(find.text('PRIVATE'), findsNothing);
    await tester.scrollUntilVisible(
      find.byTooltip('5 yıldız ver'),
      250,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.tap(find.byTooltip('5 yıldız ver'));
    await tester.pumpAndSettle();
    expect(repo.rated, 5);
    repo.events.add(null);
    await tester.pumpAndSettle();
    expect(find.textContaining('Bu paylaşım kaldırılmış'), findsOneWidget);
    expect(find.text('Kolezyum'), findsNothing);
  });

  testWidgets(
    'privacy changes preserve unrelated location and analytics choices',
    (tester) async {
      final repo = FakeCommunity();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(CommunityPrivacyPage(uid: 'me', repository: repo)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Plan paylaşımına izin ver'));
      await tester.ensureVisible(find.text('Kaydet ve uygula'));
      await tester.tap(find.text('Kaydet ve uygula'));
      await tester.pumpAndSettle();
      expect(repo.savedPrivacy?['plansPublic'], isTrue);
      expect(repo.savedPrivacy?['profilePublic'], isFalse);
      expect(repo.savedPrivacy?['analyticsEnabled'], isTrue);
      expect(repo.savedPrivacy?['locationEnabled'], isFalse);
    },
  );
}
