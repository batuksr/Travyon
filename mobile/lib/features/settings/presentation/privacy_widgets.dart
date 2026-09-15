import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../help/presentation/help_style.dart';

/// Shared visual treatment for settings switches, without changing their
/// consent or persistence behavior. Labels wrap at large accessibility sizes.
class PrivacyToggleCard extends StatelessWidget {
  const PrivacyToggleCard({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.value,
    required this.onChanged,
  });
  final String title, description;
  final IconData icon;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => HelpPanel(
    padding: 16,
    child: InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onChanged == null ? null : () => onChanged!(!value),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: context.colors.forest.withValues(alpha: .08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: context.colors.forest),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  context.tr(title),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Semantics(
                label: context.tr(title),
                child: Switch.adaptive(
                  value: value,
                  onChanged: onChanged,
                  activeThumbColor: context.colors.forest,
                  activeTrackColor: context.colors.tone(
                    const Color(0xFFD8E5DA),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            context.tr(description),
            style: TextStyle(
              fontSize: 12,
              height: 1.6,
              color: context.colors.muted,
            ),
          ),
        ],
      ),
    ),
  );
}

class PrivacySectionHeading extends StatelessWidget {
  const PrivacySectionHeading({super.key, required this.title, this.note});
  final String title;
  final String? note;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 12, 2, 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          child: Text(
            context.tr(title),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: context.colors.forest,
            ),
          ),
        ),
        if (note != null) ...[
          const SizedBox(height: 6),
          Text(
            context.tr(note!),
            style: TextStyle(
              fontSize: 12,
              height: 1.6,
              color: context.colors.muted,
            ),
          ),
        ],
      ],
    ),
  );
}

class PrivacyStatus extends StatelessWidget {
  const PrivacyStatus({
    super.key,
    required this.title,
    required this.message,
    required this.icon,
    this.warning = false,
  });
  final String title, message;
  final IconData icon;
  final bool warning;
  @override
  Widget build(BuildContext context) {
    final color = warning
        ? context.colors.tone(const Color(0xFF8B4A29))
        : context.colors.forest;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: warning
            ? context.colors.tone(const Color(0xFFFFEBD9))
            : context.colors.tone(const Color(0xFFE8EFE8)),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 24, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr(title),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  context.tr(message),
                  style: TextStyle(fontSize: 12, height: 1.6, color: color),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
