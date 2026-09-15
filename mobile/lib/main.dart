import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app/travyon_app.dart';
import 'core/firebase/firebase_environment.dart';
import 'core/firebase/mobile_app_check.dart';
import 'core/localization/app_locale_controller.dart';
import 'core/navigation/travyon_deep_links.dart';
import 'core/preferences/app_unit_controller.dart';
import 'core/theme/app_theme_controller.dart';
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

  final localeController = await AppLocaleController.load();
  final unitController = await AppUnitController.load();
  final themeController = await AppThemeController.load();
  runApp(
    TravyonApp(
      initializationError: initializationError,
      localeController: localeController,
      unitController: unitController,
      themeController: themeController,
    ),
  );
}
