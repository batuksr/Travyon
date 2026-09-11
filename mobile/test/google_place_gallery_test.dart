import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/plans/data/plan_detail.dart';
import 'package:travyon/features/plans/data/mobile_places_repository.dart';
import 'package:travyon/features/plans/presentation/google_place_gallery.dart';

class GalleryPlaces implements MobilePlacesRepository {
  final calls = <String>[];
  final requests = <Completer<String>>[];
  @override
  Future<String> photo(String name) {
    calls.add(name);
    final request = Completer<String>();
    requests.add(request);
    return request.future;
  }

  @override
  Future<Map<String, dynamic>?> details(
    PlanStop stop,
    String destination,
  ) async => null;
}

void main() {
  testWidgets(
    'loads visible photo only, swipes, attributes authors and refreshes errors',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = GalleryPlaces();
      int refreshes = 0;
      String? opened;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(1.3)),
              child: GooglePlaceGallery(
                photos: [
                  {
                    'name': 'places/x/photos/one',
                    'authorAttributions': [
                      {
                        'displayName': 'Ayşe',
                        'uri': '//maps.google.com/author',
                      },
                    ],
                  },
                  {
                    'name': 'places/x/photos/two',
                    'authorAttributions': [
                      {'displayName': 'Deniz'},
                    ],
                  },
                ],
                repository: repo,
                onRefresh: () => refreshes++,
                onOpenSource: (uri) => opened = uri,
                imageBuilder: (uri) =>
                    ColoredBox(key: ValueKey(uri), color: Colors.green),
              ),
            ),
          ),
        ),
      );
      expect(repo.calls, ['places/x/photos/one']);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      repo.requests.first.complete('https://lh3.googleusercontent.com/one');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('https://lh3.googleusercontent.com/one')),
        findsOneWidget,
      );
      await tester.tap(find.text('Fotoğraf: Ayşe'));
      expect(opened, 'https://maps.google.com/author');
      await tester.drag(find.byType(PageView), const Offset(-300, 0));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(repo.calls.length, 2);
      expect(find.text('2 / 2'), findsOneWidget);
      expect(find.text('Fotoğraf: Deniz'), findsOneWidget);
      expect(find.text('Fotoğraf: Ayşe'), findsNothing);
      repo.requests.last.completeError(Exception('expired'));
      await tester.pumpAndSettle();
      expect(find.text('Fotoğraf yüklenemedi.'), findsOneWidget);
      await tester.tap(find.text('Fotoğrafları yenile'));
      expect(refreshes, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
