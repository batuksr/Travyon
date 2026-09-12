import 'dart:convert';

import 'package:cloud_functions/cloud_functions.dart';

import '../../../core/firebase/firebase_services.dart';
import 'plan_detail.dart';

const travelModes = ['driving', 'transit', 'walking', 'cycling'];
typedef TravelTimes = Map<int, Map<String, int>>;

List<Map<String, dynamic>> travelPairs(PlanDay day) => [
  for (var i = 0; i + 1 < day.stops.length; i++)
    if (day.stops[i].location != null && day.stops[i + 1].location != null)
      {
        'index': i,
        'origin': {
          'lat': day.stops[i].location!.lat,
          'lng': day.stops[i].location!.lng,
        },
        'destination': {
          'lat': day.stops[i + 1].location!.lat,
          'lng': day.stops[i + 1].location!.lng,
        },
      },
];

TravelTimes parseTravelTimes(
  Object? response,
  List<Map<String, dynamic>> pairs,
) {
  final rows = planList(planMap(response)['results']);
  if (rows.length != pairs.length) {
    throw const FormatException('Ulaşım yanıtı eksik.');
  }
  return {
    for (var i = 0; i < pairs.length; i++)
      pairs[i]['index'] as int: {
        for (final mode in travelModes)
          if (planMap(rows[i])[mode] is num &&
              (planMap(rows[i])[mode] as num).isFinite &&
              (planMap(rows[i])[mode] as num) > 0)
            mode: (planMap(rows[i])[mode] as num).ceil(),
      },
  };
}

abstract interface class TravelTimesRepository {
  Future<TravelTimes> fetch(PlanDay day);
}

class FirebaseTravelTimesRepository implements TravelTimesRepository {
  @override
  Future<TravelTimes> fetch(PlanDay day) async {
    final pairs = travelPairs(day);
    if (pairs.isEmpty) return {};
    final response = await FirebaseServices.functions
        .httpsCallable(
          'getDirections',
          options: HttpsCallableOptions(timeout: const Duration(seconds: 70)),
        )
        .call<Object?>({
          'pairs': [
            for (final pair in pairs)
              {'origin': pair['origin'], 'destination': pair['destination']},
          ],
        });
    return parseTravelTimes(response.data, pairs);
  }
}

/// One batch per coordinate sequence, shared by all visible strips. Notes,
/// costs and completion edits do not trigger new billable requests.
class TravelTimesCache {
  TravelTimesCache(this.repository);
  final TravelTimesRepository repository;
  final _requests = <String, Future<TravelTimes>>{};
  String key(PlanDay day) => jsonEncode(travelPairs(day));
  Future<TravelTimes> load(PlanDay day, {bool retry = false}) {
    final id = key(day);
    if (retry) _requests.remove(id);
    if (!_requests.containsKey(id)) {
      if (_requests.length >= 32) _requests.remove(_requests.keys.first);
      _requests[id] = Future.sync(() => repository.fetch(day));
    }
    return _requests[id]!;
  }
}

Uri segmentDirections(PlanStop origin, PlanStop destination, String mode) {
  if (!travelModes.contains(mode) ||
      origin.location == null ||
      destination.location == null) {
    throw ArgumentError('Geçersiz ulaşım seçimi.');
  }
  return Uri.https('www.google.com', '/maps/dir/', {
    'api': '1',
    'origin': '${origin.location!.lat},${origin.location!.lng}',
    'destination': '${destination.location!.lat},${destination.location!.lng}',
    'travelmode': mode == 'cycling' ? 'bicycling' : mode,
  });
}
