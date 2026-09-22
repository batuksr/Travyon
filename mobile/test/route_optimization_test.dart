import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/onboarding/data/onboarding_data.dart';
import 'package:travyon/features/onboarding/data/plan_creation_repository.dart';
import 'package:travyon/features/onboarding/data/route_optimization.dart';

Map<String, dynamic> stop(
  String name,
  double lat,
  double lng, {
  String period = 'Sabah',
  String description = '',
}) => {
  'placeName': name,
  'period': period,
  'description': description,
  'coordinates': {'lat': lat, 'lng': lng},
  'estimatedCost': 10,
};

List<String> names(List<Map<String, dynamic>> stops) =>
    stops.map((stop) => stop['placeName'] as String).toList();

double routeLength(List<Map<String, dynamic>> stops) {
  var distance = 0.0;
  for (var i = 1; i < stops.length; i++) {
    final a = stops[i - 1]['coordinates'] as Map;
    final b = stops[i]['coordinates'] as Map;
    final latA = (a['lat'] as num) * math.pi / 180;
    final latB = (b['lat'] as num) * math.pi / 180;
    final deltaLng = ((b['lng'] as num) - (a['lng'] as num)) * math.pi / 180;
    final hav =
        math.pow(math.sin((latB - latA) / 2), 2) +
        math.cos(latA) * math.cos(latB) * math.pow(math.sin(deltaLng / 2), 2);
    distance += 12742 * math.asin(math.sqrt(hav.clamp(0, 1)));
  }
  return distance;
}

void main() {
  test(
    'nearby stops become consecutive and the original data is untouched',
    () {
      final original = [
        stop('A', 41, 12),
        stop('B', 41, 12.06),
        stop('C', 41, 12.01),
      ];
      original[1]['note'] = 'Keep my note';
      original[1]['customField'] = {'keep': true};
      final snapshot = jsonEncode(original);
      final result = optimizeDayRoute(original);
      expect(names(result), ['A', 'C', 'B']);
      expect(routeLength(result), lessThan(routeLength(original)));
      expect(jsonEncode(original), snapshot);
      expect(identical(result.last, original[1]), isTrue);
    },
  );

  test('next period starts near the previous endpoint even with two stops', () {
    final original = [
      stop('Far', 41, 12.1, period: 'Öğle'),
      stop('Morning', 41, 12),
      stop('Near', 41, 12.01, period: 'Öğle'),
    ];
    final result = optimizeDayRoute(original);
    expect(names(result), ['Morning', 'Near', 'Far']);
    expect(result.map((stop) => stop['period']), ['Sabah', 'Öğle', 'Öğle']);
  });

  test('2-opt improves a route already ordered by nearest neighbor', () {
    final nearest = [
      stop('A', 41.001, 12.005),
      stop('D', 41, 12.005),
      stop('B', 41.001, 12.003),
      stop('E', 41, 12.002),
      stop('C', 41.006, 12.002),
    ];
    final result = optimizeDayRoute(nearest);
    expect(result.first, nearest.first);
    expect(result, unorderedEquals(nearest));
    expect(routeLength(result), lessThan(routeLength(nearest) - .01));
  });

  test('shortening one period must not increase the full day distance', () {
    final original = [
      stop('A', 41, 12),
      stop('B', 41.04, 12.03),
      stop('C', 41, 12.01),
      stop('Next period', 41, 12.01, period: 'Öğle'),
    ];
    final naiveNearest = [original[0], original[2], original[1], original[3]];
    expect(routeLength(naiveNearest), greaterThan(routeLength(original)));
    expect(optimizeDayRoute(original), original);
  });

  test(
    'daytime meals stay first and evening meals stay last in both languages',
    () {
      final original = [
        stop('Museum', 41, 12),
        stop('Fırın', 41, 12.03, description: 'Kahvaltı molası'),
        stop('Old town', 41, 12.01, period: 'Öğle'),
        stop(
          'Lunch',
          41,
          12.05,
          period: 'Öğle',
          description: 'A local restaurant',
        ),
        stop('Trattoria Roma', 41, 12.07, period: 'Akşam'),
        stop('Sunset viewpoint', 41, 12.06, period: 'Akşam'),
        stop('Bar & Kitchen', 41, 12.09, period: 'Gece'),
        stop('Night walk', 41, 12.08, period: 'Gece'),
      ];
      final result = optimizeDayRoute(original);
      expect(names(result), [
        'Fırın',
        'Museum',
        'Lunch',
        'Old town',
        'Sunset viewpoint',
        'Trattoria Roma',
        'Night walk',
        'Bar & Kitchen',
      ]);
      expect(result, unorderedEquals(original));
      for (final entry in original) {
        expect(
          identical(
            result.singleWhere(
              (value) => value['placeName'] == entry['placeName'],
            ),
            entry,
          ),
          isTrue,
        );
      }
    },
  );

  test('empty, incomplete and unknown-period input is preserved without dropping stops', () {
    expect(optimizeDayRoute([]), isEmpty);
    final single = [stop('Only stop', 41, 12)];
    expect(optimizeDayRoute(single), single);
    for (final invalid in [
      {'lat': 999, 'lng': 12},
      {'lat': double.nan, 'lng': 12},
      {'lat': 41, 'lng': double.infinity},
      {'lat': 0, 'lng': 0},
      <String, dynamic>{},
    ]) {
      final original = [
        stop('A', 41, 12),
        stop('B', 41, 12.1),
        stop('C', 41, 12.01),
      ];
      original[1]['coordinates'] = invalid;
      expect(optimizeDayRoute(original), original);
    }
    final unknown = [
      stop('Unknown', 41, 12, period: 'Any time'),
      stop('A', 41, 12.1),
    ];
    expect(optimizeDayRoute(unknown), unknown);
  });

  test('equal locations keep stable order and the date line uses the short crossing', () {
    final identical = [for (var i = 0; i < 5; i++) stop('Stop $i', 41, 12)];
    expect(optimizeDayRoute(identical), identical);
    final original = [
      stop('East', 10, 179.9),
      stop('Far', 10, 170),
      stop('West', 10, -179.9),
    ];
    final result = optimizeDayRoute(original);
    expect(names(result), ['East', 'West', 'Far']);
    expect(routeLength(result), lessThan(routeLength(original)));
  });

  test('varied 15-stop days retain all periods and never worsen the starting route', () {
    final random = math.Random(241);
    for (var sample = 0; sample < 60; sample++) {
      final original = [
        for (var i = 0; i < 15; i++)
          stop(
            'Stop $i',
            41 + random.nextDouble() * .1,
            12 + random.nextDouble() * .1,
            period: routePeriods[random.nextInt(routePeriods.length)],
          ),
      ];
      final snapshot = jsonEncode(original);
      final baseline = [
        for (final period in routePeriods)
          ...original.where((stop) => stop['period'] == period),
      ];
      final result = optimizeDayRoute(original);
      expect(result, unorderedEquals(original));
      expect(result.first, baseline.first);
      expect(
        result.map((stop) => stop['period']),
        baseline.map((stop) => stop['period']),
      );
      expect(
        routeLength(result),
        lessThanOrEqualTo(routeLength(baseline) + 1e-7),
      );
      expect(jsonEncode(original), snapshot);
      expect(
        optimizeDayRoute(result),
        result,
        reason: 'Optimized order should be stable',
      );
    }
  });

  test('generation optimizes each day before preview while retaining dates, costs and descriptions', () {
    final data = OnboardingData()
      ..destination = 'Roma, İtalya'
      ..startDate = '2026-10-01'
      ..endDate = '2026-10-02'
      ..currencyCode = 'EUR';
    final raw = {
      'overallSummary': 'Original summary',
      'cityGuide': {'generalAdvice': 'Original guide'},
      'dailyPlans': [
        for (var day = 1; day <= 2; day++)
          {
            'dayNumber': day,
            'date': '2026-10-0$day',
            'daySummary': 'Day $day',
            'totalEstimatedCost': 999,
            'activities': [
              stop('A$day', 41, 12, description: 'First visit'),
              stop('B$day', 41, 12.06, description: 'Far visit'),
              stop('C$day', 41, 12.01, description: 'Nearby visit'),
            ],
          },
      ],
    };
    final result = parseCreatedPlan(jsonEncode(raw), data);
    expect(result['totalEstimatedCost'], 60);
    expect(result['currencySymbol'], '€');
    expect(result['overallSummary'], raw['overallSummary']);
    expect(result['cityGuide']['generalAdvice'], 'Original guide');
    for (var day = 1; day <= 2; day++) {
      final saved = result['dailyPlans'][day - 1];
      final activities = List<Map<String, dynamic>>.from(saved['activities']);
      expect(names(activities), ['A$day', 'C$day', 'B$day']);
      expect(activities[1]['description'], 'Nearby visit');
      expect(saved['date'], '2026-10-0$day');
      expect(saved['dayNumber'], day);
      expect(saved['daySummary'], 'Day $day');
      expect(saved['totalEstimatedCost'], 30);
      expect(activities.map((stop) => stop['estimatedCost']), everyElement(10));
    }
  });
}
