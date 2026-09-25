import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/wallet_repository.dart';
import 'wallet_pocket.dart';
import 'wallet_flight_card.dart';

String walletDisplayDate(
  BuildContext context,
  String value, {
  bool compact = false,
}) {
  final parts = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
  if (parts == null) return value;
  final year = int.parse(parts[1]!);
  final month = int.parse(parts[2]!);
  final day = int.parse(parts[3]!);
  final date = DateTime(year, month, day);
  if (date.year != year || date.month != month || date.day != day) return value;
  final locale = MaterialLocalizations.of(context);
  final dayLabel = compact
      ? locale.formatShortMonthDay(date)
      : locale.formatMediumDate(date);
  return '$dayLabel ${locale.formatYear(date)}';
}

class WalletRecordCard extends StatelessWidget {
  const WalletRecordCard({
    super.key,
    required this.entry,
    required this.onOpen,
    this.highlight = false,
  });
  final WalletEntry entry;
  final VoidCallback? onOpen;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    if (entry.category == 'flight') {
      return WalletFlightCard(
        entry: entry,
        onOpen: onOpen,
        dateLabel: entry.date.isEmpty
            ? '—'
            : walletDisplayDate(context, entry.date, compact: true),
      );
    }
    return Material(
      color: context.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: highlight ? context.colors.accent : context.colors.divider,
          width: highlight ? 1.5 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('wallet-entry-${entry.id}'),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: context.colors.greenTint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  walletIcon(entry.category),
                  color: context.colors.text,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr(walletCategories[entry.category] ?? 'Diğer'),
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      entry.title,
                      style: TextStyle(
                        color: context.colors.text,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _metadata(context),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: context.colors.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metadata(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 6,
    children: [
      _detail(
        context,
        Icons.calendar_today_outlined,
        entry.date.isEmpty
            ? context.tr('Tarih eklenmedi')
            : walletDisplayDate(context, entry.date),
      ),
      if (entry.details['time']?.isNotEmpty == true)
        _detail(context, Icons.schedule_rounded, entry.details['time']!),
      if (entry.reference.isNotEmpty)
        _detail(
          context,
          Icons.confirmation_number_outlined,
          context.tr('Kod kayıtlı'),
        ),
    ],
  );

  Widget _detail(BuildContext context, IconData icon, String text) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 13, color: context.colors.muted),
      const SizedBox(width: 5),
      Flexible(
        child: Text(
          text,
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 11,
            height: 1.4,
          ),
        ),
      ),
    ],
  );
}

class WalletCategories extends StatelessWidget {
  const WalletCategories({
    super.key,
    required this.entries,
    required this.selected,
    required this.onSelect,
  });
  final List<WalletEntry> entries;
  final String? selected;
  final ValueChanged<String?> onSelect;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    key: const ValueKey('wallet-categories'),
    scrollDirection: Axis.horizontal,
    child: Row(
      children: [
        for (final category in <String?>[
          null,
          ...walletCategories.keys.where(
            (key) => entries.any((entry) => entry.category == key),
          ),
        ])
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Semantics(
              selected: selected == category,
              inMutuallyExclusiveGroup: true,
              child: OutlinedButton(
                key: ValueKey('wallet-filter-${category ?? 'all'}'),
                onPressed: () => onSelect(category),
                style: OutlinedButton.styleFrom(
                  backgroundColor: selected == category
                      ? context.colors.greenTint
                      : context.colors.surface,
                  foregroundColor: context.colors.text,
                  side: BorderSide(
                    color: selected == category
                        ? context.colors.accent
                        : context.colors.divider,
                  ),
                  shape: const StadiumBorder(),
                  minimumSize: const Size(48, 44),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: Text(
                  context.tr(
                    category == null ? 'Tümü' : walletCategories[category]!,
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class WalletEmptyGuide extends StatelessWidget {
  const WalletEmptyGuide({super.key});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        context.tr(
          'Biletlerin, rezervasyonların ve notların burada bir araya gelsin. Bir kayıt ekle, kartın cüzdanına yerleşsin.',
        ),
        style: TextStyle(
          color: context.colors.muted,
          fontSize: 13,
          height: 1.6,
        ),
      ),
      const SizedBox(height: 20),
      _WalletBenefit(
        icon: Icons.flight_takeoff_rounded,
        label: context.tr('Uçuşların ve rezervasyon kodların'),
      ),
      const SizedBox(height: 12),
      _WalletBenefit(
        icon: Icons.hotel_outlined,
        label: context.tr('Konaklama bilgilerin ve giriş tarihlerin'),
      ),
      const SizedBox(height: 12),
      _WalletBenefit(
        icon: Icons.confirmation_number_outlined,
        label: context.tr('Etkinlik biletlerin ve seyahat notların'),
      ),
    ],
  );
}

class _WalletBenefit extends StatelessWidget {
  const _WalletBenefit({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: context.colors.greenTint,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: context.colors.divider),
        ),
        child: Icon(icon, size: 20, color: context.colors.text),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Text(
          label,
          style: TextStyle(
            color: context.colors.text,
            fontSize: 13,
            height: 1.45,
          ),
        ),
      ),
    ],
  );
}

class WalletLoadError extends StatelessWidget {
  const WalletLoadError({
    super.key,
    required this.message,
    required this.onRetry,
  });
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: context.colors.surface,
      border: Border.all(color: context.colors.divider),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      children: [
        Icon(Icons.cloud_off_outlined, color: context.colors.muted, size: 28),
        const SizedBox(height: 12),
        Text(
          context.tr(message),
          textAlign: TextAlign.center,
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 13,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: Text(context.tr('Tekrar dene')),
        ),
      ],
    ),
  );
}
