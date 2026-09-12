import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/firebase/firebase_environment.dart';
import '../../../core/firebase/firebase_services.dart';
import 'mobile_push_controller.dart';

/// App-lifetime service. In tests no instance is created and no Firebase or
/// platform channel is touched by the settings/hub widgets.
abstract final class FirebaseMobilePush {
  static MobilePushController? controller;
  static final opened = StreamController<void>.broadcast();
  static final foreground = StreamController<void>.broadcast();
  static bool pendingOpen = false;
  static const _configured = bool.fromEnvironment('TRAVYON_PUSH_ENABLED');

  static Future<void> initialize() async {
    if (controller != null) return;
    final available =
        _configured &&
        !FirebaseEnvironment.usesEmulators &&
        !kIsWeb &&
        (defaultTargetPlatform == TargetPlatform.android ||
            defaultTargetPlatform == TargetPlatform.iOS);
    controller = MobilePushController(
      device: _FirebasePushDevice(),
      store: _FirebasePushStore(),
      currentUid: () => FirebaseServices.auth.currentUser?.uid,
      available: available,
      unavailableReason: FirebaseEnvironment.usesEmulators
          ? 'LOCAL modunda telefon bildirimleri kapalı. Uygulama içindeki hatırlatmalar çalışmaya devam eder.'
          : 'Bu derlemede telefon bildirimleri etkin değil. Önce Firebase ve cihaz kurulumu tamamlanmalı.',
    );
    if (!available) return;
    // Existing production callables enforce App Check. Debug providers need
    // their device token registered in Firebase Console, never in source code.
    await FirebaseAppCheck.instance.activate(
      providerAndroid: kDebugMode
          ? const AndroidDebugProvider()
          : const AndroidPlayIntegrityProvider(),
      providerApple: kDebugMode
          ? const AppleDebugProvider()
          : const AppleDeviceCheckProvider(),
    );
    FirebaseMessaging.instance.onTokenRefresh.listen(
      (_) {
        final user = FirebaseServices.auth.currentUser;
        if (user != null && user.emailVerified) {
          unawaited(controller!.refresh(user.uid));
        }
      },
      onError: (Object _) {
        /* Retry is available in settings/on resume. */
      },
    );
    FirebaseMessaging.onMessage.listen((message) {
      if (controller!.enabled && message.data['screen'] == 'notifications') {
        foreground.add(null);
      }
    });
    void open(RemoteMessage message) {
      if (message.data['screen'] != 'notifications') return;
      pendingOpen = true;
      opened.add(null);
    }

    FirebaseMessaging.onMessageOpenedApp.listen(open);
    FirebaseMessaging.instance
        .getInitialMessage()
        .then((message) {
          if (message != null) open(message);
        })
        .catchError((Object _) {});
  }
}

class _FirebasePushDevice implements PushDeviceClient {
  FirebaseMessaging get _messaging => FirebaseMessaging.instance;
  @override
  Future<PushPermission> permission({required bool request}) async {
    final settings = request
        ? await _messaging.requestPermission(
            alert: true,
            badge: true,
            sound: true,
          )
        : await _messaging.getNotificationSettings();
    return switch (settings.authorizationStatus) {
      AuthorizationStatus.authorized ||
      AuthorizationStatus.provisional => PushPermission.allowed,
      AuthorizationStatus.denied => PushPermission.denied,
      _ => PushPermission.undecided,
    };
  }

  @override
  Future<String> token() async {
    // Keep auto-init disabled: explicit getToken only after user consent.
    if (defaultTargetPlatform == TargetPlatform.iOS &&
        await _messaging.getAPNSToken() == null) {
      throw StateError(
        'iPhone bildirim kaydı hazır değil. APNs anahtarını ve Xcode Push Notifications yetkisini kontrol edip tekrar dene.',
      );
    }
    final token = await _messaging.getToken();
    if (token == null) {
      throw StateError('Cihaz bildirime kaydedilemedi. Tekrar dene.');
    }
    return token;
  }

  @override
  Future<void> deleteToken() => _messaging.deleteToken();
}

class _FirebasePushStore implements PushRegistrationStore {
  final _prefs = SharedPreferencesAsync();
  static const _tokenKey = 'travyon-push-device-token';
  @override
  Future<bool> consent(String uid) async =>
      await _prefs.getBool('travyon-push-consent-$uid') ?? false;
  @override
  Future<void> setConsent(String uid, bool enabled) =>
      _prefs.setBool('travyon-push-consent-$uid', enabled);
  @override
  Future<String?> lastToken() => _prefs.getString(_tokenKey);
  @override
  Future<void> saveToken(String? token) => token == null
      ? _prefs.remove(_tokenKey)
      : _prefs.setString(_tokenKey, token);
  Future<void> _call(String uid, String action, String token) async {
    try {
      await FirebaseServices.functions
          .httpsCallable('mobilePushAction')
          .call<void>({
            'expectedUid': uid,
            'action': action,
            'token': token,
            'platform': defaultTargetPlatform == TargetPlatform.iOS
                ? 'ios'
                : 'android',
          });
    } on FirebaseFunctionsException catch (e) {
      throw StateError(switch (e.code) {
        'failed-precondition' => 'Bildirim kaydı hazır değil. Sunucuda MOBILE_PUSH_ENABLED ayarını ve cihaz kaydını kontrol et.',
        'not-found' ||
        'unimplemented' => 'Bildirim sunucusu henüz yayınlanmamış.',
        'unauthenticated' || 'permission-denied' => 'Bildirim doğrulaması başarısız. Oturumunu ve Firebase App Check kurulumunu kontrol et.',
        'resource-exhausted' =>
          'Çok sık deneme yapıldı. Biraz sonra tekrar dene.',
        _ => 'Bildirim sunucusuna ulaşılamadı. İnternetini kontrol edip tekrar dene.',
      });
    }
  }

  @override
  Future<void> register(String uid, String token) =>
      _call(uid, 'register', token);
  @override
  Future<void> unregister(String uid, String token) =>
      _call(uid, 'unregister', token);
  @override
  Future<void> sendTest(String uid, String token) => _call(uid, 'test', token);
}
