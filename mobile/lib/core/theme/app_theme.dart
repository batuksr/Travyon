import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFFF4E8D4);
  static const surface = Color(0xFFFFFBF5);
  static const text = Color(0xFF251F1B);
  static const muted = Color(0xFF756D65);
  static const forest = Color(0xFF315142);
  static const accent = Color(0xFFCE7137);
  static const divider = Color(0xFFDED2C1);
}

abstract final class AppTypography {
  static const body = 'Inter';
  static const heading = 'Travyon Display';
}

abstract final class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.accent,
      brightness: Brightness.light,
      surface: AppColors.surface,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTypography.body,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.text,
        elevation: 0,
        titleTextStyle: TextStyle(
          color: AppColors.text,
          fontSize: 17,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.forest.withValues(alpha: 0.10),
        height: 72,
        labelTextStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
      chipTheme: ChipThemeData(
        selectedColor: AppColors.forest,
        backgroundColor: AppColors.surface,
        labelStyle: WidgetStateTextStyle.resolveWith(
          (states) => TextStyle(
            color: states.contains(WidgetState.selected)
                ? Colors.white
                : AppColors.text,
          ),
        ),
        side: const BorderSide(color: AppColors.divider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: AppColors.forest,
          textStyle: const TextStyle(
            fontFamily: AppTypography.heading,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: AppColors.forest,
          side: const BorderSide(color: AppColors.divider),
          textStyle: const TextStyle(
            fontFamily: AppTypography.heading,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        displayMedium: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        displaySmall: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineLarge: TextStyle(
          color: AppColors.text,
          fontSize: 30,
          height: 1.2,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineMedium: TextStyle(
          color: AppColors.text,
          fontSize: 26,
          height: 1.2,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineSmall: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleLarge: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleMedium: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleSmall: TextStyle(
          color: AppColors.text,
          fontFamily: AppTypography.body,
          fontWeight: FontWeight.w700,
        ),
        bodyLarge: TextStyle(color: AppColors.muted, fontSize: 16, height: 1.5),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: const TextStyle(
            fontFamily: AppTypography.heading,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 17,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFB94747)),
        ),
      ),
    );
  }
}
