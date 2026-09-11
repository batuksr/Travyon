import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/mobile_places_repository.dart';
import 'package:travyon/features/plans/presentation/plan_route_map.dart';
import 'package:travyon/features/plans/presentation/google_place_sheet.dart';

class FakePlaces implements MobilePlacesRepository {
  @override
  Future<String> photo(String name) async =>
      'https://lh3.googleusercontent.com/test';
  int calls = 0;
  Completer<Map<String, dynamic>?> pending = Completer();
  @override
  Future<Map<String, dynamic>?> details(PlanStop stop, String destination) {
    calls++;
    return pending.future;
  }
}

Map<String, dynamic> point(String name, double lat, double lng) => {
  'placeName': name,
  'coordinates': {'lat': lat, 'lng': lng},
};
void main() {
  test('invalid coordinates do not create map points', () {
    for (final raw in [
      <String, dynamic>{},
      point('zero', 0, 0),
      point('bad', 91, 12),
      point('bad', 40, 181),
      point('bad', double.nan, 12),
    ]) {
      expect(PlanStop(raw, 0).location, isNull);
    }
    expect(PlanStop(point('Roma', 41.89, 12.49), 0).location, (
      lat: 41.89,
      lng: 12.49,
    ));
  });
  testWidgets(
    'Google marker opens loading then reviews, without eager requests; day switches reset',
    (tester) async {
      tester.view.physicalSize = const Size(360, 760);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final places = FakePlaces();
      GoogleMap? map;
      Widget app(PlanDay day) => MaterialApp(
        theme: AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.3)),
          child: child!,
        ),
        home: Scaffold(
          body: SizedBox(
            height: 480,
            child: PlanRouteMap(
              day: day,
              destination: 'Roma',
              placesRepository: places,
              onDirections: (_) {},
              mapBuilder: (value) {
                map = value;
                return const SizedBox.expand();
              },
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        app(
          PlanDay({
            'activities': [
              point('Kolezyum', 41.89, 12.49),
              {'placeName': 'Eksik'},
              point('Pantheon', 41.90, 12.47),
            ],
          }, 0),
        ),
      );
      await tester.pumpAndSettle();
      expect(map!.markers.length, 2);
      expect(map!.polylines, isEmpty);
      expect(places.calls, 0);
      map!.markers.firstWhere((m) => m.markerId.value == 'stop-2').onTap!();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.byType(GooglePlaceSheet), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      places.pending.complete({
        'displayName': {'text': 'Pantheon'},
        'rating': 4.8,
        'userRatingCount': 123,
        'reviews': [
          {
            'authorAttribution': {'displayName': 'Gezgin'},
            'rating': 5,
            'text': {'text': 'Harika bir ziyaret.'},
          },
        ],
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('4.8'), findsOneWidget);
      expect(find.text('Gezgin'), findsOneWidget);
      expect(places.calls, 1);
      expect(tester.takeException(), isNull);
      await tester.tap(find.byTooltip('Kapat'));
      await tester.pumpAndSettle();
      await tester.pumpWidget(
        app(
          PlanDay({
            'activities': [point('Yeni gün', 42, 13)],
          }, 1),
        ),
      );
      await tester.pumpAndSettle();
      expect(map!.markers.length, 1);
      expect(map!.initialCameraPosition.target, const LatLng(42, 13));
      expect(find.text('Yeni gün'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('details error can retry and empty result is explicit', (
    tester,
  ) async {
    final places = FakePlaces();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GooglePlaceSheet(
            stop: PlanStop({'placeName': 'Durak'}, 0),
            destination: 'Roma',
            repository: places,
          ),
        ),
      ),
    );
    places.pending.completeError(Exception('offline'));
    await tester.pumpAndSettle();
    expect(find.text('Tekrar dene'), findsOneWidget);
    places.pending = Completer();
    await tester.tap(find.text('Tekrar dene'));
    await tester.pump();
    places.pending.complete(null);
    await tester.pumpAndSettle();
    expect(
      find.textContaining('eşleşen bir Google mekânı bulunamadı'),
      findsOneWidget,
    );
    expect(places.calls, 2);
    expect(tester.takeException(), isNull);
  });
}
