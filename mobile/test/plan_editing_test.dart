import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/plan_editing_repository.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';
import 'package:travyon/features/plans/presentation/stop_editor_sheet.dart';

import 'plan_detail_test.dart' show fixture, DetailFake;

class EditingFake extends DetailFake implements PlanEditingRepository {
  Map<String, dynamic> plan = fixture();
  final events = StreamController<List<TravelPlanSummary>>.broadcast();
  bool fail = false;
  int writes = 0;
  List<TravelPlanSummary> get current => [
    TravelPlanSummary.fromMap('p1', {'plan': plan, 'onboardingData': {}}),
  ];
  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) async* {
    yield current;
    yield* events.stream;
  }

  @override
  Future<Map<String, dynamic>> locate(String name, String destination) async =>
      {'lat': 41.9, 'lng': 12.5};
  @override
  Future<PlanDay> replaceDay(
    String uid,
    String planId,
    PlanDay expected,
    Map<String, dynamic> replacement,
  ) async {
    if (fail) throw StateError('Test bağlantı hatası');
    plan = replacePlanDay(plan, expected, replacement);
    writes++;
    events.add(current);
    return PlanDay(
      planMap(planList(plan['dailyPlans'])[expected.index]),
      expected.index,
    );
  }
}

void main() {
  test('day mutations preserve unknown fields, recalculate totals and reject stale undo', () {
    final original = fixture();
    final day = PlanDay(planMap(planList(original['dailyPlans'])[0]), 0);
    final updated = replacePlanDay(original, day, {
      ...day.raw,
      'activities': [
        {...day.stops.first.raw, 'note': 'Yeni not'},
        {'placeName': 'Pantheon', 'period': 'Öğle', 'estimatedCost': 5},
      ],
    });
    final after = PlanDay(planMap(planList(updated['dailyPlans'])[0]), 0);
    expect(after.stops.first.raw['webOnly'], {'preserve': true});
    expect(after.estimated, 35);
    expect(updated['totalEstimatedCost'], 50);
    expect(
      planList(updated['dailyPlans'])[1],
      planList(original['dailyPlans'])[1],
    );
    final restored = replacePlanDay(updated, after, day.raw);
    expect(restored['totalEstimatedCost'], 45);
    expect(
      PlanDay(planMap(planList(restored['dailyPlans'])[0]), 0).stops.first.note,
      'Biletini yanına al',
    );
    expect(() => replacePlanDay(restored, after, day.raw), throwsStateError);
    expect(day.stops.length, 1);
    expect(
      samePlanValue(
        {
          'a': 1,
          'b': {'x': 2},
        },
        {
          'b': {'x': 2},
          'a': 1,
        },
      ),
      isTrue,
    );
  });

  test('empty day and negative totals are handled safely', () {
    final plan = fixture();
    final day = PlanDay(planMap(planList(plan['dailyPlans'])[0]), 0);
    final empty = replacePlanDay(plan, day, {...day.raw, 'activities': []});
    expect(empty['totalEstimatedCost'], 15);
    expect(
      () => replacePlanDay(plan, day, {
        ...day.raw,
        'activities': [
          {'estimatedCost': -1},
        ],
      }),
      throwsStateError,
    );
  });

  testWidgets(
    'editor supports large text and keyboard, blocks duplicate pending saves',
    (tester) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final pending = Completer<void>();
      int calls = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(2),
              viewInsets: const EdgeInsets.only(bottom: 200),
            ),
            child: child!,
          ),
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => StopEditorSheet(
                    note: '',
                    save: (_) {
                      calls++;
                      return pending.future;
                    },
                  ),
                ),
                child: const Text('Aç'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Aç'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Bir not');
      await tester.ensureVisible(find.text('Kaydet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Kaydet'));
      await tester.pump();
      expect(calls, 1);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      pending.completeError(StateError('Tekrar dene'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Bir not',
      );
      expect(tester.takeException(), isNull);
    },
  );

  Future<void> mount(WidgetTester tester, EditingFake fake) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(fake.events.close);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: PlanDetailPage(
          uid: 'u',
          planId: 'p1',
          repository: fake,
          editingRepository: fake,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    if (finder.evaluate().isNotEmpty) {
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      return;
    }
    final scrollable = find
        .descendant(
          of: find.byKey(const ValueKey('0-0')),
          matching: find.byType(Scrollable),
        )
        .first;
    tester.state<ScrollableState>(scrollable).position.jumpTo(0);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(finder, 160, scrollable: scrollable);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'note failures retain draft, retry saves, undo restores, delete requires confirmation',
    (tester) async {
      final fake = EditingFake();
      await mount(tester, fake);
      await reveal(tester, find.text('Notu düzenle'));
      await tester.tap(find.text('Notu düzenle'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Yeni not');
      fake.fail = true;
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(find.text('Test bağlantı hatası'), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Yeni not',
      );
      fake.fail = false;
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(find.byType(StopEditorSheet), findsNothing);
      expect(fake.current.first.days.first.stops.first.note, 'Yeni not');
      await reveal(tester, find.text('Geri al'));
      await tester.tap(find.text('Geri al'));
      await tester.pumpAndSettle();
      expect(
        fake.current.first.days.first.stops.first.note,
        'Biletini yanına al',
      );
      await reveal(tester, find.byTooltip('Durağı sil'));
      await tester.tap(find.byTooltip('Durağı sil'));
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops.length, 1);
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops.length, 1);
      await tester.tap(find.byTooltip('Durağı sil'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Durağı sil'));
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops, isEmpty);
      await reveal(tester, find.text('Geri al'));
      await tester.tap(find.text('Geri al'));
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops.length, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'adding a located stop and moving it preserve fields and update totals',
    (tester) async {
      final fake = EditingFake();
      await mount(tester, fake);
      await reveal(tester, find.text('Durak ekle'));
      await tester.tap(find.text('Durak ekle'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).at(0), 'Pantheon');
      await tester.enterText(find.byType(TextField).at(1), '5');
      await reveal(tester, find.text('Kaydet'));
      await tester.tap(find.text('Kaydet'));
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops.length, 2);
      expect(fake.current.first.days.first.stops.last.location, (
        lat: 41.9,
        lng: 12.5,
      ));
      expect(fake.current.first.estimatedCost, 50);
      await reveal(tester, find.byTooltip('Aşağı taşı').first);
      await tester.tap(find.byTooltip('Aşağı taşı').first);
      await tester.pumpAndSettle();
      expect(fake.current.first.days.first.stops.first.name, 'Pantheon');
      expect(fake.current.first.days.first.stops.last.raw['webOnly'], {
        'preserve': true,
      });
      expect(tester.takeException(), isNull);
    },
  );
}
