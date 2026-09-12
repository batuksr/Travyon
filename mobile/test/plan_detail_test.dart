import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';
import 'package:travyon/features/plans/presentation/plan_route_map.dart';

Map<String, dynamic> fixture() => {
  'destination': 'Roma, İtalya',
  'currencySymbol': '€',
  'totalEstimatedCost': 45,
  'dailyPlans': [
    {
      'date': '2026-09-11',
      'dayNumber': 1,
      'daySummary': 'Roma sokaklarında keşif.',
      'activities': [
        {
          'placeName': 'Kolezyum ve çevresindeki tarihi Roma sokakları',
          'period': 'Sabah',
          'description': List.filled(12, 'Roma tarihini keşfet.').join(' '),
          'estimatedCost': 30,
          'note': 'Biletini yanına al',
          'webOnly': {'preserve': true},
        },
      ],
    },
    {
      'date': '2026-09-12',
      'dayNumber': 2,
      'activities': [
        {'placeName': 'Villa Borghese', 'period': 'Öğle', 'estimatedCost': 15},
      ],
    },
  ],
};

void main() {
  testWidgets('hub can open the current travel day directly', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: PlanDetailPage(
          uid: 'test',
          planId: 'p1',
          repository: DetailFake(),
          initialDayIndex: 1,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Villa Borghese'), findsWidgets);
    final chips = tester
        .widgetList<ChoiceChip>(find.byType(ChoiceChip))
        .toList();
    expect(chips[1].selected, isTrue);
    expect(chips[0].selected, isFalse);
    expect(tester.takeException(), isNull);
  });

  test('mobile edits preserve all web fields and other days', () {
    final plan = fixture();
    final day = PlanDay(planMap(planList(plan['dailyPlans'])[0]), 0);
    final result = patchPlanStop(
      plan,
      day,
      day.stops.first,
      completed: true,
      actualCost: 0,
    );
    final saved = planMap(planList(planMap(result[0])['activities'])[0]);
    expect(saved['webOnly'], {'preserve': true});
    expect(saved['completed'], true);
    expect(saved['actualCost'], 0);
    expect(result[1], planList(plan['dailyPlans'])[1]);
    expect(day.stops.first.completed, false);
  });

  test('stale or removed activities are rejected rather than overwritten', () {
    final plan = fixture();
    final day = PlanDay(planMap(planList(plan['dailyPlans'])[0]), 0);
    final changed = fixture();
    changed['dailyPlans'][0]['activities'][0]['note'] = 'Yeni web notu';
    expect(
      () => patchPlanStop(changed, day, day.stops.first, completed: true),
      throwsStateError,
    );
    expect(
      () => patchPlanStop(
        {'dailyPlans': []},
        day,
        day.stops.first,
        completed: true,
      ),
      throwsStateError,
    );
    expect(
      () => patchPlanStop(plan, day, day.stops.first, actualCost: -2),
      throwsArgumentError,
    );
  });

  testWidgets(
    'narrow mobile layout supports days, budget, and validated expense entry',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = DetailFake();
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.3)),
            child: child!,
          ),
          home: PlanDetailPage(
            uid: 'test',
            planId: 'p1',
            repository: repository,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Roma, İtalya'), findsOneWidget);
      await tester.drag(find.byType(ChoiceChip).first, const Offset(-240, 0));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('2. Gün  ·  12 Eylül'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('2. Gün  ·  12 Eylül'));
      await tester.pumpAndSettle();
      expect(find.text('Villa Borghese'), findsWidgets);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Rota'));
      await tester.pumpAndSettle();
      expect(find.byType(PlanRouteMap), findsOneWidget);
      expect(find.text('Villa Borghese'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Bütçe'));
      await tester.pumpAndSettle();
      expect(find.text('Gerçek harcama'), findsOneWidget);
      final edit = find.byKey(const ValueKey('expense-0-0'));
      await tester.scrollUntilVisible(edit, 160);
      await tester.pumpAndSettle();
      await tester.tap(edit);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '-1');
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(find.text('Geçerli bir tutar gir (ör. 12,50).'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '12,50');
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(repository.lastCost, 12.5);
      expect(tester.takeException(), isNull);
    },
  );
}

class DetailFake implements TravelPlansRepository {
  double? lastCost;
  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) => Stream.value([
    TravelPlanSummary.fromMap('p1', {'plan': fixture(), 'onboardingData': {}}),
  ]);
  @override
  Future<void> updateStop(
    String uid,
    String planId,
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? actualCost,
  }) async {
    lastCost = actualCost;
  }
}
