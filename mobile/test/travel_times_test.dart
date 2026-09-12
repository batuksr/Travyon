import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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
      fake.pending.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.text('Ulaşım süresi alınamadı.'), findsOneWidget);
      fake.pending = Completer();
      await tester.tap(find.text('Tekrar dene'));
      await tester.pump();
      fake.pending.complete({
        0: {'driving': 5, 'walking': 2, 'cycling': 2},
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('En hızlı'), findsNWidgets(2));
      expect(find.textContaining('Toplu taşıma'), findsNothing);
      await tester.tap(find.text('Bisiklet · 2 dk · En hızlı'));
      await tester.pumpAndSettle();
      expect(opened?.queryParameters['travelmode'], 'bicycling');
      expect(fake.calls, 2);
      expect(tester.takeException(), isNull);
    },
  );
}
