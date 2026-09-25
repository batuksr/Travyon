import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';

import '../../../core/theme/app_theme.dart';

const _choiceIcons = <String, IconData>{
  // Travel type — mirrors the Lucide icon language used by the web app.
  'solo_macera': Icons.backpack_outlined,
  'romantik': Icons.favorite_border_rounded,
  'balayi': Icons.diamond_outlined,
  'aile': Icons.people_alt_outlined,
  'arkadas_grubu': Icons.handshake_outlined,
  'is_seyahati': Icons.business_center_outlined,
  'sehir_kacamagi': Icons.confirmation_number_outlined,
  'klasik_tatil': Icons.map_outlined,
  // Interests and pace.
  'culture': Icons.account_balance_outlined,
  'relax': Icons.waves_outlined,
  'nightlife': Icons.music_note_outlined,
  'nature': Icons.park_outlined,
  'rahat': Icons.weekend_outlined,
  'normal': Icons.directions_walk_outlined,
  'aktif': Icons.hiking_outlined,
  'esnek': Icons.explore_outlined,
  // Food choices.
  'vegan': Icons.eco_outlined,
  'vegetarian': Icons.spa_outlined,
  'halal': Icons.nightlight_round,
  'glutenFree': Icons.grain_outlined,
  'pescatarian': Icons.set_meal_outlined,
  'noRestriction': Icons.restaurant_outlined,
  'iconic': Icons.star_border_rounded,
  'hidden_gems': Icons.map_outlined,
  'fine_dining': Icons.wine_bar_outlined,
  'street_food': Icons.storefront_outlined,
  'mixed': Icons.shuffle_rounded,
  // Budget, stay and transport.
  'low': Icons.savings_outlined,
  'medium': Icons.balance_outlined,
  'high': Icons.auto_awesome_outlined,
  'yes': Icons.key_outlined,
  'no': Icons.search_outlined,
  'hotel': Icons.hotel_outlined,
  'airbnb': Icons.house_outlined,
  'hostel': Icons.bed_outlined,
  'resort': Icons.beach_access_outlined,
  'public': Icons.tram_outlined,
  'walk': Icons.directions_walk_outlined,
  'taxi': Icons.local_taxi_outlined,
  'car': Icons.directions_car_outlined,
};

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
    padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Adım ${step + 1} / ${labels.length}',
                style: TextStyle(
                  color: context.colors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                labels[step],
                textAlign: TextAlign.end,
                style: TextStyle(
                  color: context.colors.text,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            for (var i = 0; i < labels.length; i++) ...[
              Expanded(
                child: Semantics(
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
                        : AppMotion.quick,
                    height: 4,
                    decoration: BoxDecoration(
                      color: i <= step
                          ? context.colors.accent
                          : context.colors.divider,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
              ),
              if (i < labels.length - 1) const SizedBox(width: 6),
            ],
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
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 28),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon!, size: 20, color: context.colors.muted),
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
        const SizedBox(height: 12),
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
          !const {'pace', 'food', 'meal', 'reservation'}.contains(field) &&
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
                      ? context.colors.greenTint
                      : context.colors.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
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
                      child: _ChoiceContent(
                        label: entry.value,
                        hint: hints[entry.key],
                        icon: _choiceIcons[entry.key],
                        selected: selected.contains(entry.key),
                        rank: ranked ? selected.indexOf(entry.key) + 1 : null,
                        horizontal: columns == 1,
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

class _ChoiceContent extends StatelessWidget {
  const _ChoiceContent({
    required this.label,
    this.hint,
    this.icon,
    required this.selected,
    this.rank,
    required this.horizontal,
  });
  final String label;
  final String? hint;
  final IconData? icon;
  final bool selected, horizontal;
  final int? rank;

  @override
  Widget build(BuildContext context) {
    final marker = selected
        ? Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: context.colors.accent,
              shape: BoxShape.circle,
            ),
            child: rank != null
                ? Text(
                    '$rank',
                    textScaler: TextScaler.noScaling,
                    style: TextStyle(
                      color: context.colors.onAccent,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  )
                : Icon(
                    Icons.check_rounded,
                    size: 15,
                    color: context.colors.onAccent,
                  ),
          )
        : Icon(Icons.circle_outlined, size: 22, color: context.colors.divider);
    final copy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: context.colors.text,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            height: 1.4,
          ),
        ),
        if (hint != null) ...[
          const SizedBox(height: 5),
          Text(
            hint!,
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ],
    );
    if (horizontal) {
      return Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 24, color: context.colors.text),
            const SizedBox(width: 14),
          ],
          Expanded(child: copy),
          const SizedBox(width: 12),
          marker,
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) Icon(icon, size: 25, color: context.colors.text),
            const Spacer(),
            marker,
          ],
        ),
        const SizedBox(height: 16),
        copy,
      ],
    );
  }
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
    color: context.colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: context.colors.divider),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: context.colors.muted, size: 17),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(fontSize: 11, color: context.colors.muted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
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
