import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';

import 'firebase_environment.dart';

enum MobileAppCheckMode { disabled, debug, attested }

MobileAppCheckMode mobileAppCheckMode({
  required bool local,
  required bool web,
  required TargetPlatform platform,
  required bool debug,
}) {
  if (local ||
      web ||
      (platform != TargetPlatform.android && platform != TargetPlatform.iOS)) {
    return MobileAppCheckMode.disabled;
  }
  return debug ? MobileAppCheckMode.debug : MobileAppCheckMode.attested;
}

/// Core Firebase initialization, unrelated to notification permission/rollout.
/// Provider failures propagate to the existing initialization error screen;
/// never silently switch a release app to a debug provider.
abstract final class MobileAppCheck {
  static Future<void> initialize() async {
    final mode = mobileAppCheckMode(
      local: FirebaseEnvironment.usesEmulators,
      web: kIsWeb,
      platform: defaultTargetPlatform,
      debug: kDebugMode,
    );
    if (mode == MobileAppCheckMode.disabled) return;
    await FirebaseAppCheck.instance.activate(
      providerAndroid: mode == MobileAppCheckMode.debug
          ? const AndroidDebugProvider()
          : const AndroidPlayIntegrityProvider(),
      providerApple: mode == MobileAppCheckMode.debug
          ? const AppleDebugProvider()
          : const AppleDeviceCheckProvider(),
    );
  }
}
