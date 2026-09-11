import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../features/bootstrap/presentation/mobile_bootstrap_page.dart';

class TravyonApp extends StatelessWidget {
  const TravyonApp({super.key, this.initializationError});

  final Object? initializationError;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Travyon',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: MobileBootstrapPage(initializationError: initializationError),
    );
  }
}
