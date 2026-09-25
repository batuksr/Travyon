import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/wallet/presentation/wallet_trip_selector.dart';

import 'community_route_design_test.dart' show host, viewport;

void main() {
  for (final size in [const Size(320, 740), const Size(640, 360)]) {
    for (final language in ['tr', 'en']) {
      testWidgets(
        'trip sheet fits $size / $language at 200% and cancel preserves selection',
        (tester) async {
          viewport(tester, size);
          var selected = 'general';
          var changes = 0;
          final trips = {
            'general': language == 'tr' ? 'Genel cüzdan' : 'General wallet',
            for (var i = 0; i < 18; i++)
              'trip-$i': 'Roma, İtalya · Uzun seyahat adı ve gezi notları $i',
          };
          await tester.pumpWidget(
            host(
              Scaffold(
                body: Padding(
                  padding: const EdgeInsets.all(20),
                  child: StatefulBuilder(
                    builder: (context, setState) => Align(
                      alignment: Alignment.topCenter,
                      child: WalletTripSelector(
                        trips: trips,
                        selected: selected,
                        onChanged: (value) => setState(() {
                          selected = value;
                          changes++;
                        }),
                      ),
                    ),
                  ),
                ),
              ),
              language: language,
              dark: language == 'en',
              scale: 2,
            ),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const ValueKey('wallet-trip-select')));
          await tester.pumpAndSettle();
          expect(
            find.text(language == 'tr' ? 'Seyahat seç' : 'Choose a trip'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
          await tester.tap(find.byKey(const ValueKey('wallet-trip-close')));
          await tester.pumpAndSettle();
          expect(selected, 'general');
          expect(changes, 0);
          await tester.tap(find.byKey(const ValueKey('wallet-trip-select')));
          await tester.pumpAndSettle();
          final last = find.byKey(const ValueKey('wallet-trip-option-trip-17'));
          await tester.scrollUntilVisible(
            last,
            150,
            scrollable: find
                .descendant(
                  of: find.byKey(const ValueKey('wallet-trip-options')),
                  matching: find.byType(Scrollable),
                )
                .first,
            maxScrolls: 100,
          );
          await tester.pumpAndSettle();
          await tester.tap(last);
          await tester.pumpAndSettle();
          expect(selected, 'trip-17');
          expect(changes, 1);
          expect(
            find.byKey(const ValueKey('wallet-trip-options')),
            findsNothing,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('disabled selector does not open or change trips', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        const Scaffold(
          body: WalletTripSelector(
            trips: {'general': 'Genel cüzdan', 'roma': 'Roma, İtalya'},
            selected: 'general',
            onChanged: null,
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const ValueKey('wallet-trip-select')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('wallet-trip-options')), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
