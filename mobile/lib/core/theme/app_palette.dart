import 'package:flutter/material.dart';

/// Semantic colors shared by screens and Material components. Brand artwork
/// keeps its own ink/paper colors; ordinary UI always reads the current theme.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.background,
    required this.surface,
    required this.text,
    required this.muted,
    required this.forest,
    required this.accent,
    required this.divider,
    required this.isDark,
  });

  final Color background, surface, text, muted, forest, accent, divider;
  final bool isDark;

  static const light = AppPalette(
    background: Color(0xFFF4E8D4),
    surface: Color(0xFFFFFBF5),
    text: Color(0xFF251F1B),
    muted: Color(0xFF756D65),
    forest: Color(0xFF315142),
    accent: Color(0xFFCE7137),
    divider: Color(0xFFDED2C1),
    isDark: false,
  );

  // Matches the website's warm dark surfaces, with readable sage accents.
  static const dark = AppPalette(
    background: Color(0xFF211C17),
    surface: Color(0xFF2B241D),
    text: Color(0xFFF2E8DA),
    muted: Color(0xFFBAAFA1),
    forest: Color(0xFFB6C795),
    accent: Color(0xFFE08A4F),
    divider: Color(0xFF51463A),
    isDark: true,
  );

  Color get onAccent => isDark ? const Color(0xFF211C17) : Colors.white;
  Color get danger =>
      isDark ? const Color(0xFFFFAEA2) : const Color(0xFF9F3730);
  Color get greenTint =>
      isDark ? const Color(0xFF303C2D) : const Color(0xFFE8EFE8);
  Color get orangeTint =>
      isDark ? const Color(0xFF493122) : const Color(0xFFF8E9DC);
  Color get redTint =>
      isDark ? const Color(0xFF492A26) : const Color(0xFFF8E6E2);

  /// Existing feature-specific tones retain their light appearance and share
  /// a small set of dark semantic pairs. Unlisted colors belong to artwork or
  /// light ink on a dark hero, and deliberately remain unchanged.
  Color tone(Color lightColor) {
    if (!isDark) return lightColor;
    return switch (lightColor.toARGB32()) {
      0xFFE8EFE8 ||
      0xFFEAF0E8 ||
      0xFFEAF0E9 ||
      0xFFE9EEE5 ||
      0xFFEDF2EC ||
      0xFFE3F4EA ||
      0xFFD8E5DA => greenTint,
      0xFFF8E9DC ||
      0xFFFBE7DC ||
      0xFFFFE4D1 ||
      0xFFFFF0E5 ||
      0xFFFBE8D8 ||
      0xFFF8EADC ||
      0xFFFFEBD9 ||
      0xFFFFE5D3 => orangeTint,
      0xFFF8E6E2 || 0xFFFFE9E3 || 0xFFFFF0EB || 0xFFF9EDE7 => redTint,
      0xFFF6EDCF || 0xFFF7EDD5 => const Color(0xFF413821),
      0xFFECE5DA ||
      0xFFF2EADF ||
      0xFFF5E9DB ||
      0xFFF6EFE3 ||
      0xFFF5F0E7 ||
      0xFFF3EFE7 ||
      0xFFFAF6EE => const Color(0xFF352D24),
      0xFFA45229 ||
      0xFFA54A24 ||
      0xFF8C491A ||
      0xFFA74F21 ||
      0xFF8B4A29 ||
      0xFF98491C => const Color(0xFFF0B184),
      0xFFA83E35 ||
      0xFF873D35 ||
      0xFF9B3535 ||
      0xFF9B3020 ||
      0xFF9F3730 ||
      0xFFB33E32 => danger,
      0xFF82611A => const Color(0xFFE5CB85),
      0xFF39956A || 0xFF28734E => const Color(0xFFA4D6B6),
      0xFF5E5E5E || 0xFF6A625A => muted,
      0xFFE5B8B1 => const Color(0xFF88574F),
      _ => lightColor,
    };
  }

  @override
  AppPalette copyWith({
    Color? background,
    Color? surface,
    Color? text,
    Color? muted,
    Color? forest,
    Color? accent,
    Color? divider,
    bool? isDark,
  }) => AppPalette(
    background: background ?? this.background,
    surface: surface ?? this.surface,
    text: text ?? this.text,
    muted: muted ?? this.muted,
    forest: forest ?? this.forest,
    accent: accent ?? this.accent,
    divider: divider ?? this.divider,
    isDark: isDark ?? this.isDark,
  );

  @override
  AppPalette lerp(covariant AppPalette? other, double t) {
    if (other == null) return this;
    return AppPalette(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      text: Color.lerp(text, other.text, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      forest: Color.lerp(forest, other.forest, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      divider: Color.lerp(divider, other.divider, t)!,
      isDark: t < .5 ? isDark : other.isDark,
    );
  }
}

extension AppPaletteContext on BuildContext {
  AppPalette get colors {
    final theme = Theme.of(this);
    return theme.extension<AppPalette>() ??
        (theme.brightness == Brightness.dark
            ? AppPalette.dark
            : AppPalette.light);
  }
}
