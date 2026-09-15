import 'package:flutter/material.dart';

import '../localization/app_localizations.dart';
import '../theme/app_theme.dart';

enum AppDialogTone { standard, warning, destructive }

Future<bool> showAppConfirmation(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = 'Vazgeç',
  IconData icon = Icons.help_outline_rounded,
  AppDialogTone tone = AppDialogTone.standard,
}) async =>
    await showDialog<bool>(
      context: context,
      barrierColor: AppColors.text.withValues(alpha: 0.42),
      builder: (context) => AppDialog(
        title: title,
        message: message,
        icon: icon,
        tone: tone,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        onConfirm: () => Navigator.pop(context, true),
        onCancel: () => Navigator.pop(context, false),
      ),
    ) ??
    false;

Future<void> showAppInformation(
  BuildContext context, {
  required String title,
  required String message,
  IconData icon = Icons.info_outline_rounded,
}) => showDialog<void>(
  context: context,
  barrierColor: AppColors.text.withValues(alpha: 0.42),
  builder: (context) => AppDialog(
    title: title,
    message: message,
    icon: icon,
    confirmLabel: 'Tamam',
    onConfirm: () => Navigator.pop(context),
    onCancel: () => Navigator.pop(context),
  ),
);

/// Shared presentation only: callers retain their validation and save logic.
class AppDialog extends StatelessWidget {
  const AppDialog({
    super.key,
    required this.title,
    required this.confirmLabel,
    required this.onConfirm,
    required this.onCancel,
    this.message,
    this.content,
    this.cancelLabel,
    this.icon = Icons.info_outline_rounded,
    this.tone = AppDialogTone.standard,
    this.busy = false,
  });

  final String title, confirmLabel;
  final String? message, cancelLabel;
  final Widget? content;
  final IconData icon;
  final AppDialogTone tone;
  final VoidCallback? onConfirm, onCancel;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final (color, tint) = switch (tone) {
      AppDialogTone.standard => (
        context.colors.forest,
        context.colors.tone(const Color(0xFFE8EFE8)),
      ),
      AppDialogTone.warning => (
        context.colors.tone(const Color(0xFFA45229)),
        context.colors.tone(const Color(0xFFF8E9DC)),
      ),
      AppDialogTone.destructive => (
        context.colors.tone(const Color(0xFFA83E35)),
        context.colors.tone(const Color(0xFFF8E6E2)),
      ),
    };
    const buttonText = TextStyle(
      fontFamily: AppTypography.body,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 1.3,
    );
    final confirm = context.tr(confirmLabel);
    final cancel = cancelLabel == null ? null : context.tr(cancelLabel!);

    Widget primary() => FilledButton(
      key: const ValueKey('dialog-confirm'),
      onPressed: busy ? null : onConfirm,
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: context.colors.isDark
            ? context.colors.background
            : Colors.white,
        minimumSize: const Size(0, 50),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: buttonText,
      ),
      child: busy
          ? Semantics(
              label: confirm,
              child: SizedBox.square(
                dimension: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: color),
              ),
            )
          : Text(confirm, textAlign: TextAlign.center),
    );

    Widget secondary() => OutlinedButton(
      key: const ValueKey('dialog-cancel'),
      onPressed: busy ? null : onCancel,
      style: OutlinedButton.styleFrom(
        foregroundColor: context.colors.text,
        side: BorderSide(color: context.colors.divider),
        minimumSize: const Size(0, 50),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: buttonText,
      ),
      child: Text(cancel!, textAlign: TextAlign.center),
    );

    double labelWidth(String label) {
      final painter = TextPainter(
        text: TextSpan(text: label, style: buttonText),
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
      )..layout();
      final width = painter.width;
      painter.dispose();
      return width + 40;
    }

    return Dialog(
      backgroundColor: context.colors.surface,
      surfaceTintColor: Colors.transparent,
      shadowColor: AppColors.text.withValues(alpha: 0.16),
      elevation: 8,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      constraints: const BoxConstraints(maxWidth: 400),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: BorderSide(color: context.colors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: tint,
                      borderRadius: BorderRadius.circular(17),
                    ),
                    child: Icon(icon, color: color, size: 25),
                  ),
                  const Spacer(),
                  IconButton(
                    key: const ValueKey('dialog-close'),
                    tooltip: context.tr('Kapat'),
                    onPressed: busy ? null : onCancel,
                    icon: const Icon(Icons.close_rounded, size: 21),
                    color: context.colors.muted,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Semantics(
                namesRoute: true,
                header: true,
                child: Text(
                  context.tr(title),
                  style: TextStyle(
                    fontFamily: AppTypography.heading,
                    fontSize: 23,
                    height: 1.25,
                    color: context.colors.text,
                  ),
                ),
              ),
              if (message != null) ...[
                const SizedBox(height: 12),
                Text(
                  context.tr(message!),
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: context.colors.muted,
                  ),
                ),
              ],
              if (content != null) ...[const SizedBox(height: 20), content!],
              const SizedBox(height: 26),
              LayoutBuilder(
                builder: (context, constraints) {
                  if (cancel == null) {
                    return SizedBox(width: double.infinity, child: primary());
                  }
                  final halfWidth = (constraints.maxWidth - 10) / 2;
                  if (labelWidth(confirm) > halfWidth ||
                      labelWidth(cancel) > halfWidth) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        primary(),
                        const SizedBox(height: 10),
                        secondary(),
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: secondary()),
                      const SizedBox(width: 10),
                      Expanded(child: primary()),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
