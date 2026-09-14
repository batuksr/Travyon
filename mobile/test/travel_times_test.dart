import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/travel_times_repository.dart';
import 'package:travyon/features/plans/presentation/travel_time_strip.dart';

Map<String, dynamic> stop(double lat) => {
  'placeName': 'Durak',
  'coordinates': {'lat': lat, 'lng': 12.4},
};
PlanDay day() => PlanDay({
  'activities': [stop(41.8), stop(41.9)],
}, 0);

class TimesFake implements TravelTimesRepository {
  int calls = 0;
  Completer<TravelTimes> pending = Completer();
  @override
  Future<TravelTimes> fetch(PlanDay day) {
    calls++;
    return pending.future;
  }
}

void main() {
  test('missing coordinates never bridge stops; response and URL modes are validated', () {
    final gaps = PlanDay({
      'activities': [
        stop(41.8),
        {'placeName': 'Eksik'},
        stop(41.9),
        stop(42),
      ],
    }, 0);
    expect(travelPairs(gaps).map((p) => p['index']), [2]);
    final times = parseTravelTimes({
      'results': [
        {'driving': 5, 'walking': 2.2, 'cycling': -1, 'transit': null},
      ],
    }, travelPairs(day()));
    expect(times[0], {'driving': 5, 'walking': 3});
    expect(
      () => parseTravelTimes({'results': []}, travelPairs(day())),
      throwsFormatException,
    );
    final uri = segmentDirections(
      day().stops.first,
      day().stops.last,
      'cycling',
    );
    expect(uri.queryParameters['travelmode'], 'bicycling');
    expect(uri.queryParameters['origin'], '41.8,12.4');
  });
  test('batch cache ignores notes but reloads reordered routes', () async {
    final fake = TimesFake();
    final cache = TravelTimesCache(fake);
    final first = cache.load(day());
    final notes = PlanDay({
      'activities': [
        {...stop(41.8), 'note': 'Test'},
        stop(41.9),
      ],
    }, 0);
    expect(identical(first, cache.load(notes)), isTrue);
    fake.pending.complete({});
    await first;
    expect(fake.calls, 1);
    await cache.load(
      PlanDay({
        'activities': [stop(41.9), stop(41.8)],
      }, 0),
    );
    expect(fake.calls, 2);
  });
  testWidgets(
    'loading, fastest ties, links and failed retry remain usable on narrow screens',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fake = TimesFake();
      Uri? opened;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.5)),
            child: child!,
          ),
          home: Scaffold(
            body: SingleChildScrollView(
              child: TravelTimeStrip(
                day: day(),
                index: 0,
                cache: TravelTimesCache(fake),
                onOpen: (uri) async {
                  opened = uri;
                  return true;
                },
              ),
            ),
          ),
        ),
      );
      expect(find.text('Ulaşım süreleri hesaplanıyor…'), findsOneWidget);
      expect(find.text('↕ 11,1 km'), findsOneWidget);
      expect(find.textContaining('Sonraki durak'), findsNothing);
      expect(find.text('Kuş uçuşu'), findsNothing);
      fake.pending.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Ulaşım süresi alınamadı.'), findsOneWidget);
      expect(find.text('↕ 11,1 km'), findsOneWidget);
      fake.pending = Completer();
      await tester.tap(find.text('Tekrar dene'));
      await tester.pump();
      fake.pending.complete({
        0: {'driving': 5, 'walking': 2, 'cycling': 2},
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('En hızlı'), findsNothing);
      expect(find.textContaining('Araba'), findsNothing);
      expect(find.textContaining('Yürüyüş'), findsNothing);
      expect(find.textContaining('Bisiklet'), findsNothing);
      expect(find.textContaining('Toplu taşıma'), findsNothing);
      expect(find.text('2 dk'), findsNWidgets(2));
      await tester.tap(find.byTooltip('Bisiklet · 2 dk · En hızlı'));
      await tester.pumpAndSettle();
      expect(opened?.queryParameters['travelmode'], 'bicycling');
      expect(fake.calls, 2);
      expect(tester.takeException(), isNull);
    },
  );

  for (final english in [false, true]) {
    testWidgets(
      'distance respects locale and live units with large text (${english ? 'en' : 'tr'})',
      (tester) async {
        tester.view.physicalSize = const Size(320, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final units = AppUnitController.testing();
        addTearDown(units.dispose);
        final fake = TimesFake();
        final cache = TravelTimesCache(fake);
        const name = 'Museo Nazionale Romano – Palazzo Massimo alle Terme';
        final longDay = PlanDay({
          'activities': [
            stop(41.8),
            {...stop(41.9), 'placeName': name},
          ],
        }, 0);
        await tester.pumpWidget(
          AppUnitScope(
            controller: units,
            child: MaterialApp(
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
              home: Scaffold(
                body: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: TravelTimeStrip(day: longDay, index: 0, cache: cache),
                ),
              ),
            ),
          ),
        );
        expect(find.text(english ? '↕ 11.1 km' : '↕ 11,1 km'), findsOneWidget);
        expect(
          find.byTooltip(
            english
                ? 'Straight-line distance; the travel distance may differ.'
                : 'Kuş uçuşu mesafedir; yol mesafesi farklı olabilir.',
          ),
          findsOneWidget,
        );
        expect(find.text(name), findsNothing);
        expect(
          find.text(english ? '1 → 2 · Next stop' : '1 → 2 · Sonraki durak'),
          findsNothing,
        );
        fake.pending.complete({
          0: {'driving': 61, 'transit': 90, 'walking': 180, 'cycling': 120},
        });
        await tester.pumpAndSettle();
        expect(find.text(english ? '1 hr 1 min' : '1 sa 1 dk'), findsOneWidget);
        expect(find.byType(OutlinedButton), findsNWidgets(4));
        expect(tester.takeException(), isNull);

        await units.setUnits(distanceKm: false, tempCelsius: true);
        await tester.pumpAndSettle();
        expect(find.text(english ? '↕ 6.9 mi' : '↕ 6,9 mi'), findsOneWidget);
        expect(find.textContaining(' km'), findsNothing);
        expect(fake.calls, 1);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'plain double arrow distance and compact transport options have no card or description',
    (tester) async {
      tester.view.physicalSize = const Size(390, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fake = TimesFake();
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: TravelTimeStrip(
                day: day(),
                index: 0,
                cache: TravelTimesCache(fake),
              ),
            ),
          ),
        ),
      );
      fake.pending.complete({
        0: {'driving': 3, 'transit': 4, 'walking': 12, 'cycling': 5},
      });
      await tester.pumpAndSettle();
      expect(find.text('↕ 11,1 km'), findsOneWidget);
      expect(find.text('Durak'), findsNothing);
      expect(find.byType(Divider), findsNothing);
      expect(find.textContaining('Tahmini sürelerdir'), findsNothing);
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('segment-distance')))
            .style
            ?.fontSize,
        12,
      );
      final buttons = tester.widgetList<OutlinedButton>(
        find.byType(OutlinedButton),
      );
      expect(buttons.length, 4);
      for (final button in find.byType(OutlinedButton).evaluate()) {
        final rect = tester.getRect(find.byWidget(button.widget));
        expect(rect.height, greaterThanOrEqualTo(48));
        expect(rect.left, greaterThanOrEqualTo(20));
        expect(rect.right, lessThanOrEqualTo(370));
      }
      expect(tester.takeException(), isNull);
    },
  );
}
