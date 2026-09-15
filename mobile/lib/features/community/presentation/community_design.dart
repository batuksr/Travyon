import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';
import '../../../core/theme/app_theme.dart';

/// Shared visual elements for the community feed. No data or navigation state.
class CommunityTabs extends StatelessWidget {
  const CommunityTabs({
    super.key,
    required this.selected,
    required this.onSelect,
  });
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      const labels = [
        'Keşfet',
        'Takip ettiklerin',
        'En beğenilen',
        'Paylaşımlarım',
      ];
      const icons = [
        Icons.explore_outlined,
        Icons.people_outline_rounded,
        Icons.star_outline_rounded,
        Icons.bookmarks_outlined,
      ];
      final columns = constraints.maxWidth >= 600 ? 4 : 2;
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (var i = 0; i < labels.length; i++)
            SizedBox(
              width: (constraints.maxWidth - (columns - 1) * 8) / columns,
              child: Semantics(
                selected: selected == i,
                child: OutlinedButton(
                  onPressed: () => onSelect(i),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 12,
                    ),
                    minimumSize: const Size(48, 48),
                    backgroundColor: selected == i
                        ? AppColors.forest
                        : context.colors.surface,
                    foregroundColor: selected == i
                        ? AppColors.surface
                        : context.colors.text,
                    side: BorderSide(
                      color: selected == i
                          ? context.colors.forest
                          : context.colors.divider,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(icons[i], size: 19),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          labels[i],
                          style: TextStyle(
                            fontFamily: AppTypography.body,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: selected == i
                                ? AppColors.surface
                                : context.colors.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

class CommunityEmptyState extends StatelessWidget {
  const CommunityEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.route_rounded,
    this.actionLabel,
    this.onAction,
  });
  final String title, message;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: context.colors.divider),
    ),
    child: Column(
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: context.colors.tone(const Color(0xFFEAF0E9)),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 30, color: context.colors.forest),
        ),
        const SizedBox(height: 18),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 10),
        Text(
          message,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 13,
            height: 1.6,
          ),
        ),
        if (onAction != null && actionLabel != null) ...[
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: onAction,
            icon: const Icon(Icons.arrow_forward_rounded, size: 18),
            label: Text(actionLabel!),
          ),
        ],
      ],
    ),
  );
}

class CommunityMetric extends StatelessWidget {
  const CommunityMetric({super.key, required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 16, color: context.colors.forest),
      const SizedBox(width: 6),
      Flexible(
        child: Text(
          context.tr(label),
          style: TextStyle(
            fontSize: 12,
            color: context.colors.muted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    ],
  );
}
