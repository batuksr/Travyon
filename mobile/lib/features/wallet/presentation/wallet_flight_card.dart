import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/wallet_repository.dart';

/// A compact boarding-pass overview. Private booking codes stay in details.
class WalletFlightCard extends StatelessWidget {
  const WalletFlightCard({
    super.key,
    required this.entry,
    required this.onOpen,
    required this.dateLabel,
  });

  final WalletEntry entry;
  final VoidCallback? onOpen;
  final String dateLabel;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final airline = entry.details['airline']?.trim() ?? '';
    final number = entry.details['flightNumber']?.trim() ?? '';
    final origin = entry.details['origin']?.trim() ?? '';
    final destination = entry.details['destination']?.trim() ?? '';
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: colors.text.withValues(alpha: .04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        key: ValueKey('wallet-flight-surface-${entry.id}'),
        color: colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: colors.divider),
        ),
        clipBehavior: Clip.antiAlias,
        child: Semantics(
          label: entry.title,
          child: InkWell(
            key: ValueKey('wallet-entry-${entry.id}'),
            onTap: onOpen,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: colors.greenTint,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.flight_takeoff_rounded,
                          size: 16,
                          color: colors.accent,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 3,
                        child: Text(
                          airline.isEmpty ? entry.title : airline,
                          style: TextStyle(
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 1.4,
                          ),
                        ),
                      ),
                      if (number.isNotEmpty) ...[
                        const SizedBox(width: 12),
                        Flexible(
                          child: Align(
                            alignment: Alignment.centerRight,
                            child: Text(
                              number,
                              textAlign: TextAlign.end,
                              style: TextStyle(
                                color: colors.muted,
                                fontSize: 10,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1, color: colors.divider),
                  ),
                  if (origin.isNotEmpty || destination.isNotEmpty) ...[
                    Row(
                      key: ValueKey('wallet-flight-route-${entry.id}'),
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(child: _airport(context, 'Kalkış', origin)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: ExcludeSemantics(
                            child: Icon(
                              Icons.flight_rounded,
                              color: colors.accent.withValues(alpha: .45),
                              size: 18,
                            ),
                          ),
                        ),
                        Expanded(
                          child: _airport(
                            context,
                            'Varış',
                            destination,
                            alignEnd: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: colors.background,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final time = entry.details['time'] ?? '';
                        final seat = entry.details['seat'] ?? '';
                        if (MediaQuery.textScalerOf(context).scale(12) > 16) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _info(context, 'Tarih', dateLabel),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(child: _info(context, 'Saat', time)),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _info(
                                      context,
                                      'Koltuk',
                                      seat,
                                      align: TextAlign.end,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          );
                        }
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 2,
                              child: _info(context, 'Tarih', dateLabel),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _info(
                                context,
                                'Saat',
                                time,
                                align: TextAlign.center,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _info(
                                context,
                                'Koltuk',
                                seat,
                                align: TextAlign.end,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _airport(
    BuildContext context,
    String label,
    String value, {
    bool alignEnd = false,
  }) => Column(
    crossAxisAlignment: alignEnd
        ? CrossAxisAlignment.end
        : CrossAxisAlignment.start,
    children: [
      Text(
        value.isEmpty ? '—' : value,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        textAlign: alignEnd ? TextAlign.end : TextAlign.start,
        style: TextStyle(
          color: context.colors.text,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          height: 1.25,
        ),
      ),
      const SizedBox(height: 3),
      Text(
        context.tr(label),
        style: TextStyle(
          color: context.colors.muted,
          fontSize: 10,
          height: 1.3,
        ),
      ),
    ],
  );

  Widget _info(
    BuildContext context,
    String label,
    String value, {
    TextAlign align = TextAlign.start,
  }) => Column(
    crossAxisAlignment: switch (align) {
      TextAlign.end => CrossAxisAlignment.end,
      TextAlign.center => CrossAxisAlignment.center,
      _ => CrossAxisAlignment.start,
    },
    children: [
      Text(
        context.tr(label),
        textAlign: align,
        style: TextStyle(
          color: context.colors.muted,
          fontSize: 10,
          height: 1.3,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        value.trim().isEmpty ? '—' : value,
        textAlign: align,
        style: TextStyle(
          color: context.colors.text,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          height: 1.3,
        ),
      ),
    ],
  );
}
