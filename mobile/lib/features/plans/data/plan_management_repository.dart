import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_environment.dart';
import '../../../core/firebase/firebase_services.dart';
import '../../community/data/community_repository.dart';
import 'travel_plans_repository.dart';

abstract interface class PlanManagementRepository {
  Future<void> favorite(String uid, String id, bool value);
  Future<void> rename(String uid, TravelPlanSummary expected, String name);
  Future<void> delete(String uid, String id);
  Future<Uri> shareLink(String uid, String id);
}

class FirebasePlanManagementRepository implements PlanManagementRepository {
  DocumentReference<Map<String, dynamic>> _ref(String uid, String id) =>
      FirebaseServices.firestore
          .collection('users')
          .doc(uid)
          .collection('plans')
          .doc(id);
  void _owner(String uid) {
    if (FirebaseServices.auth.currentUser?.uid != uid) {
      throw StateError('Oturum değişti. Yeniden giriş yap.');
    }
  }

  @override
  Future<void> favorite(String uid, String id, bool value) async {
    _owner(uid);
    await _ref(uid, id).update({
      'isFavorite': value,
      'updatedAt': DateTime.now().millisecondsSinceEpoch,
    });
  }

  @override
  Future<void> rename(
    String uid,
    TravelPlanSummary expected,
    String name,
  ) async {
    _owner(uid);
    if (name.trim().isEmpty || name.trim().length > 100) {
      throw StateError('1–100 karakterlik bir ad gir.');
    }
    await FirebaseServices.firestore.runTransaction((tx) async {
      final ref = _ref(uid, expected.id);
      final snap = await tx.get(ref);
      if (!snap.exists) throw StateError('Bu plan artık bulunamıyor.');
      if ((snap.data()?['customName'] ?? '') != expected.customName) {
        throw StateError(
          'Planın adı başka bir cihazda değişti. Yeniden açıp dene.',
        );
      }
      tx.update(ref, {
        'customName': name.trim(),
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      });
    });
  }

  @override
  Future<void> delete(String uid, String id) async {
    _owner(uid);
    // Do not leave a published copy behind when revocation fails.
    final published = await FirebaseServices.firestore
        .collection('publicPlans')
        .doc(id)
        .get(const GetOptions(source: Source.server));
    final revoke = published.exists && published.data()?['userId'] == uid;
    if (revoke) {
      await FirebaseCommunityRepository().unshare(id);
    }
    _owner(uid);
    try {
      await _ref(uid, id).delete();
    } catch (_) {
      throw StateError(
        revoke
            ? 'Paylaşım kaldırıldı; özel plan silinemedi. Tekrar dene.'
            : 'Plan silinemedi. Bağlantını kontrol edip tekrar dene.',
      );
    }
    // Wallet records deliberately survive under their archived plan group.
  }

  @override
  Future<Uri> shareLink(String uid, String id) async {
    _owner(uid);
    if (FirebaseEnvironment.usesEmulators) {
      throw StateError(
        'LOCAL planları dışarıdan açılamaz. Gerçek paylaşım bağlantısı için web ve mobil aynı production ortamında olmalı.',
      );
    }
    final saved = await _ref(
      uid,
      id,
    ).get(const GetOptions(source: Source.server));
    if (!saved.exists) throw StateError('Plan artık bulunamıyor.');
    final public = await FirebaseServices.firestore
        .collection('publicPlans')
        .doc(id)
        .get(const GetOptions(source: Source.server));
    // Preserve an already-public feed entry; link sharing must not hide it.
    if (!public.exists || public.data()?['feedVisible'] != true) {
      await FirebaseServices.functions
          .httpsCallable('sharePublicPlan')
          .call<dynamic>({
            'planId': id,
            ...publicSharePayload(saved.data()!),
            'linkOnly': true,
          });
    } else if (public.data()?['userId'] != uid) {
      throw StateError('Paylaşım kimliği bu hesaba ait değil.');
    }
    return Uri.https('travyon-5fb01.web.app', '/plan/$id');
  }
}

enum PlanFilter { all, favorites, upcoming, past }

List<TravelPlanSummary> filterSavedPlans(
  List<TravelPlanSummary> plans,
  String query,
  PlanFilter filter,
  DateTime now, {
  bool byTripDate = false,
}) {
  final today = DateTime(now.year, now.month, now.day);
  final search = query.trim().toLowerCase();
  final result = plans.where((p) {
    final end = DateTime.tryParse(p.endDate) ?? p.parsedStartDate;
    final match = '${p.title} ${p.destination}'.toLowerCase().contains(search);
    return match &&
        switch (filter) {
          PlanFilter.all => true,
          PlanFilter.favorites => p.isFavorite,
          PlanFilter.upcoming => end != null && !end.isBefore(today),
          PlanFilter.past => end != null && end.isBefore(today),
        };
  }).toList();
  result.sort((a, b) {
    final order = byTripDate
        ? (a.parsedStartDate ?? DateTime(9999)).compareTo(
            b.parsedStartDate ?? DateTime(9999),
          )
        : (b.createdAt ?? DateTime(1970)).compareTo(
            a.createdAt ?? DateTime(1970),
          );
    return order == 0 ? a.id.compareTo(b.id) : order;
  });
  return result;
}
