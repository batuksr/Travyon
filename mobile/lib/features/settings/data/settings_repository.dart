import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart'
    show MissingPluginException, PlatformException;

import '../../../core/firebase/firebase_services.dart';
import '../../../core/firebase/firebase_environment.dart';
import '../../../core/firebase/auth_repository.dart';
import '../../community/data/community_repository.dart';
import 'settings_fields.dart';

/// Optional device metadata must not prevent access to cloud account settings.
/// Keep failures explicit so callers cannot overwrite or export missing data.
Future<Map<String, dynamic>> loadPassportMetadata(
  Future<String?> Function() read,
) async {
  try {
    final raw = await read();
    if (raw == null) return {'passport': <String, dynamic>{}};
    final decoded = jsonDecode(raw);
    if (decoded is! Map || decoded.keys.any((key) => key is! String)) {
      throw const FormatException('Invalid local passport metadata');
    }
    return {'passport': Map<String, dynamic>.from(decoded)};
  } catch (error) {
    return {
      'passportLoadError': error is FormatException
          ? 'Cihazdaki pasaport hatırlatıcısı okunamadı. Mevcut kayıt değiştirilmedi.'
          : settingsError(error),
    };
  }
}

abstract interface class SettingsRepository {
  Future<Map<String, dynamic>> load();
  Future<void> save(SettingsSection section, Map<String, dynamic> values);
  Future<void> photo(Uint8List jpeg);
  Future<void> changeEmail(String email, String password);
  Future<void> changePassword(String oldPassword, String newPassword);
  Future<void> deleteAccount(String password);
  Future<void> support(String subject, String message, {required bool bug});
  Future<List<Map<String, dynamic>>> payments();
  Future<String> exportData();
}

class FirebaseSettingsRepository implements SettingsRepository {
  FirebaseSettingsRepository(this.uid);
  final String uid;
  DocumentReference<Map<String, dynamic>> get _doc =>
      FirebaseServices.firestore.collection('users').doc(uid);
  User get _user {
    final user = FirebaseServices.auth.currentUser;
    if (user == null || user.uid != uid) {
      throw StateError('Oturum bulunamadı. Yeniden giriş yap.');
    }
    return user;
  }

  String get _passportKey => 'travyon-passport-$uid';
  final _local = SharedPreferencesAsync();
  Future<void> _call(String name, Map<String, dynamic> values) async {
    _user;
    await FirebaseServices.functions.httpsCallable(name).call<dynamic>(values);
  }

  @override
  Future<Map<String, dynamic>> load() async {
    await _user.reload();
    final user = _user;
    final snap = await _doc.get(const GetOptions(source: Source.server));
    final local = await loadPassportMetadata(
      () => _local.getString(_passportKey),
    );
    return {
      ...?snap.data(),
      'displayName': user.displayName ?? '',
      'email': user.email ?? '',
      'photoURL': snap.data()?['photoURL'] ?? user.photoURL,
      'passwordProvider': user.providerData.any(
        (p) => p.providerId == 'password',
      ),
      ...local,
    };
  }

  @override
  Future<void> save(
    SettingsSection section,
    Map<String, dynamic> values,
  ) async {
    _user;
    final patch = settingsPatch(section, values);
    for (final field in section.fields) {
      if (!field.toggle) {
        final error = validateSetting(field, '${patch[field.key]}');
        if (error != null) throw StateError(error);
        if (field.options != null &&
            !field.options!.containsKey(patch[field.key])) {
          throw StateError('Geçerli bir seçenek seç.');
        }
      }
    }
    if (section.id == 'passport') {
      await _local.setString(_passportKey, jsonEncode(patch));
      return;
    }
    if (section.id == 'dataPrivacy') {
      final community = FirebaseCommunityRepository();
      final existing = await community.privacy(uid);
      await community.savePrivacy({
        ...existing,
        'analyticsEnabled': patch['analyticsEnabled'] == true,
      });
      return;
    }
    if (section.id == 'profile') {
      await _user.updateDisplayName(patch['displayName'] as String);
    }
    await _doc.set(patch, SetOptions(merge: true));
    if (section.id == 'profile') {
      try {
        await _call('syncSharedPlansIdentity', {});
      } catch (_) {
        throw StateError(
          'Profil kaydedildi; topluluk kimliği güncellenemedi. Tekrar kaydetmeyi dene.',
        );
      }
    }
  }

  @override
  Future<void> photo(Uint8List jpeg) async {
    _user;
    if (jpeg.length >= 512 * 1024 ||
        jpeg.length < 3 ||
        jpeg[0] != 255 ||
        jpeg[1] != 216 ||
        jpeg[2] != 255) {
      throw StateError('512 KB altında bir JPEG fotoğraf seç.');
    }
    final ref = FirebaseServices.storage.ref('users/$uid/avatar.jpg');
    await ref.putData(jpeg, SettableMetadata(contentType: 'image/jpeg'));
    final url = await ref.getDownloadURL();
    await _user.updatePhotoURL(url);
    await _doc.set({'photoURL': url}, SetOptions(merge: true));
    await _call('syncSharedPlansIdentity', {});
  }

  Future<void> _reauth(String password) async {
    final user = _user;
    if (user.providerData.any((p) => p.providerId == 'password')) {
      await user.reauthenticateWithCredential(
        EmailAuthProvider.credential(email: user.email!, password: password),
      );
    } else if (user.providerData.any((p) => p.providerId == 'google.com')) {
      await FirebaseAuthRepository().reauthenticateGoogle(uid);
    } else if (user.providerData.any((p) => p.providerId == 'apple.com')) {
      await FirebaseAuthRepository().reauthenticateApple(uid);
    } else {
      throw StateError('Bu işlem için yeniden giriş yapmalısın.');
    }
    await _user.getIdToken(true);
  }

  @override
  Future<void> changeEmail(String email, String password) async {
    await _reauth(password);
    await _user.verifyBeforeUpdateEmail(email.trim());
  }

  @override
  Future<void> changePassword(String oldPassword, String newPassword) async {
    if (newPassword.length < 8 || newPassword == oldPassword) {
      throw StateError('En az 8 karakterlik farklı bir şifre seç.');
    }
    await _reauth(oldPassword);
    await _user.updatePassword(newPassword);
  }

  @override
  Future<void> deleteAccount(String password) async {
    // Hybrid development uses production Auth with local Firestore. Deleting
    // there would remove the real login but leave its cloud data behind.
    if (FirebaseEnvironment.usesEmulators) {
      throw StateError(
        'LOCAL modunda hesap silme kapalı. Gerçek hesabını ve tüm verilerini birlikte silmek için production ortamını kullan.',
      );
    }
    await _reauth(password);
    await _call('deleteMyAccount', {});
    try {
      await _local.remove(_passportKey);
    } finally {
      await FirebaseServices.auth.signOut();
    }
  }

  @override
  Future<void> support(
    String subject,
    String message, {
    required bool bug,
  }) async {
    final user = _user;
    await _call(
      bug ? 'submitBugReport' : 'submitContactMessage',
      bug
          ? {'title': subject, 'desc': message}
          : {
              'name': user.displayName?.isNotEmpty == true
                  ? user.displayName
                  : 'Gezgin',
              'email': user.email,
              'subject': subject,
              'message': message,
            },
    );
  }

  @override
  Future<List<Map<String, dynamic>>> payments() async {
    _user;
    final result = await FirebaseServices.firestore
        .collection('payments')
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .get();
    return result.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  @override
  Future<String> exportData() async {
    final user = _user;
    final profile = await load();
    if (profile['passportLoadError'] != null) {
      throw StateError(
        'Eksik veri dışa aktarılmadı. ${profile['passportLoadError']}',
      );
    }
    Future<List<Map<String, dynamic>>> collection(String name) async {
      final docs = await _doc
          .collection(name)
          .get(const GetOptions(source: Source.server));
      return docs.docs
          .where((d) => d.data()['deleted'] != true)
          .map((d) => {'id': d.id, ...d.data()})
          .toList();
    }

    final plans = await collection('plans');
    final wallet = await collection('wallet');
    return JsonEncoder.withIndent('  ', (object) {
      if (object is Timestamp) return object.toDate().toIso8601String();
      if (object is GeoPoint) {
        return {'lat': object.latitude, 'lng': object.longitude};
      }
      return object.toString();
    }).convert({
      'exportedAt': DateTime.now().toUtc().toIso8601String(),
      'account': {'uid': uid, 'email': user.email},
      'profile': profile,
      'savedPlans': plans,
      'wallet': wallet,
    });
  }
}

String settingsError(Object error) {
  if (error is MissingPluginException ||
      (error is PlatformException && error.code == 'channel-error')) {
    return 'Cihaz eklentisi yüklenemedi. Flutter terminalinde q ile uygulamayı kapatıp flutter run komutuyla yeniden başlat. Hot reload veya R yeterli değildir.';
  }
  if (error is PlatformException) {
    return 'Cihaz işlemi tamamlanamadı (${error.code}). Uygulamayı tamamen kapatıp yeniden başlat.';
  }
  if (error is AuthFailure) return error.message;
  if (error is StateError) return error.message.toString();
  if (error is FirebaseException) {
    return switch (error.code) {
      'invalid-credential' || 'wrong-password' => 'Mevcut şifreni kontrol et.',
      'invalid-email' => 'Geçerli bir e-posta adresi gir.',
      'email-already-in-use' => 'Bu e-posta başka bir hesapta kullanılıyor.',
      'requires-recent-login' =>
        'Güvenlik için yeniden giriş yapıp tekrar dene.',
      'failed-precondition' => 'İşlem önkoşulları sağlanmadı. Hesap silerken aktif aboneliğin olmamalı ve yeniden doğrulama tamamlanmalı.',
      'weak-password' => 'Daha güçlü bir şifre seç.',
      'resource-exhausted' ||
      'too-many-requests' => 'Biraz bekleyip tekrar dene.',
      _ => 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.',
    };
  }
  return 'İşlem tamamlanamadı. Tekrar dene.';
}
