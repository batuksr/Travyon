import 'dart:math' as math;

import '../../plans/data/plan_detail.dart';

const routePeriods = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'];

// Same meal ordering as web/src/services/aiService.ts: meals first during
// daytime, sightseeing first in the evening. Canonical periods stay Turkish
// even when the generated names and descriptions are in another language.
const _mealKeywords = [
  'kafe',
  'kahvaltı',
  'restoran',
  'fırın',
  'pastane',
  'lokanta',
  'börek',
  'kebap',
  'pideci',
  'çay bahçesi',
  'café',
  'boulangerie',
  'patisserie',
  'bistro',
  'brasserie',
  'trattoria',
  'osteria',
  'ristorante',
  'pizzeria',
  'crêperie',
  'taverna',
  'cafe',
  'restaurant',
  'bakery',
  'breakfast',
  'brunch',
  'diner',
  'bar & kitchen',
];

bool _isMeal(PlanStop stop) {
  final text = '${stop.name} ${stop.description}'.toLowerCase();
  return _mealKeywords.any(text.contains);
}

double _distance(({double lat, double lng}) a, ({double lat, double lng}) b) {
  const radians = math.pi / 180;
  final lat = (b.lat - a.lat) * radians;
  final lng = (b.lng - a.lng) * radians;
  final haversine =
      (math.pow(math.sin(lat / 2), 2) +
              math.cos(a.lat * radians) *
                  math.cos(b.lat * radians) *
                  math.pow(math.sin(lng / 2), 2))
          .clamp(0.0, 1.0);
  return 6371 * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine));
}

/// Reorders a newly generated day using the web's nearest-neighbor + 2-opt
/// approach. Periods and meal ordering are constraints, not distance hints.
/// The original first stop of the first group anchors the day, as on web.
///
/// Every stop and its fields survive unchanged. No network calls or writes;
/// callers must not run this when simply displaying or manually editing a plan.
List<Map<String, dynamic>> optimizeDayRoute(
  List<Map<String, dynamic>> activities,
) {
  final stops = [
    for (var i = 0; i < activities.length; i++) PlanStop(activities[i], i),
  ];
  if (stops.length < 2 ||
      stops.any(
        (stop) => !routePeriods.contains(stop.period) || stop.location == null,
      )) {
    // Generation validates these fields first. If reused with incomplete data,
    // keep every stop in place rather than constructing an unreliable route.
    return List.of(activities);
  }
  final points = [for (final stop in stops) stop.location!];
  final distances = [
    for (final a in points) [for (final b in points) _distance(a, b)],
  ];
  final groups = <List<int>>[];
  for (var period = 0; period < routePeriods.length; period++) {
    final meals = <int>[];
    final visits = <int>[];
    for (final stop in stops.where(
      (stop) => stop.period == routePeriods[period],
    )) {
      (_isMeal(stop) ? meals : visits).add(stop.index);
    }
    for (final group in period >= 3 ? [visits, meals] : [meals, visits]) {
      if (group.isNotEmpty) groups.add(group);
    }
  }

  final baseline = groups.expand((group) => group).toList();
  final nearest = _nearestNeighbor(groups, distances);
  // Include the links between periods: a shorter morning must not make the
  // journey to lunch longer than the distance it saved. Ties keep stable order.
  final route =
      _length(nearest, distances) < _length(baseline, distances) - 1e-9
      ? nearest
      : baseline;
  _twoOpt(route, groups, distances);
  return [for (final index in route) activities[index]];
}

double _length(List<int> route, List<List<double>> distances) {
  var total = 0.0;
  for (var i = 1; i < route.length; i++) {
    total += distances[route[i - 1]][route[i]];
  }
  return total;
}

List<int> _nearestNeighbor(
  List<List<int>> groups,
  List<List<double>> distances,
) {
  final route = <int>[];
  for (final group in groups) {
    final remaining = List<int>.of(group);
    while (remaining.isNotEmpty) {
      var nearest = 0;
      if (route.isNotEmpty) {
        for (var i = 1; i < remaining.length; i++) {
          if (distances[route.last][remaining[i]] <
              distances[route.last][remaining[nearest]] - 1e-9) {
            nearest = i;
          }
        }
      }
      route.add(remaining.removeAt(nearest));
    }
  }
  return route;
}

void _twoOpt(
  List<int> route,
  List<List<int>> groups,
  List<List<double>> distances,
) {
  // A generated day has at most 15 stops. The bound also keeps future callers
  // from blocking the UI on unexpectedly large inputs.
  for (var pass = 0; pass < 20; pass++) {
    var improved = false;
    var offset = 0;
    for (final group in groups) {
      final end = offset + group.length;
      final first = offset == 0 ? 1 : offset;
      for (var i = first; i < end - 1; i++) {
        for (var k = i + 1; k < end; k++) {
          // Reversal preserves all internal distances. Only the incoming and
          // outgoing edges change, including edges to the next period/meal.
          final before =
              distances[route[i - 1]][route[i]] +
              (k + 1 < route.length ? distances[route[k]][route[k + 1]] : 0.0);
          final after =
              distances[route[i - 1]][route[k]] +
              (k + 1 < route.length ? distances[route[i]][route[k + 1]] : 0.0);
          if (after >= before - 1e-9) continue;
          for (var left = i, right = k; left < right; left++, right--) {
            final value = route[left];
            route[left] = route[right];
            route[right] = value;
          }
          improved = true;
        }
      }
      offset = end;
    }
    if (!improved) break;
  }
}
