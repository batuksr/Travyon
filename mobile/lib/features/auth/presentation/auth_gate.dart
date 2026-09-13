import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/firebase/auth_repository.dart';
import '../../../core/firebase/firebase_services.dart';
import '../../../core/localization/app_locale_controller.dart';
import '../../../core/preferences/app_unit_controller.dart';
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
    required this.unitController,
  });

  final AuthRepository repository;
  final TravelPlansRepository plansRepository;
  final AppLocaleController localeController;
  final AppUnitController unitController;

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

        return _AccountPreferenceSync(
          key: ValueKey('preferences-${session.uid}'),
          uid: session.uid,
          localeController: localeController,
          unitController: unitController,
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

class _AccountPreferenceSync extends StatefulWidget {
  const _AccountPreferenceSync({
    super.key,
    required this.uid,
    required this.localeController,
    required this.unitController,
    required this.child,
  });

  final String uid;
  final AppLocaleController localeController;
  final AppUnitController unitController;
  final Widget child;

  @override
  State<_AccountPreferenceSync> createState() => _AccountPreferenceSyncState();
}

class _AccountPreferenceSyncState extends State<_AccountPreferenceSync> {
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
            if (language != null) {
              widget.localeController.setLanguage(language);
            }
            widget.unitController.applyAccountSettings(data);
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
