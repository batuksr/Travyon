import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/firebase/auth_repository.dart';
import '../core/localization/app_locale_controller.dart';
import '../core/localization/app_localizations.dart';
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
    this.localeController,
  });

  final Object? initializationError;
  final AuthRepository? authRepository;
  final TravelPlansRepository? travelPlansRepository;
  final AppLocaleController? localeController;

  @override
  Widget build(BuildContext context) {
    final locale = localeController ?? AppLocaleController.testing();
    return AppLocaleScope(
      controller: locale,
      child: ListenableBuilder(
        listenable: locale,
        builder: (context, _) => MaterialApp(
          title: 'Travyon',
          debugShowCheckedModeBanner: false,
          locale: locale.locale,
          supportedLocales: supportedAppLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            ...GlobalMaterialLocalizations.delegates,
          ],
          theme: AppTheme.light,
          home: initializationError == null
              ? AuthGate(
                  repository: authRepository ?? FirebaseAuthRepository(),
                  plansRepository:
                      travelPlansRepository ?? FirebaseTravelPlansRepository(),
                  localeController: locale,
                )
              : MobileBootstrapPage(initializationError: initializationError),
        ),
      ),
    );
  }
}
