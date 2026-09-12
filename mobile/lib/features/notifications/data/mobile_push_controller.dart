import 'package:flutter/foundation.dart';

enum PushPermission { allowed, denied, undecided }

abstract interface class PushDeviceClient {
  Future<PushPermission> permission({required bool request});
  Future<String> token();
  Future<void> deleteToken();
}

abstract interface class PushRegistrationStore {
  Future<bool> consent(String uid);
  Future<void> setConsent(String uid, bool enabled);
  Future<String?> lastToken();
  Future<void> saveToken(String? token);
  Future<void> register(String uid, String token);
  Future<void> unregister(String uid, String token);
  Future<void> sendTest(String uid, String token);
}

/// Serializes permission, refresh and logout so a late token cannot re-enable
/// notifications after the user has turned them off. No automatic permission
/// prompt: only the explicit enable action may ask the operating system.
class MobilePushController extends ChangeNotifier {
  MobilePushController({
    required this.device,
    required this.store,
    required this.currentUid,
    required this.available,
    required this.unavailableReason,
  });
  final PushDeviceClient device;
  final PushRegistrationStore store;
  final String? Function() currentUid;
  final bool available;
  final String unavailableReason;
  bool busy = false, enabled = false;
  String? error;
  PushPermission permission = PushPermission.undecided;
  Future<void>? _tail;

  Future<bool> _run(Future<void> Function() task) {
    final operation = (_tail ?? Future<void>.value()).then((_) async {
      busy = true;
      error = null;
      notifyListeners();
      try {
        await task();
        return true;
      } catch (e) {
        error = e is StateError ? e.message.toString() : 'Bildirim işlemi tamamlanamadı. İnternetini ve Firebase bildirim yapılandırmasını kontrol edip tekrar dene.';
        return false;
      } finally {
        busy = false;
        notifyListeners();
      }
    });
    _tail = operation.then((_) {});
    return operation;
  }

  void _check(String uid) {
    if (!available) throw StateError(unavailableReason);
    if (currentUid() != uid) {
      throw StateError('Oturum değişti. Yeniden giriş yap.');
    }
  }

  Future<bool> enable(String uid) => _run(() async {
    _check(uid);
    permission = await device.permission(request: true);
    if (permission != PushPermission.allowed) {
      throw StateError(
        'Telefonun bildirim izni kapalı. Telefon Ayarları → Travyon → Bildirimler bölümünden izin ver.',
      );
    }
    await store.setConsent(uid, true);
    await _register(uid);
    _check(uid);
    enabled = true;
  });

  Future<void> _register(String uid) async {
    final token = await device.token();
    _check(uid);
    final old = await store.lastToken();
    // Remember before the network write so a failed/ambiguous write can still
    // be cleaned up on disable. A rotated old token is already invalid in FCM.
    await store.saveToken(token);
    _check(uid);
    await store.register(uid, token);
    if (old != null && old != token) {
      await store.unregister(uid, old);
    }
  }

  Future<bool> refresh(String uid) => _run(() async {
    enabled = false;
    if (!available) return;
    _check(uid);
    permission = await device.permission(request: false);
    if (!await store.consent(uid)) return;
    if (permission != PushPermission.allowed) {
      await _disable(uid);
      return;
    }
    await _register(uid);
    enabled = true;
  });

  Future<bool> disable(String uid) => _run(() => _disable(uid));

  Future<void> _disable(String uid) async {
    if (!available) {
      enabled = false;
      return;
    }
    _check(uid);
    await store.setConsent(uid, false);
    bool removed = false, revoked = false;
    try {
      final token = await store.lastToken();
      if (token != null) {
        await store.unregister(uid, token);
        removed = true;
      }
    } catch (_) {
      /* Token revocation below also makes delivery impossible. */
    }
    try {
      await device.deleteToken();
      revoked = true;
    } catch (_) {
      /* Successful server removal is sufficient for our sender. */
    }
    if (!removed && !revoked) {
      throw StateError(
        'Cihaz kaydı kapatılamadı. İnternete bağlanıp tekrar dene; çıkıştan önce bildirim kaydı temizlenmeli.',
      );
    }
    await store.saveToken(null);
    enabled = false;
  }

  Future<bool> test(String uid) => _run(() async {
    _check(uid);
    if (!enabled) throw StateError('Önce bu cihazda bildirimleri etkinleştir.');
    permission = await device.permission(request: false);
    if (permission != PushPermission.allowed) {
      await _disable(uid);
      throw StateError('Telefonun bildirim izni kapalı.');
    }
    final token = await store.lastToken();
    if (token == null) {
      throw StateError('Cihaz kaydı bulunamadı. Bildirimleri yeniden aç.');
    }
    await store.sendTest(uid, token);
  });
}
