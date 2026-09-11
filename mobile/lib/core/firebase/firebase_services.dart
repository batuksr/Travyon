import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';

/// Shared Firebase entry points used by the Android and iOS clients.
///
/// The Functions region matches the existing Travyon web client and backend.
abstract final class FirebaseServices {
  static FirebaseAuth get auth => FirebaseAuth.instance;
  static FirebaseFirestore get firestore => FirebaseFirestore.instance;
  static FirebaseStorage get storage => FirebaseStorage.instance;
  static FirebaseFunctions get functions =>
      FirebaseFunctions.instanceFor(region: 'europe-west1');
}
