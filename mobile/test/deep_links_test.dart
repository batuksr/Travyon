import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/navigation/travyon_deep_links.dart';

void main() {
  test('accepts public web and custom plan links', () {
    expect(
      TravyonDeepLinks.parsePlanId(
        Uri.parse('https://travyon-5fb01.web.app/plan/rome_2026'),
      ),
      'rome_2026',
    );
    expect(
      TravyonDeepLinks.parsePlanId(Uri.parse('travyon://plan/rome_2026')),
      'rome_2026',
    );
  });

  test('rejects foreign, malformed and non-plan links', () {
    for (final uri in [
      Uri.parse('https://example.com/plan/rome'),
      Uri.parse('https://travyon-5fb01.web.app/settings'),
      Uri.parse('travyon://plan/bad%20id'),
      Uri.parse('travyon://wallet/rome'),
    ]) {
      expect(TravyonDeepLinks.parsePlanId(uri), isNull);
    }
  });
}
