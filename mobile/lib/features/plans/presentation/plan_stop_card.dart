import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';

/// A stop's content and direct actions, with no independent save state.
class PlanStopCard extends StatefulWidget {
  const PlanStopCard({
    super.key,
    required this.stop,
    required this.symbol,
    required this.busy,
    required this.onComplete,
    required this.onAction,
    required this.canMoveUp,
    required this.canMoveDown,
  });

  final PlanStop stop;
  final String symbol;
  final bool busy;
  final VoidCallback onComplete;
  final ValueChanged<String> onAction;
  final bool canMoveUp, canMoveDown;

  @override
  State<PlanStopCard> createState() => _PlanStopCardState();
}

class _PlanStopCardState extends State<PlanStopCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final stop = widget.stop;
    final amount = UnitFormatter.of(context)
        .number(stop.estimated, fractionDigits: 2);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppColors.text.withValues(alpha: 0.035),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: AppColors.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: const BorderSide(color: AppColors.divider),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        constraints: const BoxConstraints(
                          minWidth: 34,
                          minHeight: 34,
                        ),
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8EADC),
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Text(
                          '${stop.index + 1}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFFA74F21),
                            fontSize: 14,
                            height: 1.4,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            stop.name,
                            style: const TextStyle(
                              color: AppColors.text,
                              fontSize: 18,
                              height: 1.35,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Semantics(
                        toggled: stop.completed,
                        child: IconButton(
                          tooltip: context.tr(
                            stop.completed
                                ? 'Gezildi işaretini kaldır'
                                : 'Gezildi olarak işaretle',
                          ),
                          onPressed: widget.busy ? null : widget.onComplete,
                          style: IconButton.styleFrom(
                            minimumSize: const Size(48, 48),
                            backgroundColor: stop.completed
                                ? AppColors.forest
                                : const Color(0xFFF3EFE7),
                            foregroundColor: stop.completed
                                ? Colors.white
                                : AppColors.muted,
                            disabledBackgroundColor: stop.completed
                                ? AppColors.forest.withValues(alpha: 0.5)
                                : const Color(0xFFF3EFE7),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          icon: const Icon(Icons.check_rounded, size: 23),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F0E7),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        const Icon(
                          Icons.payments_outlined,
                          size: 16,
                          color: AppColors.muted,
                        ),
                        Text(
                          context.tr('Tahmini maliyet'),
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          '${widget.symbol}$amount',
                          style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (stop.description.trim().isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _description(context),
                  ],
                  if (stop.note.trim().isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDF2EC),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Notun'),
                            style: const TextStyle(
                              color: AppColors.forest,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            stop.note,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.forest,
                              fontSize: 13,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Divider(height: 1, color: AppColors.divider),
            _actions(context),
          ],
        ),
      ),
    );
  }

  Widget _description(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final style = DefaultTextStyle.of(context).style.merge(
        const TextStyle(
          color: AppColors.muted,
          fontFamily: AppTypography.body,
          fontSize: 14,
          height: 1.6,
        ),
      );
      final painter = TextPainter(
        text: TextSpan(text: widget.stop.description, style: style),
        maxLines: 3,
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
      )..layout(maxWidth: constraints.maxWidth);
      final overflows = painter.didExceedMaxLines;
      painter.dispose();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.stop.description,
            style: style,
            maxLines: _expanded ? null : 3,
            overflow: _expanded ? null : TextOverflow.ellipsis,
          ),
          if (overflows)
            TextButton.icon(
              onPressed: () => setState(() => _expanded = !_expanded),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFA74F21),
                padding: EdgeInsets.zero,
                textStyle: const TextStyle(
                  fontFamily: AppTypography.body,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              iconAlignment: IconAlignment.end,
              icon: Icon(
                _expanded
                    ? Icons.keyboard_arrow_up_rounded
                    : Icons.keyboard_arrow_down_rounded,
                size: 18,
              ),
              label: Text(context.tr(_expanded ? 'Daha az' : 'Devamını oku')),
            ),
        ],
      );
    },
  );

  Widget _actions(BuildContext context) => Container(
    color: const Color(0xFFFAF6EE),
    padding: const EdgeInsets.all(12),
    child: LayoutBuilder(
      builder: (context, constraints) {
        final note = TextButton.icon(
          onPressed: widget.busy ? null : () => widget.onAction('note'),
          style: TextButton.styleFrom(
            backgroundColor: const Color(0xFFEAF0E9),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontFamily: AppTypography.body,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          icon: Icon(
            widget.stop.note.isEmpty
                ? Icons.note_add_outlined
                : Icons.edit_note_rounded,
            size: 18,
          ),
          label: Text(
            context.tr(widget.stop.note.isEmpty ? 'Not ekle' : 'Notu düzenle'),
          ),
        );
        final controls = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border.all(color: AppColors.divider),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _actionIcon(
                    'Yukarı taşı',
                    Icons.arrow_upward_rounded,
                    widget.canMoveUp ? () => widget.onAction('up') : null,
                  ),
                  Container(width: 1, height: 18, color: AppColors.divider),
                  _actionIcon(
                    'Aşağı taşı',
                    Icons.arrow_downward_rounded,
                    widget.canMoveDown ? () => widget.onAction('down') : null,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _actionIcon(
              'Durağı sil',
              Icons.delete_outline_rounded,
              () => widget.onAction('delete'),
              destructive: true,
            ),
          ],
        );
        // Allow the note action a full row on narrow or large-text layouts.
        final compact =
            constraints.maxWidth < 305 ||
            MediaQuery.textScalerOf(context).scale(12) > 15;
        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              note,
              const SizedBox(height: 8),
              Align(alignment: Alignment.centerRight, child: controls),
            ],
          );
        }
        return Row(
          children: [
            Expanded(child: note),
            const SizedBox(width: 10),
            controls,
          ],
        );
      },
    ),
  );

  Widget _actionIcon(
    String label,
    IconData icon,
    VoidCallback? onPressed, {
    bool destructive = false,
  }) => IconButton(
    tooltip: context.tr(label),
    onPressed: widget.busy ? null : onPressed,
    style: IconButton.styleFrom(
      minimumSize: const Size(48, 48),
      foregroundColor: destructive ? const Color(0xFF9B3020) : AppColors.muted,
      backgroundColor: destructive ? const Color(0xFFF9EDE7) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    icon: Icon(icon, size: 19),
  );
}
