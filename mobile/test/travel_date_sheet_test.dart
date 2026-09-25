import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/presentation/travel_date_sheet.dart';

void main() {
  test('date shortcuts stay in the future over Sunday and year boundaries', () {
    final saturday = travelDateShortcuts(DateTime(2026, 9, 12, 23));
    expect(saturday['Bu hafta sonu']!.start, DateTime(2026, 9, 12));
    expect(saturday['Bu hafta sonu']!.end, DateTime(2026, 9, 13));
    final sunday = travelDateShortcuts(DateTime(2026, 9, 13));
    expect(sunday['Bu hafta sonu']!.start, DateTime(2026, 9, 19));
    expect(sunday['Gelecek hafta']!.start, DateTime(2026, 9, 14));
    expect(sunday['Gelecek hafta']!.end, DateTime(2026, 9, 20));
    final december = travelDateShortcuts(DateTime(2026, 12, 31));
    expect(december['Bu hafta sonu']!.start, DateTime(2027, 1, 2));
    expect(december['Gelecek hafta']!.start, DateTime(2027, 1, 4));
    expect(december['Gelecek hafta']!.end, DateTime(2027, 1, 10));
  });
  DateTimeRange? result;
  Future<void> open(
    WidgetTester tester, {
    DateTime? today,
    double scale = 1,
  }) async {
    result = null;
    tester.view.physicalSize = const Size(320, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showModalBottomSheet<DateTimeRange>(
                  context: context,
                  showDragHandle: true,
                  isScrollControlled: true,
                  constraints: const BoxConstraints(maxHeight: 666),
                  builder: (_) =>
                      TravelDateSheet(today: today ?? DateTime(2026, 9, 12)),
                );
              },
              child: const Text('Takvimi aç'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Takvimi aç'));
    await tester.pumpAndSettle();
  }

  Future<void> tap(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
    expect(finder.hitTestable(), findsOneWidget);
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  Finder day(String value) => find.byKey(ValueKey('calendar-$value'));

  testWidgets(
    'Monday-first grid disables past dates and confirms same-day trips',
    (tester) async {
      await open(tester);
      final labels = tester
          .widgetList<Text>(find.byType(Text))
          .map((t) => t.data)
          .toList();
      expect(labels.indexOf('Pzt'), lessThan(labels.indexOf('Paz')));
      expect(tester.widget<InkWell>(day('2026-09-11')).onTap, isNull);
      await tap(tester, day('2026-09-15'));
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await tap(tester, day('2026-09-15'));
      expect(find.text('1 gün · 0 gece'), findsOneWidget);
      await tester.tap(find.text('Tarihleri seç'));
      await tester.pumpAndSettle();
      expect(result!.start, DateTime(2026, 9, 15));
      expect(result!.end, result!.start);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('range survives month navigation and supports year boundary', (
    tester,
  ) async {
    await open(tester, today: DateTime(2026, 12, 28));
    await tap(tester, day('2026-12-30'));
    await tap(tester, find.byTooltip('Sonraki ay'));
    await tap(tester, day('2027-01-02'));
    expect(find.text('4 gün · 3 gece'), findsOneWidget);
    await tester.tap(find.text('Tarihleri seç'));
    await tester.pumpAndSettle();
    expect(result!.start, DateTime(2026, 12, 30));
    expect(result!.end, DateTime(2027, 1, 2));
  });

  testWidgets(
    'enforces 31 days, earlier picks restart selection, and clear disables save',
    (tester) async {
      await open(tester);
      await tap(tester, day('2026-09-12'));
      await tap(tester, find.byTooltip('Sonraki ay'));
      await tap(tester, day('2026-10-13'));
      expect(find.textContaining('en fazla 31 gün'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await tap(tester, day('2026-10-12'));
      expect(find.text('31 gün · 30 gece'), findsOneWidget);
      await tap(tester, find.byTooltip('Önceki ay'));
      await tap(tester, day('2026-09-25'));
      await tap(tester, day('2026-09-20'));
      await tap(tester, day('2026-09-21'));
      expect(find.text('2 gün · 1 gece'), findsOneWidget);
      await tap(tester, find.text('Temizle'));
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'large text scrolls without overflow and confirmation stays visible',
    (tester) async {
      await open(tester, scale: 2);
      expect(find.text('Tarihleri seç').hitTestable(), findsOneWidget);
      await tap(tester, day('2026-09-22'));
      await tap(tester, day('2026-09-23'));
      expect(find.text('Tarihleri seç').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('dismissing date picker does not commit tentative dates', (
    tester,
  ) async {
    await open(tester);
    await tap(tester, day('2026-09-22'));
    Navigator.of(tester.element(find.byType(TravelDateSheet))).pop();
    await tester.pumpAndSettle();
    expect(result, isNull);
  });

  testWidgets(
    'date shortcut is tentative until confirmed and close cancels it',
    (tester) async {
      await open(tester, today: DateTime(2026, 12, 31));
      await tap(
        tester,
        find.byKey(const ValueKey('calendar-shortcut-Gelecek hafta')),
      );
      expect(result, isNull);
      expect(find.text('7 gün · 6 gece'), findsOneWidget);
      await tap(tester, find.byKey(const ValueKey('calendar-close')));
      expect(result, isNull);
      await open(tester, today: DateTime(2026, 12, 31));
      await tap(
        tester,
        find.byKey(const ValueKey('calendar-shortcut-Gelecek hafta')),
      );
      await tester.tap(find.text('Tarihleri seç'));
      await tester.pumpAndSettle();
      expect(result!.start, DateTime(2027, 1, 4));
      expect(result!.end, DateTime(2027, 1, 10));
      expect(tester.takeException(), isNull);
    },
  );
}
