import '../../../core/firebase/firebase_services.dart';
import 'plan_detail.dart';

bool samePlanValue(Object? a, Object? b) {
  if (a is Map && b is Map) {
    return a.length == b.length &&
        a.keys.every(
          (key) => b.containsKey(key) && samePlanValue(a[key], b[key]),
        );
  }
  if (a is List && b is List) {
    return a.length == b.length &&
        List.generate(
          a.length,
          (i) => i,
        ).every((i) => samePlanValue(a[i], b[i]));
  }
  return a == b;
}

/// Compare the complete day inside a transaction: stale mobile edits and undo
/// must never overwrite a newer web edit. Other days and unknown fields survive.
Map<String, dynamic> replacePlanDay(
  Map<String, dynamic> plan,
  PlanDay expected,
  Map<String, dynamic> replacement,
) {
  final days = List<dynamic>.from(planList(plan['dailyPlans']));
  if (expected.index < 0 ||
      expected.index >= days.length ||
      !samePlanValue(days[expected.index], expected.raw)) {
    throw StateError(
      'Bu gün başka bir cihazda değişti. Güncel planı kontrol edip tekrar dene.',
    );
  }
  if (replacement['date'] != expected.raw['date'] ||
      replacement['dayNumber'] != expected.raw['dayNumber']) {
    throw StateError('Günün tarihi değiştirilemez.');
  }
  final stops = planList(replacement['activities']);
  if (stops.length > 15) {
    throw StateError('Bir güne en fazla 15 durak ekleyebilirsin.');
  }
  for (final raw in stops) {
    final stop = planMap(raw);
    final cost = stop['estimatedCost'];
    if (cost != null && (cost is! num || !cost.isFinite || cost < 0)) {
      throw StateError('Tahmini tutar sıfır veya pozitif olmalı.');
    }
  }
  days[expected.index] = {
    ...replacement,
    'totalEstimatedCost': stops.fold<double>(
      0,
      (sum, raw) => sum + planNumber(planMap(raw)['estimatedCost']),
    ),
  };
  return {
    ...plan,
    'dailyPlans': days,
    'totalEstimatedCost': days.fold<double>(
      0,
      (sum, raw) => sum + PlanDay(planMap(raw), 0).estimated,
    ),
  };
}

abstract interface class PlanEditingRepository {
  Future<PlanDay> replaceDay(
    String uid,
    String planId,
    PlanDay expected,
    Map<String, dynamic> replacement,
  );
  Future<Map<String, dynamic>> locate(String name, String destination);
}

class FirebasePlanEditingRepository implements PlanEditingRepository {
  @override
  Future<Map<String, dynamic>> locate(String name, String destination) async {
    final response = await FirebaseServices.functions
        .httpsCallable('geocodeAddress')
        .call<Object?>({'address': '$name, $destination'});
    final result = planMap(planMap(response.data)['result']);
    final point = PlanStop({'coordinates': result}, 0).location;
    if (point == null) {
      throw StateError(
        'Mekânın konumu bulunamadı. Adına açık adresini de ekleyerek tekrar dene.',
      );
    }
    return {'lat': point.lat, 'lng': point.lng};
  }

  @override
  Future<PlanDay> replaceDay(
    String uid,
    String planId,
    PlanDay expected,
    Map<String, dynamic> replacement,
  ) async {
    final ref = FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .collection('plans')
        .doc(planId);
    return FirebaseServices.firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw StateError('Bu plan artık bulunamıyor.');
      final updated = replacePlanDay(
        planMap(snapshot.data()?['plan']),
        expected,
        replacement,
      );
      transaction.update(ref, {
        'plan': updated,
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      });
      return PlanDay(
        planMap(planList(updated['dailyPlans'])[expected.index]),
        expected.index,
      );
    });
  }
}
