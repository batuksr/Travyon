// SDK interfaces are faked only in tests; no Firebase backend is contacted.
// ignore_for_file: subtype_of_sealed_class

import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/features/auth/presentation/auth_page.dart';

class TestUser extends Fake implements User {
  @override
  String get uid => 'test-user';
  @override
  String get email => 'traveler@example.test';
  @override
  String get displayName => 'Traveler';
  @override
  bool get emailVerified => true;
  int verificationEmails = 0;
  @override
  Future<void> updateDisplayName(String? displayName) async {}
  @override
  Future<void> sendEmailVerification([
    ActionCodeSettings? actionCodeSettings,
  ]) async {
    verificationEmails++;
  }

  @override
  Future<void> reload() async {}
}

class TestCredential extends Fake implements UserCredential {
  TestCredential(this.user);
  @override
  final User user;
}

class TestAuth extends Fake implements FirebaseAuth {
  final user = TestUser();
  Object? error;
  @override
  User? currentUser;
  Future<UserCredential> authenticate() async {
    if (error != null) throw error!;
    currentUser = user;
    return TestCredential(user);
  }

  @override
  Future<UserCredential> signInWithCredential(AuthCredential credential) =>
      authenticate();
  @override
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) => authenticate();
  @override
  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) => authenticate();
}

class TestGoogleAccount extends Fake implements GoogleSignInAccount {
  @override
  GoogleSignInAuthentication get authentication =>
      const GoogleSignInAuthentication(idToken: 'fake-test-id-token');
}

class TestGoogle extends Fake implements GoogleSignIn {
  Object? error;
  int initializations = 0;
  @override
  Future<void> initialize({
    String? clientId,
    String? serverClientId,
    String? nonce,
    String? hostedDomain,
  }) async {
    initializations++;
  }

  @override
  Future<GoogleSignInAccount> authenticate({
    List<String> scopeHint = const [],
  }) async {
    if (error != null) throw error!;
    return TestGoogleAccount();
  }
}

class TestSnapshot<T extends Object?> extends Fake
    implements DocumentSnapshot<T> {
  TestSnapshot(this.exists);
  @override
  final bool exists;
}

class TestReference extends Fake
    implements DocumentReference<Map<String, dynamic>> {}

class TestCollection extends Fake
    implements CollectionReference<Map<String, dynamic>> {
  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) =>
      TestReference();
}

class TestTransaction extends Fake implements Transaction {
  Completer<void>? readPending;
  bool exists = false;
  int writes = 0;
  Map<String, dynamic>? data;
  @override
  Future<DocumentSnapshot<T>> get<T extends Object?>(
    DocumentReference<T> documentReference,
  ) async {
    await readPending?.future;
    return TestSnapshot<T>(exists);
  }

  @override
  Transaction set<T>(
    DocumentReference<T> documentReference,
    T data, [
    SetOptions? options,
  ]) {
    writes++;
    this.data = Map<String, dynamic>.from(data as Map);
    return this;
  }
}

class TestFirestore extends Fake implements FirebaseFirestore {
  final transaction = TestTransaction();
  Object? error;
  int attempts = 0;
  @override
  CollectionReference<Map<String, dynamic>> collection(String collectionPath) =>
      TestCollection();
  @override
  Future<T> runTransaction<T>(
    TransactionHandler<T> transactionHandler, {
    Duration timeout = const Duration(seconds: 30),
    int maxAttempts = 5,
  }) async {
    attempts++;
    if (error != null) throw error!;
    return transactionHandler(transaction);
  }
}

void main() {
  late TestAuth auth;
  late TestGoogle google;
  late TestFirestore firestore;
  late FirebaseAuthRepository repository;
  setUp(() {
    auth = TestAuth();
    google = TestGoogle();
    firestore = TestFirestore();
    repository = FirebaseAuthRepository(
      auth: auth,
      firestore: firestore,
      googleSignIn: google,
    );
  });

  for (final code in ['unavailable', 'permission-denied']) {
    test(
      'Google auth succeeds even when profile synchronization reports $code',
      () async {
        firestore.error = FirebaseException(
          plugin: 'cloud_firestore',
          code: code,
        );
        await repository.signInWithGoogle();
        await pumpEventQueue();
        expect(auth.currentUser, auth.user);
        expect(firestore.attempts, 1);
        expect(firestore.transaction.writes, 0);
      },
    );
  }

  test(
    'pending profile never blocks auth and existing profile is not overwritten',
    () async {
      final pending = Completer<void>();
      firestore.transaction.readPending = pending;
      await repository.signInWithGoogle();
      expect(auth.currentUser, auth.user);
      await repository.signInWithGoogle();
      expect(firestore.attempts, 1);
      expect(google.initializations, 1);
      firestore.transaction.exists = true;
      pending.complete();
      await pumpEventQueue();
      expect(firestore.transaction.writes, 0);
    },
  );

  test(
    'a delayed profile callback does not write after the session changes',
    () async {
      final pending = Completer<void>();
      firestore.transaction.readPending = pending;
      await repository.signInWithGoogle();
      auth.currentUser = null;
      pending.complete();
      await pumpEventQueue();
      expect(firestore.transaction.writes, 0);
    },
  );

  test(
    'later sign in retries profile creation with private defaults',
    () async {
      firestore.error = FirebaseException(
        plugin: 'cloud_firestore',
        code: 'unavailable',
      );
      await repository.signInWithGoogle();
      await pumpEventQueue();
      firestore.error = null;
      await repository.signInWithGoogle();
      await pumpEventQueue();
      expect(firestore.attempts, 2);
      final data = firestore.transaction.data!;
      expect(data['termsAcceptedAt'], isNotNull);
      expect(data['createdAt'], isNotNull);
      for (final field in [
        'profilePublic',
        'plansPublic',
        'followPublic',
        'locationEnabled',
        'locationHistory',
        'analyticsEnabled',
      ]) {
        expect(data[field], isFalse);
      }
      expect(data.containsKey('isPro'), isFalse);
    },
  );

  test(
    'real Firebase credential failure remains an authentication error',
    () async {
      auth.error = FirebaseAuthException(code: 'invalid-credential');
      await expectLater(
        repository.signInWithGoogle(),
        throwsA(isA<AuthFailure>()),
      );
      expect(auth.currentUser, isNull);
      expect(firestore.attempts, 0);
    },
  );

  test('canceling Google never starts profile synchronization', () async {
    google.error = const GoogleSignInException(
      code: GoogleSignInExceptionCode.canceled,
    );
    await expectLater(
      repository.signInWithGoogle(),
      throwsA(
        isA<AuthFailure>().having(
          (error) => error.message,
          'message',
          'Google ile giriş iptal edildi.',
        ),
      ),
    );
    expect(auth.currentUser, isNull);
    expect(firestore.attempts, 0);
  });

  test(
    'email sign in and registration are independent of Firestore availability',
    () async {
      firestore.error = FirebaseException(
        plugin: 'cloud_firestore',
        code: 'unavailable',
      );
      await repository.signIn(
        email: 'traveler@example.test',
        password: 'test-password',
      );
      await pumpEventQueue();
      expect(auth.currentUser, auth.user);
      await repository.register(
        name: 'Traveler',
        email: 'traveler@example.test',
        password: 'test-password',
      );
      await pumpEventQueue();
      expect(auth.user.verificationEmails, 1);
      expect(auth.currentUser, auth.user);
    },
  );

  testWidgets(
    'successful Google login closes the form while the profile is pending',
    (tester) async {
      final pending = Completer<void>();
      firestore.transaction.readPending = pending;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => AuthPage(repository: repository),
                  ),
                ),
                child: const Text('Open login'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open login'));
      await tester.pumpAndSettle();
      final button = find.text('Google ile devam et');
      await tester.ensureVisible(button);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(find.byType(AuthPage), findsNothing);
      expect(auth.currentUser, auth.user);
      pending.completeError(
        FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
}
