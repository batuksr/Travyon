import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/onboarding/data/plan_creation_repository.dart';
import 'package:travyon/features/onboarding/presentation/onboarding_page.dart';

import 'widget_test.dart' show FakeTravelPlansRepository;

OnboardingData answers() => OnboardingData()
  ..budget = 15000
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
  Map<String, dynamic> savedDefaults = {};
  int defaultReads = 0;
  int generations = 0;
  bool failGeneration = false;
  final ids = <String>[];
  Map<String, dynamic>? savedAnswers;
  Completer<Map<String, dynamic>>? pending;
  @override
  Future<Map<String, dynamic>> defaults(String uid) async {
    defaultReads++;
    return savedDefaults;
  }

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
  bool applySavedDefaults = false,
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
        applySavedDefaults: applySavedDefaults,
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
  testWidgets(
    'currency labels stay dark when selected and choices use line icons',
    (tester) async {
      final data = answers();
      await mount(tester, data, CreationFake());
      expect(find.byIcon(Icons.backpack_outlined), findsNothing);
      await choose(tester, 'currency-EUR');
      for (final entry in currencies.entries) {
        final label = find.text('${entry.key} · ${entry.value}');
        final paragraph = tester.renderObject<RenderParagraph>(label);
        final color = paragraph.text.style!.color!;
        expect(color, AppColors.text);
        final background = entry.key == 'EUR'
            ? AppPalette.light.greenTint
            : AppColors.surface;
        final contrast =
            (background.computeLuminance() + .05) /
            (color.computeLuminance() + .05);
        expect(contrast, greaterThanOrEqualTo(4.5));
      }
      await next(tester);
      expect(find.byIcon(Icons.explore_outlined), findsNothing);
      expect(find.byIcon(Icons.backpack_outlined), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('pace-esnek')),
        180,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(
        find.byIcon(Icons.explore_outlined),
        findsOneWidget,
      ); // Flexible pace card only, not header.
      await next(tester);
      expect(find.byIcon(Icons.nightlight_round), findsOneWidget);
      await next(tester);
      expect(find.byIcon(Icons.key_outlined), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('all redesigned steps fit narrow screens at large text scale', (
    tester,
  ) async {
    final data = answers();
    await mount(tester, data, CreationFake(), scale: 2);
    expect(find.text('Nereye gidiyorsun?'), findsOneWidget);
    await choose(tester, 'currency-EUR');
    expect(tester.takeException(), isNull);
    await next(tester);
    await choose(tester, 'travelType-aile');
    await choose(tester, 'pace-rahat');
    expect(tester.takeException(), isNull);
    await next(tester);
    await choose(tester, 'diet-vegan');
    await choose(tester, 'meal-medium');
    expect(tester.takeException(), isNull);
    await next(tester);
    await choose(tester, 'stay-hostel');
    await choose(tester, 'transport-public');
    expect(tester.takeException(), isNull);
    await next(tester);
    expect(find.text('Planın hazır'), findsOneWidget);
    await choose(tester, 'preview-day-1');
    expect(find.text('Pantheon'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'hub seeds retain city and dates while loading saved preferences',
    (tester) async {
      final seed = OnboardingData()
        ..destination = 'Roma, İtalya'
        ..startDate = '2026-10-10'
        ..endDate = '2026-10-11';
      final repo = CreationFake()
        ..savedDefaults = {
          'defaultBudget': 800,
          'defaultCurrency': 'EUR — €',
          'defaultPeopleCount': 2,
          'defaultPace': 'rahat',
        };
      await mount(tester, seed, repo, applySavedDefaults: true);
      expect(repo.defaultReads, 1);
      expect(seed.destination, 'Roma, İtalya');
      expect(seed.startDate, '2026-10-10');
      expect(seed.endDate, '2026-10-11');
      expect(seed.budget, 0);
      expect(seed.currencyCode, 'EUR');
      expect(seed.peopleCount, 2);
      expect(seed.pace, 'rahat');
      expect(tester.takeException(), isNull);
    },
  );

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
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('budget')),
        180,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const ValueKey('budget')), '15000');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
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
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('accommodation-address')),
        160,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
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
    expect(find.byType(AppBar), findsOneWidget);
    for (var i = 0; i < 3; i++) {
      await next(tester);
    }
    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pump();
    expect(find.text('Roma, İtalya için rotan hazırlanıyor…'), findsOneWidget);
    expect(find.byKey(const ValueKey('onboarding-next')), findsNothing);
    expect(repo.generations, 1);
    await tester.pump(const Duration(seconds: 65));
    expect(find.text('Roma, İtalya için rotan hazırlanıyor…'), findsOneWidget);
    expect(find.text('01:05'), findsOneWidget);
    expect(repo.generations, 1);
    expect(repo.ids, isEmpty);
    expect(find.byType(AppBar), findsNothing);
    expect(find.text('Yeni yolculuğun'), findsNothing);
    expect(find.byIcon(Icons.arrow_back), findsNothing);
    repo.pending!.complete(parseCreatedPlan(jsonEncode(generated(data)), data));
    await tester.pumpAndSettle();
    expect(find.text('Planın hazır'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
  });
}
