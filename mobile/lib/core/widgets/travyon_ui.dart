import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Shared building blocks for the mobile redesign.
///
/// Keeping surface, icon and section treatments here prevents individual
/// features from gradually inventing different card systems again.
abstract final class TravyonSpace {
  static const page = 20.0;
  static const section = 28.0;
  static const card = 18.0;
  static const compact = 12.0;
}

abstract final class TravyonRadius {
  static const panel = 24.0;
  static const control = 16.0;
  static const badge = 14.0;
}

class TravyonWordmark extends StatelessWidget {
  const TravyonWordmark({super.key, this.size = 23});

  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Travyon',
    excludeSemantics: true,
    child: Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'trav',
            style: TextStyle(color: context.colors.text),
          ),
          TextSpan(
            text: 'yon',
            style: TextStyle(color: context.colors.accent),
          ),
        ],
      ),
      style: TextStyle(
        fontFamily: AppTypography.body,
        fontSize: size,
        fontWeight: FontWeight.w700,
        letterSpacing: -1,
      ),
    ),
  );
}

class TravyonSurface extends StatelessWidget {
  const TravyonSurface({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.color,
    this.borderRadius = TravyonRadius.panel,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final double borderRadius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      side: BorderSide(color: colors.divider),
    );
    final content = padding == null
        ? child
        : Padding(padding: padding!, child: child);
    final surface = Material(
      color: color ?? colors.surface,
      elevation: 0,
      shadowColor: colors.text.withValues(alpha: .08),
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? content
          : InkWell(
              onTap: onTap,
              splashColor: colors.forest.withValues(alpha: .08),
              highlightColor: colors.forest.withValues(alpha: .035),
              child: content,
            ),
    );
    final semanticSurface = semanticLabel == null
        ? surface
        : Semantics(
            button: onTap != null,
            label: semanticLabel,
            child: surface,
          );
    return margin == null
        ? semanticSurface
        : Padding(padding: margin!, child: semanticSurface);
  }
}

class TravyonIconBadge extends StatelessWidget {
  const TravyonIconBadge({
    super.key,
    required this.icon,
    this.color,
    this.background,
    this.size = 42,
  });

  final IconData icon;
  final Color? color, background;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: background ?? colors.greenTint,
        borderRadius: BorderRadius.circular(TravyonRadius.badge),
      ),
      child: Icon(icon, size: size * .48, color: color ?? colors.forest),
    );
  }
}

class TravyonSectionHeader extends StatelessWidget {
  const TravyonSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? subtitle, actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            if (subtitle != null) ...[
              const SizedBox(height: 5),
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: context.colors.muted, height: 1.4),
              ),
            ],
          ],
        ),
      ),
      if (actionLabel != null && onAction != null)
        TextButton(onPressed: onAction, child: Text(actionLabel!)),
    ],
  );
}
