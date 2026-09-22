import 'dart:convert';

import 'package:cloud_functions/cloud_functions.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../plans/data/plan_detail.dart';
import 'onboarding_data.dart';
import 'route_optimization.dart';

abstract interface class PlanCreationRepository {
  Future<Map<String, dynamic>> defaults(String uid);
  Future<Map<String, dynamic>> generate(OnboardingData data);
  Future<void> save(
    String uid,
    String id,
    Map<String, dynamic> plan,
    Map<String, dynamic> answers,
  );
}

Map<String, dynamic> parseCreatedPlan(String text, OnboardingData data) {
  final cleaned = text
      .trim()
      .replaceFirst(RegExp(r'^```(?:json)?\s*'), '')
      .replaceFirst(RegExp(r'\s*```$'), '');
  final decoded = jsonDecode(cleaned);
  if (decoded is! Map) throw const FormatException('Plan biçimi geçersiz.');
  final plan = planMap(decoded);
  final days = planList(plan['dailyPlans']);
  if (days.length != data.dayCount || days.length > 31) {
    throw const FormatException('Plan günleri tarihlerle uyuşmuyor.');
  }
  double total = 0;
  final normalized = <Map<String, dynamic>>[];
  for (int i = 0; i < days.length; i++) {
    final day = planMap(days[i]);
    final date = dateKey(
      DateTime.parse('${data.startDate}T00:00:00Z').add(Duration(days: i)),
    );
    if (day['date'] != date ||
        day['dayNumber'] != i + 1 ||
        day['activities'] is! List) {
      throw const FormatException('Plan tarihleri veya durakları geçersiz.');
    }
    final activities = planList(day['activities']);
    if (activities.length > 15) {
      throw const FormatException('Günlük durak sayısı geçersiz.');
    }
    final stops = <Map<String, dynamic>>[];
    for (final raw in activities) {
      final stop = planMap(raw);
      final location = PlanStop(stop, 0).location;
      if (stop['placeName'] is! String ||
          (stop['placeName'] as String).trim().isEmpty ||
          location == null ||
          !routePeriods.contains(stop['period'])) {
        throw const FormatException(
          'Planın mekân bilgileri eksik. Tekrar deneyebilirsin.',
        );
      }
      final cost = stop['estimatedCost'] is num
          ? (stop['estimatedCost'] as num).toDouble()
          : double.tryParse('${stop['estimatedCost']}');
      if (cost == null || !cost.isFinite || cost < 0) {
        throw const FormatException('Planın maliyet bilgileri geçersiz.');
      }
      stops.add({
        'placeName': stop['placeName'],
        'period': stop['period'],
        'description': stop['description'] is String ? stop['description'] : '',
        'coordinates': {'lat': location.lat, 'lng': location.lng},
        'estimatedCost': cost,
      });
    }
    // Optimize once, before preview and persistence. Opening saved plans or
    // retrying a failed save must preserve the order the user already saw.
    final sorted = optimizeDayRoute(stops);
    final cost = sorted.fold<double>(
      0,
      (sum, s) => sum + (s['estimatedCost'] as double),
    );
    total += cost;
    normalized.add({
      'date': date,
      'dayNumber': i + 1,
      'daySummary': day['daySummary'] is String ? day['daySummary'] : '',
      'totalEstimatedCost': cost,
      'activities': sorted,
    });
  }
  if (normalized.every((d) => (d['activities'] as List).isEmpty)) {
    throw const FormatException('Planda ziyaret edilecek durak bulunamadı.');
  }
  final guide = planMap(plan['cityGuide']);
  return {
    'destination': data.destination.trim(),
    'currencySymbol': currencies[data.currencyCode],
    'overallSummary': plan['overallSummary'] is String
        ? plan['overallSummary']
        : '',
    'totalEstimatedCost': total,
    'dailyPlans': normalized,
    'cityGuide': {
      for (final field in [
        'transportationTips',
        'localCustoms',
        'generalAdvice',
      ])
        field: guide[field] is String ? guide[field] : '',
    },
  };
}

class FirebasePlanCreationRepository implements PlanCreationRepository {
  @override
  Future<Map<String, dynamic>> defaults(String uid) async =>
      (await FirebaseServices.firestore.collection('users').doc(uid).get())
          .data() ??
      {};

  @override
  Future<Map<String, dynamic>> generate(OnboardingData data) async {
    for (int step = 0; step < 4; step++) {
      final error = data.validate(step);
      if (error != null) throw StateError(error);
    }
    final functions = FirebaseFunctions.instanceFor(region: 'europe-west1');
    if (data.hasReservation == true && data.accommodationLat == null) {
      final address = '${data.accommodationAddress}, ${data.destination}';
      final response = await functions
          .httpsCallable('geocodeAddress')
          .call<Object?>({
            'address': address.length <= 300
                ? address
                : data.accommodationAddress,
          });
      final result = planMap(planMap(response.data)['result']);
      final location = PlanStop({'coordinates': result}, 0).location;
      if (location == null) {
        throw StateError(
          'Konaklama adresi bulunamadı. Otel adı ve açık adresi kontrol et.',
        );
      }
      data.accommodationLat = location.lat;
      data.accommodationLng = location.lng;
    }
    final response = await functions
        .httpsCallable(
          'generateAIContent',
          options: HttpsCallableOptions(timeout: const Duration(seconds: 190)),
        )
        .call<Object?>({'type': 'plan', 'prompt': data.prompt()});
    final text = planMap(response.data)['text'];
    if (text is! String) throw const FormatException('Plan yanıtı okunamadı.');
    return parseCreatedPlan(text, data);
  }

  @override
  Future<void> save(
    String uid,
    String id,
    Map<String, dynamic> plan,
    Map<String, dynamic> answers,
  ) async {
    // A retry uses the same ID; a failed save must never regenerate the AI plan.
    final now = DateTime.now().millisecondsSinceEpoch;
    await FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .collection('plans')
        .doc(id)
        .set({
          'plan': plan,
          'onboardingData': answers,
          'createdAt': now,
          'updatedAt': now,
          'isFavorite': false,
          'schemaVersion': 1,
        });
  }
}
