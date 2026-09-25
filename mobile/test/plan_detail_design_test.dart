import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';
import 'package:travyon/features/plans/presentation/plan_route_map.dart';
import 'package:travyon/features/plans/presentation/plan_stop_card.dart';

import 'plan_detail_test.dart' show DetailFake;

void main() {
  for (final dark in [false, true]) {
    for (final locale in ['tr', 'en']) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets('itinerary fits $size / $locale / dark=$dark at 200%', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            MaterialApp(
              theme: dark ? AppTheme.dark : AppTheme.light,
              locale: Locale(locale),
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
              home: PlanDetailPage(
                uid: 'u',
                planId: 'p1',
                repository: DetailFake(),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(
            find.text(
              locale == 'tr'
                  ? 'Durakların konumu henüz eklenmemiş.'
                  : 'Stop locations have not been added yet.',
            ),
            findsOneWidget,
          );
          final scrollable = find
              .descendant(
                of: find.byKey(const ValueKey('0-0')),
                matching: find.byType(Scrollable),
              )
              .first;
          await tester.scrollUntilVisible(
            find.byType(PlanStopCard),
            180,
            scrollable: scrollable,
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          await tester.scrollUntilVisible(
            find.byKey(const ValueKey('plan-weather')),
            180,
            scrollable: scrollable,
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  testWidgets(
    'map preview uses only valid locations and does not capture scroll',
    (tester) async {
      GoogleMap? map;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SizedBox(
              height: 220,
              child: PlanRouteMap(
                day: PlanDay({
                  'activities': [
                    {
                      'placeName': 'Pantheon',
                      'coordinates': {'lat': 41.8986, 'lng': 12.4769},
                    },
                    {'placeName': 'Eksik'},
                    {
                      'placeName': 'Kolezyum',
                      'coordinates': {'lat': 41.8902, 'lng': 12.4922},
                    },
                  ],
                }, 0),
                preview: true,
                onDirections: (_) =>
                    fail('A preview must not request directions'),
                mapBuilder: (value) {
                  map = value;
                  return const SizedBox.expand();
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(map!.markers.length, 2);
      expect(map!.polylines, isEmpty); // No line spanning a missing location.
      expect(map!.scrollGesturesEnabled, isFalse);
      expect(map!.zoomGesturesEnabled, isFalse);
      expect(map!.gestureRecognizers, isEmpty);
      expect(map!.markers.every((marker) => marker.onTap == null), isTrue);
      expect(find.byKey(const ValueKey('route-stop-details')), findsNothing);
      expect(find.byKey(const ValueKey('plan-map-preview')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('hero opens the selected day on the full map', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: PlanDetailPage(
          uid: 'u',
          planId: 'p1',
          repository: DetailFake(),
          initialDayIndex: 1,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('plan-open-map')));
    await tester.pumpAndSettle();
    expect(
      tester.widget<PlanRouteMap>(find.byType(PlanRouteMap)).preview,
      isFalse,
    );
    expect(find.text('Villa Borghese'), findsOneWidget);
    await tester.tap(find.text('Günlük plan'));
    await tester.pumpAndSettle();
    expect(tester.widget<PlanRouteMap>(find.byType(PlanRouteMap)).day.index, 1);
    expect(
      tester.widget<PlanRouteMap>(find.byType(PlanRouteMap)).preview,
      isTrue,
    );
    expect(tester.takeException(), isNull);
  });
}
