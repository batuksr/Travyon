import 'package:cloud_functions/cloud_functions.dart';

import 'plan_detail.dart';

abstract interface class MobilePlacesRepository {
  Future<Map<String, dynamic>?> details(PlanStop stop, String destination);
  Future<String> photo(String name);
}

class FirebaseMobilePlacesRepository implements MobilePlacesRepository {
  @override
  Future<String> photo(String name) async {
    final response = await FirebaseFunctions.instanceFor(region: 'europe-west1')
        .httpsCallable(
          'getMobilePlacePhoto',
          options: HttpsCallableOptions(timeout: const Duration(seconds: 25)),
        )
        .call<Object?>({'name': name});
    final uri = planMap(response.data)['photoUri'];
    if (uri is! String || Uri.tryParse(uri)?.scheme != 'https') {
      throw StateError('Fotoğraf bağlantısı alınamadı.');
    }
    return uri;
  }

  @override
  Future<Map<String, dynamic>?> details(
    PlanStop stop,
    String destination,
  ) async {
    final point = stop.location;
    final response = await FirebaseFunctions.instanceFor(region: 'europe-west1')
        .httpsCallable(
          'getMobilePlaceDetails',
          options: HttpsCallableOptions(timeout: const Duration(seconds: 35)),
        )
        .call<Object?>({
          'name': stop.name,
          'destination': destination,
          if (point != null) 'location': {'lat': point.lat, 'lng': point.lng},
        });
    final place = planMap(response.data)['place'];
    return place is Map ? planMap(place) : null;
  }
}
