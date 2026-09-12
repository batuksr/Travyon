import 'package:flutter/material.dart';

import '../../../core/firebase/auth_repository.dart';
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
  });

  final AuthRepository repository;
  final TravelPlansRepository plansRepository;

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

        return MobileHubPage(
          key: ValueKey(session.uid),
          session: session,
          repository: repository,
          plansRepository: plansRepository,
        );
      },
    );
  }
}
