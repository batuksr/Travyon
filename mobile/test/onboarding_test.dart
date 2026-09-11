import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/onboarding/data/plan_creation_repository.dart';
import 'package:travyon/features/onboarding/presentation/onboarding_page.dart';

import 'widget_test.dart' show FakeTravelPlansRepository;

OnboardingData answers() => OnboardingData()
  ..destination = 'Roma, İtalya'
  ..startDate = dateKey(DateTime.now().add(const Duration(days: 10)))
  ..endDate = dateKey(DateTime.now().add(const Duration(days: 11)))
  ..travelType = 'solo_macera'
  ..purposes.add('culture')
  ..dietaryRestrictions.add('noRestriction')
  ..foodPhilosophy = 'mixed'
  ..mealBudget = 'medium'
  ..hasReservation = false
  ..accommodation = 'hotel'
  ..transport = 'walk';

Map<String, dynamic> generated(OnboardingData data) => {
  'totalEstimatedCost': 9999,
  'overallSummary': 'Roma seni bekliyor.',
  'dailyPlans': List.generate(
    data.dayCount,
    (i) => {
      'dayNumber': i + 1,
      'date': dateKey(
        DateTime.parse('${data.startDate}T00:00:00Z').add(Duration(days: i)),
      ),
      'daySummary': 'Tarihi meydanlarda bir gün.',
      'totalEstimatedCost': 9999,
      'activities': [
        {
          'placeName': 'Pantheon',
          'period': 'Öğle',
          'coordinates': {'lat': 41.8986, 'lng': 12.4769},
          'estimatedCost': 5,
          'actualCost': 999,
          'completed': true,
        },
        {
          'placeName': 'Piazza Navona',
          'period': 'Sabah',
          'coordinates': {'lat': 41.8992, 'lng': 12.4731},
          'estimatedCost': 0,
        },
      ],
    },
  ),
};

class CreationFake implements PlanCreationRepository {
  int generations = 0;
  bool failGeneration = false;
  final ids = <String>[];
  Map<String, dynamic>? savedAnswers;
  Completer<Map<String, dynamic>>? pending;
  @override
  Future<Map<String, dynamic>> defaults(String uid) async => {};
  @override
  Future<Map<String, dynamic>> generate(OnboardingData data) async {
    generations++;
    if (failGeneration) throw StateError('Tekrar dene.');
    return pending == null
        ? parseCreatedPlan(jsonEncode(generated(data)), data)
        : pending!.future;
  }

  @override
  Future<void> save(
    String uid,
    String id,
    Map<String, dynamic> plan,
    Map<String, dynamic> answers,
  ) async {
    ids.add(id);
    savedAnswers = answers;
    throw Exception('offline');
  }
}

Future<void> mount(
  WidgetTester tester,
  OnboardingData data,
  CreationFake repo, {
  double scale = 1,
}) async {
  tester.view.physicalSize = const Size(360, 740);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: OnboardingPage(
        uid: 'user',
        repository: repo,
        plansRepository: FakeTravelPlansRepository([]),
        initialData: data,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> next(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('onboarding-next')));
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  final scroll = find.byType(Scrollable).first;
  await tester.drag(find.byType(ListView).first, const Offset(0, 5000));
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(target, 220, scrollable: scroll);
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  test('web profile defaults accept persisted strings and currency labels', () {
    final data = OnboardingData()
      ..applyDefaults({
        'defaultBudget': '3500',
        'defaultPeopleCount': '2',
        'defaultCurrency': 'EUR — €',
        'defaultPace': 'rahat',
      });
    expect(data.budget, 3500);
    expect(data.peopleCount, 2);
    expect(data.currencyCode, 'EUR');
    expect(data.pace, 'rahat');
    data.applyDefaults({
      'defaultBudget': 'NaN',
      'defaultPeopleCount': 99,
      'defaultCurrency': 'unknown',
    });
    expect(data.budget, 3500);
    expect(data.peopleCount, 2);
    expect(data.currencyCode, 'EUR');
  });
  test('four steps validate and serialize the web contract', () {
    final data = answers();
    for (var i = 0; i < 4; i++) {
      expect(data.validate(i), isNull);
    }
    expect(data.dayCount, 2);
    expect(data.toJson()['tripPurpose'], 'culture');
    expect(data.toJson()['currencySymbol'], '₺');
    expect(data.toJson()['accommodationLat'], isNull);
    expect(data.prompt(), contains(jsonEncode(data.toJson())));
    data.endDate = data.startDate;
    expect(data.validate(0), isNotNull);
    data.endDate = dateKey(
      DateTime.parse(data.startDate).add(const Duration(days: 31)),
    );
    expect(data.validate(0), isNotNull);
    data.endDate = dateKey(
      DateTime.parse(data.startDate).add(const Duration(days: 1)),
    );
    data.budget = double.nan;
    expect(data.validate(0), isNotNull);
  });

  test('interests preserve ranking and cap at three, diets are exclusive', () {
    final data = answers();
    expect(data.toggleInterest('nature'), isTrue);
    expect(data.toggleInterest('relax'), isTrue);
    expect(data.toggleInterest('nightlife'), isFalse);
    data.toggleInterest('culture');
    expect(data.toJson()['tripPurpose'], 'nature');
    data.toggleDiet('vegan');
    expect(data.dietaryRestrictions, ['vegan']);
    data.toggleDiet('halal');
    expect(data.dietaryRestrictions, ['vegan', 'halal']);
    data.toggleDiet('noRestriction');
    expect(data.dietaryRestrictions, ['noRestriction']);
  });

  test('reservation switch clears fields that no longer apply', () {
    final data = answers()..setReservation(true);
    expect(data.accommodation, isEmpty);
    expect(data.validate(3), isNotNull);
    data.accommodationAddress = 'Hotel Roma';
    data.accommodationLat = 41;
    data.accommodationLng = 12;
    expect(data.validate(3), isNull);
    data.setReservation(false);
    expect(data.accommodationAddress, isEmpty);
    expect(data.accommodationLat, isNull);
    expect(data.validate(3), isNotNull);
  });

  test('AI response is validated, ordered and totals recomputed', () {
    final data = answers();
    final plan = parseCreatedPlan(
      '```json\n${jsonEncode(generated(data))}\n```',
      data,
    );
    expect(plan['totalEstimatedCost'], 10);
    expect(plan['destination'], data.destination);
    final stop = plan['dailyPlans'][0]['activities'][1] as Map;
    expect(plan['dailyPlans'][0]['activities'][0]['period'], 'Sabah');
    expect(stop.containsKey('actualCost'), isFalse);
    expect(stop.containsKey('completed'), isFalse);
    final bad = generated(data);
    bad['dailyPlans'][0]['activities'][0]['coordinates'] = {
      'lat': 999,
      'lng': 12,
    };
    expect(
      () => parseCreatedPlan(jsonEncode(bad), data),
      throwsFormatException,
    );
    final dates = generated(data);
    dates['dailyPlans'][0]['date'] = '2000-01-01';
    expect(
      () => parseCreatedPlan(jsonEncode(dates), data),
      throwsFormatException,
    );
    expect(() => parseCreatedPlan('{}', data), throwsFormatException);
  });

  testWidgets(
    'validation, Turkish calendar, selections and back retain answers',
    (tester) async {
      final data = OnboardingData();
      await mount(tester, data, CreationFake(), scale: 1.4);
      await next(tester);
      expect(find.text('Lütfen bir destinasyon girin.'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('destination')),
        'Roma, İtalya',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await choose(tester, 'dates');
      expect(find.text('Seyahat tarihleri'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Tarihleri seç'));
      await tester.pumpAndSettle();
      expect(data.dayCount, 2);
      await next(tester);
      await choose(tester, 'travelType-aile');
      await choose(tester, 'interest-culture');
      await choose(tester, 'interest-nature');
      await choose(tester, 'pace-rahat');
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(find.text('Roma, İtalya'), findsOneWidget);
      await next(tester);
      expect(data.travelType, 'aile');
      expect(data.purposes, ['culture', 'nature']);
      await next(tester);
      await choose(tester, 'diet-vegan');
      await choose(tester, 'food-hidden_gems');
      await choose(tester, 'meal-medium');
      await next(tester);
      await choose(tester, 'reservation-yes');
      await tester.ensureVisible(
        find.byKey(const ValueKey('accommodation-address')),
      );
      await tester.enterText(
        find.byKey(const ValueKey('accommodation-address')),
        'Hotel Roma Centro',
      );
      await choose(tester, 'reservation-no');
      expect(data.accommodationAddress, isEmpty);
      await choose(tester, 'stay-hostel');
      await choose(tester, 'transport-public');
      expect(tester.takeException(), isNull);
      await next(tester);
      expect(find.text('Planın hazır'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'generation error preserves answers and save retries do not regenerate',
    (tester) async {
      final data = answers();
      final repo = CreationFake()..failGeneration = true;
      await mount(tester, data, repo);
      for (var i = 0; i < 4; i++) {
        await next(tester);
      }
      expect(find.text('Tekrar dene.'), findsOneWidget);
      expect(data.foodPhilosophy, 'mixed');
      repo.failGeneration = false;
      await next(tester);
      expect(find.text('Planın hazır'), findsOneWidget);
      await next(tester);
      expect(find.textContaining('Plan kaydedilemedi.'), findsOneWidget);
      await next(tester);
      expect(repo.generations, 2);
      expect(repo.ids.length, 2);
      expect(repo.ids.toSet().length, 1);
      expect(repo.savedAnswers, data.toJson());
      expect(find.text('Planın hazır'), findsOneWidget);
    },
  );

  testWidgets('pending generation disables resubmission', (tester) async {
    final data = answers();
    final repo = CreationFake()..pending = Completer<Map<String, dynamic>>();
    await mount(tester, data, repo);
    for (var i = 0; i < 3; i++) {
      await next(tester);
    }
    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pump();
    expect(find.text('Planın hazırlanıyor'), findsOneWidget);
    expect(find.byKey(const ValueKey('onboarding-next')), findsNothing);
    expect(repo.generations, 1);
    repo.pending!.complete(parseCreatedPlan(jsonEncode(generated(data)), data));
    await tester.pumpAndSettle();
    expect(find.text('Planın hazır'), findsOneWidget);
  });
}
