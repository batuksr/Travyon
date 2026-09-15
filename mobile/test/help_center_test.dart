import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/auth/presentation/auth_page.dart';
import 'package:travyon/features/bootstrap/presentation/mobile_bootstrap_page.dart';
import 'package:travyon/features/help/data/contact_repository.dart';
import 'package:travyon/features/help/data/help_content.dart';
import 'package:travyon/features/help/data/help_content.generated.dart';
import 'package:travyon/features/help/presentation/help_center_page.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'settings_test.dart' show FakeSettings;
import 'welcome_screen_test.dart' show host;
import 'widget_test.dart' show FakeAuthRepository;

class FakeContact implements ContactRepository {
  final messages = <Map<String, String>>[];
  Object? error;
  Completer<void>? pending;

  @override
  Future<void> send({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) async {
    messages.add({
      'name': name,
      'email': email,
      'subject': subject,
      'message': message,
    });
    await pending?.future;
    if (error != null) throw error!;
  }
}

class OfflineSettings extends FakeSettings {
  bool offline = true;
  @override
  Future<Map<String, dynamic>> load() async {
    if (offline) throw StateError('offline');
    return super.load();
  }
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Finder helpScroll(String section) => find
    .descendant(
      of: find.byKey(PageStorageKey('help-$section-scroll')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> contactField(
  WidgetTester tester,
  String field,
  String text,
) async {
  final finder = find.byKey(ValueKey('contact-$field'));
  await tester.scrollUntilVisible(
    finder,
    400,
    scrollable: helpScroll('contact'),
  );
  await tester.enterText(finder, text);
  await tester.pumpAndSettle();
}

Future<void> fillMessage(WidgetTester tester) async {
  await contactField(tester, 'name', ' Traveler ');
  await contactField(tester, 'email', ' traveler@example.test ');
  await contactField(tester, 'subject', ' My trip ');
  await contactField(tester, 'message', ' Can you help with my plan? ');
}

Future<void> contactSubmit(WidgetTester tester, {bool settle = true}) async {
  final button = find.byKey(const ValueKey('contact-send'));
  await tester.scrollUntilVisible(
    button,
    300,
    scrollable: helpScroll('contact'),
  );
  await tester.ensureVisible(button);
  await tester.pump();
  await tester.tap(button);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Widget routeHost(Widget page, {String language = 'en'}) => host(
  Scaffold(
    body: Builder(
      builder: (context) => TextButton(
        onPressed: () =>
            Navigator.of(context)
                .push(MaterialPageRoute<void>(builder: (_) => page)),
        child: const Text('Open help'),
      ),
    ),
  ),
  language: language,
);

void main() {
  test('all public content exactly matches both web locales, including long policy paragraphs', () {
    for (final language in ['tr', 'en']) {
      final source = jsonDecode(
        File('../web/src/i18n/locales/$language.json').readAsStringSync(),
      ) as Map;
      expect(sharedHelpContent[language], source['legal']);
      final content = HelpContent(language);
      expect(content.sections(HelpSection.faq).length, 4);
      expect(content.sections(HelpSection.privacy).length, 10);
      expect(content.sections(HelpSection.terms).length, 11);
    }
    expect(HelpContent('unsupported').tab(HelpSection.faq), 'SSS');
  });

  for (final language in ['tr', 'en']) {
    testWidgets(
      'FAQ, policies and contact are localized and fit narrow large text: $language',
      (tester) async {
        tester.view.physicalSize = const Size(320, 740);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repo = FakeContact();
        await tester.pumpWidget(
          host(HelpCenterPage(repository: repo), language: language, scale: 2),
        );
        await tester.pumpAndSettle();
        final content = HelpContent(language);
        final first =
            (content.sections(HelpSection.faq).first['items'] as List).first
                as Map;
        await tester.scrollUntilVisible(
          find.text(first['q'] as String),
          300,
          scrollable: helpScroll('faq'),
        );
        await tapVisible(tester, find.text(first['q'] as String));
        expect(find.text(first['a'] as String), findsOneWidget);
        for (final section in [HelpSection.privacy, HelpSection.terms]) {
          await tester.tap(find.byKey(ValueKey('help-tab-${section.name}')));
          await tester.pumpAndSettle();
          final last = content.sections(section).last;
          await tester.scrollUntilVisible(
            find.text(last['title'] as String),
            1400,
            scrollable: helpScroll(section.name),
            maxScrolls: 90,
          );
          expect(find.text(last['content'] as String), findsOneWidget);
          await tester.scrollUntilVisible(
            find.text(content.text('lastUpdated')),
            500,
            scrollable: helpScroll(section.name),
          );
          expect(find.text(content.text('lastUpdated')), findsOneWidget);
        }
        await tester.tap(find.byKey(const ValueKey('help-tab-contact')));
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('contact-send')),
          500,
          scrollable: helpScroll('contact'),
        );
        expect(repo.messages, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'welcome exposes help without Firebase even when initialization fails',
    (tester) async {
      await tester.pumpWidget(
        host(
          MobileBootstrapPage(initializationError: StateError('offline')),
          language: 'en',
        ),
      );
      await tapVisible(tester, find.byKey(const ValueKey('welcome-help')));
      expect(find.text('Frequently Asked Questions'), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.byType(MobileBootstrapPage), findsOneWidget);
    },
  );

  testWidgets(
    'registration links open full policies without accepting terms or losing input',
    (tester) async {
      await tester.pumpWidget(
        host(
          AuthPage(
            repository: FakeAuthRepository(session: null),
            initialMode: AuthMode.register,
          ),
          language: 'en',
        ),
      );
      await tester.enterText(find.byType(TextFormField).first, 'Traveler');
      await tapVisible(tester, find.byKey(const ValueKey('help-link-terms')));
      expect(find.text('1. Acceptance'), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      expect(find.text('Traveler'), findsOneWidget);
      await tapVisible(tester, find.byKey(const ValueKey('help-link-privacy')));
      expect(find.text('Privacy Policy'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('settings body can retry and help opens from the support menu', (
    tester,
  ) async {
    final repository = OfflineSettings();
    await tester.pumpWidget(
      host(
        SettingsPage(
          uid: 'test',
          repository: repository,
          onSignOut: () async {},
        ),
        language: 'en',
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.widget<AppBar>(find.byType(AppBar)).actions, isNull);
    repository.offline = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Frequently asked questions'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Frequently asked questions'));
    await tester.pumpAndSettle();
    expect(find.byType(HelpCenterPage), findsOneWidget);
    expect(find.text('Frequently Asked Questions'), findsOneWidget);
  });

  testWidgets(
    'public contact validates required fields and email without submitting',
    (tester) async {
      final repo = FakeContact();
      await tester.pumpWidget(
        host(
          HelpCenterPage(initialSection: HelpSection.contact, repository: repo),
          language: 'en',
        ),
      );
      await contactSubmit(tester);
      expect(repo.messages, isEmpty);
      await contactField(tester, 'name', 'Traveler');
      await contactField(tester, 'email', 'not-an-email');
      await contactField(tester, 'subject', 'Help');
      await contactField(tester, 'message', 'My message');
      await contactSubmit(tester);
      expect(repo.messages, isEmpty);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('contact-email')),
        -300,
        scrollable: helpScroll('contact'),
      );
      expect(find.text('Enter a valid email address.'), findsOneWidget);
    },
  );

  testWidgets(
    'contact prevents double send, waits for acknowledgement and can start a new message',
    (tester) async {
      final pending = Completer<void>();
      final repo = FakeContact()..pending = pending;
      await tester.pumpWidget(
        host(
          HelpCenterPage(initialSection: HelpSection.contact, repository: repo),
          language: 'en',
        ),
      );
      await fillMessage(tester);
      await contactSubmit(tester, settle: false);
      expect(repo.messages.single['email'], 'traveler@example.test');
      expect(repo.messages.single['message'], 'Can you help with my plan?');
      expect(
        tester
            .widget<FilledButton>(find.byKey(const ValueKey('contact-send')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<ChoiceChip>(find.byKey(const ValueKey('help-tab-faq')))
            .onSelected,
        isNull,
      );
      final success =
          HelpContent('en').page(HelpSection.contact)['form']['successTitle']
              as String;
      expect(find.text(success), findsNothing);
      pending.complete();
      await tester.pumpAndSettle();
      final button = find.byKey(const ValueKey('contact-new-message'));
      await tester.scrollUntilVisible(
        button,
        200,
        scrollable: helpScroll('contact'),
      );
      expect(find.text(success), findsOneWidget);
      await tapVisible(tester, button);
      final name = find.byKey(const ValueKey('contact-name'));
      await tester.scrollUntilVisible(
        name,
        -300,
        scrollable: helpScroll('contact'),
      );
      expect(tester.widget<TextFormField>(name).controller!.text, isEmpty);
      expect(repo.messages.length, 1);
    },
  );

  for (final code in ['unavailable', 'resource-exhausted']) {
    testWidgets(
      'contact $code shows a localized error and preserves draft across tabs',
      (tester) async {
        final repo = FakeContact()
          ..error = FirebaseFunctionsException(
            code: code,
            message: 'private backend details',
          );
        await tester.pumpWidget(
          host(
            HelpCenterPage(
              initialSection: HelpSection.contact,
              repository: repo,
            ),
            language: 'en',
          ),
        );
        await fillMessage(tester);
        await contactSubmit(tester);
        final content =
            HelpContent('en').page(HelpSection.contact)['form'] as Map;
        final error =
            content[code == 'resource-exhausted'
                    ? 'errorCooldown'
                    : 'errorGeneric']
                as String;
        expect(find.text(error), findsOneWidget);
        expect(find.textContaining('private backend details'), findsNothing);
        await tester.tap(find.byKey(const ValueKey('help-tab-privacy')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const ValueKey('help-tab-contact')));
        await tester.pumpAndSettle();
        final field = find.byKey(const ValueKey('contact-message'));
        await tester.scrollUntilVisible(
          field,
          -200,
          scrollable: helpScroll('contact'),
        );
        expect(
          tester.widget<TextFormField>(field).controller!.text,
          ' Can you help with my plan? ',
        );
        repo.error = null;
        await contactSubmit(tester);
        expect(
          find.byKey(const ValueKey('contact-new-message')),
          findsOneWidget,
        );
        expect(repo.messages.length, 2);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('back protects an unsent draft and requires explicit discard', (
    tester,
  ) async {
    await tester.pumpWidget(
      routeHost(
        HelpCenterPage(
          initialSection: HelpSection.contact,
          repository: FakeContact(),
        ),
      ),
    );
    await tapVisible(tester, find.text('Open help'));
    await contactField(tester, 'name', 'Traveler');
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Discard your draft?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(find.byType(HelpCenterPage), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Leave without saving'));
    await tester.pumpAndSettle();
    expect(find.byType(HelpCenterPage), findsNothing);
  });

  testWidgets(
    'email and Google policy links open the exact destination and show launch errors',
    (tester) async {
      final uris = <Uri>[];
      await tester.pumpWidget(
        host(
          HelpCenterPage(
            initialSection: HelpSection.contact,
            openLink: (uri) async {
              uris.add(uri);
              return false;
            },
          ),
          language: 'en',
        ),
      );
      await tapVisible(
        tester,
        find.byKey(const ValueKey('contact-info-email')),
      );
      expect(uris.single.toString(), 'mailto:iletisim@travyon.app');
      expect(find.text('Could not open the link. Try again.'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('help-tab-privacy')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Google Privacy Policy'),
        1200,
        scrollable: helpScroll('privacy'),
      );
      await tapVisible(tester, find.text('Google Privacy Policy'));
      expect(uris.last.toString(), 'https://policies.google.com/privacy');
      expect(tester.takeException(), isNull);
    },
  );
}
