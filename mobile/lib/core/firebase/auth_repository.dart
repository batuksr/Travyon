import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../firebase_options.dart';
import 'firebase_services.dart';

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
  static Future<void>? _googleInitialization;

  @override
  Stream<AuthSession?> watchSession() => _auth.userChanges().map(_toSession);

  @override
  Future<void> signIn({required String email, required String password}) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _ensureUserDocument(credential.user, recordConsent: false);
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
      await _ensureUserDocument(result.user, recordConsent: true);
    } on GoogleSignInException catch (error) {
      throw AuthFailure(_messageForGoogle(error.code));
    } on FirebaseAuthException catch (error) {
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
      await _ensureUserDocument(
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
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_messageFor(error.code));
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();

  Future<void> _initializeGoogleSignIn() {
    return _googleInitialization ??= _googleSignIn.initialize(
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

  Future<void> _ensureUserDocument(
    User? user, {
    required bool recordConsent,
    String? preferredName,
  }) async {
    if (user == null) return;
    final reference = _firestore.collection('users').doc(user.uid);
    final snapshot = await reference.get();
    if (snapshot.exists) return;

    await reference.set({
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
