import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class HelpPanel extends StatelessWidget {
  const HelpPanel({super.key, required this.child, this.padding = 20});
  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Material(
      color: context.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: context.colors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: EdgeInsets.all(padding), child: child),
    ),
  );
}

class HelpHeading extends StatelessWidget {
  const HelpHeading({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
  });
  final String title, subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: context.colors.forest.withValues(alpha: 0.09),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: context.colors.forest, size: 26),
        ),
        const SizedBox(height: 16),
        Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
        ),
        const SizedBox(height: 10),
        Text(
          subtitle,
          style: TextStyle(color: context.colors.muted, height: 1.6),
        ),
      ],
    ),
  );
}
