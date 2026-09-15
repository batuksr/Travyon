import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/community/presentation/community_page.dart';
import 'package:travyon/features/notifications/data/mobile_push_controller.dart';
import 'package:travyon/features/notifications/presentation/mobile_push_page.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';
import 'package:travyon/features/settings/presentation/privacy_widgets.dart';

import 'account_pages_test.dart' show AccountSettings, tap;
import 'community_test.dart' show FakeCommunity;
import 'mobile_push_test.dart' show Device, Store;
import 'settings_test.dart' show section;
import 'welcome_screen_test.dart' show host;

class PrivacyRepository extends FakeCommunity {
  bool loadFails = false, saveFails = false;
  int loads = 0, saves = 0;
  Completer<void>? pending;
  @override
  Future<Map<String, bool>> privacy(String uid) async {
    loads++;
    if (loadFails) throw StateError('Bağlantı yok.');
    return {
      'profilePublic': false,
      'plansPublic': false,
      'followPublic': false,
      'locationEnabled': true,
      'locationHistory': true,
      'analyticsEnabled': true,
    };
  }

  @override
  Future<void> savePrivacy(Map<String, bool> values) async {
    saves++;
    await pending?.future;
    if (saveFails) throw StateError('Kaydedilemedi; tekrar dene.');
    await super.savePrivacy(values);
  }
}

class TestPushStore extends Store {
  bool failTest = false;
  Completer<void>? pendingTest;
  @override
  Future<void> sendTest(String uid, String token) async {
    await super.sendTest(uid, token);
    await pendingTest?.future;
    if (failTest) throw StateError('Test gönderilemedi.');
  }
}

Switch switchAt(WidgetTester tester, String key) => tester.widget<Switch>(
  find.descendant(of: find.byKey(ValueKey(key)), matching: find.byType(Switch)),
);

Future<void> toggle(WidgetTester tester, String key) async {
  final target = find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byType(Switch),
  );
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  for (final kind in ['notifications', 'dataPrivacy', 'community', 'push']) {
    for (final language in ['tr', 'en']) {
      for (final size in [const Size(320, 640), const Size(640, 360)]) {
        testWidgets('$kind fits $language $size with 200% text', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final settings = AccountSettings();
          final community = PrivacyRepository();
          final device = Device();
          final store = Store();
          final push = MobilePushController(
            device: device,
            store: store,
            currentUid: () => 'me',
            available: true,
            unavailableReason: 'Unavailable',
          );
          addTearDown(push.dispose);
          addTearDown(community.events.close);
          final page = switch (kind) {
            'community' => CommunityPrivacyPage(
              uid: 'me',
              repository: community,
            ),
            'push' => MobilePushPage(uid: 'me', controller: push),
            _ => SettingsEditor(section: section(kind), repository: settings),
          };
          await tester.pumpWidget(host(page, language: language, scale: 2));
          await tester.pumpAndSettle();
          final title = switch (kind) {
            'community' => 'Ne paylaşacağına sen karar ver.',
            'push' => 'Önemli anları kaçırma.',
            'notifications' => 'Sana neyi hatırlatalım?',
            _ => 'Verilerin, senin kontrolünde.',
          };
          expect(
            find.text(AppLocalizations(Locale(language)).text(title)),
            findsOneWidget,
          );
          final switches = find.byType(PrivacyToggleCard);
          expect(switches, findsWidgets);
          for (final element in switches.evaluate().toList()) {
            await tester.ensureVisible(find.byWidget(element.widget));
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
          }
          await tester.ensureVisible(
            find.byKey(
              ValueKey(switch (kind) {
                'push' => 'push-clear',
                'community' => 'community-privacy-save',
                _ => 'privacy-save',
              }),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(device.prompts, 0);
          expect(store.tests, 0);
          expect(settings.saves, 0);
          expect(community.saves, 0);
        });
      }
    }
  }

  for (final kind in ['notifications', 'dataPrivacy', 'community']) {
    testWidgets(
      '$kind never writes defaults after a load failure and can retry',
      (tester) async {
        final settings = AccountSettings()..loadFails = true;
        final community = PrivacyRepository()..loadFails = true;
        addTearDown(community.events.close);
        await tester.pumpWidget(
          host(
            kind == 'community'
                ? CommunityPrivacyPage(uid: 'me', repository: community)
                : SettingsEditor(section: section(kind), repository: settings),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(Switch), findsNothing);
        expect(find.byKey(const ValueKey('privacy-save')), findsNothing);
        expect(
          find.byKey(const ValueKey('community-privacy-save')),
          findsNothing,
        );
        settings.loadFails = false;
        community.loadFails = false;
        await tester.tap(find.text('Tekrar dene'));
        await tester.pumpAndSettle();
        expect(find.byType(Switch), findsWidgets);
        expect(kind == 'community' ? community.loads : settings.loads, 2);
        expect(settings.saves, 0);
        expect(community.saves, 0);
      },
    );

    testWidgets(
      '$kind guards unsaved/back/busy state and preserves unrelated preferences',
      (tester) async {
        final settings = AccountSettings()..fail = true;
        final community = PrivacyRepository()..saveFails = true;
        addTearDown(community.events.close);
        final page = kind == 'community'
            ? CommunityPrivacyPage(uid: 'me', repository: community)
            : SettingsEditor(section: section(kind), repository: settings);
        await tester.pumpWidget(
          host(
            Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(builder: (_) => page),
                  ),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final key = switch (kind) {
          'community' => 'community-profilePublic',
          'notifications' => 'privacy-appPlanNotif',
          _ => 'privacy-analyticsEnabled',
        };
        await toggle(tester, key);
        final value = switchAt(tester, key).value;
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(find.text('Değişikliklerden vazgeç?'), findsOneWidget);
        await tester.tap(find.text('Düzenlemeye dön'));
        await tester.pumpAndSettle();
        final save = kind == 'community'
            ? 'community-privacy-save'
            : 'privacy-save';
        await tap(tester, save);
        expect(
          find.text(
            kind == 'community'
                ? communityError(StateError('Kaydedilemedi; tekrar dene.'))
                : 'Kaydedilemedi; tekrar dene.',
          ),
          findsOneWidget,
        );
        expect(switchAt(tester, key).value, value);
        expect(settings.lastSave, isNull);
        expect(community.savedPrivacy, isNull);
        settings.fail = false;
        community.saveFails = false;
        final pending = Completer<void>();
        settings.pending = pending;
        community.pending = pending;
        await tap(tester, save, settle: false);
        expect(switchAt(tester, key).onChanged, isNull);
        await tester.binding.handlePopRoute();
        await tester.pump();
        expect(find.text('Değişikliklerden vazgeç?'), findsNothing);
        expect(find.byType(Switch), findsWidgets);
        pending.complete();
        await tester.pumpAndSettle();
        if (kind == 'community') {
          expect(community.savedPrivacy, {
            'profilePublic': true,
            'plansPublic': false,
            'followPublic': false,
            'locationEnabled': true,
            'locationHistory': true,
            'analyticsEnabled': true,
          });
          expect(community.saves, 2);
          expect(find.text('Open'), findsOneWidget);
        } else {
          expect(
            settings.lastSave!.keys.toSet(),
            section(kind).fields.map((f) => f.key).toSet(),
          );
          expect(
            settings.lastSave![kind == 'notifications'
                ? 'appPlanNotif'
                : 'analyticsEnabled'],
            value,
          );
          expect(settings.saves, 2);
          expect(find.text('Değişikliklerin kaydedildi.'), findsOneWidget);
        }
      },
    );
  }

  testWidgets(
    'notification groups describe inactive email delivery in English',
    (tester) async {
      final settings = AccountSettings();
      await tester.pumpWidget(
        host(
          SettingsEditor(
            section: section('notifications'),
            repository: settings,
          ),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('App notifications'), findsOneWidget);
      expect(find.text('Email notifications'), findsOneWidget);
      expect(
        find.text(
          'You can save your preferences; email delivery is not active yet.',
        ),
        findsOneWidget,
      );
      expect(find.byType(Switch), findsNWidgets(6));
      await toggle(tester, 'privacy-emailPromoNotif');
      await tap(tester, 'privacy-save');
      expect(settings.lastSave!['emailPromoNotif'], isTrue);
      expect(settings.lastSave!.containsKey('pushEnabled'), isFalse);
    },
  );

  testWidgets(
    'community keeps link-only warning visible and does not claim to unpublish',
    (tester) async {
      final repo = PrivacyRepository();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          CommunityPrivacyPage(uid: 'me', repository: repo),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('When sharing is off'), findsOneWidget);
      expect(
        find.textContaining('anyone with the link can open them'),
        findsOneWidget,
      );
      expect(
        find.text(
          'Your wallet entries and personal notes are not shared with the community.',
        ),
        findsOneWidget,
      );
      await toggle(tester, 'community-plansPublic');
      expect(find.text('When sharing is off'), findsNothing);
      expect(repo.saves, 0);
    },
  );

  testWidgets(
    'push shows denied permission and never sends without explicit enable',
    (tester) async {
      final device = Device()..status = PushPermission.denied;
      final store = Store();
      final push = MobilePushController(
        device: device,
        store: store,
        currentUid: () => 'me',
        available: true,
        unavailableReason: 'Unavailable',
      );
      addTearDown(push.dispose);
      await tester.pumpWidget(
        host(
          MobilePushPage(uid: 'me', controller: push),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('System permission is off'), findsOneWidget);
      expect(device.prompts, 0);
      expect(store.tests, 0);
      await toggle(tester, 'push-enabled');
      expect(device.prompts, 1);
      expect(push.enabled, isFalse);
      expect(store.registrations, 0);
      expect(find.textContaining('Settings'), findsWidgets);
    },
  );

  testWidgets(
    'push test reports acceptance not delivery; refresh clears stale status; failure keeps retry',
    (tester) async {
      final device = Device();
      final store = TestPushStore();
      final push = MobilePushController(
        device: device,
        store: store,
        currentUid: () => 'me',
        available: true,
        unavailableReason: 'Unavailable',
      );
      addTearDown(push.dispose);
      await tester.pumpWidget(
        host(
          MobilePushPage(uid: 'me', controller: push),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      expect(device.prompts, 0);
      final testButton = find.descendant(
        of: find.byKey(const ValueKey('push-test')),
        matching: find.byType(FilledButton),
      );
      expect(tester.widget<FilledButton>(testButton).onPressed, isNull);
      await toggle(tester, 'push-enabled');
      expect(push.enabled, isTrue);
      expect(device.prompts, 1);
      store.pendingTest = Completer<void>();
      await tap(tester, 'push-test', settle: false);
      expect(store.tests, 1);
      expect(tester.widget<FilledButton>(testButton).onPressed, isNull);
      expect(switchAt(tester, 'push-enabled').onChanged, isNull);
      store.pendingTest!.complete();
      await tester.pumpAndSettle();
      expect(
        find.textContaining('does not guarantee delivery'),
        findsOneWidget,
      );
      await tap(tester, 'push-refresh');
      expect(find.textContaining('does not guarantee delivery'), findsNothing);
      expect(device.prompts, 1);
      store.pendingTest = null;
      store.failTest = true;
      await tap(tester, 'push-test');
      expect(find.text('Test gönderilemedi.'), findsOneWidget);
      expect(find.textContaining('does not guarantee delivery'), findsNothing);
      store.failTest = false;
      await tap(tester, 'push-test');
      expect(store.tests, 3);
      expect(
        find.textContaining('does not guarantee delivery'),
        findsOneWidget,
      );
      await tap(tester, 'push-clear');
      expect(push.enabled, isFalse);
      expect(store.saved, isNull);
    },
  );
}
