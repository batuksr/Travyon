import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/firebase/auth_repository.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/auth_gate.dart';
import '../features/bootstrap/presentation/mobile_bootstrap_page.dart';
import '../features/plans/data/travel_plans_repository.dart';

class TravyonApp extends StatelessWidget {
  const TravyonApp({
    super.key,
    this.initializationError,
    this.authRepository,
    this.travelPlansRepository,
  });

  final Object? initializationError;
  final AuthRepository? authRepository;
  final TravelPlansRepository? travelPlansRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Travyon',
      debugShowCheckedModeBanner: false,
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: AppTheme.light,
      home: initializationError == null
          ? AuthGate(
              repository: authRepository ?? FirebaseAuthRepository(),
              plansRepository:
                  travelPlansRepository ?? FirebaseTravelPlansRepository(),
            )
          : MobileBootstrapPage(initializationError: initializationError),
    );
  }
}
