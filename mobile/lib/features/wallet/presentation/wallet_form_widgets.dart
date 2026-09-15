import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/wallet_repository.dart';
import 'wallet_pocket.dart';

class WalletTypePicker extends StatelessWidget {
  const WalletTypePicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });
  final String selected;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final columns = MediaQuery.textScalerOf(context).scale(12) > 18 ? 2 : 3;
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final category in walletCategories.entries)
            SizedBox(
              width: (constraints.maxWidth - (columns - 1) * 8) / columns,
              child: Semantics(
                selected: selected == category.key,
                inMutuallyExclusiveGroup: true,
                child: OutlinedButton(
                  key: ValueKey('wallet-type-${category.key}'),
                  onPressed: onChanged == null
                      ? null
                      : () => onChanged!(category.key),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                    foregroundColor: selected == category.key
                        ? context.colors.forest
                        : context.colors.muted,
                    backgroundColor: selected == category.key
                        ? context.colors.greenTint
                        : context.colors.surface,
                    side: BorderSide(
                      color: selected == category.key
                          ? context.colors.forest
                          : context.colors.divider,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    textStyle: const TextStyle(
                      fontFamily: AppTypography.body,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(walletIcon(category.key), size: 21),
                      const SizedBox(height: 8),
                      Text(
                        context.tr(category.value),
                        textAlign: TextAlign.center,
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

class WalletFormSection extends StatelessWidget {
  const WalletFormSection({
    super.key,
    required this.title,
    required this.icon,
    this.subtitle,
  });
  final String title;
  final IconData icon;
  final String? subtitle;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 19, color: context.colors.forest),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                context.tr(title),
                style: TextStyle(
                  color: context.colors.text,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
            ),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            context.tr(subtitle!),
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ],
    ),
  );
}
