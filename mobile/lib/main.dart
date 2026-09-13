import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app/travyon_app.dart';
import 'core/firebase/firebase_environment.dart';
import 'core/firebase/mobile_app_check.dart';
import 'core/navigation/travyon_deep_links.dart';
import 'firebase_options.dart';
import 'features/notifications/data/firebase_mobile_push.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Object? initializationError;
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await FirebaseEnvironment.configureAfterFirebaseInitialization();
    await MobileAppCheck.initialize();
    await FirebaseMobilePush.initialize();
  } catch (error) {
    initializationError = error;
  }
  try {
    await TravyonDeepLinks.initialize();
  } catch (_) {
    // A malformed platform link must not prevent normal app startup.
  }

  runApp(TravyonApp(initializationError: initializationError));
}
