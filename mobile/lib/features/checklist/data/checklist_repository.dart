import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_services.dart';
import 'checklist_catalog.dart';

class TravelChecklistState {
  const TravelChecklistState({
    required this.checkedIds,
    this.fromCache = false,
    this.hasPendingWrites = false,
  });

  final Set<String> checkedIds;
  final bool fromCache;
  final bool hasPendingWrites;
}

Set<String> normalizeTravelChecklistIds(Object? value) {
  if (value is! List) return <String>{};
  return value
      .whereType<String>()
      .where(travelChecklistItemIds.contains)
      .toSet();
}

abstract interface class ChecklistRepository {
  Stream<TravelChecklistState> watch(String uid, String planId);
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
  Stream<TravelChecklistState> watch(String uid, String planId) =>
      _state(uid, planId).snapshots(includeMetadataChanges: true).map((
        snapshot,
      ) {
        final checked = normalizeTravelChecklistIds(
          snapshot.data()?['checkedIds'],
        );
        return TravelChecklistState(
          checkedIds: checked,
          fromCache: snapshot.metadata.isFromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        );
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
