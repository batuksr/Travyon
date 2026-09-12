import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../wallet/data/wallet_repository.dart';
import '../data/travel_plans_repository.dart';
import '../data/plan_detail.dart';

class NextStopPanel extends StatelessWidget {
  const NextStopPanel({
    super.key,
    required this.day,
    required this.onDirections,
  });
  final PlanDay day;
  final ValueChanged<PlanStop> onDirections;
  @override
  Widget build(BuildContext context) {
    final remaining = day.stops.where((stop) => !stop.completed);
    final next = remaining.isEmpty ? null : remaining.first;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF0E8),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            next == null
                ? (day.stops.isEmpty
                      ? 'Henüz durak yok'
                      : 'Bugünün rotası tamamlandı')
                : 'Sıradaki durak',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.forest,
            ),
          ),
          if (next != null) ...[
            const SizedBox(height: 6),
            Text(
              next.name,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
            TextButton.icon(
              onPressed: () => onDirections(next),
              icon: const Icon(Icons.near_me_outlined, size: 18),
              label: const Text('Yol tarifi al'),
            ),
          ],
        ],
      ),
    );
  }
}

String journeyMoney(String symbol, double value) =>
    '$symbol${value.toStringAsFixed(value == value.roundToDouble() ? 0 : 2)}';

/// Matches the web: only this plan, exact date or inclusive stay/insurance range.
List<WalletEntry> walletEntriesForDay(
  List<WalletEntry> entries,
  String planId,
  String date,
) {
  final pattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');
  if (planId.isEmpty || !pattern.hasMatch(date)) return [];
  final result = entries.where((entry) {
    if (entry.planId != planId || !pattern.hasMatch(entry.date)) return false;
    final end = entry.category == 'stay'
        ? entry.details['checkOut']
        : entry.category == 'insurance'
        ? entry.details['endDate']
        : null;
    return entry.date == date ||
        (end != null &&
            pattern.hasMatch(end) &&
            entry.date.compareTo(date) <= 0 &&
            date.compareTo(end) <= 0);
  }).toList();
  result.sort(
    (a, b) => (a.details['time'] ?? '').compareTo(b.details['time'] ?? ''),
  );
  return result;
}

class PlanBudgetSummary extends StatelessWidget {
  const PlanBudgetSummary({
    super.key,
    required this.plan,
    this.collapsible = false,
  });
  final TravelPlanSummary plan;
  final bool collapsible;
  @override
  Widget build(BuildContext context) {
    final spent = plan.days
        .expand((d) => d.stops)
        .fold<double>(0, (sum, stop) => sum + (stop.actual ?? 0));
    final budget = plan.allocatedBudget;
    final hasBudget = budget > 0;
    final remaining = budget - spent;
    final status = !hasBudget
        ? 'Bütçe belirlenmedi'
        : remaining < 0
        ? '${journeyMoney(plan.currencySymbol, -remaining)} bütçe aşıldı'
        : '${journeyMoney(plan.currencySymbol, remaining)} kaldı';
    final content = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 24,
            runSpacing: 16,
            children: [
              for (final item in [
                (
                  'Tahmini plan maliyeti',
                  journeyMoney(plan.currencySymbol, plan.estimatedCost),
                ),
                ('Gerçek harcama', journeyMoney(plan.currencySymbol, spent)),
                (
                  'Ayrılan bütçe',
                  hasBudget
                      ? journeyMoney(plan.currencySymbol, budget)
                      : 'Belirlenmedi',
                ),
              ])
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.$1,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.$2,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (hasBudget) ...[
            const SizedBox(height: 18),
            LinearProgressIndicator(
              value: (spent / budget).clamp(0, 1),
              color: remaining < 0
                  ? Theme.of(context).colorScheme.error
                  : AppColors.forest,
              backgroundColor: AppColors.divider,
              borderRadius: BorderRadius.circular(4),
              minHeight: 5,
            ),
          ],
          const SizedBox(height: 12),
          Text(
            status,
            style: TextStyle(
              color: hasBudget && remaining < 0
                  ? Theme.of(context).colorScheme.error
                  : AppColors.forest,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Gerçek harcama, duraklara girdiğin tutarların toplamıdır. Cüzdan belgeleri ayrıca ücret olarak eklenmez.',
            style: TextStyle(color: AppColors.muted, fontSize: 11, height: 1.4),
          ),
        ],
      ),
    );
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: collapsible
          ? ExpansionTile(
              key: const PageStorageKey('journey-budget'),
              leading: const Icon(
                Icons.account_balance_wallet_outlined,
                color: AppColors.forest,
              ),
              title: const Text(
                'Seyahat bütçesi',
                style: TextStyle(
                  fontFamily: AppTypography.body,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                '${journeyMoney(plan.currencySymbol, spent)} harcandı · $status',
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              children: [content],
            )
          : content,
    );
  }
}

class DayWalletPanel extends StatefulWidget {
  const DayWalletPanel({
    super.key,
    required this.uid,
    required this.planId,
    required this.date,
    required this.repository,
  });
  final String uid, planId, date;
  final WalletRepository repository;
  @override
  State<DayWalletPanel> createState() => _DayWalletPanelState();
}

class _DayWalletPanelState extends State<DayWalletPanel> {
  late Stream<List<WalletEntry>> _stream = _watch();
  Stream<List<WalletEntry>> _watch() {
    try {
      return widget.repository.watch(widget.uid);
    } catch (e) {
      return Stream.error(e);
    }
  }

  @override
  void didUpdateWidget(covariant DayWalletPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.repository != widget.repository) {
      _stream = _watch();
    }
  }

  Future<void> _open(String url) async {
    final safe = walletUrl(url);
    if (safe == null || safe.isEmpty) return;
    try {
      if (await launchUrl(
        Uri.parse(safe),
        mode: LaunchMode.externalApplication,
      )) {
        return;
      }
    } catch (_) {
      /* Show the same recoverable message below. */
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rezervasyon bağlantısı açılamadı.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<List<WalletEntry>>(
    stream: _stream,
    builder: (context, snapshot) {
      final entries = walletEntriesForDay(
        snapshot.data ?? [],
        widget.planId,
        widget.date,
      );
      return Material(
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.divider),
        ),
        clipBehavior: Clip.antiAlias,
        child: ExpansionTile(
        key: PageStorageKey('day-wallet-${widget.planId}-${widget.date}'),
          leading: const Icon(Icons.wallet_outlined, color: AppColors.forest),
          title: Text(
            'Günün cüzdan kayıtları${snapshot.hasData && !snapshot.hasError ? ' · ${entries.length}' : ''}',
            style: const TextStyle(
              fontFamily: AppTypography.body,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
          children: [
            if (snapshot.hasError) ...[
              const Text(
                'Cüzdan kayıtları yüklenemedi. Planını kullanmaya devam edebilirsin.',
              ),
              TextButton(
                onPressed: () => setState(() => _stream = _watch()),
                child: const Text('Cüzdanı tekrar yükle'),
              ),
            ] else if (!snapshot.hasData)
              const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              )
            else if (entries.isEmpty)
              const Text(
                'Bu plana ve güne ait cüzdan kaydı yok. Cüzdan sekmesinden planına bilet veya rezervasyon ekleyebilirsin.',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 13,
                  height: 1.5,
                ),
              )
            else ...[
              for (final entry in entries)
                ExpansionTile(
                  key: PageStorageKey('wallet-entry-${entry.id}-${entry.updatedAt}'),
                  tilePadding: const EdgeInsets.symmetric(horizontal: 4),
                  title: Text(
                    entry.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    '${walletCategories[entry.category] ?? 'Diğer'}${entry.details['time']?.isNotEmpty == true ? ' · ${entry.details['time']}' : ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                  children: [
                    for (final item in [
                      if (entry.reference.isNotEmpty)
                        ('Referans', entry.reference),
                      ('Tarih', entry.date),
                      for (final field in entry.details.entries)
                        if (field.value.isNotEmpty)
                          (
                            walletFields[entry.category]?[field.key] ??
                                field.key,
                            field.value,
                          ),
                      if (entry.note.isNotEmpty) ('Not', entry.note),
                    ])
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: 5,
                          horizontal: 4,
                        ),
                        child: Align(
                          alignment: Alignment.centerLeft,
                        child: SelectableText(
                          key: PageStorageKey('wallet-field-${entry.id}-${item.$1}'),
                            '${item.$1}: ${item.$2}',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    if (walletUrl(entry.url)?.isNotEmpty == true)
                      TextButton.icon(
                        onPressed: () => _open(entry.url),
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text('Rezervasyonu aç'),
                      ),
                  ],
                ),
              const SizedBox(height: 8),
              const Text(
                'Bunlar cüzdanındaki kayıtların görünümüdür; bütçeye tekrar eklenmez.',
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ],
        ),
      );
    },
  );
}
