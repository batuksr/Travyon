import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/onboarding/data/accommodation_repository.dart';
import 'package:travyon/features/onboarding/presentation/accommodation_field.dart';

class FakeAccommodation implements AccommodationRepository {
  final calls = <({String input, String destination, String session})>[];
  final responses = <Completer<List<AccommodationSuggestion>>>[];
  String? resolvedSession;
  bool failResolve = false;
  @override
  Future<List<AccommodationSuggestion>> suggest(
    String input,
    String destination,
    String session,
  ) {
    calls.add((input: input, destination: destination, session: session));
    final response = Completer<List<AccommodationSuggestion>>();
    responses.add(response);
    return response.future;
  }

  @override
  Future<AccommodationSelection> resolve(
    AccommodationSuggestion suggestion,
    String session,
  ) async {
    resolvedSession = session;
    if (failResolve) throw Exception('network');
    return const AccommodationSelection('Hotel Roma, Via Roma 1', 41.9, 12.5);
  }
}

void main() {
  testWidgets(
    'debounces, ignores stale replies, selects address and clears old coordinates on editing',
    (tester) async {
      final repo = FakeAccommodation();
      var address = '';
      AccommodationSelection? selected;
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => SingleChildScrollView(
                child: AccommodationField(
                  value: address,
                  destination: 'Roma, İtalya',
                  repository: repo,
                  confirmed: selected != null,
                  onChanged: (v) => setState(() {
                    address = v;
                    selected = null;
                  }),
                  onSelected: (v) => setState(() {
                    address = v.address;
                    selected = v;
                  }),
                ),
              ),
            ),
          ),
        ),
      );
      final field = find.byKey(const ValueKey('accommodation-address'));
      await tester.enterText(field, 'Ho');
      await tester.pump(const Duration(milliseconds: 500));
      expect(repo.calls, isEmpty);
      await tester.enterText(field, 'Hot');
      await tester.pump(const Duration(milliseconds: 200));
      await tester.enterText(field, 'Hotel');
      await tester.pump(const Duration(milliseconds: 400));
      expect(repo.calls.length, 1);
      expect(repo.calls.first.destination, 'Roma, İtalya');
      await tester.enterText(field, 'Hotel Roma');
      await tester.pump(const Duration(milliseconds: 400));
      repo.responses[1].complete([
        const AccommodationSuggestion('new', 'Hotel Roma', 'Via Roma 1'),
      ]);
      await tester.pumpAndSettle();
      repo.responses[0].complete([
        const AccommodationSuggestion('old', 'Old hotel', ''),
      ]);
      await tester.pumpAndSettle();
      expect(find.text('Old hotel'), findsNothing);
      expect(find.text('Google Maps'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('accommodation-new')));
      await tester.pumpAndSettle();
      expect(address, 'Hotel Roma, Via Roma 1');
      expect(selected?.lat, 41.9);
      expect(repo.resolvedSession, repo.calls.last.session);
      await tester.enterText(field, 'New hotel');
      expect(selected, isNull);
      await tester.pump(const Duration(milliseconds: 400));
      expect(repo.calls.last.session, isNot(repo.resolvedSession));
      repo.responses.last.completeError(Exception('offline'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Öneriler alınamadı'), findsOneWidget);
      expect(address, 'New hotel');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('disposing a field cancels pending searches safely', (
    tester,
  ) async {
    final repo = FakeAccommodation();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AccommodationField(
            value: '',
            destination: 'Roma',
            repository: repo,
            onChanged: (_) {},
            onSelected: (_) {},
          ),
        ),
      ),
    );
    await tester.enterText(
      find.byKey(const ValueKey('accommodation-address')),
      'Hotel',
    );
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 1));
    expect(repo.calls, isEmpty);
    expect(tester.takeException(), isNull);
  });
}
