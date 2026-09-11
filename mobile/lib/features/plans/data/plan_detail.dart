import 'dart:convert';

Map<String, dynamic> planMap(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<dynamic> planList(Object? value) => value is List ? value : [];
double planNumber(Object? value) =>
    value is num && value.isFinite ? value.toDouble() : 0;

class PlanDay {
  PlanDay(this.raw, this.index);
  final Map<String, dynamic> raw;
  final int index;
  String get date => raw['date'] as String? ?? '';
  String get summary => raw['daySummary'] as String? ?? '';
  List<PlanStop> get stops =>
      planList(raw['activities'])
          .asMap()
          .entries
          .map((e) => PlanStop(planMap(e.value), e.key))
          .toList();
  double get estimated => stops.fold(0, (sum, stop) => sum + stop.estimated);
  int get completed => stops.where((stop) => stop.completed).length;
}

class PlanStop {
  PlanStop(this.raw, this.index);
  final Map<String, dynamic> raw;
  final int index;
  String get name => raw['placeName'] as String? ?? 'Durak';
  String get period => raw['period'] as String? ?? '';
  String get description => raw['description'] as String? ?? '';
  String get note => raw['note'] as String? ?? '';
  bool get completed => raw['completed'] == true;
  double get estimated => planNumber(raw['estimatedCost']);
  double? get actual =>
      raw['actualCost'] is num ? planNumber(raw['actualCost']) : null;
  ({double lat, double lng})? get location {
    final coordinates = planMap(raw['coordinates']);
    final lat = coordinates['lat'];
    final lng = coordinates['lng'];
    final valid =
        lat is num &&
        lng is num &&
        lat.isFinite &&
        lng.isFinite &&
        lat.abs() <= 90 &&
        lng.abs() <= 180 &&
        (lat != 0 || lng != 0);
    return valid ? (lat: lat.toDouble(), lng: lng.toDouble()) : null;
  }

  Uri directions(String destination) {
    final point = location;
    return Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': point != null
          ? '${point.lat},${point.lng}'
          : '$name, $destination',
    });
  }
}

/// Re-read inside a transaction and reject stale/moved activities. Unknown web
/// fields and other days survive mobile edits unchanged.
List<dynamic> patchPlanStop(
  Map<String, dynamic> plan,
  PlanDay expectedDay,
  PlanStop expectedStop, {
  bool? completed,
  double? actualCost,
}) {
  if (actualCost != null && (!actualCost.isFinite || actualCost < 0)) {
    throw ArgumentError('Harcama sıfır veya pozitif olmalı.');
  }
  final days = List<dynamic>.from(planList(plan['dailyPlans']));
  if (expectedDay.index >= days.length) {
    throw StateError('Plan değişti. Tekrar dene.');
  }
  final day = planMap(days[expectedDay.index]);
  final stops = List<dynamic>.from(planList(day['activities']));
  if (day['date'] != expectedDay.raw['date'] ||
      expectedStop.index >= stops.length ||
      jsonEncode(stops[expectedStop.index]) != jsonEncode(expectedStop.raw)) {
    throw StateError('Bu durak başka bir cihazda değişti. Tekrar dene.');
  }
  stops[expectedStop.index] = {
    ...planMap(stops[expectedStop.index]),
    'completed': ?completed,
    'actualCost': ?actualCost,
  };
  days[expectedDay.index] = {...day, 'activities': stops};
  return days;
}
