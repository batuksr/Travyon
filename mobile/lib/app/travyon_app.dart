import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/firebase/auth_repository.dart';
import '../core/localization/app_locale_controller.dart';
import '../core/localization/app_localizations.dart';
import '../core/preferences/app_unit_controller.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_theme_controller.dart';
import '../features/auth/presentation/auth_gate.dart';
import '../features/bootstrap/presentation/mobile_bootstrap_page.dart';
import '../features/plans/data/travel_plans_repository.dart';

class TravyonApp extends StatefulWidget {
  const TravyonApp({
    super.key,
    this.initializationError,
    this.authRepository,
    this.travelPlansRepository,
    this.localeController,
    this.unitController,
    this.themeController,
  });

  final Object? initializationError;
  final AuthRepository? authRepository;
  final TravelPlansRepository? travelPlansRepository;
  final AppLocaleController? localeController;
  final AppUnitController? unitController;
  final AppThemeController? themeController;

  @override
  State<TravyonApp> createState() => _TravyonAppState();
}

class _TravyonAppState extends State<TravyonApp> {
  late final locale = widget.localeController ?? AppLocaleController.testing();
  late final units = widget.unitController ?? AppUnitController.testing();
  late final appearance =
      widget.themeController ?? AppThemeController.testing();
  late final auth = widget.authRepository ?? FirebaseAuthRepository();
  late final plans =
      widget.travelPlansRepository ?? FirebaseTravelPlansRepository();

  @override
  void dispose() {
    if (widget.localeController == null) locale.dispose();
    if (widget.unitController == null) units.dispose();
    if (widget.themeController == null) appearance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppThemeScope(
      controller: appearance,
      child: AppLocaleScope(
        controller: locale,
        child: AppUnitScope(
          controller: units,
          child: ListenableBuilder(
            listenable: Listenable.merge([locale, appearance]),
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
              darkTheme: AppTheme.dark,
              themeMode: appearance.mode,
              builder: (context, child) =>
                  AnnotatedRegion<SystemUiOverlayStyle>(
                    value: Theme.of(context).appBarTheme.systemOverlayStyle!,
                    child: child!,
                  ),
              home: widget.initializationError == null
                  ? AuthGate(
                      repository: auth,
                      plansRepository: plans,
                      localeController: locale,
                      unitController: units,
                    )
                  : MobileBootstrapPage(
                      initializationError: widget.initializationError,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
