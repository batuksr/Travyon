import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_theme_controller.dart';
import 'account_widgets.dart';

class ThemeSettingsPage extends StatelessWidget {
  const ThemeSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = AppThemeScope.of(context);
    return AccountScreen(
      title: 'Tema',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AccountHeader(
            subtitle: 'Açık, karanlık veya sistem temasını seç.',
          ),
          for (final mode in ThemeMode.values) ...[
            _ThemeOption(
              mode: mode,
              selected: controller.mode == mode,
              onTap: () => controller.setMode(mode),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.check_circle_outline_rounded,
                color: context.colors.forest,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.tr('Seçimin otomatik kaydedilir.'),
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  const _ThemeOption({
    required this.mode,
    required this.selected,
    required this.onTap,
  });
  final ThemeMode mode;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (title, subtitle, icon) = switch (mode) {
      ThemeMode.system => (
        'Sistem ayarı',
        'Cihazının görünümüne otomatik uyum sağlar.',
        Icons.brightness_auto_outlined,
      ),
      ThemeMode.light => (
        'Açık',
        'Sıcak krem tonları ve aydınlık bir görünüm.',
        Icons.light_mode_outlined,
      ),
      ThemeMode.dark => (
        'Karanlık',
        'Koyu tonlar ve yumuşak kontrast.',
        Icons.dark_mode_outlined,
      ),
    };
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      button: true,
      child: Material(
        color: selected ? context.colors.greenTint : context.colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(
            color: selected ? context.colors.forest : context.colors.divider,
            width: selected ? 1.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: ValueKey('theme-${mode.name}'),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: context.colors.forest, size: 26),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr(title),
                        style: TextStyle(
                          color: context.colors.text,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr(subtitle),
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 12,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _ThemePreview(mode: mode),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Icon(
                  selected
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: selected
                      ? context.colors.forest
                      : context.colors.muted,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Deliberate light/dark swatches: these previews do not follow the active theme.
class _ThemePreview extends StatelessWidget {
  const _ThemePreview({required this.mode});
  final ThemeMode mode;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox(
      height: 58,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Row(
          children: [
            if (mode != ThemeMode.dark)
              Expanded(child: _sample(AppPalette.light)),
            if (mode != ThemeMode.light)
              Expanded(child: _sample(AppPalette.dark)),
          ],
        ),
      ),
    ),
  );

  Widget _sample(AppPalette colors) => ColoredBox(
    color: colors.background,
    child: Padding(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 4,
            decoration: BoxDecoration(
              color: colors.text,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(5),
              ),
              padding: const EdgeInsets.all(5),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    decoration: BoxDecoration(
                      color: colors.accent,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(child: Container(height: 3, color: colors.divider)),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
