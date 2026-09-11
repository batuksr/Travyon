import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_services.dart';
import 'plan_detail.dart';

class TravelPlanSummary {
  const TravelPlanSummary({
    required this.id,
    required this.destination,
    required this.customName,
    required this.startDate,
    required this.endDate,
    required this.dayCount,
    required this.activityCount,
    required this.estimatedCost,
    required this.currencySymbol,
    required this.isFavorite,
    required this.createdAt,
    this.planData = const {},
  });

  final String id;
  final String destination;
  final String customName;
  final String startDate;
  final String endDate;
  final int dayCount;
  final int activityCount;
  final double estimatedCost;
  final String currencySymbol;
  final bool isFavorite;
  final DateTime? createdAt;
  final Map<String, dynamic> planData;
  List<PlanDay> get days =>
      planList(planData['dailyPlans'])
          .asMap()
          .entries
          .map((entry) => PlanDay(planMap(entry.value), entry.key))
          .toList();

  String get title => customName.trim().isEmpty ? destination : customName;

  DateTime? get parsedStartDate => DateTime.tryParse(startDate);

  factory TravelPlanSummary.fromMap(String id, Map<String, dynamic> data) {
    final plan = _map(data['plan']);
    final onboarding = _map(data['onboardingData']);
    final dailyPlans = _list(plan['dailyPlans']);
    final activityCount = dailyPlans.fold<int>(0, (total, day) {
      return total + _list(_map(day)['activities']).length;
    });

    return TravelPlanSummary(
      id: id,
      planData: plan,
      destination: _text(plan['destination'], fallback: 'Yeni yolculuk'),
      customName: _text(data['customName']),
      startDate: _text(
        onboarding['startDate'],
        fallback: dailyPlans.isEmpty
            ? ''
            : _text(_map(dailyPlans.first)['date']),
      ),
      endDate: _text(
        onboarding['endDate'],
        fallback: dailyPlans.isEmpty
            ? ''
            : _text(_map(dailyPlans.last)['date']),
      ),
      dayCount: dailyPlans.length,
      activityCount: activityCount,
      estimatedCost: _number(plan['totalEstimatedCost']),
      currencySymbol: _text(plan['currencySymbol'], fallback: '₺'),
      isFavorite: data['isFavorite'] == true,
      createdAt: _date(data['createdAt']),
    );
  }

  static Map<String, dynamic> _map(Object? value) => value is Map
      ? value.map((key, item) => MapEntry(key.toString(), item))
      : const {};

  static List<dynamic> _list(Object? value) => value is List ? value : const [];

  static String _text(Object? value, {String fallback = ''}) {
    final text = value is String ? value.trim() : '';
    return text.isEmpty ? fallback : text;
  }

  static double _number(Object? value) => value is num ? value.toDouble() : 0;

  static DateTime? _date(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is num) return DateTime.fromMillisecondsSinceEpoch(value.toInt());
    return null;
  }
}

abstract interface class TravelPlansRepository {
  Stream<List<TravelPlanSummary>> watchPlans(String uid);
  Future<void> updateStop(
    String uid,
    String planId,
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? actualCost,
  });
}

class FirebaseTravelPlansRepository implements TravelPlansRepository {
  FirebaseTravelPlansRepository();

  @override
  Future<void> updateStop(
    String uid,
    String planId,
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? actualCost,
  }) async {
    final ref = FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .collection('plans')
        .doc(planId);
    await FirebaseServices.firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw StateError('Bu plan artık bulunamıyor.');
      final days = patchPlanStop(
        planMap(snapshot.data()?['plan']),
        day,
        stop,
        completed: completed,
        actualCost: actualCost,
      );
      transaction.update(ref, {
        'plan.dailyPlans': days,
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      });
    });
  }

  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) {
    return FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .collection('plans')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(
                (document) =>
                    TravelPlanSummary.fromMap(document.id, document.data()),
              )
              .toList(growable: false),
        );
  }
}
