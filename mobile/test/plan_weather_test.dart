import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_weather_repository.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/plan_information_sheet.dart';
import 'package:travyon/features/plans/presentation/plan_weather_sheet.dart';

TravelPlanSummary trip({
  List<String> dates = const ['2026-09-17', '2026-09-18'],
  bool coordinates = true,
  bool guide = true,
}) => TravelPlanSummary.fromMap('p1', {
  'plan': {
    'destination': 'Roma, İtalya',
    if (guide)
      'cityGuide': {
        'transportationTips': 'Metro and bus advice.',
        'localCustoms': 'Local customs advice.',
        'generalAdvice': 'Useful travel advice.',
      },
    'dailyPlans': [
      for (final date in dates)
        {
          'date': date,
          'activities': [
            {
              'placeName': 'Pantheon',
              if (coordinates) 'coordinates': {'lat': 41.9, 'lng': 12.48},
            },
          ],
        },
    ],
  },
});

Map<String, dynamic> response(List<String> dates) => {
  'daily': {
    'time': dates,
    'temperature_2m_max': [for (final _ in dates) 30],
    'temperature_2m_min': [for (final _ in dates) 10],
    'weather_code': [for (final _ in dates) 63],
    'precipitation_sum': [for (final _ in dates) 4.5],
    'precipitation_probability_max': [for (final _ in dates) 70],
    'wind_speed_10m_max': [for (final _ in dates) 40],
  },
};

PlanWeatherReport report() => PlanWeatherReport(
  days: parsePlanWeather(response(['2026-09-17', '2026-09-18'])),
  latitude: 41.9,
  longitude: 12.48,
  today: DateTime(2026, 9, 14),
);

class WeatherFake implements PlanWeatherRepository {
  int calls = 0;
  Completer<PlanWeatherReport> pending = Completer();
  @override
  Future<PlanWeatherReport> fetch(TravelPlanSummary plan) {
    calls++;
    return pending.future;
  }
}

Widget app(Widget child, {bool english = false, AppUnitController? units}) {
  final result = MaterialApp(
    theme: AppTheme.light,
    locale: Locale(english ? 'en' : 'tr'),
    supportedLocales: const [Locale('tr'), Locale('en')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      ...GlobalMaterialLocalizations.delegates,
    ],
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: const TextScaler.linear(2)),
      child: child!,
    ),
    home: Scaffold(body: SafeArea(child: child)),
  );
  return units == null
      ? result
      : AppUnitScope(controller: units, child: result);
}

void narrow(WidgetTester tester) {
  tester.view.physicalSize = const Size(320, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  test(
    'invalid dates and missing readings are not reported as zero or sunshine',
    () {
      expect(weatherDate('2026-02-30'), isNull);
      final parsed = parsePlanWeather({
        'daily': {
          'time': ['2026-09-17', '2026-09-18', '2026-09-19'],
          'temperature_2m_max': [null, 0, 20],
          'temperature_2m_min': [null, -1, 10],
          'precipitation_probability_max': [null, null, 150],
          'wind_speed_10m_max': [null, null, -1],
        },
      });
      expect(parsed.length, 2);
      expect(parsed.first.maximum, 0);
      expect(parsed.first.code, isNull);
      expect(parsed.last.rainChance, isNull);
      expect(parsed.last.windKmh, isNull);
    },
  );

  test(
    'forecast uses trip coordinates, Celsius and kmh, and coalesces requests',
    () async {
      final requests = <Uri>[];
      final repository = OpenMeteoPlanWeatherRepository(
        now: () => DateTime(2026, 9, 14),
        getJson: (uri) async {
          requests.add(uri);
          return response(['2026-09-17', '2026-09-18']);
        },
      );
      final results = await Future.wait([
        repository.fetch(trip()),
        repository.fetch(trip()),
      ]);
      expect(requests.length, 1);
      expect(requests.single.host, 'api.open-meteo.com');
      expect(requests.single.queryParameters['latitude'], '41.9000');
      expect(requests.single.queryParameters['temperature_unit'], 'celsius');
      expect(requests.single.queryParameters['wind_speed_unit'], 'kmh');
      expect(results.first.days.length, 2);
      await repository.fetch(trip());
      expect(requests.length, 1);
    },
  );

  test('future-only dates skip the API and partial forecasts request only available dates', () async {
    final requests = <Uri>[];
    final repository = OpenMeteoPlanWeatherRepository(
      now: () => DateTime(2026, 9, 14),
      getJson: (uri) async {
        requests.add(uri);
        return response(['2026-09-29']);
      },
    );
    await expectLater(
      repository.fetch(trip(dates: ['2026-10-01'])),
      throwsA(
        isA<PlanWeatherException>().having(
          (e) => e.reason,
          'reason',
          PlanWeatherFailure.tooFar,
        ),
      ),
    );
    expect(requests, isEmpty);
    final result = await repository.fetch(
      trip(dates: ['2026-09-29', '2026-09-30']),
    );
    expect(requests.single.queryParameters['end_date'], '2026-09-29');
    expect(result.days.length, 1);
  });

  test(
    'archive and forecast dates split; geocoding is a coordinate fallback',
    () async {
      final requests = <Uri>[];
      final repository = OpenMeteoPlanWeatherRepository(
        now: () => DateTime(2026, 9, 14),
        getJson: (uri) async {
          requests.add(uri);
          if (uri.host.startsWith('geocoding')) {
            return {
              'results': [
                {'latitude': 41.9, 'longitude': 12.48},
              ],
            };
          }
          return response([uri.queryParameters['start_date']!]);
        },
      );
      final boundary = DateTime(2026, 9, 14).subtract(const Duration(days: 92));
      final result = await repository.fetch(
        trip(
          coordinates: false,
          dates: [
            weatherDateString(boundary.subtract(const Duration(days: 1))),
            weatherDateString(boundary),
          ],
        ),
      );
      expect(requests.map((uri) => uri.host), [
        'geocoding-api.open-meteo.com',
        'archive-api.open-meteo.com',
        'api.open-meteo.com',
      ]);
      expect(
        requests[1].queryParameters['daily'],
        isNot(contains('precipitation_probability_max')),
      );
      expect(result.days.length, 2);
    },
  );

  test('failed requests can retry and successful cache expires', () async {
    var now = DateTime(2026, 9, 14);
    var calls = 0;
    final repository = OpenMeteoPlanWeatherRepository(
      now: () => now,
      getJson: (_) async {
        if (++calls == 1) throw StateError('offline');
        return response(['2026-09-17']);
      },
    );
    await expectLater(repository.fetch(trip()), throwsStateError);
    await repository.fetch(trip());
    expect(calls, 2);
    now = now.add(const Duration(minutes: 21));
    await repository.fetch(trip());
    expect(calls, 3);
  });

  for (final english in [false, true]) {
    testWidgets(
      'guide uses saved web content and handles missing content ($english)',
      (tester) async {
        narrow(tester);
        await tester.pumpWidget(
          app(PlanGuideSheet(plan: trip()), english: english),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(english ? 'City guide' : 'Şehir rehberi'),
          findsOneWidget,
        );
        for (final text in [
          'Metro and bus advice.',
          'Local customs advice.',
          'Useful travel advice.',
        ]) {
          await tester.scrollUntilVisible(find.text(text), 200);
          expect(find.text(text), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(
          app(PlanGuideSheet(plan: trip(guide: false)), english: english),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(
            english
                ? 'No guide information is saved for this trip.'
                : 'Bu plan için rehber bilgisi bulunmuyor.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'weather retries, respects units and links, and fits large text ($english)',
      (tester) async {
        narrow(tester);
        final units = AppUnitController.testing();
        addTearDown(units.dispose);
        final fake = WeatherFake();
        Uri? opened;
        await tester.pumpWidget(
          app(
            PlanWeatherSheet(
              plan: trip(),
              repository: fake,
              onOpen: (uri) async {
                opened = uri;
                return true;
              },
            ),
            english: english,
            units: units,
          ),
        );
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        fake.pending.completeError(StateError('offline'));
        await tester.pumpAndSettle();
        fake.pending = Completer();
        await tester.tap(find.text(english ? 'Try again' : 'Tekrar dene'));
        await tester.pump();
        fake.pending.complete(report());
        await tester.pumpAndSettle();
        expect(find.text('30°C'), findsWidgets);
        expect(
          find.text(english ? 'Rain chance: 70%' : 'Yağış olasılığı: %70'),
          findsWidgets,
        );
        expect(
          find.text(english ? 'Wind: 40 km/h' : 'Rüzgâr: 40 km/sa'),
          findsWidgets,
        );
        await units.setUnits(distanceKm: false, tempCelsius: false);
        await tester.pumpAndSettle();
        expect(find.text('86°F'), findsWidgets);
        expect(
          find.text(english ? 'Wind: 25 mph' : 'Rüzgâr: 25 mph'),
          findsWidgets,
        );
        expect(fake.calls, 2);
        final windy = find.text(
          english ? 'Open in Windy' : 'Windy haritasında aç',
        );
        await tester.scrollUntilVisible(windy, 200);
        await tester.drag(find.byType(ListView), const Offset(0, -140));
        await tester.pumpAndSettle();
        await tester.tap(windy);
        await tester.pumpAndSettle();
        expect(opened?.host, 'www.windy.com');
        expect(opened?.path, '/41.9000/12.4800/11');
        final source = find.text(
          english ? 'Weather data: Open-Meteo' : 'Hava verisi: Open-Meteo',
        );
        await tester.scrollUntilVisible(source, 160);
        await tester.ensureVisible(source);
        await tester.pumpAndSettle();
        final attribution = tester.widget<TextButton>(
          find.byKey(const ValueKey('weather-attribution')),
        );
        final sourceStyle = attribution.style!.textStyle!.resolve({});
        expect(sourceStyle?.fontFamily, AppTypography.body);
        expect(sourceStyle?.fontSize, 11);
        expect(sourceStyle?.fontWeight, FontWeight.w400);
        expect(sourceStyle?.decoration, TextDecoration.underline);
        expect(
          tester
              .getSize(find.byKey(const ValueKey('weather-attribution')))
              .height,
          greaterThanOrEqualTo(48),
        );
        await tester.tap(source);
        expect(opened?.host, 'open-meteo.com');
        expect(tester.takeException(), isNull);
      },
    );
  }

  test(
    'rain showers do not incorrectly produce thunderstorm packing advice',
    () {
      final tips = planPackingTips([
        const PlanWeatherDay(
          date: '2026-09-17',
          code: 80,
          maximum: 20,
          minimum: 15,
          rainMm: 5,
        ),
      ]);
      expect(tips.map((tip) => tip.$2), ['Şemsiye veya yağmurluk']);
    },
  );
}
