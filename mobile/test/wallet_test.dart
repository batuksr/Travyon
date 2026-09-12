import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/wallet/data/wallet_repository.dart';
import 'package:travyon/features/wallet/presentation/wallet_page.dart';
import 'package:travyon/features/wallet/presentation/wallet_editor.dart';

import 'widget_test.dart' show FakeTravelPlansRepository;

class FakeWallet implements WalletRepository {
  List<WalletEntry> entries = [];
  final changes = StreamController<List<WalletEntry>>.broadcast();
  final saved = <WalletEntry>[];
  bool failSave = false, failDelete = false;
  int removed = 0;
  @override
  Stream<List<WalletEntry>> watch(String uid) async* {
    yield entries;
    yield* changes.stream;
  }

  @override
  Future<void> save(
    String uid,
    WalletEntry entry, {
    required bool create,
  }) async {
    saved.add(entry);
    if (failSave) throw StateError('Kaydetme denemesi başarısız.');
    entries = [...entries.where((e) => e.id != entry.id), entry];
    changes.add(entries);
  }

  @override
  Future<void> remove(String uid, String id) async {
    if (failDelete) throw StateError('offline');
    removed++;
    entries = entries.where((e) => e.id != id).toList();
    changes.add(entries);
  }
}

const flight = WalletEntry(
  id: 'f1',
  planId: 'general',
  category: 'flight',
  title: 'İstanbul → Roma',
  reference: 'ABC123',
  date: '2026-09-20',
  createdAt: 1,
  details: {'time': '10:00', 'airline': 'THY'},
);

Future<void> mount(WidgetTester tester, Widget page, {double scale = 1}) async {
  tester.view.physicalSize = const Size(360, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (c, child) => MediaQuery(
        data: MediaQuery.of(c).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: Scaffold(body: page),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> see(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    250,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

void main() {
  test('wallet uses web fields, category whitelist and safe links', () {
    final entry = WalletEntry.fromMap('x', {
      ...flight.toMap(),
      'details': {'airline': ' THY ', 'insurer': 'hidden'},
    });
    expect(entry.toMap()['details'], {'airline': 'THY'});
    expect(walletUrl('example.com'), 'https://example.com');
    expect(walletUrl('javascript:alert(1)'), isNull);
    expect(walletUrl('https://user:pass@example.com'), isNull);
    expect(walletUrl('file:///tmp/x'), isNull);
    expect(
      sortedWalletEntries([
        WalletEntry(
          id: 'z',
          planId: 'general',
          category: 'other',
          title: 'Not',
          createdAt: 2,
        ),
        flight,
      ]).first.id,
      'f1',
    );
  });
  testWidgets(
    'empty wallet opens editor, validates, preserves failed save and adds once',
    (tester) async {
      final repo = FakeWallet();
      addTearDown(repo.changes.close);
      await mount(
        tester,
        WalletPage(
          uid: 'u',
          repository: repo,
          plansRepository: FakeTravelPlansRepository([]),
        ),
      );
      expect(find.text('İlk biletini ekle'), findsOneWidget);
      await see(tester, find.byKey(const ValueKey('wallet-add')));
      await tester.tap(find.byKey(const ValueKey('wallet-add')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('wallet-save')));
      await tester.pumpAndSettle();
      expect(find.text('Başlık gir.'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('wallet-title')),
        'Roma uçuşum',
      );
      await tester.enterText(
        find.byKey(const ValueKey('wallet-reference')),
        'PNR123',
      );
      repo.failSave = true;
      await tester.tap(find.byKey(const ValueKey('wallet-save')));
      await tester.pumpAndSettle();
      expect(find.text('Roma uçuşum'), findsOneWidget);
      expect(repo.saved.length, 1);
      repo.failSave = false;
      await tester.tap(find.byKey(const ValueKey('wallet-save')));
      await tester.pumpAndSettle();
      expect(repo.saved.map((e) => e.id).toSet().length, 1);
      expect(repo.entries.length, 1);
      expect(find.byType(WalletEditor), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'three pocket cards fit large text, details edit and deletion require confirmation',
    (tester) async {
      final repo = FakeWallet()
        ..entries = [
          flight,
          const WalletEntry(
            id: 's1',
            planId: 'general',
            category: 'stay',
            title: 'Roma merkez otel rezervasyonu',
            createdAt: 2,
          ),
          const WalletEntry(
            id: 't1',
            planId: 'general',
            category: 'ticket',
            title: 'Kolezyum bileti',
            createdAt: 3,
          ),
        ];
      addTearDown(repo.changes.close);
      await mount(
        tester,
        WalletPage(
          uid: 'u',
          repository: repo,
          plansRepository: FakeTravelPlansRepository([]),
        ),
        scale: 1.4,
      );
      await see(tester, find.byKey(const ValueKey('wallet-entry-f1')));
      await tester.tap(find.byKey(const ValueKey('wallet-entry-f1')));
      await tester.pumpAndSettle();
      expect(find.text('ABC123'), findsOneWidget);
      expect(find.byTooltip('Kodu kopyala'), findsOneWidget);
      final delete = find.text('Kaydı sil');
      await tester.scrollUntilVisible(
        delete,
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('wallet-details-list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(delete);
      await tester.pumpAndSettle();
      expect(repo.removed, 0);
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(repo.entries.length, 3);
      await tester.tap(find.byKey(const ValueKey('wallet-entry-f1')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Düzenle'),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('wallet-details-list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.text('Düzenle'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('wallet-title')),
        'Güncellenmiş uçuş',
      );
      await tester.tap(find.byKey(const ValueKey('wallet-save')));
      await tester.pumpAndSettle();
      expect(
        repo.entries.firstWhere((e) => e.id == 'f1').title,
        'Güncellenmiş uçuş',
      );
      expect(repo.entries.length, 3);
      await see(tester, find.byKey(const ValueKey('wallet-entry-f1')));
      await tester.tap(find.byKey(const ValueKey('wallet-entry-f1')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Kaydı sil'),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('wallet-details-list')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.text('Kaydı sil'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sil'));
      await tester.pumpAndSettle();
      expect(repo.removed, 1);
      expect(repo.entries.any((e) => e.id == 'f1'), isFalse);
    },
  );
}
