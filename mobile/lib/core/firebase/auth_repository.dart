import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../firebase_options.dart';
import 'firebase_services.dart';
import '../../features/notifications/data/firebase_mobile_push.dart';

class AuthSession {
  const AuthSession({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.emailVerified,
  });

  final String uid;
  final String email;
  final String displayName;
  final bool emailVerified;
}

abstract interface class AuthRepository {
  Stream<AuthSession?> watchSession();
  Future<void> signIn({required String email, required String password});
  Future<void> signInWithGoogle();
  Future<void> signInWithApple();
  Future<void> register({
    required String name,
    required String email,
    required String password,
  });
  Future<void> sendPasswordReset(String email);
  Future<void> sendEmailVerification();
  Future<void> refreshSession();
  Future<void> signOut();
}

class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository({
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
    GoogleSignIn? googleSignIn,
  }) : _auth = auth ?? FirebaseServices.auth,
       _firestore = firestore ?? FirebaseServices.firestore,
       _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final GoogleSignIn _googleSignIn;
  // Share initialization for the SDK singleton, but keep injected clients isolated.
  static final _googleInitializations = Expando<Future<void>>();
  final _profileSyncs = <String, Future<void>>{};

  @override
  Stream<AuthSession?> watchSession() => _auth.userChanges().map(_toSession);

  @override
  Future<void> signIn({required String email, required String password}) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      _syncUserDocument(credential.user, recordConsent: false);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> signInWithGoogle() async {
    try {
      await _initializeGoogleSignIn();
      final googleUser = await _googleSignIn.authenticate();
      final idToken = googleUser.authentication.idToken;
      if (idToken == null) {
        throw const AuthFailure(
          'Google hesabından güvenli giriş bilgisi alınamadı.',
        );
      }

      final credential = GoogleAuthProvider.credential(idToken: idToken);
      final result = await _auth.signInWithCredential(credential);
      _syncUserDocument(result.user, recordConsent: true);
    } on GoogleSignInException catch (error) {
      throw AuthFailure(_messageForGoogle(error.code));
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> signInWithApple() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      throw const AuthFailure(
        'Apple ile giriş yalnızca iPhone ve iPad’de kullanılabilir.',
      );
    }
    try {
      final provider = AppleAuthProvider()
        ..addScope('email')
        ..addScope('name');
      final result = await _auth.signInWithProvider(provider);
      _syncUserDocument(result.user, recordConsent: true);
    } on FirebaseAuthException catch (error) {
      if (error.code == 'web-context-canceled' ||
          error.code == 'web-context-cancelled' ||
          error.code == 'canceled' ||
          error.code == 'cancelled') {
        throw const AuthFailure('Apple ile giriş iptal edildi.');
      }
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await credential.user?.updateDisplayName(name.trim());
      _syncUserDocument(
        credential.user,
        recordConsent: true,
        preferredName: name,
      );
      await credential.user?.sendEmailVerification();
      await credential.user?.reload();
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> sendEmailVerification() async {
    final user = _auth.currentUser;
    if (user == null) throw const AuthFailure('Oturum bulunamadı.');
    try {
      await user.sendEmailVerification();
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> refreshSession() async {
    try {
      await _auth.currentUser?.reload();
      _syncUserDocument(_auth.currentUser, recordConsent: false);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> signOut() async {
    final uid = _auth.currentUser?.uid;
    final push = FirebaseMobilePush.controller;
    if (uid != null && push != null && push.available) {
      if (!await push.disable(uid)) {
        throw AuthFailure(
          push.error ?? 'Bildirim cihaz kaydı kapatılamadı. Tekrar dene.',
        );
      }
    }
    await _auth.signOut();
  }

  /// Reauthenticate the existing account; never switch Firebase users when a
  /// different Google account is selected in a sensitive settings operation.
  Future<void> reauthenticateGoogle(String expectedUid) async {
    final user = _auth.currentUser;
    if (user == null || user.uid != expectedUid) {
      throw const AuthFailure('Oturum değişti. Yeniden giriş yap.');
    }
    await _initializeGoogleSignIn();
    final googleUser = await _googleSignIn.authenticate();
    final token = googleUser.authentication.idToken;
    if (token == null) {
      throw const AuthFailure('Google doğrulaması tamamlanamadı.');
    }
    await user.reauthenticateWithCredential(
      GoogleAuthProvider.credential(idToken: token),
    );
  }

  Future<void> reauthenticateApple(String expectedUid) async {
    final user = _auth.currentUser;
    if (user == null || user.uid != expectedUid) {
      throw const AuthFailure('Oturum değişti. Yeniden giriş yap.');
    }
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      throw const AuthFailure(
        'Apple doğrulaması yalnızca iPhone ve iPad’de kullanılabilir.',
      );
    }
    await user.reauthenticateWithProvider(AppleAuthProvider());
  }

  Future<void> _initializeGoogleSignIn() {
    return _googleInitializations[_googleSignIn] ??= _googleSignIn.initialize(
      clientId: defaultTargetPlatform == TargetPlatform.iOS
          ? DefaultFirebaseOptions.ios.iosClientId
          : null,
    );
  }

  AuthSession? _toSession(User? user) {
    if (user == null) return null;
    return AuthSession(
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName?.trim() ?? '',
      emailVerified: user.emailVerified,
    );
  }

  /// Authentication has already succeeded. As on web, a profile database
  /// outage must not leave the signed-in user on a failed Google/login form.
  /// Data screens retain their own connection/error states. A later sign-in or
  /// session refresh retries profile creation; existing profiles are untouched.
  void _syncUserDocument(
    User? user, {
    required bool recordConsent,
    String? preferredName,
  }) {
    if (user == null || _profileSyncs.containsKey(user.uid)) return;
    final sync =
        _ensureUserDocument(
              user,
              recordConsent: recordConsent,
              preferredName: preferredName,
            )
            .catchError((Object error) {
              // Do not print exception messages, tokens, email addresses or user IDs.
              final reason = error is FirebaseException
                  ? switch (error.code) {
                      'unavailable' => 'unavailable',
                      'permission-denied' => 'permission-denied',
                      'unauthenticated' => 'unauthenticated',
                      'deadline-exceeded' => 'timeout',
                      _ => 'profile-sync-error',
                    }
                  : error is TimeoutException
                  ? 'timeout'
                  : 'profile-sync-error';
              debugPrint('Travyon: Profil eşitlemesi ertelendi ($reason).');
            })
            .whenComplete(() {
              _profileSyncs.remove(user.uid);
            });
    _profileSyncs[user.uid] = sync;
    unawaited(sync);
  }

  Future<void> _ensureUserDocument(
    User user, {
    required bool recordConsent,
    String? preferredName,
  }) async {
    if (_auth.currentUser?.uid != user.uid) return;
    final reference = _firestore.collection('users').doc(user.uid);
    // Server-backed transaction: an offline cache miss is not proof that an
    // account is new, and another device may create its profile concurrently.
    await _firestore.runTransaction<void>(
      (transaction) async {
        final snapshot = await transaction.get(reference);
        if (snapshot.exists || _auth.currentUser?.uid != user.uid) return;
        transaction.set(reference, {
          'displayName': user.displayName ?? preferredName?.trim() ?? '',
          'email': user.email,
          'profilePublic': false,
          'plansPublic': false,
          'followPublic': false,
          'locationEnabled': false,
          'locationHistory': false,
          'analyticsEnabled': false,
          'createdAt': FieldValue.serverTimestamp(),
          if (recordConsent) 'termsAcceptedAt': FieldValue.serverTimestamp(),
        });
      },
      timeout: const Duration(seconds: 10),
      maxAttempts: 3,
    );
  }

  String _messageFor(String code) => switch (code) {
    'invalid-email' => 'Geçerli bir e-posta adresi gir.',
    'invalid-credential' ||
    'wrong-password' ||
    'user-not-found' => 'E-posta veya şifre hatalı.',
    'email-already-in-use' => 'Bu e-posta adresi zaten kullanılıyor.',
    'weak-password' => 'Daha güçlü bir şifre belirle.',
    'too-many-requests' => 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'network-request-failed' => 'İnternet bağlantını kontrol et.',
    'user-disabled' => 'Bu hesap devre dışı bırakılmış.',
    _ => 'İşlem tamamlanamadı. Lütfen tekrar dene.',
  };

  String _messageForGoogle(GoogleSignInExceptionCode code) => switch (code) {
    GoogleSignInExceptionCode.canceled ||
    GoogleSignInExceptionCode.interrupted => 'Google ile giriş iptal edildi.',
    GoogleSignInExceptionCode.clientConfigurationError ||
    GoogleSignInExceptionCode.providerConfigurationError =>
      'Google girişi yapılandırılamadı. Lütfen tekrar dene.',
    GoogleSignInExceptionCode.uiUnavailable =>
      'Google hesap ekranı şu anda açılamıyor.',
    _ => 'Google ile giriş yapılamadı. Lütfen tekrar dene.',
  };
}
