import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_services.dart';

const travelChecklistItemIds = <String>{
  'passport',
  'visa',
  'ticket',
  'hotel',
  'insurance',
  'emergency',
  'cash',
  'card',
  'backup',
  'medicine',
  'firstaid',
  'sunscreen',
  'vaccine',
  'charger',
  'powerbank',
  'simcard',
  'offline',
  'transport',
  'clothes',
  'shoes',
  'lock',
  'copies',
  'notify',
};

abstract interface class ChecklistRepository {
  Stream<Set<String>> watch(String uid, String planId);
  Future<void> toggle(String uid, String planId, String itemId, bool checked);
  Future<void> reset(String uid, String planId);
}

class FirebaseChecklistRepository implements ChecklistRepository {
  DocumentReference<Map<String, dynamic>> _state(String uid, String planId) =>
      FirebaseServices.firestore
          .collection('users')
          .doc(uid)
          .collection('plans')
          .doc(planId)
          .collection('checklist')
          .doc('state');

  @override
  Stream<Set<String>> watch(String uid, String planId) =>
      _state(uid, planId).snapshots().map((snapshot) {
        final raw = snapshot.data()?['checkedIds'];
        if (raw is! List) return <String>{};
        return raw
            .whereType<String>()
            .where(travelChecklistItemIds.contains)
            .toSet();
      });

  @override
  Future<void> toggle(
    String uid,
    String planId,
    String itemId,
    bool checked,
  ) async {
    if (!travelChecklistItemIds.contains(itemId)) {
      throw ArgumentError.value(itemId, 'itemId', 'Unknown checklist item');
    }
    await _state(uid, planId).set({
      'schemaVersion': 1,
      'checkedIds': checked
          ? FieldValue.arrayUnion([itemId])
          : FieldValue.arrayRemove([itemId]),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  @override
  Future<void> reset(String uid, String planId) => _state(uid, planId).set({
    'schemaVersion': 1,
    'checkedIds': <String>[],
    'updatedAt': FieldValue.serverTimestamp(),
  });
}
