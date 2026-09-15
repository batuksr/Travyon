import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/wallet/data/wallet_repository.dart';
import 'package:travyon/features/wallet/presentation/wallet_editor.dart';
import 'package:travyon/features/wallet/presentation/wallet_form_copy.dart';

import 'community_route_design_test.dart' show host, viewport;
import 'wallet_test.dart' show FakeWallet, flight;

Finder field(String name) => find.byKey(ValueKey('wallet-$name'));

TextField input(WidgetTester tester, String name) => tester.widget<TextField>(
  find.descendant(of: field(name), matching: find.byType(TextField)),
);

Future<void> reveal(WidgetTester tester, String name) async {
  await tester.scrollUntilVisible(
    field(name),
    180,
    scrollable: find
        .descendant(
          of: find.byKey(const ValueKey('wallet-form-scroll')),
          matching: find.byType(Scrollable),
        )
        .first,
    maxScrolls: 100,
  );
  await tester.pumpAndSettle();
}

Future<void> top(WidgetTester tester) async {
  tester
      .widget<ListView>(find.byKey(const ValueKey('wallet-form-scroll')))
      .controller!
      .jumpTo(0);
  await tester.pumpAndSettle();
}

Future<void> open(
  WidgetTester tester,
  FakeWallet repo, {
  String language = 'tr',
  bool dark = false,
  double scale = 1,
  WalletEntry? entry,
}) async {
  addTearDown(repo.changes.close);
  await tester.pumpWidget(
    host(
      Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => WalletEditor(
                  uid: 'u',
                  planId: 'rome',
                  repository: repo,
                  entry: entry,
                ),
              ),
            ),
            child: const Text('Open editor'),
          ),
        ),
      ),
      language: language,
      dark: dark,
      scale: scale,
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('Open editor'));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'all category and detail examples match the website and are localized',
    () {
      final web = jsonDecode(
        File('../web/src/i18n/locales/tr.json').readAsStringSync(),
      )['travelWallet'];
      final form = web['form'];
      const en = AppLocalizations(Locale('en'));
      expect(walletFormCopy.keys, walletCategories.keys);
      for (final category in walletCategories.keys) {
        final copy = walletFormCopy[category]!;
        final pairs = {
          'titlePlaceholders': copy.titleHint,
          'referenceLabels': copy.referenceLabel,
          'referencePlaceholders': copy.referenceHint,
          'dateLabels': copy.dateLabel,
          'categoryDetails': copy.sectionTitle,
          'urlPlaceholders': copy.urlHint,
          'notePlaceholders': copy.noteHint,
        };
        for (final pair in pairs.entries) {
          expect(pair.value, form[pair.key][category]);
          expect(en.text(pair.value), isNot(pair.value), reason: pair.value);
        }
        for (final key in walletFields[category]!.keys) {
          final copy = walletDetailCopy[key]!;
          expect(copy.label, web['fields'][key]['label']);
          expect(copy.hint, web['fields'][key]['placeholder']);
          expect(en.text(copy.hint), isNot(copy.hint), reason: copy.hint);
        }
      }
      expect(en.text('Örn. TRV123'), 'e.g. TRV123');
    },
  );

  for (final language in ['tr', 'en']) {
    for (final dark in [false, true]) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets('form $language dark=$dark $size fits 200% text', (
          tester,
        ) async {
          viewport(tester, size);
          final repo = FakeWallet();
          await open(tester, repo, language: language, dark: dark, scale: 2);
          final l10n = AppLocalizations(Locale(language));
          await reveal(tester, 'type-flight');
          expect(field('type-flight').hitTestable(), findsOneWidget);
          await reveal(tester, 'reference');
          expect(
            input(tester, 'reference').decoration!.hintText,
            l10n.text('Örn. TRV123'),
          );
          expect(input(tester, 'reference').controller!.text, isEmpty);
          await reveal(tester, 'airline');
          expect(
            input(tester, 'airline').decoration!.hintText,
            l10n.text('Örn. Türk Hava Yolları'),
          );
          await reveal(tester, 'note');
          expect(tester.takeException(), isNull);
          await top(tester);
          await reveal(tester, 'type-document');
          await tester.tap(field('type-document'));
          await tester.pumpAndSettle();
          await reveal(tester, 'reference');
          expect(
            input(tester, 'reference').decoration!.hintText,
            l10n.text('Tam belge numarasını kaydetme'),
          );
          expect(
            input(tester, 'reference').decoration!.hintMaxLines,
            greaterThan(1),
          );
          await reveal(tester, 'note');
          await tester.enterText(field('note'), 'A personal reminder');
          tester.view.viewInsets = FakeViewPadding(
            bottom: size.height > 400 ? 260 : 100,
          );
          addTearDown(tester.view.resetViewInsets);
          await tester.pumpAndSettle();
          expect(input(tester, 'note').controller!.text, 'A personal reminder');
          expect(repo.saved, isEmpty);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  for (final category in walletCategories.keys) {
    testWidgets(
      '$category examples never become saved data; only title is required',
      (tester) async {
        viewport(tester, const Size(390, 820));
        final repo = FakeWallet();
        await open(tester, repo);
        await tester.tap(field('type-$category'));
        await tester.pumpAndSettle();
        await reveal(tester, 'title');
        expect(input(tester, 'title').controller!.text, isEmpty);
        expect(
          input(tester, 'title').decoration!.hintText,
          walletFormCopy[category]!.titleHint,
        );
        await tester.enterText(field('title'), 'My own item');
        await tester.tap(field('save'));
        await tester.pumpAndSettle();
        expect(find.byType(WalletEditor), findsNothing);
        final saved = repo.saved.single;
        expect(saved.category, category);
        expect(saved.planId, 'rome');
        expect(saved.title, 'My own item');
        expect([
          saved.reference,
          saved.date,
          saved.note,
          saved.url,
        ], everyElement(isEmpty));
        expect(saved.toMap()['details'], isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'scrolled-out required fields and unsafe links still prevent saving',
    (tester) async {
      viewport(tester, const Size(360, 780));
      final repo = FakeWallet();
      await open(tester, repo);
      await reveal(tester, 'note');
      await tester.tap(field('save'));
      await tester.pumpAndSettle();
      expect(repo.saved, isEmpty);
      await top(tester);
      await reveal(tester, 'title');
      await tester.enterText(field('title'), 'Real title');
      await reveal(tester, 'url');
      await tester.enterText(field('url'), 'javascript:alert(1)');
      FocusManager.instance.primaryFocus?.unfocus();
      await top(tester);
      await tester.tap(field('save'));
      await tester.pumpAndSettle();
      expect(repo.saved, isEmpty);
      expect(find.byType(WalletEditor), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'editing keeps saved values, opens saved time and clears date explicitly',
    (tester) async {
      viewport(tester, const Size(390, 820));
      final repo = FakeWallet()..entries = [flight];
      await open(tester, repo, entry: flight);
      await reveal(tester, 'reference');
      expect(input(tester, 'reference').controller!.text, 'ABC123');
      await reveal(tester, 'date');
      expect(input(tester, 'date').controller!.text, '2026-09-20');
      await tester.tap(
        find.descendant(of: field('date'), matching: find.byTooltip('Temizle')),
      );
      await tester.pumpAndSettle();
      expect(input(tester, 'date').controller!.text, isEmpty);
      expect(find.byType(DatePickerDialog), findsNothing);
      expect(
        find.descendant(
          of: field('date'),
          matching: find.byIcon(Icons.calendar_today_outlined),
        ),
        findsOneWidget,
      );
      await reveal(tester, 'time');
      await tester.tap(field('time'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TimePickerDialog>(find.byType(TimePickerDialog))
            .initialTime,
        const TimeOfDay(hour: 10, minute: 0),
      );
      final cancel = MaterialLocalizations.of(
        tester.element(find.byType(TimePickerDialog)),
      ).cancelButtonLabel;
      await tester.tap(find.text(cancel));
      await tester.pumpAndSettle();
      await tester.tap(field('save'));
      await tester.pumpAndSettle();
      final saved = repo.saved.single;
      expect(saved.id, flight.id);
      expect(saved.createdAt, flight.createdAt);
      expect(saved.planId, flight.planId);
      expect(saved.reference, flight.reference);
      expect(saved.date, isEmpty);
      expect(saved.details['time'], '10:00');
      expect(saved.details['airline'], 'THY');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'category switching updates copy and only persists current details',
    (tester) async {
      viewport(tester, const Size(390, 820));
      final repo = FakeWallet();
      await open(tester, repo);
      await reveal(tester, 'title');
      await tester.enterText(field('title'), 'Travel item');
      await reveal(tester, 'airline');
      await tester.enterText(field('airline'), 'My airline');
      FocusManager.instance.primaryFocus?.unfocus();
      await top(tester);
      await tester.tap(field('type-stay'));
      await tester.pumpAndSettle();
      await reveal(tester, 'reference');
      expect(input(tester, 'reference').decoration!.hintText, 'Örn. HTL456');
      await reveal(tester, 'address');
      expect(find.text('Havayolu'), findsNothing);
      await tester.enterText(field('address'), 'My hotel address');
      await tester.tap(field('save'));
      await tester.pumpAndSettle();
      expect(repo.saved.single.title, 'Travel item');
      expect(repo.saved.single.toMap()['details'], {
        'address': 'My hotel address',
      });
      expect(tester.takeException(), isNull);
    },
  );
}
