import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_palette.dart';
export 'app_palette.dart';

abstract final class AppColors {
  static const background = Color(0xFFFCF8F4);
  static const surface = Color(0xFFFFFFFF);
  static const text = Color(0xFF2B2521);
  static const muted = Color(0xFF6B6661);
  static const forest = Color(0xFFA94B27);
  static const accent = Color(0xFFD86731);
  static const divider = Color(0xFFE8E2DC);
}

abstract final class AppTypography {
  static const body = 'Plus Jakarta Sans';
  static const heading = body;
  static const logo = 'Travyon Display';
}

abstract final class AppMotion {
  static const quick = Duration(milliseconds: 160);
  static const standard = Duration(milliseconds: 220);
}

abstract final class AppTheme {
  static ThemeData get light => _build(AppPalette.light);
  static ThemeData get dark => _build(AppPalette.dark);

  static ThemeData _build(AppPalette colors) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: colors.accent,
      brightness: colors.isDark ? Brightness.dark : Brightness.light,
      surface: colors.surface,
      primary: colors.forest,
      onPrimary: colors.background,
      secondary: colors.accent,
      onSecondary: colors.onAccent,
      onSurface: colors.text,
      onSurfaceVariant: colors.muted,
      outline: colors.divider,
      error: colors.danger,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTypography.body,
      extensions: [colors],
      dividerColor: colors.divider,
      iconTheme: IconThemeData(color: colors.text),
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colors.background,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: colors.text,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: colors.isDark
              ? Brightness.light
              : Brightness.dark,
          statusBarBrightness: colors.isDark
              ? Brightness.dark
              : Brightness.light,
          systemNavigationBarColor: colors.background,
          systemNavigationBarIconBrightness: colors.isDark
              ? Brightness.light
              : Brightness.dark,
        ),
        titleTextStyle: TextStyle(
          color: colors.text,
          fontSize: 17,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: colors.orangeTint,
        height: 68,
        labelTextStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 10, height: 1.1, fontWeight: FontWeight.w600),
        ),
      ),
      chipTheme: ChipThemeData(
        checkmarkColor: Colors.white,
        selectedColor: AppColors.forest,
        backgroundColor: colors.surface,
        labelStyle: WidgetStateTextStyle.resolveWith(
          (states) => TextStyle(
            color: states.contains(WidgetState.selected)
                ? Colors.white
                : colors.text,
          ),
        ),
        side: BorderSide(color: colors.divider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(44, 44),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          foregroundColor: colors.text,
          textStyle: const TextStyle(
            fontFamily: AppTypography.body,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          // `Size.fromHeight` carries an infinite width. That breaks compact
          // outlined controls placed inside horizontal scrollers (for example
          // route day selectors), so only make the touch height mandatory.
          minimumSize: const Size(0, 54),
          foregroundColor: colors.text,
          side: BorderSide(color: colors.divider),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontFamily: AppTypography.body,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textTheme: TextTheme(
        displayLarge: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w800,
        ),
        displayMedium: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
        ),
        displaySmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
        ),
        headlineLarge: TextStyle(
          color: colors.text,
          fontSize: 32,
          height: 1.2,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
          letterSpacing: -.8,
        ),
        headlineMedium: TextStyle(
          color: colors.text,
          fontSize: 26,
          height: 1.25,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
          letterSpacing: -.6,
        ),
        headlineSmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w700,
          fontSize: 24,
          height: 1.3,
        ),
        titleLarge: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w600,
          fontSize: 20,
          height: 1.3,
        ),
        titleMedium: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w600,
          fontSize: 16,
          height: 1.4,
        ),
        titleSmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.body,
          fontWeight: FontWeight.w700,
        ),
        bodyLarge: TextStyle(color: colors.text, fontSize: 16, height: 1.5),
        bodyMedium: TextStyle(color: colors.text, fontSize: 14, height: 1.5),
        labelLarge: TextStyle(
          color: colors.text,
          fontSize: 14,
          fontWeight: FontWeight.w700,
          letterSpacing: -.1,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colors.accent,
          foregroundColor: colors.onAccent,
          minimumSize: const Size(0, 56),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          elevation: 0,
          shape: const StadiumBorder(),
          textStyle: const TextStyle(
            fontFamily: AppTypography.body,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colors.surface,
        modalBackgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        dragHandleColor: colors.muted,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: colors.surface,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: colors.divider),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.accent, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.danger),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colors.text,
        contentTextStyle: TextStyle(color: colors.surface, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
