import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/travel_plans_repository.dart';

String savedPlanDate(String raw) {
  final date = DateTime.tryParse(raw);
  if (date == null) return '';
  const months = [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}

String savedPlanStatus(TravelPlanSummary plan, DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  final start = DateTime.tryParse(plan.startDate);
  final end = DateTime.tryParse(plan.endDate);
  if (start == null || end == null || end.isBefore(start)) {
    return 'Tarihsiz plan';
  }
  if (today.isAfter(end)) return 'Geçmiş yolculuk';
  if (today.isBefore(start)) return 'Yaklaşan yolculuk';
  return 'Yolculuk devam ediyor';
}

class SavedPlanCard extends StatelessWidget {
  const SavedPlanCard({
    super.key,
    required this.plan,
    required this.busy,
    required this.onOpen,
    required this.onFavorite,
    required this.onAction,
  });
  final TravelPlanSummary plan;
  final bool busy;
  final VoidCallback onOpen, onFavorite;
  final ValueChanged<String> onAction;

  @override
  Widget build(BuildContext context) {
    final dates = [
      savedPlanDate(plan.startDate),
      savedPlanDate(plan.endDate),
    ].where((s) => s.isNotEmpty).toSet().join(' – ');
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 8, 8, 8),
            color: const Color(0xFFEAF0E8),
            child: Row(
              children: [
                const Icon(
                  Icons.route_outlined,
                  size: 18,
                  color: AppColors.forest,
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    savedPlanStatus(plan, DateTime.now()),
                    style: const TextStyle(
                      color: AppColors.forest,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: plan.isFavorite
                      ? 'Favorilerden çıkar'
                      : 'Favorilere ekle',
                  onPressed: busy ? null : onFavorite,
                  icon: Icon(
                    plan.isFavorite
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color: AppColors.accent,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plan.title, style: Theme.of(context).textTheme.titleLarge),
                if (plan.title != plan.destination) ...[
                  const SizedBox(height: 6),
                  Text(
                    plan.destination,
                    style: const TextStyle(color: AppColors.muted, height: 1.4),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 16,
                      color: AppColors.muted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        dates.isEmpty ? 'Tarih belirtilmedi' : dates,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _Detail(
                      icon: Icons.wb_sunny_outlined,
                      text: '${plan.dayCount} gün',
                    ),
                    _Detail(
                      icon: Icons.place_outlined,
                      text: '${plan.activityCount} durak',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Tahmini toplam · ${plan.currencySymbol}${plan.estimatedCost.toStringAsFixed(0)}',
                  style: const TextStyle(
                    color: AppColors.forest,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 18),
                const Divider(height: 1, color: AppColors.divider),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.forest,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: busy ? null : onOpen,
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text('Planı aç'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (busy)
                      const Padding(
                        padding: EdgeInsets.all(14),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    else
                      PopupMenuButton<String>(
                        tooltip: context.tr('Plan işlemleri'),
                        onSelected: onAction,
                        icon: const Icon(Icons.more_horiz_rounded),
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: 'rename',
                            child: Text('Adını değiştir'),
                          ),
                          PopupMenuItem(
                            value: 'link',
                            child: Text('Bağlantıyı kopyala'),
                          ),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text(
                              'Planı sil',
                              style: TextStyle(color: Color(0xFF9B3020)),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
    decoration: BoxDecoration(
      color: const Color(0xFFF6EFE3),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.forest),
        const SizedBox(width: 6),
        Text(text, style: const TextStyle(color: AppColors.text, fontSize: 12)),
      ],
    ),
  );
}
