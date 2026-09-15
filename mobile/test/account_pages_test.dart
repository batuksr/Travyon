import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/settings/data/settings_fields.dart';
import 'package:travyon/features/settings/presentation/account_profile_page.dart';
import 'package:travyon/features/settings/presentation/account_security_page.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'settings_test.dart' show FakeSettings;
import 'welcome_screen_test.dart' show host;

class AccountSettings extends FakeSettings {
  bool loadFails = false;
  int loads = 0, saves = 0;
  Completer<void>? pending;
  final emailChanges = <({String email, String password})>[];
  final passwordChanges = <({String oldPassword, String newPassword})>[];
  @override
  Future<Map<String, dynamic>> load() async {
    loads++;
    if (loadFails) throw StateError('Ayarlar yüklenemedi.');
    return super.load();
  }

  @override
  Future<void> save(SettingsSection section, Map<String, dynamic> data) async {
    saves++;
    await pending?.future;
    return super.save(section, data);
  }

  @override
  Future<void> changeEmail(String email, String password) async {
    emailChanges.add((email: email, password: password));
    await pending?.future;
    if (this.fail) throw StateError('Mevcut şifreni kontrol et.');
  }

  @override
  Future<void> changePassword(String oldPassword, String newPassword) async {
    passwordChanges.add((oldPassword: oldPassword, newPassword: newPassword));
    await pending?.future;
    if (this.fail) throw StateError('Mevcut şifreni kontrol et.');
  }
}

Future<void> enter(WidgetTester tester, String key, String value) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.enterText(finder, value);
  await tester.pumpAndSettle();
}

Future<void> tap(WidgetTester tester, String key, {bool settle = true}) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

TextField field(WidgetTester tester, String key) => tester.widget<TextField>(
  find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byType(TextField),
  ),
);

Widget page(
  String kind,
  AccountSettings repo, {
  bool passwordProvider = true,
}) => kind == 'profile'
    ? SettingsEditor(
        section: settingsSections.firstWhere((s) => s.id == 'profile'),
        repository: repo,
      )
    : SettingsActionPage(
        action: kind,
        title: kind,
        passwordProvider: passwordProvider,
        currentEmail: 'traveler@example.test',
        repository: repo,
      );

Widget routed(Widget page) => host(
  Scaffold(
    body: Builder(
      builder: (context) => TextButton(
        onPressed: () =>
            Navigator.of(context)
                .push(MaterialPageRoute<void>(builder: (_) => page)),
        child: const Text('Open account'),
      ),
    ),
  ),
  language: 'en',
);

void main() {
  for (final kind in ['profile', 'email', 'password']) {
    for (final language in ['tr', 'en']) {
      for (final size in [const Size(320, 640), const Size(640, 360)]) {
        testWidgets(
          '$kind in $language fits narrow/landscape $size with large text and keyboard',
          (tester) async {
            tester.view.physicalSize = size;
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetViewInsets);
            final repo = AccountSettings();
            await tester.pumpWidget(
              host(page(kind, repo), language: language, scale: 2),
            );
            await tester.pumpAndSettle();
            final strings = AppLocalizations(Locale(language));
            expect(
              find.text(
                strings.text(
                  kind == 'profile'
                      ? 'Profilini güncel tut.'
                      : kind == 'email'
                      ? 'E-postanı güncelle.'
                      : 'Hesabını koru.',
                ),
              ),
              findsOneWidget,
            );
            await enter(
              tester,
              kind == 'profile'
                  ? 'profile-displayName'
                  : kind == 'email'
                  ? 'account-email'
                  : 'account-new',
              'Traveler123',
            );
            tester.view.viewInsets = const FakeViewPadding(bottom: 160);
            await tester.pumpAndSettle();
            await tester.ensureVisible(
              find.byKey(
                ValueKey(kind == 'profile' ? 'profile-save' : 'account-submit'),
              ),
            );
            await tester.pumpAndSettle();
            expect(repo.saves, 0);
            expect(repo.emailChanges, isEmpty);
            expect(repo.passwordChanges, isEmpty);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'profile loads once, validates, saves only profile fields and preserves failed edits',
    (tester) async {
      final repo = AccountSettings()..fail = true;
      await tester.pumpWidget(host(page('profile', repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(repo.loads, 1);
      await enter(tester, 'profile-displayName', '');
      await tap(tester, 'profile-save');
      expect(repo.saves, 0);
      await enter(tester, 'profile-displayName', 'New Traveler');
      await enter(tester, 'profile-username', 'traveler');
      await enter(tester, 'profile-phone', '+90 555 000 00 00');
      await enter(tester, 'profile-address', 'Test address');
      await tap(tester, 'profile-save');
      expect(find.text('New Traveler'), findsOneWidget);
      expect(repo.lastSave, isNull);
      repo.fail = false;
      await tap(tester, 'profile-save');
      expect(repo.lastSave?['displayName'], 'New Traveler');
      expect(repo.lastSave?['nationality'], 'Türkiye');
      expect(repo.lastSave?.keys.toSet(), {
        'displayName',
        'username',
        'phone',
        'birthDate',
        'nationality',
        'gender',
        'address',
      });
      expect(find.text('Your changes have been saved.'), findsOneWidget);
      expect(repo.loads, 1);
    },
  );

  testWidgets(
    'profile load failure can be retried without saving missing data',
    (tester) async {
      final repo = AccountSettings()..loadFails = true;
      await tester.pumpWidget(host(page('profile', repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('profile-save')), findsNothing);
      expect(repo.saves, 0);
      repo.loadFails = false;
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('profile-save')), findsOneWidget);
      expect(repo.loads, 2);
    },
  );

  testWidgets(
    'profile calendar is localized, cannot select future birth dates and can clear the date',
    (tester) async {
      final repo = AccountSettings()..values['birthDate'] = '2000-01-01';
      await tester.pumpWidget(host(page('profile', repo), language: 'en'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('Choose a date'));
      await tester.tap(find.byTooltip('Choose a date'));
      await tester.pumpAndSettle();
      final picker = tester.widget<DatePickerDialog>(
        find.byType(DatePickerDialog),
      );
      expect(picker.lastDate, DateUtils.dateOnly(DateTime.now()));
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(field(tester, 'profile-birthDate').controller!.text, '2000-01-01');
      await tester.tap(find.byTooltip('Clear date'));
      await tester.pumpAndSettle();
      expect(field(tester, 'profile-birthDate').controller!.text, isEmpty);
      expect(repo.saves, 0);
    },
  );

  for (final kind in ['email', 'password']) {
    testWidgets(
      '$kind preserves input after failure, blocks duplicate requests and clears secrets on success',
      (tester) async {
        final repo = AccountSettings()..fail = true;
        await tester.pumpWidget(host(page(kind, repo), language: 'en'));
        await tester.pumpAndSettle();
        if (kind == 'email') {
          await enter(tester, 'account-email', ' new@example.test ');
        }
        await enter(tester, 'account-current', 'old-password');
        if (kind == 'password') {
          await enter(tester, 'account-new', 'new-password123');
          await enter(tester, 'account-repeat', 'new-password123');
        }
        await tap(tester, 'account-submit');
        expect(find.text('Check your current password.'), findsOneWidget);
        expect(
          field(tester, 'account-current').controller!.text,
          'old-password',
        );
        repo.fail = false;
        repo.pending = Completer<void>();
        await tap(tester, 'account-submit', settle: false);
        expect(field(tester, 'account-current').enabled, isFalse);
        await tester.binding.handlePopRoute();
        await tester.pump();
        expect(find.byType(AccountSecurityPage), findsOneWidget);
        repo.pending!.complete();
        await tester.pumpAndSettle();
        expect(find.byType(TextFormField), findsNothing);
        expect(find.text('old-password'), findsNothing);
        if (kind == 'email') {
          expect(repo.emailChanges.length, 2);
          expect(repo.emailChanges.last, (
            email: 'new@example.test',
            password: 'old-password',
          ));
          expect(find.text('Check your email.'), findsOneWidget);
          expect(find.text('new@example.test'), findsOneWidget);
          expect(
            find.text(
              'Open the verification link sent to your new address, then refresh Settings.',
            ),
            findsOneWidget,
          );
        } else {
          expect(repo.passwordChanges.length, 2);
          expect(repo.passwordChanges.last, (
            oldPassword: 'old-password',
            newPassword: 'new-password123',
          ));
          expect(find.text('Your password was updated.'), findsOneWidget);
        }
      },
    );

    testWidgets(
      '$kind with Google provider explains reauthentication and never asks for a current password',
      (tester) async {
        final repo = AccountSettings();
        await tester.pumpWidget(
          host(page(kind, repo, passwordProvider: false), language: 'en'),
        );
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('account-current')), findsNothing);
        expect(find.textContaining('You sign in with Google.'), findsOneWidget);
        if (kind == 'email') {
          await enter(tester, 'account-email', 'new@example.test');
        } else {
          await enter(tester, 'account-new', 'new-password123');
          await enter(tester, 'account-repeat', 'new-password123');
        }
        await tap(tester, 'account-submit');
        if (kind == 'email') {
          expect(repo.emailChanges.single.password, isEmpty);
        } else {
          expect(repo.passwordChanges.single.oldPassword, isEmpty);
        }
        expect(find.byKey(const ValueKey('account-done')), findsOneWidget);
      },
    );
  }

  testWidgets(
    'email rejects invalid or unchanged addresses and requires current password',
    (tester) async {
      final repo = AccountSettings();
      await tester.pumpWidget(host(page('email', repo), language: 'en'));
      await tester.pumpAndSettle();
      await enter(tester, 'account-email', 'bad');
      await tap(tester, 'account-submit');
      expect(repo.emailChanges, isEmpty);
      await enter(tester, 'account-email', 'TRAVELER@example.test');
      await enter(tester, 'account-current', 'password');
      await tap(tester, 'account-submit');
      expect(
        find.text('Enter an email address different from your current one.'),
        findsOneWidget,
      );
      expect(repo.emailChanges, isEmpty);
    },
  );

  testWidgets(
    'password rejects short, reused and mismatched values; each visibility toggle is independent',
    (tester) async {
      final repo = AccountSettings();
      await tester.pumpWidget(host(page('password', repo), language: 'en'));
      await tester.pumpAndSettle();
      await enter(tester, 'account-current', 'old-password');
      await enter(tester, 'account-new', 'short');
      await enter(tester, 'account-repeat', 'short');
      await tap(tester, 'account-submit');
      expect(repo.passwordChanges, isEmpty);
      await enter(tester, 'account-new', 'old-password');
      await enter(tester, 'account-repeat', 'old-password');
      await tap(tester, 'account-submit');
      expect(repo.passwordChanges, isEmpty);
      await enter(tester, 'account-new', 'new-password123');
      await enter(tester, 'account-repeat', 'mismatched123');
      await tap(tester, 'account-submit');
      expect(repo.passwordChanges, isEmpty);
      expect(field(tester, 'account-new').obscureText, isTrue);
      await tap(tester, 'toggle-new');
      expect(field(tester, 'account-new').obscureText, isFalse);
      expect(field(tester, 'account-current').obscureText, isTrue);
      expect(field(tester, 'account-repeat').obscureText, isTrue);
    },
  );

  for (final kind in ['profile', 'email', 'password']) {
    testWidgets('$kind protects edits from system and toolbar back', (
      tester,
    ) async {
      final repo = AccountSettings();
      await tester.pumpWidget(routed(page(kind, repo)));
      await tester.tap(find.text('Open account'));
      await tester.pumpAndSettle();
      final key = kind == 'profile'
          ? 'profile-username'
          : kind == 'email'
          ? 'account-email'
          : 'account-new';
      await enter(tester, key, 'changed');
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Discard changes?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(field(tester, key).controller!.text, 'changed');
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Leave without saving'));
      await tester.pumpAndSettle();
      expect(find.byType(AccountProfilePage), findsNothing);
      expect(find.byType(AccountSecurityPage), findsNothing);
      expect(repo.saves, 0);
      expect(repo.emailChanges, isEmpty);
      expect(repo.passwordChanges, isEmpty);
    });
  }
}
