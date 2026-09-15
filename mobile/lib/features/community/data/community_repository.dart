import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../onboarding/data/onboarding_data.dart';

String communityPreference(Object? value) {
  final raw = value?.toString() ?? '';
  return {
        ...travelTypes,
        ...interests,
        ...paces,
        ...stays,
        ...transports,
        ...diets,
        ...foodStyles,
      }[raw] ??
      raw;
}

class CommunityPlan {
  CommunityPlan(this.id, this.data);
  final String id;
  final Map<String, dynamic> data;
  String get owner => data['userId'] as String? ?? '';
  bool get profilePublic => data['profilePublic'] == true;
  String get author =>
      profilePublic ? data['userDisplayName'] as String? ?? 'Gezgin' : 'Gezgin';
  String get destination {
    final title = data['destination'];
    if (title is String && title.trim().isNotEmpty) return title.trim();
    final nested = planMap(data['planData'])['destination'];
    return nested is String && nested.trim().isNotEmpty
        ? nested.trim()
        : 'Yolculuk';
  }

  String get purpose => communityPreference(data['tripPurpose']);
  bool get visible => data['feedVisible'] == true;
  double get rating => planNumber(data['avgRating']);
  int get ratingCount => planNumber(data['ratingCount']).toInt();
  TravelPlanSummary get summary => TravelPlanSummary.fromMap(id, {
    'plan': data['planData'],
    'onboardingData': data,
  });
}

class TravelerProfile {
  TravelerProfile(this.uid, this.data);
  final String uid;
  final Map<String, dynamic> data;
  bool get visible => data['exists'] == true && data['isPublic'] == true;
  String get name {
    if (!visible) return 'Gizli profil';
    final name = data['displayName'];
    return name is String && name.trim().isNotEmpty ? name.trim() : 'Gezgin';
  }

  String? get photoUrl {
    if (!visible || data['photoURL'] is! String) return null;
    final uri = Uri.tryParse((data['photoURL'] as String).trim());
    return uri != null &&
            uri.scheme == 'https' &&
            uri.host.isNotEmpty &&
            uri.userInfo.isEmpty
        ? uri.toString()
        : null;
  }
}

abstract interface class CommunityRepository {
  Stream<List<CommunityPlan>> feed();
  Stream<List<CommunityPlan>> sharedBy(String uid, {bool own = false});
  Stream<CommunityPlan?> plan(String id);
  Stream<Set<String>> following(String uid);
  Future<TravelerProfile> profile(String uid);
  Future<void> follow(String uid, String target, bool value);
  Future<void> rate(String id, int rating);
  Future<void> share(String uid, String id);
  Future<void> unshare(String id);
  Future<Map<String, bool>> privacy(String uid);
  Future<void> savePrivacy(Map<String, bool> values);
}

const privacyKeys = [
  'profilePublic',
  'plansPublic',
  'followPublic',
  'locationEnabled',
  'locationHistory',
  'analyticsEnabled',
];

class FirebaseCommunityRepository implements CommunityRepository {
  CollectionReference<Map<String, dynamic>> get _public =>
      FirebaseServices.firestore.collection('publicPlans');
  Stream<List<CommunityPlan>> _watch(Query<Map<String, dynamic>> query) => query
      .snapshots()
      .map((s) => s.docs.map((d) => CommunityPlan(d.id, d.data())).toList());
  Future<void> _call(String name, Map<String, dynamic> data) async {
    await FirebaseServices.functions.httpsCallable(name).call<dynamic>(data);
  }

  @override
  Stream<List<CommunityPlan>> feed() => _watch(
    _public
        .where('feedVisible', isEqualTo: true)
        .orderBy('createdAt', descending: true)
        .limit(50),
  );
  @override
  Stream<List<CommunityPlan>> sharedBy(String uid, {bool own = false}) {
    final query = _public.where('userId', isEqualTo: uid);
    return _watch(
      own
          ? query
          : query
                .where('feedVisible', isEqualTo: true)
                .orderBy('createdAt', descending: true)
                .limit(50),
    );
  }

  @override
  Stream<CommunityPlan?> plan(String id) => _public
      .doc(id)
      .snapshots()
      .map((s) => s.exists ? CommunityPlan(s.id, s.data()!) : null);
  @override
  Stream<Set<String>> following(String uid) => FirebaseServices.firestore
      .collection('userFollows')
      .doc(uid)
      .collection('following')
      .snapshots()
      .map((s) => s.docs.map((d) => d.id).toSet());
  @override
  Future<TravelerProfile> profile(String uid) async {
    final result = await FirebaseServices.functions
        .httpsCallable('getPublicProfile')
        .call<dynamic>({'targetUid': uid});
    return TravelerProfile(uid, planMap(result.data));
  }

  @override
  Future<void> follow(String uid, String target, bool value) async {
    if (value) {
      await _call('followUserAction', {'targetUid': target});
    } else {
      await FirebaseServices.firestore
          .collection('userFollows')
          .doc(uid)
          .collection('following')
          .doc(target)
          .delete();
    }
  }

  @override
  Future<void> rate(String id, int rating) =>
      _call('ratePublicPlan', {'planId': id, 'rating': rating});
  @override
  Future<void> unshare(String id) => _call('unsharePublicPlan', {'planId': id});
  @override
  Future<void> share(String uid, String id) async {
    // Read the latest owned version, never another user's cached feed card.
    final saved = await FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .collection('plans')
        .doc(id)
        .get(const GetOptions(source: Source.server));
    if (!saved.exists) throw StateError('Plan artık bulunamıyor.');
    await _call('sharePublicPlan', {
      'planId': id,
      ...publicSharePayload(saved.data()!),
    });
  }

  @override
  Future<Map<String, bool>> privacy(String uid) async {
    final saved = await FirebaseServices.firestore
        .collection('users')
        .doc(uid)
        .get(const GetOptions(source: Source.server));
    return {for (final key in privacyKeys) key: saved.data()?[key] == true};
  }

  @override
  Future<void> savePrivacy(Map<String, bool> values) =>
      _call('updatePrivacySettings', values);
}

/// Explicit public schema: wallet, personal notes, actual spending and hotel
/// address/coordinates are not included in community publications.
Map<String, dynamic> publicSharePayload(Map<String, dynamic> saved) {
  final plan = planMap(saved['plan']);
  final onboarding = planMap(saved['onboardingData']);
  String text(Object? v, int max, [String fallback = '']) {
    final s = v is String && v.trim().isNotEmpty ? v : fallback;
    return s.length <= max ? s : s.substring(0, max);
  }

  double amount(Object? v) => planNumber(v).clamp(0, 1000000000).toDouble();
  final guide = planMap(plan['cityGuide']);
  final days = planList(plan['dailyPlans']);
  if (days.isEmpty) throw StateError('Boş plan paylaşılamaz.');
  return {
    'plan': {
      'destination': text(plan['destination'], 200, 'Yolculuk'),
      'overallSummary': text(plan['overallSummary'], 10000),
      'totalEstimatedCost': amount(plan['totalEstimatedCost']),
      'currencySymbol': text(plan['currencySymbol'], 10, '₺'),
      'cityGuide': {
        for (final k in ['transportationTips', 'localCustoms', 'generalAdvice'])
          k: text(guide[k], 5000),
      },
      'dailyPlans': days.take(31).toList().asMap().entries.map((e) {
        final day = planMap(e.value);
        return {
          'dayNumber': e.key + 1,
          'date': text(day['date'], 32, '1970-01-01'),
          'daySummary': text(day['daySummary'], 4000),
          'totalEstimatedCost': amount(day['totalEstimatedCost']),
          'activities': planList(day['activities']).take(15).map((a) {
            final stop = planMap(a);
            final coordinates = planMap(stop['coordinates']);
            return {
              'period': text(stop['period'], 50, 'Gün'),
              'placeName': text(stop['placeName'], 200, 'Durak'),
              'description': text(stop['description'], 4000),
              'estimatedCost': amount(stop['estimatedCost']),
              'coordinates': {
                'lat': planNumber(coordinates['lat']).clamp(-90, 90),
                'lng': planNumber(coordinates['lng']).clamp(-180, 180),
              },
            };
          }).toList(),
        };
      }).toList(),
    },
    'onboardingData': {
      'budget': amount(onboarding['budget']),
      'peopleCount': planNumber(onboarding['peopleCount'])
          .toInt()
          .clamp(1, 100),
      'earlyBird': onboarding['earlyBird'] == true,
      for (final k in [
        'currencySymbol',
        'tripPurpose',
        'travelType',
        'pace',
        'foodPhilosophy',
        'accommodation',
        'transport',
      ])
        k: text(onboarding[k], 100),
      for (final k in ['startDate', 'endDate']) k: text(onboarding[k], 32),
      for (final k in ['purposes', 'dietaryRestrictions'])
        k: planList(onboarding[k]).take(20).map((v) => text(v, 100)).toList(),
    },
  };
}

String communityError(Object error) {
  if (error is FirebaseException) {
    return switch (error.code) {
      'permission-denied' => 'Bu işlem için gizlilik izinlerini kontrol et. Paylaşım ve takip kapalı olabilir.',
      'unauthenticated' => 'Oturumun sona ermiş. Yeniden giriş yap.',
      'failed-precondition' =>
        'Hesap doğrulamasını ve sunucu yapılandırmasını kontrol et.',
      'resource-exhausted' => 'Çok sık işlem yapıldı. Biraz sonra tekrar dene.',
      _ => 'Bağlantı kurulamadı. İnternetini ve Firebase bağlantısını kontrol edip tekrar dene.',
    };
  }
  return 'İşlem tamamlanamadı. Tekrar dene.';
}
