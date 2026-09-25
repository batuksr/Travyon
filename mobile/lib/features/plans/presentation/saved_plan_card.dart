import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../hub/data/hub_content.dart';
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
    return TravyonSurface(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(16, 4, 12, 10),
      borderRadius: 20,
      onTap: busy ? null : onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: context.colors.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        savedPlanStatus(plan, DateTime.now()),
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: context.tr(
                  plan.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle',
                ),
                onPressed: busy ? null : onFavorite,
                iconSize: 21,
                icon: Icon(
                  plan.isFavorite
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  color: plan.isFavorite
                      ? context.colors.accent
                      : context.colors.muted,
                ),
              ),
              if (busy)
                const Padding(
                  padding: EdgeInsets.all(12),
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
                  color: context.colors.surface,
                  surfaceTintColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                  icon: Icon(
                    Icons.more_horiz_rounded,
                    color: context.colors.muted,
                    size: 22,
                  ),
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'rename',
                      child: Text('Adını değiştir'),
                    ),
                    const PopupMenuItem(
                      value: 'link',
                      child: Text('Bağlantıyı kopyala'),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Text(
                        'Planı sil',
                        style: TextStyle(color: context.colors.danger),
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DestinationThumbnail(destination: plan.destination),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plan.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                    if (plan.title != plan.destination) ...[
                      const SizedBox(height: 5),
                      Text(
                        plan.destination,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      dates.isEmpty ? 'Tarih belirtilmedi' : dates,
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 12,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _Detail(
                icon: Icons.calendar_today_outlined,
                text: '${plan.dayCount} gün',
              ),
              _Detail(
                icon: Icons.place_outlined,
                text: '${plan.activityCount} durak',
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(height: 1, color: context.colors.divider),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, bounds) {
              final cost = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tahmini toplam',
                    style: TextStyle(color: context.colors.muted, fontSize: 11),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${plan.currencySymbol}${plan.estimatedCost.toStringAsFixed(0)}',
                    style: TextStyle(
                      color: context.colors.text,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              );
              final open = TextButton.icon(
                key: ValueKey('saved-plan-open-${plan.id}'),
                onPressed: busy ? null : onOpen,
                iconAlignment: IconAlignment.end,
                icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                label: const Text('Planı aç'),
              );
              if (MediaQuery.textScalerOf(context).scale(14) > 20 ||
                  bounds.maxWidth < 260) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    cost,
                    Align(alignment: Alignment.centerRight, child: open),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(child: cost),
                  const SizedBox(width: 12),
                  open,
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _DestinationThumbnail extends StatelessWidget {
  const _DestinationThumbnail({required this.destination});
  final String destination;

  @override
  Widget build(BuildContext context) {
    final known = hubCities
        .where(
          (city) =>
              city.destination == destination ||
              city.destinationFor(true) == destination,
        )
        .firstOrNull;
    final fallback = ColoredBox(
      color: context.colors.background,
      child: Center(
        child: Icon(Icons.map_outlined, size: 28, color: context.colors.muted),
      ),
    );
    return ExcludeSemantics(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          width: 64,
          height: 76,
          child: known == null
              ? fallback
              : Image.network(
                  known.imageUrl,
                  fit: BoxFit.cover,
                  cacheWidth: 240,
                  errorBuilder: (_, _, _) => fallback,
                ),
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: context.colors.muted),
      const SizedBox(width: 6),
      Flexible(
        child: Text(
          text,
          style: TextStyle(color: context.colors.muted, fontSize: 12),
        ),
      ),
    ],
  );
}
