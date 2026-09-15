import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/plans/data/plan_management_repository.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/saved_plans_page.dart';
import 'package:travyon/features/notifications/data/notification_repository.dart';
import 'package:travyon/features/notifications/presentation/notifications_page.dart';

import 'widget_test.dart' show FakeTravelPlansRepository;

TravelPlanSummary fixture({
  String id = 'rome',
  String city = 'Roma',
  String? date,
  bool favorite = false,
  double spent = 0,
}) => TravelPlanSummary.fromMap(id, {
  'createdAt': 1000,
  'isFavorite': favorite,
  'onboardingData': {
    'startDate': date ?? dateKey(DateTime.now()),
    'endDate': date ?? dateKey(DateTime.now()),
    'budget': 200,
  },
  'plan': {
    'destination': city,
    'currencySymbol': '€',
    'totalEstimatedCost': 100,
    'dailyPlans': [
      {
        'date': date ?? dateKey(DateTime.now()),
        'activities': [
          {
            'placeName': 'Kolezyum',
            'actualCost': spent,
            'coordinates': {'lat': 41.89, 'lng': 12.49},
          },
        ],
      },
    ],
  },
});

class FakeManagement implements PlanManagementRepository {
  String? renamed;
  bool? favoriteValue;
  int deleted = 0;
  bool fail = false;
  @override
  Future<void> favorite(String uid, String id, bool value) async {
    favoriteValue = value;
  }

  @override
  Future<void> rename(
    String uid,
    TravelPlanSummary expected,
    String name,
  ) async {
    if (fail) throw StateError('Bağlantı yok.');
    renamed = name;
  }

  @override
  Future<void> delete(String uid, String id) async {
    deleted++;
  }

  @override
  Future<Uri> shareLink(String uid, String id) async =>
      Uri.https('example.com', '/plan/$id');
}

class FakeNotifications implements NotificationRepository {
  Set<String> hidden = {};
  bool failDismiss = false, failStorage = false, enabled = true;
  final changes = StreamController<Map<String, dynamic>>.broadcast();
  int weatherCalls = 0;
  Completer<TripWeather>? delayedWeather;
  @override
  Stream<Map<String, dynamic>> preferences(String uid) async* {
    yield {'appPlanNotif': enabled};
    yield* changes.stream;
  }

  @override
  Future<Set<String>> dismissed(String uid) async {
    if (failStorage) throw StateError('Cihaz eklentisi yüklenemedi.');
    return Set.of(hidden);
  }

  @override
  Future<void> dismiss(String uid, Set<String> ids) async {
    if (failDismiss) throw StateError('Kaydedilemedi.');
    hidden.addAll(ids);
  }

  @override
  Future<void> restore(String uid) async {
    hidden.clear();
  }

  @override
  Future<TripWeather> weather(TravelPlanSummary plan) async {
    weatherCalls++;
    return delayedWeather == null
        ? TripWeather(18, 0, DateTime.now().toUtc())
        : delayedWeather!.future;
  }
}

Widget host(Widget child) => MaterialApp(
  theme: AppTheme.light,
  home: Scaffold(body: child),
);
Widget notifications(
  FakeNotifications repo, {
  ValueChanged<TravelPlanSummary>? onOpen,
}) => NotificationsPage(
  uid: 'me',
  repository: repo,
  plansRepository: FakeTravelPlansRepository([fixture()]),
  onOpen: onOpen ?? (_) {},
  onSettings: () {},
);

void main() {
  test(
    'calendar-day notices include today at midnight and at the end of day',
    () {
      final p = fixture(date: '2026-09-12');
      for (final now in [
        DateTime(2026, 9, 12),
        DateTime(2026, 9, 12, 23, 59),
      ]) {
        expect(daysUntilTrip(p, now), 0);
        expect(
          buildTravelNotices([
            p,
          ], now).any((n) => n.title == 'Bugün yola çıkıyorsun!'),
          isTrue,
        );
      }
      expect(buildTravelNotices([p], DateTime(2026, 9, 13)), isEmpty);
      expect(
        buildTravelNotices([p], DateTime(2026, 9, 12), enabled: false),
        isEmpty,
      );
      expect(weatherTrip([p], DateTime(2026, 10, 1)), isNull);
      final updated = fixture(date: '2026-10-12');
      expect(
        buildTravelNotices([p], DateTime(2026, 9, 12)).first.id,
        isNot(buildTravelNotices([updated], DateTime(2026, 10, 12)).first.id),
      );
    },
  );
  test(
    'budget thresholds and weather types describe the source accurately',
    () {
      expect(
        buildTravelNotices([
          fixture(spent: 85),
        ], DateTime.now()).any((n) => n.id.endsWith('budget:high')),
        isTrue,
      );
      final snow = TripWeather(-1, 75, DateTime.now()).notice(fixture());
      expect(snow.title, contains('Kar yağışı'));
      expect(snow.title, isNot(contains('Yağışlı hava')));
      expect(
        TripWeather(22, 81, DateTime.now()).notice(fixture()).title,
        contains('Yağışlı hava'),
      );
      expect(TripWeather(22, 81, DateTime.now()).notice(fixture()).level, 1);
      expect(
        TripWeather(
          0,
          0,
          DateTime.now(),
        ).notice(fixture(), celsiusUnit: false).title,
        contains('32°F'),
      );
      expect(() => TripWeather.fromMap({'current': {}}), throwsFormatException);
    },
  );
  test('search and favorites preserve source order and ongoing trips', () {
    final plans = [
      fixture(id: 'b', city: 'Paris', favorite: true, date: '2026-09-13'),
      fixture(date: '2026-09-11'),
    ];
    expect(
      filterSavedPlans(
        plans,
        'par',
        PlanFilter.all,
        DateTime(2026, 9, 12),
      ).single.id,
      'b',
    );
    expect(
      filterSavedPlans(
        plans,
        '',
        PlanFilter.favorites,
        DateTime(2026, 9, 12),
      ).single.id,
      'b',
    );
    expect(
      filterSavedPlans(
        plans,
        '',
        PlanFilter.past,
        DateTime(2026, 9, 12),
      ).single.id,
      'rome',
    );
    expect(plans.first.id, 'b');
  });
  testWidgets(
    'saved plan rename retains text after failure and deletion needs confirmation',
    (tester) async {
      final manager = FakeManagement();
      await tester.pumpWidget(
        host(
          SavedPlansPage(
            uid: 'me',
            repository: FakeTravelPlansRepository([fixture()]),
            management: manager,
            onOpen: (_) {},
            onCreate: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byTooltip('Plan işlemleri'),
        250,
        scrollable: find
            .descendant(
              of: find.byType(ListView),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.ensureVisible(find.byTooltip('Plan işlemleri'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Plan işlemleri'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Adını değiştir'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Plan adı'),
        'Roma tatilim',
      );
      manager.fail = true;
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(find.text('Bağlantı yok.'), findsOneWidget);
      expect(find.text('Roma tatilim'), findsOneWidget);
      manager.fail = false;
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(manager.renamed, 'Roma tatilim');
      await tester.tap(find.byTooltip('Plan işlemleri'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Planı sil'));
      await tester.pumpAndSettle();
      expect(manager.deleted, 0);
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(manager.deleted, 0);
      await tester.tap(find.byTooltip('Plan işlemleri'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Planı sil'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Planı sil'));
      await tester.pumpAndSettle();
      expect(manager.deleted, 1);
    },
  );
  testWidgets(
    'notification dismissal persists only on success and can be restored',
    (tester) async {
      final repo = FakeNotifications();
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(notifications(repo)));
      await tester.pumpAndSettle();
      expect(find.text('Bugün yola çıkıyorsun!'), findsOneWidget);
      repo.failDismiss = true;
      await tester.tap(find.text('Tümünü kapat'));
      await tester.pumpAndSettle();
      expect(repo.hidden, isEmpty);
      expect(find.text('Kaydedilemedi.'), findsOneWidget);
      repo.failDismiss = false;
      await tester.tap(find.text('Tümünü kapat'));
      await tester.pumpAndSettle();
      expect(find.text('Bugün yola çıkıyorsun!'), findsNothing);
      expect(repo.hidden, isNotEmpty);
      await tester.tap(find.text('Kapatılanları geri getir'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Geri getir'));
      await tester.pumpAndSettle();
      expect(find.text('Bugün yola çıkıyorsun!'), findsOneWidget);
    },
  );
  testWidgets(
    'disabling plan notifications ignores an outstanding weather response',
    (tester) async {
      final repo = FakeNotifications()
        ..delayedWeather = Completer<TripWeather>();
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(notifications(repo)));
      await tester.pumpAndSettle();
      repo.changes.add({'appPlanNotif': false});
      await tester.pumpAndSettle();
      repo.delayedWeather!.complete(
        TripWeather(12, 95, DateTime.now().toUtc()),
      );
      await tester.pumpAndSettle();
      expect(find.text('Bugün yola çıkıyorsun!'), findsNothing);
      expect(find.textContaining('Gök gürültülü hava'), findsNothing);
      expect(
        find.text('Plan bildirimlerin ayarlardan kapalı.'),
        findsOneWidget,
      );
    },
  );
  testWidgets('plugin storage error still shows notices on a narrow display', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repo = FakeNotifications()..failStorage = true;
    addTearDown(repo.changes.close);
    await tester.pumpWidget(
      host(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(360, 800),
            textScaler: TextScaler.linear(1.3),
          ),
          child: notifications(repo),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('kapatma tercihin yüklenemedi'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Bugün yola çıkıyorsun!'), 200);
    expect(find.text('Bugün yola çıkıyorsun!'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
