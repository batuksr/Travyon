import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/wallet/data/wallet_repository.dart';
import 'package:travyon/features/wallet/presentation/wallet_design.dart';
import 'package:travyon/features/wallet/presentation/wallet_editor.dart';
import 'package:travyon/features/wallet/presentation/wallet_page.dart';
import 'package:travyon/features/wallet/presentation/wallet_pocket.dart';

import 'community_route_design_test.dart' show host, viewport;
import 'wallet_test.dart' show FakeWallet, flight;
import 'widget_test.dart' show FakeTravelPlansRepository;

const stay = WalletEntry(
  id: 's1',
  planId: 'general',
  category: 'stay',
  title: 'Roma merkez otel rezervasyonu ve uzun oda açıklaması',
  date: '2026-09-21',
  createdAt: 2,
);
const ticket = WalletEntry(
  id: 't1',
  planId: 'general',
  category: 'ticket',
  title: 'Kolezyum bileti',
  date: '2026-09-22',
  createdAt: 3,
);

class ReloadWallet extends FakeWallet {
  bool failLoad = false;
  int loads = 0;
  @override
  Stream<List<WalletEntry>> watch(String uid) async* {
    loads++;
    if (failLoad) throw StateError('offline');
    yield entries;
    yield* changes.stream;
  }
}

class ReloadPlans extends FakeTravelPlansRepository {
  ReloadPlans(super.plans);
  bool fail = false;
  int loads = 0;
  @override
  Stream<List<TravelPlanSummary>> watchPlans(String uid) {
    loads++;
    return fail ? Stream.error(StateError('offline')) : super.watchPlans(uid);
  }
}

Widget page(
  FakeWallet repo, {
  TravelPlansRepository? plans,
  String uid = 'u',
}) => Scaffold(
  body: SafeArea(
    child: WalletPage(
      uid: uid,
      repository: repo,
      plansRepository: plans ?? FakeTravelPlansRepository([]),
    ),
  ),
);

Finder scroll() => find
    .descendant(
      of: find.byKey(const PageStorageKey('wallet-scroll-u')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> reveal(
  WidgetTester tester,
  Finder target, {
  bool up = false,
}) async {
  await tester.scrollUntilVisible(
    target,
    up ? -220 : 220,
    scrollable: scroll(),
    maxScrolls: 80,
  );
  await tester.pumpAndSettle();
}

void main() {
  for (final language in ['tr', 'en']) {
    for (final dark in [false, true]) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets(
          'white wallet $language dark=$dark $size fits 200% empty and populated',
          (tester) async {
            viewport(tester, size);
            final repo = FakeWallet();
            addTearDown(repo.changes.close);
            await tester.pumpWidget(
              host(page(repo), language: language, dark: dark, scale: 2),
            );
            await tester.pumpAndSettle();
            await reveal(
              tester,
              find.byKey(const ValueKey('wallet-pocket-add')),
            );
            expect(
              tester
                  .widget<Material>(
                    find.byKey(const ValueKey('wallet-pocket-add')),
                  )
                  .color,
              Colors.white,
            );
            final title = tester.widget<Text>(
              find.text(
                language == 'en' ? 'Add your first item' : 'İlk kaydını ekle',
              ),
            );
            expect(title.style!.color!.computeLuminance(), lessThan(.1));
            expect(tester.takeException(), isNull);
            await reveal(tester, find.byType(WalletEmptyGuide));
            expect(find.text('Neler ekleyebilirsin?'), findsNothing);
            expect(tester.takeException(), isNull);
            repo.entries = [flight, stay, ticket];
            repo.changes.add(repo.entries);
            await tester.pumpAndSettle();
            await reveal(
              tester,
              find.byKey(const ValueKey('wallet-pocket-f1')),
              up: true,
            );
            for (final id in ['f1', 's1', 't1']) {
              expect(
                tester
                    .widget<Material>(find.byKey(ValueKey('wallet-pocket-$id')))
                    .color,
                Colors.white,
              );
            }
            await reveal(tester, find.byKey(const ValueKey('wallet-entry-t1')));
            expect(find.byType(WalletEmptyGuide), findsNothing);
            expect(repo.saved, isEmpty);
            expect(repo.removed, 0);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'category filters affect list only and reset when the category disappears',
    (tester) async {
      viewport(tester, const Size(390, 820));
      final repo = FakeWallet()..entries = [flight, stay, ticket];
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(page(repo), language: 'en', dark: true));
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const ValueKey('wallet-filter-stay')));
      await tester.tap(find.byKey(const ValueKey('wallet-filter-stay')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('wallet-entry-f1')), findsNothing);
      await reveal(tester, find.byKey(const ValueKey('wallet-entry-s1')));
      expect(find.byKey(const ValueKey('wallet-entry-s1')), findsOneWidget);
      expect(find.byKey(const ValueKey('wallet-entry-t1')), findsNothing);
      repo.entries = [flight, ticket];
      repo.changes.add(repo.entries);
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byKey(const ValueKey('wallet-filter-all')),
        up: true,
      );
      expect(
        tester.widget<WalletCategories>(find.byType(WalletCategories)).selected,
        isNull,
      );
      await reveal(tester, find.byKey(const ValueKey('wallet-entry-f1')));
      expect(find.byKey(const ValueKey('wallet-entry-f1')), findsOneWidget);
      expect(repo.saved, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'white paper opens details; dates are localized and codes stay off overview',
    (tester) async {
      final repo = FakeWallet()..entries = [flight];
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(page(repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('ABC123'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('wallet-pocket-f1')));
      await tester.pumpAndSettle();
      expect(find.text('ABC123'), findsOneWidget);
      expect(find.byTooltip('Copy code'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('wallet-details-list')),
          matching: find.textContaining('Sep 20 2026'),
        ),
        findsOneWidget,
      );
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const ValueKey('wallet-entry-f1')));
      expect(find.text('Code saved'), findsOneWidget);
      expect(find.text('ABC123'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'trip selection isolates records and new editor inherits selected trip',
    (tester) async {
      final plans = FakeTravelPlansRepository([
        TravelPlanSummary.fromMap('roma', {
          'plan': {'destination': 'Roma, İtalya', 'dailyPlans': []},
        }),
      ]);
      final repo = FakeWallet()
        ..entries = [
          flight,
          const WalletEntry(
            id: 'roma-stay',
            planId: 'roma',
            category: 'stay',
            title: 'Roma oteli',
            createdAt: 2,
          ),
          const WalletEntry(
            id: 'old-doc',
            planId: 'deleted',
            category: 'document',
            title: 'Arşiv belgesi',
            createdAt: 3,
          ),
        ];
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(page(repo, plans: plans)));
      await tester.pumpAndSettle();
      final select = tester.widget<DropdownButton<String>>(
        find.byType(DropdownButton<String>),
      );
      expect(select.items!.map((item) => item.value), [
        'general',
        'roma',
        'deleted',
      ]);
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Roma, İtalya').last);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<WalletPocket>(find.byType(WalletPocket))
            .entries
            .single
            .id,
        'roma-stay',
      );
      expect(find.text('İstanbul → Roma'), findsNothing);
      await reveal(tester, find.byKey(const ValueKey('wallet-add')));
      await tester.tap(find.byKey(const ValueKey('wallet-add')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<WalletEditor>(find.byType(WalletEditor)).planId,
        'roma',
      );
      expect(repo.saved, isEmpty);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byType(DropdownButtonFormField<String>),
        up: true,
      );
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Arşivlenmiş seyahat').last);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<WalletPocket>(find.byType(WalletPocket))
            .entries
            .single
            .id,
        'old-doc',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'wallet and trips load failures retry separately without unsafe writes',
    (tester) async {
      final repo = ReloadWallet()..failLoad = true;
      final plans = ReloadPlans([])..fail = true;
      addTearDown(repo.changes.close);
      await tester.pumpWidget(host(page(repo, plans: plans), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.byType(WalletPocket), findsNothing);
      expect(find.byKey(const ValueKey('wallet-add')), findsNothing);
      expect(find.textContaining('Firestore'), findsNothing);
      repo.failLoad = false;
      await reveal(tester, find.byKey(const ValueKey('wallet-load-error')));
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('wallet-load-error')),
          matching: find.byType(TextButton),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.loads, 2);
      await reveal(tester, find.byKey(const ValueKey('wallet-pocket-add')));
      expect(find.byKey(const ValueKey('wallet-pocket-add')), findsOneWidget);
      plans.fail = false;
      await reveal(
        tester,
        find.byKey(const ValueKey('wallet-plans-error')),
        up: true,
      );
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('wallet-plans-error')),
          matching: find.byType(TextButton),
        ),
      );
      await tester.pumpAndSettle();
      expect(plans.loads, 2);
      expect(find.byKey(const ValueKey('wallet-plans-error')), findsNothing);
      expect(repo.saved, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('empty white card opens one editor without changing data', (
    tester,
  ) async {
    final repo = FakeWallet();
    addTearDown(repo.changes.close);
    await tester.pumpWidget(host(page(repo)));
    await tester.pumpAndSettle();
    final target = find.byKey(const ValueKey('wallet-pocket-add'));
    await tester.tap(target);
    await tester.pumpAndSettle();
    expect(find.byType(WalletEditor), findsOneWidget);
    expect(repo.saved, isEmpty);
    expect(repo.removed, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'all six categories use white paper, and invalid dates are left untouched',
    (tester) async {
      String? formatted;
      await tester.pumpWidget(
        host(
          Scaffold(
            body: Builder(
              builder: (context) {
                formatted = walletDisplayDate(context, '2026-02-30');
                return const SizedBox();
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(formatted, '2026-02-30');
      for (final category in walletCategories.keys) {
        expect(walletCardColor(category), Colors.white);
      }
      const en = AppLocalizations(Locale('en'));
      expect(en.text('1 kayıt'), '1 item');
      expect(en.text('{count} kayıt', values: {'count': 2}), '2 items');
    },
  );
}
