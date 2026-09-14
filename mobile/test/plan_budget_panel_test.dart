import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_budget_panel.dart';
import 'package:travyon/features/plans/presentation/plan_expense_sheet.dart';

TravelPlanSummary budgetPlan(double budget, {double spent = 120.25}) =>
    TravelPlanSummary.fromMap('budget-test', {
      'onboardingData': {'budget': budget},
      'plan': {
        'currencySymbol': '€',
        'totalEstimatedCost': 150,
        'dailyPlans': [
          {
            'activities': [
              {'placeName': 'Trattoria Vecchia Roma', 'actualCost': spent},
              {'placeName': 'Trevi Çeşmesi', 'actualCost': 0},
              {'placeName': 'Kolezyum', 'estimatedCost': 18},
            ],
          },
        ],
      },
    });

void narrowView(WidgetTester tester) {
  tester.view.physicalSize = const Size(320, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Widget localizedApp(
  Widget child, {
  bool english = false,
  double keyboard = 0,
}) => MaterialApp(
  theme: AppTheme.light,
  locale: Locale(english ? 'en' : 'tr'),
  supportedLocales: const [Locale('tr'), Locale('en')],
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      textScaler: const TextScaler.linear(2),
      viewInsets: EdgeInsets.only(bottom: keyboard),
    ),
    child: child!,
  ),
  home: Scaffold(body: child),
);

void main() {
  for (final english in [false, true]) {
    testWidgets(
      'budget states and zero-cost entries fit large text (${english ? 'en' : 'tr'})',
      (tester) async {
        narrowView(tester);
        Future<void> mount(double budget) async {
          await tester.pumpWidget(
            localizedApp(
              SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: PlanBudgetOverview(plan: budgetPlan(budget)),
              ),
              english: english,
            ),
          );
          await tester.pumpAndSettle();
        }

        await mount(100);
        expect(
          find.text(english ? '€20.25 over budget' : '€20,25 bütçe aşıldı'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<LinearProgressIndicator>(
                find.byType(LinearProgressIndicator),
              )
              .value,
          1,
        );
        expect(
          find.text(
            english ? '120% of budget used' : 'Bütçenin %120 kadarı kullanıldı',
          ),
          findsOneWidget,
        );
        expect(
          find.text(
            english
                ? 'Spending added to 2 / 3 stops.'
                : '2 / 3 durağa harcama girildi.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);

        await mount(0);
        expect(
          find.text(english ? 'Budget not set' : 'Bütçe belirlenmedi'),
          findsOneWidget,
        );
        expect(find.byType(LinearProgressIndicator), findsNothing);
        expect(find.text(english ? '€120.25' : '€120,25'), findsOneWidget);
        expect(tester.takeException(), isNull);

        await mount(200);
        expect(
          find.text(english ? '€79.75 remaining' : '€79,75 kaldı'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<LinearProgressIndicator>(
                find.byType(LinearProgressIndicator),
              )
              .value,
          closeTo(0.60125, 0.00001),
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'daily expenses expand and distinguish missing and zero spending',
    (tester) async {
      narrowView(tester);
      PlanStop? opened;
      await tester.pumpWidget(
        localizedApp(
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: PlanBudgetDayCard(
              day: budgetPlan(200).days.first,
              label: '1. Gün · 17 Eylül',
              symbol: '€',
              busy: false,
              onExpense: (stop) => opened = stop,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Kolezyum'), findsNothing);
      await tester.tap(find.text('1. Gün · 17 Eylül'));
      await tester.pumpAndSettle();
      expect(find.text('Harcama girilmedi'), findsOneWidget);
      expect(find.text('€0'), findsOneWidget);
      final edit = find.byKey(const ValueKey('expense-0-2'));
      await tester.ensureVisible(edit);
      await tester.pumpAndSettle();
      await tester.tap(edit);
      expect(opened?.name, 'Kolezyum');
      expect(opened?.actual, isNull);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'expense draft survives failure, prevents duplicate saves and accepts zero',
    (tester) async {
      narrowView(tester);
      var pending = Completer<void>();
      final amounts = <double>[];
      bool? saved;
      await tester.pumpWidget(
        localizedApp(
          Builder(
            builder: (context) => TextButton(
              child: const Text('Aç'),
              onPressed: () async {
                saved = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  isDismissible: false,
                  enableDrag: false,
                  builder: (_) => PlanExpenseSheet(
                    stop: PlanStop({
                      'placeName': 'Roma',
                      'actualCost': 12.5,
                      'estimatedCost': 20,
                    }, 0),
                    symbol: '€',
                    save: (amount) {
                      amounts.add(amount);
                      return pending.future;
                    },
                  ),
                );
              },
            ),
          ),
          keyboard: 220,
        ),
      );
      await tester.tap(find.text('Aç'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '12,50',
      );
      await tester.enterText(find.byType(TextField), '0');
      await tester.ensureVisible(find.text('Kaydet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Kaydet'));
      await tester.pump();
      expect(amounts, [0]);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(find.byType(PlanExpenseSheet), findsOneWidget);

      pending.completeError(Exception('offline'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Kaydedilemedi. Bağlantını kontrol et; yazdıkların korunuyor.',
        ),
        findsOneWidget,
      );
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        '0',
      );
      expect(saved, isNull);
      pending = Completer<void>();
      await tester.ensureVisible(find.text('Kaydet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Kaydet'));
      await tester.pump();
      expect(amounts, [0, 0]);
      pending.complete();
      await tester.pumpAndSettle();
      expect(find.byType(PlanExpenseSheet), findsNothing);
      expect(saved, isTrue);
      expect(tester.takeException(), isNull);
    },
  );
}
