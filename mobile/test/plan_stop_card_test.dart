import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/presentation/plan_stop_card.dart';

Finder actionButton(String tooltip) => find.byWidgetPredicate(
  (widget) => widget is IconButton && widget.tooltip == tooltip,
);

void main() {
  testWidgets(
    'visited toggle retains stop number and busy state blocks edits',
    (tester) async {
      var completed = false;
      var busy = false;
      var calls = 0;
      final actions = <String>[];
      late StateSetter update;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return PlanStopCard(
                  stop: PlanStop({
                    'placeName': 'Trattoria Vecchia Roma',
                    'estimatedCost': 20,
                    'completed': completed,
                  }, 0),
                  symbol: '€',
                  busy: busy,
                  onComplete: () {
                    calls++;
                    setState(() => completed = !completed);
                  },
                  onAction: actions.add,
                  canMoveUp: false,
                  canMoveDown: true,
                );
              },
            ),
          ),
        ),
      );
      final mark = find.byTooltip('Gezildi olarak işaretle');
      expect(tester.getSize(mark).shortestSide, greaterThanOrEqualTo(48));
      await tester.tap(mark);
      await tester.pumpAndSettle();
      expect(find.text('1'), findsOneWidget);
      final unmark = find.byTooltip('Gezildi işaretini kaldır');
      expect(unmark, findsOneWidget);
      await tester.tap(unmark);
      await tester.pumpAndSettle();
      expect(completed, isFalse);
      expect(calls, 2);
      expect(
      tester.widget<IconButton>(actionButton('Yukarı taşı')).onPressed,
        isNull,
      );
      await tester.tap(find.byTooltip('Aşağı taşı'));
      await tester.tap(find.text('Not ekle'));
      await tester.tap(find.byTooltip('Durağı sil'));
      expect(actions, ['down', 'note', 'delete']);
      update(() => busy = true);
      await tester.pumpAndSettle();
      for (final tooltip in [
        'Gezildi olarak işaretle',
        'Yukarı taşı',
        'Aşağı taşı',
        'Durağı sil',
      ]) {
        expect(
        tester.widget<IconButton>(actionButton(tooltip)).onPressed,
          isNull,
        );
      }
      expect(
        tester.widget<TextButton>(find.byType(TextButton)).onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  for (final english in [false, true]) {
    testWidgets(
      'long content fits a narrow large-text card (${english ? 'en' : 'tr'})',
      (tester) async {
        tester.view.physicalSize = const Size(320, 780);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final description = List.filled(
          8,
          'A family restaurant in the historic center, with handmade pasta.',
        ).join(' ');
        final actions = <String>[];
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            locale: Locale(english ? 'en' : 'tr'),
            supportedLocales: const [Locale('tr'), Locale('en')],
            localizationsDelegates: const [
              AppLocalizations.delegate,
              ...GlobalMaterialLocalizations.delegates,
            ],
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: Scaffold(
              body: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: PlanStopCard(
                  stop: PlanStop({
                    'placeName':
                        'Trattoria Vecchia Roma e Piazza Vittorio Emanuele',
                    'description': description,
                    'estimatedCost': 1234.5,
                    'note': 'Biletini yanına al',
                  }, 14),
                  symbol: '€',
                  busy: false,
                  onComplete: () {},
                  onAction: actions.add,
                  canMoveUp: true,
                  canMoveDown: false,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(english ? 'Estimated cost' : 'Tahmini maliyet'),
          findsOneWidget,
        );
        expect(find.text(english ? '€1234.50' : '€1234,50'), findsOneWidget);
        expect(find.text(english ? 'Your note' : 'Notun'), findsOneWidget);
        // User-authored content is never translated along with interface labels.
        expect(find.text('Biletini yanına al'), findsOneWidget);
        expect(tester.takeException(), isNull);

        final readMore = find.text(english ? 'Read more' : 'Devamını oku');
        await tester.ensureVisible(readMore);
        await tester.pumpAndSettle();
        await tester.tap(readMore);
        await tester.pumpAndSettle();
        expect(tester.widget<Text>(find.text(description)).maxLines, isNull);
        final readLess = find.text(english ? 'Show less' : 'Daha az');
        await tester.ensureVisible(readLess);
        await tester.pumpAndSettle();
        await tester.tap(readLess);
        await tester.pumpAndSettle();
        expect(tester.widget<Text>(find.text(description)).maxLines, 3);

        final note = find.text(english ? 'Edit note' : 'Notu düzenle');
        await tester.ensureVisible(note);
        await tester.pumpAndSettle();
        await tester.tap(note);
        expect(actions, ['note']);
        final down = actionButton(english ? 'Move down' : 'Aşağı taşı');
        expect(tester.widget<IconButton>(down).onPressed, isNull);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
