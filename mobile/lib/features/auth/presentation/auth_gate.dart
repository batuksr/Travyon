import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/firebase/auth_repository.dart';
import '../../../core/firebase/firebase_services.dart';
import '../../../core/localization/app_locale_controller.dart';
import '../../../core/theme/app_theme.dart';
import '../../bootstrap/presentation/mobile_bootstrap_page.dart';
import '../../hub/presentation/mobile_hub_page.dart';
import '../../plans/data/travel_plans_repository.dart';
import 'auth_page.dart';
import 'email_verification_page.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({
    super.key,
    required this.repository,
    required this.plansRepository,
    required this.localeController,
  });

  final AuthRepository repository;
  final TravelPlansRepository plansRepository;
  final AppLocaleController localeController;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthSession?>(
      stream: repository.watchSession(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppColors.accent),
            ),
          );
        }

        final session = snapshot.data;
        if (session == null) {
          return MobileBootstrapPage(
            onStart: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => AuthPage(repository: repository),
              ),
            ),
          );
        }

        if (!session.emailVerified) {
          return EmailVerificationPage(
            session: session,
            repository: repository,
          );
        }

        return _AccountLocaleSync(
          key: ValueKey('locale-${session.uid}'),
          uid: session.uid,
          controller: localeController,
          child: MobileHubPage(
            key: ValueKey(session.uid),
            session: session,
            repository: repository,
            plansRepository: plansRepository,
          ),
        );
      },
    );
  }
}

class _AccountLocaleSync extends StatefulWidget {
  const _AccountLocaleSync({
    super.key,
    required this.uid,
    required this.controller,
    required this.child,
  });

  final String uid;
  final AppLocaleController controller;
  final Widget child;

  @override
  State<_AccountLocaleSync> createState() => _AccountLocaleSyncState();
}

class _AccountLocaleSyncState extends State<_AccountLocaleSync> {
  StreamSubscription<Map<String, dynamic>?>? _subscription;

  @override
  void initState() {
    super.initState();
    if (Firebase.apps.isEmpty) return;
    _subscription = FirebaseServices.firestore
        .collection('users')
        .doc(widget.uid)
        .snapshots()
        .map((snapshot) => snapshot.data())
        .listen(
          (data) {
            final language = data?['language'];
            if (language != null) widget.controller.setLanguage(language);
          },
          onError: (_) {
            // The cached device preference keeps the app usable offline.
          },
        );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
