import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';

/// Selects whether the mobile app talks to local Firebase emulators or cloud.
///
/// Authentication intentionally remains on the real Firebase project in both
/// modes, matching the web app's hybrid local-development setup.
abstract final class FirebaseEnvironment {
  static const String mode = String.fromEnvironment(
    'TRAVYON_FIREBASE_MODE',
    defaultValue: 'production',
  );

  static const String _customHost = String.fromEnvironment(
    'TRAVYON_FIREBASE_EMULATOR_HOST',
  );

  static bool get usesEmulators => mode == 'local';

  static String get emulatorHost {
    if (_customHost.isNotEmpty) return _customHost;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return '10.0.2.2';
    }
    return '127.0.0.1';
  }

  static String get label => usesEmulators ? 'LOCAL' : 'PRODUCTION';

  static Future<void> configureAfterFirebaseInitialization() async {
    if (!usesEmulators) {
      debugPrint('Travyon Firebase modu: PRODUCTION');
      return;
    }

    final host = emulatorHost;
    // We already select 10.0.2.2 for Android emulators above. Preserve an
    // explicit 127.0.0.1 override for physical devices using adb reverse;
    // FlutterFire would otherwise silently map it back to 10.0.2.2.
    FirebaseFirestore.instance.useFirestoreEmulator(
      host,
      8080,
      automaticHostMapping: false,
    );
    FirebaseFunctions.instanceFor(region: 'europe-west1')
        .useFunctionsEmulator(host, 5001, automaticHostMapping: false);
    await FirebaseStorage.instance.useStorageEmulator(
      host,
      9199,
      automaticHostMapping: false,
    );

    debugPrint(
      'Travyon Firebase modu: LOCAL '
      '(Auth: production, Firestore/Functions/Storage: $host)',
    );
  }
}
