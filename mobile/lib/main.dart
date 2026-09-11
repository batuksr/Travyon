import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app/travyon_app.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Object? initializationError;
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (error) {
    initializationError = error;
  }

  runApp(TravyonApp(initializationError: initializationError));
}
