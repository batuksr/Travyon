import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_journey_tools.dart';
import 'package:travyon/features/wallet/data/wallet_repository.dart';

WalletEntry entry(
  String id, {
  String plan = 'p',
  String category = 'flight',
  String date = '2026-09-16',
  Map<String, String> details = const {},
}) => WalletEntry(
  id: id,
  planId: plan,
  category: category,
  title: id,
  date: date,
  details: details,
  createdAt: 1,
);

class JourneyWalletFake implements WalletRepository {
  int calls = 0;
  bool fail = false;
  @override
  Stream<List<WalletEntry>> watch(String uid) {
    calls++;
    return fail
        ? Stream.error(StateError('offline'))
        : Stream.value([entry('Bilet'), entry('Başka plan', plan: 'other')]);
  }

  @override
  Future<void> save(
    String uid,
    WalletEntry entry, {
    required bool create,
  }) async {}
  @override
  Future<void> remove(String uid, String id) async {}
}

void main() {
  test('day wallet matches plan, inclusive ranges and time order', () {
    final records = [
      entry('Akşam', details: {'time': '19:00'}),
      entry('Sabah', details: {'time': '08:00'}),
      entry(
        'Otel',
        category: 'stay',
        date: '2026-09-14',
        details: {'checkOut': '2026-09-16'},
      ),
      entry(
        'Sigorta',
        category: 'insurance',
        date: '2026-09-15',
        details: {'endDate': '2026-09-20'},
      ),
      entry('Yabancı', plan: 'other'),
      entry('Genel', plan: 'general'),
      entry('Eski', date: '2026-09-15'),
      entry('Tarihsiz', date: ''),
    ];
    expect(walletEntriesForDay(records, 'p', '2026-09-16').map((e) => e.id), [
      'Otel',
      'Sigorta',
      'Sabah',
      'Akşam',
    ]);
    expect(walletEntriesForDay(records, 'p', '2026-09-17').map((e) => e.id), [
      'Sigorta',
    ]);
    expect(walletEntriesForDay(records, '', '2026-09-16'), isEmpty);
  });

  testWidgets(
    'next stop skips completed stops and handles empty/all done days',
    (tester) async {
      PlanStop? selected;
      Future<void> mount(List<Map<String, dynamic>> stops) => tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NextStopPanel(
              day: PlanDay({'activities': stops}, 0),
              onDirections: (stop) => selected = stop,
            ),
          ),
        ),
      );
      await mount([
        {'placeName': 'Gezilen', 'completed': true},
        {'placeName': 'Sıradaki'},
      ]);
      await tester.tap(find.text('Yol tarifi al'));
      expect(selected?.name, 'Sıradaki');
      await mount([
        {'placeName': 'Gezilen', 'completed': true},
      ]);
      expect(find.text('Bugünün rotası tamamlandı'), findsOneWidget);
      await mount([]);
      expect(find.text('Henüz durak yok'), findsOneWidget);
    },
  );

  testWidgets('budget handles overspend and zero budget at large text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    Future<void> mount(double budget) {
      final plan = TravelPlanSummary.fromMap('p', {
        'onboardingData': {'budget': budget},
        'plan': {
          'currencySymbol': '€',
          'dailyPlans': [
            {
              'activities': [
                {'actualCost': 120},
              ],
            },
          ],
        },
      });
      return tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(2)),
            child: child!,
          ),
          home: Scaffold(
            body: SingleChildScrollView(child: PlanBudgetSummary(plan: plan)),
          ),
        ),
      );
    }

    await mount(100);
    expect(find.text('€20 bütçe aşıldı'), findsOneWidget);
    expect(
      tester
          .widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator))
          .value,
      1,
    );
    await mount(0);
    expect(find.text('Bütçe belirlenmedi'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('wallet error retries independently and hides other plans', (
    tester,
  ) async {
    final fake = JourneyWalletFake()..fail = true;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: DayWalletPanel(
              uid: 'u',
              planId: 'p',
              date: '2026-09-16',
              repository: fake,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Günün cüzdan kayıtları'));
    await tester.pumpAndSettle();
    fake.fail = false;
    await tester.tap(find.text('Cüzdanı tekrar yükle'));
    await tester.pumpAndSettle();
    expect(find.text('Günün cüzdan kayıtları · 1'), findsOneWidget);
    expect(find.text('Bilet'), findsOneWidget);
    expect(find.text('Başka plan'), findsNothing);
    expect(fake.calls, 2);
    expect(tester.takeException(), isNull);
  });
}
