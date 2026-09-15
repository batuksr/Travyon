import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_palette.dart';
export 'app_palette.dart';

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
          fontWeight: FontWeight.w400,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: colors.forest.withValues(alpha: 0.10),
        height: 64,
        labelTextStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 10.5, height: 1, fontWeight: FontWeight.w600),
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
          minimumSize: const Size(48, 48),
          foregroundColor: colors.forest,
          textStyle: const TextStyle(
            fontFamily: AppTypography.heading,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: colors.forest,
          side: BorderSide(color: colors.divider),
          textStyle: const TextStyle(
            fontFamily: AppTypography.heading,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      textTheme: TextTheme(
        displayLarge: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        displayMedium: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        displaySmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineLarge: TextStyle(
          color: colors.text,
          fontSize: 30,
          height: 1.2,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineMedium: TextStyle(
          color: colors.text,
          fontSize: 26,
          height: 1.2,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        headlineSmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleLarge: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleMedium: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.heading,
          fontWeight: FontWeight.w400,
        ),
        titleSmall: TextStyle(
          color: colors.text,
          fontFamily: AppTypography.body,
          fontWeight: FontWeight.w700,
        ),
        bodyLarge: TextStyle(color: colors.muted, fontSize: 16, height: 1.5),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colors.accent,
          foregroundColor: colors.onAccent,
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
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 17,
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
    );
  }
}
