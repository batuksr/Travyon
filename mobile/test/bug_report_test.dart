import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/settings/presentation/bug_report_page.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'settings_test.dart' show FakeSettings;
import 'welcome_screen_test.dart' show host;

class BugSettings extends FakeSettings {
  final reports = <({String title, String description, bool bug})>[];
  Completer<void>? pending;
  Object? error;
  @override
  Future<void> support(
    String subject,
    String message, {
    required bool bug,
  }) async {
    reports.add((title: subject, description: message, bug: bug));
    await pending?.future;
    if (error != null) throw error!;
  }
}

Future<void> visible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> fill(WidgetTester tester) async {
  final title = find.byKey(const ValueKey('bug-title'));
  final description = find.byKey(const ValueKey('bug-description'));
  await visible(tester, title);
  await tester.enterText(title, ' Map issue ');
  await visible(tester, description);
  await tester.enterText(
    description,
    ' The route is blank after selecting a day. ',
  );
  await tester.pumpAndSettle();
}

Future<void> send(WidgetTester tester, {bool settle = true}) async {
  final button = find.byKey(const ValueKey('bug-send'));
  await visible(tester, button);
  await tester.tap(button);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Widget routeHost(BugSettings repo) => host(
  Scaffold(
    body: Builder(
      builder: (context) => TextButton(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => BugReportPage(repository: repo),
          ),
        ),
        child: const Text('Open report'),
      ),
    ),
  ),
  language: 'en',
);

void main() {
  for (final language in ['tr', 'en']) {
    for (final size in [
      const Size(320, 640),
      const Size(411, 731),
      const Size(640, 360),
    ]) {
      testWidgets(
        'bug report fits $language at $size with large text and keyboard',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetViewInsets);
          final repo = BugSettings();
          await tester.pumpWidget(
            host(BugReportPage(repository: repo), language: language, scale: 2),
          );
          await tester.pumpAndSettle();
          final strings = AppLocalizations(Locale(language));
          expect(
            find.text(strings.text('Birlikte daha iyi bir Travyon.')),
            findsOneWidget,
          );
          final description = tester.widget<TextField>(
            find.descendant(
              of: find.byKey(const ValueKey('bug-description')),
              matching: find.byType(TextField),
            ),
          );
          expect(
            description.decoration!.labelText,
            strings.text('Detaylı açıklama'),
          );
          expect(description.decoration!.alignLabelWithHint, isTrue);
          expect(
            description.decoration!.labelText,
            isNot(contains('rezervasyon')),
          );
          await fill(tester);
          tester.view.viewInsets = const FakeViewPadding(bottom: 180);
          await tester.pumpAndSettle();
          await visible(tester, find.byKey(const ValueKey('bug-send')));
          expect(
            find.text(
              strings.text(
                'Şifre, kart bilgisi veya rezervasyon kodu paylaşma.',
              ),
            ),
            findsOneWidget,
          );
          expect(repo.reports, isEmpty);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('validates required text and server code-unit limits', (
    tester,
  ) async {
    final repo = BugSettings();
    await tester.pumpWidget(
      host(BugReportPage(repository: repo), language: 'en'),
    );
    await send(tester);
    expect(find.text('Complete this field.'), findsNWidgets(2));
    expect(repo.reports, isEmpty);
    final title = find.byKey(const ValueKey('bug-title'));
    final description = find.byKey(const ValueKey('bug-description'));
    await visible(tester, title);
    await tester.enterText(title, List.filled(101, '🗺').join());
    await visible(tester, description);
    await tester.enterText(description, 'Map failed');
    await send(tester);
    expect(find.text('Use no more than 200 characters.'), findsOneWidget);
    expect(repo.reports, isEmpty);
  });

  testWidgets(
    'sends only trimmed report fields once and waits for server acknowledgement',
    (tester) async {
      final repo = BugSettings()..pending = Completer<void>();
      await tester.pumpWidget(
        host(BugReportPage(repository: repo), language: 'en'),
      );
      await fill(tester);
      await send(tester, settle: false);
      expect(repo.reports.single, (
        title: 'Map issue',
        description: 'The route is blank after selecting a day.',
        bug: true,
      ));
      expect(
        tester
            .widget<FilledButton>(find.byKey(const ValueKey('bug-send')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<TextFormField>(find.byKey(const ValueKey('bug-title')))
            .enabled,
        isFalse,
      );
      expect(find.text('We received your report.'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('bug-send')));
      await tester.pump();
      expect(repo.reports.length, 1);
      repo.pending!.complete();
      await tester.pumpAndSettle();
      expect(find.text('We received your report.'), findsOneWidget);
      expect(find.byType(TextFormField), findsNothing);
      await visible(tester, find.byKey(const ValueKey('bug-new-report')));
      await tester.tap(find.byKey(const ValueKey('bug-new-report')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextFormField>(find.byKey(const ValueKey('bug-title')))
            .controller!
            .text,
        isEmpty,
      );
      expect(
        tester
            .widget<TextFormField>(
              find.byKey(const ValueKey('bug-description')),
            )
            .controller!
            .text,
        isEmpty,
      );
    },
  );

  for (final (code, message) in [
    (
      'unavailable',
      'Couldn’t send your report. Your draft is safe here; check your connection and try again.',
    ),
    (
      'resource-exhausted',
      'You’ve sent too many reports. Please wait a while and try again.',
    ),
    ('unauthenticated', 'Sign in again to send a report.'),
    (
      'failed-precondition',
      'Verify your email address before sending a report.',
    ),
  ]) {
    testWidgets('preserves draft on $code and shows localized safe feedback', (
      tester,
    ) async {
      final repo = BugSettings()
        ..error = FirebaseFunctionsException(
          code: code,
          message: 'private technical details',
        );
      await tester.pumpWidget(
        host(BugReportPage(repository: repo), language: 'en'),
      );
      await fill(tester);
      await send(tester);
      expect(find.text(message), findsOneWidget);
      expect(find.textContaining('private technical details'), findsNothing);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const ValueKey('bug-title')))
            .controller!
            .text,
        ' Map issue ',
      );
      expect(
        tester
            .widget<TextFormField>(
              find.byKey(const ValueKey('bug-description')),
            )
            .controller!
            .text,
        ' The route is blank after selecting a day. ',
      );
      repo.error = null;
      await send(tester);
      expect(find.text('We received your report.'), findsOneWidget);
      expect(repo.reports.length, 2);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'system and toolbar back require confirmation only for an unsent draft',
    (tester) async {
      final repo = BugSettings();
      await tester.pumpWidget(routeHost(repo));
      await tester.tap(find.text('Open report'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.byType(BugReportPage), findsNothing);
      await tester.tap(find.text('Open report'));
      await tester.pumpAndSettle();
      await fill(tester);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Discard your report?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(find.byType(BugReportPage), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Leave without saving'));
      await tester.pumpAndSettle();
      expect(find.byType(BugReportPage), findsNothing);
      expect(repo.reports, isEmpty);
    },
  );

  testWidgets(
    'successful report returns to settings without an unsaved warning',
    (tester) async {
      final repo = BugSettings();
      await tester.pumpWidget(routeHost(repo));
      await tester.tap(find.text('Open report'));
      await tester.pumpAndSettle();
      await fill(tester);
      await send(tester);
      await visible(tester, find.byKey(const ValueKey('bug-done')));
      await tester.tap(find.byKey(const ValueKey('bug-done')));
      await tester.pumpAndSettle();
      expect(find.byType(BugReportPage), findsNothing);
      expect(find.text('Discard your report?'), findsNothing);
      expect(repo.reports.length, 1);
    },
  );

  testWidgets('the settings bug action opens the redesigned report form', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        SettingsActionPage(
          action: 'bug',
          title: 'Hata bildir',
          passwordProvider: true,
          repository: BugSettings(),
        ),
        language: 'en',
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(BugReportPage), findsOneWidget);
    expect(find.text('A better Travyon, together.'), findsOneWidget);
    expect(find.byKey(const ValueKey('bug-send')), findsOneWidget);
  });
}
