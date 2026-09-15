import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/checklist/data/checklist_catalog.dart';
import 'package:travyon/features/checklist/data/checklist_repository.dart';
import 'package:travyon/features/checklist/presentation/travel_checklist_panel.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';

void main() {
  test('mobile catalog matches the shared 23-item Firestore allowlist', () {
    final catalogIds = travelChecklistGroups
        .expand((group) => group.items)
        .map((item) => item.id)
        .toList();
    expect(catalogIds, hasLength(23));
    expect(catalogIds.toSet(), hasLength(catalogIds.length));
    expect(travelChecklistItemIds, catalogIds.toSet());
    expect(travelChecklistTotal, 23);
    expect(
      normalizeTravelChecklistIds(['passport', 'passport', 'unknown', 42]),
      {'passport'},
    );
    expect(normalizeTravelChecklistIds(null), isEmpty);
  });

  testWidgets('checklist toggles, syncs and resets at narrow width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = ChecklistFake();
    addTearDown(repository.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: TravelChecklistPanel(
            uid: 'user',
            planId: 'plan',
            destination: 'Roma, İtalya',
            repository: repository,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Seyahat listesi'), findsOneWidget);
    expect(find.text('0 / 23 tamamlandı'), findsOneWidget);
    expect(find.text('Web ve telefonla senkronize'), findsNothing);

    await tester.tap(find.text('Pasaport / Kimlik kartı'));
    await tester.pumpAndSettle();
    expect(repository.lastToggle, ('passport', true));
    expect(find.text('1 / 23 tamamlandı'), findsOneWidget);

    await tester.tap(find.text('Belgeler'));
    await tester.pumpAndSettle();
    expect(find.text('Pasaport / Kimlik kartı'), findsNothing);
    await tester.tap(find.text('Belgeler'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sıfırla').first);
    await tester.pumpAndSettle();
    expect(find.text('Liste sıfırlansın mı?'), findsOneWidget);
    await tester.tap(find.text('Sıfırla').last);
    await tester.pumpAndSettle();
    expect(repository.resetCalls, 1);
    expect(find.text('0 / 23 tamamlandı'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cached checklist clearly reports offline synchronization', (
    tester,
  ) async {
    final repository = ChecklistFake(
      initial: const TravelChecklistState(
        checkedIds: {'ticket'},
        fromCache: true,
      ),
    );
    addTearDown(repository.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: TravelChecklistPanel(
            uid: 'user',
            planId: 'plan',
            destination: 'Roma',
            repository: repository,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.text('Çevrimdışı · bağlantı gelince eşitlenecek'),
      findsOneWidget,
    );
  });

  testWidgets('plan detail exposes preparation as a fourth tab', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final checklist = ChecklistFake();
    addTearDown(checklist.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: PlanDetailPage(
          uid: 'user',
          planId: 'plan',
          repository: PlanFake(),
          checklistRepository: checklist,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hazırlık'));
    await tester.pumpAndSettle();
    expect(find.text('Seyahat listesi'), findsOneWidget);
    expect(checklist.watchCalls, 1);
    expect(tester.takeException(), isNull);
  });
}

class ChecklistFake implements ChecklistRepository {
  ChecklistFake({
    TravelChecklistState initial = const TravelChecklistState(checkedIds: {}),
  }) : _state = initial;

  final _updates = StreamController<TravelChecklistState>.broadcast();
  TravelChecklistState _state;
  (String, bool)? lastToggle;
  int resetCalls = 0;
  int watchCalls = 0;

  @override
  Stream<TravelChecklistState> watch(String uid, String planId) async* {
    watchCalls++;
    yield _state;
    yield* _updates.stream;
  }

  @override
  Future<void> toggle(
    String uid,
    String planId,
    String itemId,
    bool checked,
  ) async {
    lastToggle = (itemId, checked);
    final next = {..._state.checkedIds};
    checked ? next.add(itemId) : next.remove(itemId);
    _state = TravelChecklistState(checkedIds: next);
    _updates.add(_state);
  }

  @override
  Future<void> reset(String uid, String planId) async {
    resetCalls++;
    _state = const TravelChecklistState(checkedIds: {});
    _updates.add(_state);
  }

  Future<void> dispose() => _updates.close();
}

class PlanFake implements TravelPlansRepository {
  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) => Stream.value([
    TravelPlanSummary.fromMap('plan', {
      'onboardingData': {'startDate': '2026-09-13', 'endDate': '2026-09-13'},
      'plan': {
        'destination': 'Roma, İtalya',
        'dailyPlans': [
          {
            'date': '2026-09-13',
            'dayNumber': 1,
            'activities': [
              {'placeName': 'Pantheon'},
            ],
          },
        ],
      },
    }),
  ]);

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
