import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';

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
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (var i = 0; i < labels.length; i++)
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: constraints.maxWidth),
              child: Semantics(
                selected: selected == i,
                child: OutlinedButton(
                  key: ValueKey('community-filter-$i'),
                  onPressed: () => onSelect(i),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    minimumSize: const Size(48, 48),
                    backgroundColor: selected == i
                        ? context.colors.orangeTint
                        : context.colors.surface,
                    foregroundColor: context.colors.text,
                    side: BorderSide(
                      color: selected == i
                          ? context.colors.accent
                          : context.colors.divider,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(32),
                    ),
                  ),
                  child: Text(
                    labels[i],
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppTypography.body,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      color: context.colors.text,
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
  Widget build(BuildContext context) => TravyonSurface(
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
    borderRadius: 20,
    child: Column(
      children: [
        TravyonIconBadge(
          icon: icon,
          size: 64,
          background: context.colors.background,
          color: context.colors.text,
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
          FilledButton.icon(
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
      Icon(icon, size: 15, color: context.colors.muted),
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
