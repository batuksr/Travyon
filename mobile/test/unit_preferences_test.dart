import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/preferences/unit_formatter.dart';

void main() {
  test('distance, speed and temperature follow locale and unit settings', () {
    const metricTurkish = UnitFormatter(
      distanceKm: true,
      tempCelsius: true,
      english: false,
    );
    expect(metricTurkish.distance(2.4), '2,4 km');
    expect(metricTurkish.temperature(24), '24°C');
    expect(metricTurkish.speed(18), '18 km/sa');
    expect(metricTurkish.distanceRange(3, 4, perDay: true), '3–4 km/gün');

    const imperialEnglish = UnitFormatter(
      distanceKm: false,
      tempCelsius: false,
      english: true,
    );
    expect(imperialEnglish.distance(2.4), '1.5 mi');
    expect(imperialEnglish.temperature(24), '75°F');
    expect(imperialEnglish.speed(18), '11 mph');
    expect(imperialEnglish.distanceRange(3, 4, perDay: true), '1.9–2.5 mi/day');
  });

  test('route distance does not bridge stops with missing coordinates', () {
    const istanbul = (lat: 41.0082, lng: 28.9784);
    const nearby = (lat: 41.0182, lng: 28.9784);
    final oneLeg = distanceBetweenKm(istanbul, nearby);
    expect(oneLeg, closeTo(1.11, 0.02));
    expect(routeDistanceKm([istanbul, nearby]), closeTo(oneLeg, 0.001));
    expect(routeDistanceKm([istanbul, null, nearby]), 0);
  });

  test(
    'account values update the live controller with safe defaults',
    () async {
      final controller = AppUnitController.testing();
      var changes = 0;
      controller.addListener(() => changes++);

      await controller.applyAccountSettings({
        'distanceKm': false,
        'tempCelsius': false,
      });
      expect(controller.distanceKm, isFalse);
      expect(controller.tempCelsius, isFalse);
      expect(changes, 1);

      await controller.applyAccountSettings(null);
      expect(controller.distanceKm, isTrue);
      expect(controller.tempCelsius, isTrue);
      expect(changes, 2);
    },
  );

  testWidgets('unit scope rebuilds dependants immediately', (tester) async {
    final controller = AppUnitController.testing();
    await tester.pumpWidget(
      AppUnitScope(
        controller: controller,
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: Builder(
            builder: (context) =>
                Text(context.units.distanceKm ? 'metric' : 'imperial'),
          ),
        ),
      ),
    );
    expect(find.text('metric'), findsOneWidget);

    await controller.setUnits(
      distanceKm: false,
      tempCelsius: false,
      persist: false,
    );
    await tester.pump();
    expect(find.text('imperial'), findsOneWidget);
  });
}
