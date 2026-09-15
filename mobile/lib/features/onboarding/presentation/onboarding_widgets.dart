import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';

import '../../../core/theme/app_theme.dart';

const _choiceEmojis = {
  'solo_macera': '🎒',
  'romantik': '💑',
  'balayi': '💍',
  'aile': '👨‍👩‍👧',
  'arkadas_grubu': '🤝',
  'is_seyahati': '💼',
  'sehir_kacamagi': '🏙️',
  'klasik_tatil': '🏖️',
  'culture': '🏛️',
  'relax': '🌊',
  'nightlife': '🎶',
  'nature': '🌿',
  'rahat': '🌴',
  'normal': '🚶',
  'aktif': '🥾',
  'esnek': '🧭',
  'vegan': '🌱',
  'vegetarian': '🥗',
  'halal': '🍽️',
  'glutenFree': '🌾',
  'pescatarian': '🐟',
  'noRestriction': '😋',
  'iconic': '⭐',
  'hidden_gems': '💎',
  'fine_dining': '🥂',
  'street_food': '🌮',
  'mixed': '🍱',
  'low': '🪙',
  'medium': '⚖️',
  'high': '✨',
  'yes': '🗝️',
  'no': '🔎',
  'hotel': '🏨',
  'airbnb': '🏡',
  'hostel': '🛏️',
  'resort': '🏝️',
  'public': '🚇',
  'walk': '👟',
  'taxi': '🚕',
  'car': '🚗',
};

/// Uses system emoji rendering, not the decorative heading font.
class OnboardingEmoji extends StatelessWidget {
  const OnboardingEmoji(this.emoji, {super.key, this.size = 28});
  final String emoji;
  final double size;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Text(
      emoji,
      style: TextStyle(
        fontFamily: 'Noto Color Emoji',
        fontFamilyFallback: const ['Apple Color Emoji', 'Segoe UI Emoji'],
        fontSize: size,
        height: 1.3,
      ),
      textScaler: TextScaler.noScaling,
    ),
  );
}

class OnboardingProgress extends StatelessWidget {
  const OnboardingProgress({
    super.key,
    required this.step,
    required this.labels,
  });
  final int step;
  final List<String> labels;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
    child: Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < labels.length; i++) ...[
              Semantics(
                label: context.tr(
                  i < step
                      ? 'Adım {number}: {label}, tamamlandı'
                      : i == step
                      ? 'Adım {number}: {label}, şu anki adım'
                      : 'Adım {number}: {label}',
                  values: {'number': i + 1, 'label': context.tr(labels[i])},
                ),
                excludeSemantics: true,
                child: AnimatedContainer(
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : const Duration(milliseconds: 180),
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: i < step
                        ? AppColors.forest
                        : i == step
                        ? context.colors.accent
                        : context.colors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: i <= step
                          ? Colors.transparent
                          : context.colors.divider,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: i < step
                      ? const Icon(
                          Icons.check_rounded,
                          color: Colors.white,
                          size: 18,
                        )
                      : Text(
                          '${i + 1}',
                          textScaler: TextScaler.noScaling,
                          style: TextStyle(
                            color: i == step
                                ? context.colors.onAccent
                                : context.colors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
              if (i < labels.length - 1)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    height: 2,
                    color: i < step
                        ? context.colors.forest
                        : context.colors.divider,
                  ),
                ),
            ],
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Text(
              'Adım ${step + 1} / 4',
              style: TextStyle(color: context.colors.muted, fontSize: 12),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                labels[step],
                textAlign: TextAlign.end,
                style: TextStyle(
                  color: context.colors.forest,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class OnboardingSection extends StatelessWidget {
  const OnboardingSection({
    super.key,
    required this.title,
    this.hint,
    required this.child,
    this.icon,
  });
  final String title;
  final String? hint;
  final Widget child;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 18),
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: context.colors.divider),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20, color: context.colors.accent),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
        if (hint != null) ...[
          const SizedBox(height: 7),
          Text(
            hint!,
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
        const SizedBox(height: 16),
        child,
      ],
    ),
  );
}

class OnboardingChoices extends StatelessWidget {
  const OnboardingChoices({
    super.key,
    required this.field,
    required this.options,
    required this.selected,
    required this.onSelect,
    this.hints = const {},
    this.ranked = false,
  });
  final String field;
  final Map<String, String> options, hints;
  final List<String> selected;
  final ValueChanged<String> onSelect;
  final bool ranked;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, bounds) {
      final columns =
          bounds.maxWidth >= 280 &&
              MediaQuery.textScalerOf(context).scale(14) < 20
          ? 2
          : 1;
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final entry in options.entries)
            SizedBox(
              width: (bounds.maxWidth - (columns - 1) * 10) / columns,
              child: Semantics(
                selected: selected.contains(entry.key),
                child: Material(
                  color: selected.contains(entry.key)
                      ? context.colors.tone(const Color(0xFFFFF0E5))
                      : context.colors.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: BorderSide(
                      color: selected.contains(entry.key)
                          ? context.colors.accent
                          : context.colors.divider,
                      width: selected.contains(entry.key) ? 1.5 : 1,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    key: ValueKey('$field-${entry.key}'),
                    onTap: () => onSelect(entry.key),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (_choiceEmojis[entry.key] != null)
                                OnboardingEmoji(_choiceEmojis[entry.key]!),
                              const Spacer(),
                              if (selected.contains(entry.key))
                                Container(
                                  width: 22,
                                  height: 22,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    color: AppColors.accent,
                                    shape: BoxShape.circle,
                                  ),
                                  child: ranked
                                      ? Text(
                                          '${selected.indexOf(entry.key) + 1}',
                                          textScaler: TextScaler.noScaling,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.check_rounded,
                                          size: 15,
                                          color: Colors.white,
                                        ),
                                )
                              else
                                Icon(
                                  Icons.circle_outlined,
                                  size: 22,
                                  color: context.colors.divider,
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            entry.value,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              height: 1.4,
                              color: selected.contains(entry.key)
                                  ? context.colors.tone(const Color(0xFF8C491A))
                                  : context.colors.text,
                            ),
                          ),
                          if (hints[entry.key] != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              hints[entry.key]!,
                              style: TextStyle(
                                fontSize: 12,
                                color: context.colors.muted,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

class OnboardingValueTile extends StatelessWidget {
  const OnboardingValueTile({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.onTap,
  });
  final String title, value;
  final IconData icon;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: context.colors.tone(const Color(0xFFF6EFE3)),
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: context.colors.forest, size: 20),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(fontSize: 11, color: context.colors.muted),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class OnboardingPair extends StatelessWidget {
  const OnboardingPair({super.key, required this.first, required this.second});
  final Widget first, second;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxWidth < 250 ||
          MediaQuery.textScalerOf(context).scale(14) > 21) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [first, const SizedBox(height: 10), second],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: first),
          const SizedBox(width: 10),
          Expanded(child: second),
        ],
      );
    },
  );
}
