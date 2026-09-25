import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/notifications/data/mobile_push_controller.dart';
import 'package:travyon/features/notifications/presentation/mobile_push_page.dart';

class Device implements PushDeviceClient {
  PushPermission status = PushPermission.allowed;
  int prompts = 0, tokens = 0, deletes = 0;
  bool failDelete = false;
  Completer<String>? delayed;
  @override
  Future<PushPermission> permission({required bool request}) async {
    if (request) prompts++;
    return status;
  }

  @override
  Future<String> token() async {
    tokens++;
    return delayed == null ? 'test-token' : delayed!.future;
  }

  @override
  Future<void> deleteToken() async {
    if (failDelete) throw StateError('offline');
    deletes++;
  }
}

class Store implements PushRegistrationStore {
  final consentValues = <String, bool>{};
  String? saved, owner;
  int registrations = 0, tests = 0;
  bool failRegister = false, failRemove = false;
  @override
  Future<bool> consent(String uid) async => consentValues[uid] ?? false;
  @override
  Future<void> setConsent(String uid, bool enabled) async {
    consentValues[uid] = enabled;
  }

  @override
  Future<String?> lastToken() async => saved;
  @override
  Future<void> saveToken(String? token) async {
    saved = token;
  }

  @override
  Future<void> register(String uid, String token) async {
    if (failRegister) throw StateError('Sunucu hazır değil.');
    registrations++;
    owner = uid;
  }

  @override
  Future<void> unregister(String uid, String token) async {
    if (failRemove) throw StateError('offline');
    if (owner == uid) owner = null;
  }

  @override
  Future<void> sendTest(String uid, String token) async {
    tests++;
  }
}

void main() {
  late Device device;
  late Store store;
  late MobilePushController controller;
  String? uid;
  setUp(() {
    uid = 'alice';
    device = Device();
    store = Store();
    controller = MobilePushController(
      device: device,
      store: store,
      currentUid: () => uid,
      available: true,
      unavailableReason: 'LOCAL kapalı',
    );
  });
  tearDown(() => controller.dispose());

  test(
    'refresh does not prompt or register without explicit consent',
    () async {
      await controller.refresh('alice');
      expect(device.prompts, 0);
      expect(device.tokens, 0);
      expect(store.registrations, 0);
      expect(controller.enabled, false);
    },
  );
  test('denied permission does not acquire a token', () async {
    device.status = PushPermission.denied;
    expect(await controller.enable('alice'), false);
    expect(device.tokens, 0);
    expect(store.registrations, 0);
  });
  test(
    'enable, test, disable and repeat refresh respect per-user consent',
    () async {
      expect(await controller.enable('alice'), true);
      expect(controller.enabled, true);
      expect(store.owner, 'alice');
      expect(await controller.test('alice'), true);
      expect(store.tests, 1);
      expect(await controller.disable('alice'), true);
      await controller.refresh('alice');
      expect(controller.enabled, false);
      expect(store.owner, null);
      expect(store.saved, null);
      expect(device.deletes, 1);
      uid = 'bob';
      await controller.refresh('bob');
      expect(store.registrations, 1);
    },
  );
  test('failed registration stays disabled and can be retried', () async {
    store.failRegister = true;
    expect(await controller.enable('alice'), false);
    expect(controller.enabled, false);
    expect(controller.error, contains('Sunucu'));
    store.failRegister = false;
    expect(await controller.refresh('alice'), true);
    expect(controller.enabled, true);
    expect(device.prompts, 1);
  });
  test('disable waits for in-flight registration, then removes it', () async {
    device.delayed = Completer<String>();
    final enable = controller.enable('alice');
    await Future<void>.delayed(Duration.zero);
    final disable = controller.disable('alice');
    device.delayed!.complete('late-token');
    await enable;
    await disable;
    expect(controller.enabled, false);
    expect(store.owner, null);
    expect(await store.consent('alice'), false);
  });
  test('session changes reject late registration', () async {
    device.delayed = Completer<String>();
    final pending = controller.enable('alice');
    await Future<void>.delayed(Duration.zero);
    uid = 'bob';
    device.delayed!.complete('late-token');
    expect(await pending, false);
    expect(store.registrations, 0);
  });
  test('OS permission revocation removes the binding on resume', () async {
    await controller.enable('alice');
    device.status = PushPermission.denied;
    await controller.refresh('alice');
    expect(controller.enabled, false);
    expect(store.owner, null);
  });
  test(
    'network failure falls back to token revocation; double failure is visible',
    () async {
      await controller.enable('alice');
      store.failRemove = true;
      device.failDelete = true;
      expect(await controller.disable('alice'), false);
      expect(store.saved, isNotNull);
      expect(controller.error, contains('kapatılamadı'));
      device.failDelete = false;
      expect(await controller.disable('alice'), true);
      expect(store.saved, null);
      expect(controller.enabled, false);
    },
  );
  test('logout cleanup succeeds without a registered token on iOS', () async {
    device.failDelete = true;
    expect(await controller.disable('alice'), true);
    expect(await store.consent('alice'), false);
    expect(store.saved, isNull);
    expect(controller.enabled, false);
    expect(store.registrations, 0);
  });
  testWidgets('local rollout is disabled without touching device or store', (
    tester,
  ) async {
    final local = MobilePushController(
      device: device,
      store: store,
      currentUid: () => uid,
      available: false,
      unavailableReason: 'LOCAL modunda kapalı',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: MobilePushPage(uid: 'alice', controller: local),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('LOCAL modunda kapalı'), findsOneWidget);
    expect(find.byType(Switch), findsNothing);
    expect(device.tokens, 0);
    expect(device.prompts, 0);
    await tester.pumpWidget(const SizedBox());
    local.dispose();
  });
  testWidgets(
    'narrow screen shows honest server error, not a successful enable',
    (tester) async {
      tester.view.physicalSize = const Size(360, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      store.failRegister = true;
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.3)),
            child: child!,
          ),
          home: MobilePushPage(uid: 'alice', controller: controller),
        ),
      );
      await tester.pumpAndSettle();
      expect(controller.busy, false);
      expect(tester.widget<Switch>(find.byType(Switch)).onChanged, isNotNull);
      await tester.ensureVisible(find.text('Telefon bildirimlerini aç'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Telefon bildirimlerini aç'));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();
      expect(device.prompts, 1);
      expect(controller.enabled, false);
      expect(controller.error, 'Sunucu hazır değil.');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
