import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/firebase/mobile_app_check.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    test('$platform production uses attestation without a push flag', () {
      expect(
        mobileAppCheckMode(
          local: false,
          web: false,
          platform: platform,
          debug: false,
        ),
        MobileAppCheckMode.attested,
      );
    });
    test('$platform development uses debug provider', () {
      expect(
        mobileAppCheckMode(
          local: false,
          web: false,
          platform: platform,
          debug: true,
        ),
        MobileAppCheckMode.debug,
      );
    });
    test('$platform local emulators do not request attestation', () {
      for (final debug in [true, false]) {
        expect(
          mobileAppCheckMode(
            local: true,
            web: false,
            platform: platform,
            debug: debug,
          ),
          MobileAppCheckMode.disabled,
        );
      }
    });
  }
  test(
    'web and unsupported desktop platforms do not activate mobile providers',
    () {
      for (final platform in TargetPlatform.values) {
        expect(
          mobileAppCheckMode(
            local: false,
            web: true,
            platform: platform,
            debug: false,
          ),
          MobileAppCheckMode.disabled,
        );
        if (platform == TargetPlatform.android ||
            platform == TargetPlatform.iOS) {
          continue;
        }
        expect(
          mobileAppCheckMode(
            local: false,
            web: false,
            platform: platform,
            debug: false,
          ),
          MobileAppCheckMode.disabled,
        );
      }
    },
  );
}
