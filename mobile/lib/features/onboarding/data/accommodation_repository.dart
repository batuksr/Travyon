import '../../../core/firebase/firebase_services.dart';
import '../../plans/data/plan_detail.dart';

class AccommodationSuggestion {
  const AccommodationSuggestion(this.id, this.title, this.subtitle);
  final String id, title, subtitle;
}

class AccommodationSelection {
  const AccommodationSelection(this.address, this.lat, this.lng);
  final String address;
  final double lat, lng;
}

abstract interface class AccommodationRepository {
  Future<List<AccommodationSuggestion>> suggest(
    String input,
    String destination,
    String session,
  );
  Future<AccommodationSelection> resolve(
    AccommodationSuggestion suggestion,
    String session,
  );
}

class FirebaseAccommodationRepository implements AccommodationRepository {
  // Only the destination bias lives in memory for this form's lifetime.
  String? _biasDestination;
  Future<Map<String, dynamic>?>? _bias;
  Future<Map<String, dynamic>?> _loadBias(String destination) async {
    try {
      final response = await FirebaseServices.functions
          .httpsCallable('geocodeAddress')
          .call<Object?>({'address': destination});
      final result = planMap(planMap(response.data)['result']);
      final point = PlanStop({'coordinates': result}, 0).location;
      return point == null ? null : {'lat': point.lat, 'lng': point.lng};
    } catch (_) {
      return null;
    }
  }

  @override
  Future<List<AccommodationSuggestion>> suggest(
    String input,
    String destination,
    String session,
  ) async {
    if (_biasDestination != destination) {
      _biasDestination = destination;
      _bias = _loadBias(destination);
    }
    final bias = await _bias;
    final response = await FirebaseServices.functions
        .httpsCallable('getMobileAccommodation')
        .call<Object?>({
          'action': 'suggest',
          'input': input,
          'destination': destination,
          'sessionToken': session,
          'bias': ?bias,
        });
    return planList(planMap(response.data)['suggestions']).map((raw) {
      final row = planMap(raw);
      return AccommodationSuggestion(
        row['placeId'] as String,
        row['title'] as String,
        row['subtitle'] as String,
      );
    }).toList();
  }

  @override
  Future<AccommodationSelection> resolve(
    AccommodationSuggestion suggestion,
    String session,
  ) async {
    final response = await FirebaseServices.functions
        .httpsCallable('getMobileAccommodation')
        .call<Object?>({
          'action': 'resolve',
          'placeId': suggestion.id,
          'sessionToken': session,
        });
    final result = planMap(response.data);
    final point = PlanStop({'coordinates': result}, 0).location;
    if (point == null || result['address'] is! String) {
      throw const FormatException('Konaklama adresi bulunamadı.');
    }
    final address = '${suggestion.title}, ${result['address']}';
    // Keep the same maximum length accepted by the onboarding/backend contract.
    return AccommodationSelection(
      address.length <= 300 ? address : result['address'] as String,
      point.lat,
      point.lng,
    );
  }
}
