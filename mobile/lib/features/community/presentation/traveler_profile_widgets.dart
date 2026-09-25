import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../data/community_repository.dart';
import 'community_route_widgets.dart';

class TravelerStats {
  TravelerStats(List<CommunityPlan> plans)
    : routes = plans.length,
      days = plans.fold(0, (sum, plan) => sum + plan.summary.dayCount),
      cities = _cities(plans);

  final int routes, days;
  final List<String> cities;

  static List<String> _cities(List<CommunityPlan> plans) {
    final cities = <String, String>{};
    for (final plan in plans) {
      final city = plan.destination.split(',').first.trim();
      if (city.isNotEmpty && city != 'Yolculuk') {
        cities.putIfAbsent(city.toLowerCase(), () => city);
      }
    }
    return cities.values.toList(growable: false);
  }
}

String travelerInitials(String name) {
  final words = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty);
  return words.isEmpty
      ? 'T'
      : words.take(2).map((word) => word.characters.first).join().toUpperCase();
}

/// Public identity and statistics use the same neutral surfaces as settings.
class TravelerProfileCard extends StatefulWidget {
  const TravelerProfileCard({
    super.key,
    required this.profile,
    required this.stats,
    this.followAction,
  });
  final TravelerProfile profile;
  final TravelerStats? stats;
  final Widget? followAction;

  @override
  State<TravelerProfileCard> createState() => _TravelerProfileCardState();
}

class _TravelerProfileCardState extends State<TravelerProfileCard> {
  bool _allCities = false;

  @override
  void didUpdateWidget(covariant TravelerProfileCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid) _allCities = false;
  }

  Widget _identity(BuildContext context) {
    final name = widget.profile.name == 'Gezgin'
        ? context.tr('Gezgin')
        : widget.profile.name;
    final fallback = ColoredBox(
      color: context.colors.accent,
      child: Center(
        child: Text(
          travelerInitials(name),
          key: const ValueKey('traveler-initials'),
          style: TextStyle(
            color: context.colors.onAccent,
            fontSize: 25,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
    return Column(
      children: [
        ExcludeSemantics(
          child: ClipOval(
            child: SizedBox(
              width: 84,
              height: 84,
              child: widget.profile.photoUrl == null
                  ? fallback
                  : Image.network(
                      widget.profile.photoUrl!,
                      fit: BoxFit.cover,
                      cacheWidth: 252,
                      errorBuilder: (_, _, _) => fallback,
                      frameBuilder: (_, child, frame, synchronous) =>
                          synchronous || frame != null ? child : fallback,
                    ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          name,
          key: const ValueKey('traveler-name'),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            height: 1.3,
            color: context.colors.text,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          context.tr('Her rota, yeni bir hikâye'),
          textAlign: TextAlign.center,
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 12,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _statistics(BuildContext context) {
    final stats = widget.stats;
    final rows = [
      (stats?.routes, 'Paylaşılan rota'),
      (stats?.days, 'Planlanan gün'),
      (stats?.cities.length, 'Farklı şehir'),
    ];
    return TravyonSurface(
      key: const ValueKey('traveler-statistics'),
      borderRadius: 20,
      padding: const EdgeInsets.all(16),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final stacked =
              constraints.maxWidth < 260 ||
              MediaQuery.textScalerOf(context).scale(12) > 18;
          return Wrap(
            spacing: 10,
            runSpacing: 14,
            children: [
              for (final row in rows)
                SizedBox(
                  width: stacked
                      ? constraints.maxWidth
                      : (constraints.maxWidth - 20) / 3,
                  child: Semantics(
                    label:
                        '${context.tr(row.$2)}: ${row.$1 ?? context.tr('Yükleniyor…')}',
                    excludeSemantics: true,
                    child: stacked
                        ? Row(
                            children: [
                              Expanded(
                                child: Text(
                                  context.tr(row.$2),
                                  style: TextStyle(
                                    color: context.colors.muted,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                '${row.$1 ?? '—'}',
                                style: TextStyle(
                                  color: context.colors.text,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          )
                        : Column(
                            children: [
                              Text(
                                '${row.$1 ?? '—'}',
                                style: TextStyle(
                                  color: context.colors.text,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                context.tr(row.$2),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: context.colors.muted,
                                  fontSize: 11,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cities = widget.stats?.cities ?? <String>[];
    return Column(
      key: const ValueKey('traveler-profile-header'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        _identity(context),
        if (widget.followAction != null) ...[
          const SizedBox(height: 18),
          widget.followAction!,
        ],
        const SizedBox(height: 20),
        _statistics(context),
        if (cities.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            context.tr('Planlarındaki şehirler'),
            style: TextStyle(color: context.colors.muted, fontSize: 12),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final city in _allCities ? cities : cities.take(3))
                TravyonSurface(
                  borderRadius: 24,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.place_outlined,
                        size: 15,
                        color: context.colors.muted,
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          city,
                          style: TextStyle(
                            color: context.colors.text,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (cities.length > 3)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(
                key: const ValueKey('traveler-all-cities'),
                onPressed: () => setState(() => _allCities = !_allCities),
                style: TextButton.styleFrom(
                  foregroundColor: context.colors.text,
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: Text(
                  _allCities
                      ? context.tr('Daha az')
                      : context.tr(
                          'Tüm şehirler ({count})',
                          values: {'count': cities.length},
                        ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}

/// Compact profile routes deliberately omit the author's repeated identity.
class TravelerRouteCard extends StatelessWidget {
  const TravelerRouteCard({
    super.key,
    required this.plan,
    required this.onOpen,
  });
  final CommunityPlan plan;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) {
    final summary = plan.summary;
    return TravyonSurface(
      borderRadius: 20,
      child: InkWell(
        key: ValueKey('traveler-route-${plan.id}'),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: context.colors.background,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.route_outlined,
                      size: 18,
                      color: context.colors.text,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.destination,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                            color: context.colors.text,
                          ),
                        ),
                        if (plan.purpose.isNotEmpty) ...[
                          const SizedBox(height: 5),
                          Text(
                            context.tr(plan.purpose),
                            style: TextStyle(
                              fontSize: 12,
                              color: context.colors.muted,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  _metric(
                    context,
                    Icons.calendar_today_outlined,
                    publicRouteCount(context, summary.dayCount, 'gün'),
                  ),
                  _metric(
                    context,
                    Icons.place_outlined,
                    publicRouteCount(context, summary.activityCount, 'durak'),
                  ),
                  _metric(
                    context,
                    Icons.account_balance_wallet_outlined,
                    context.tr(
                      'Tahmini {amount}',
                      values: {
                        'amount': publicRouteMoney(
                          context,
                          summary.currencySymbol,
                          summary.estimatedCost,
                        ),
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                spacing: 14,
                runSpacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  plan.ratingCount == 0
                      ? Text(
                          context.tr('Henüz değerlendirme yok'),
                          style: TextStyle(
                            fontSize: 11,
                            color: context.colors.muted,
                          ),
                        )
                      : _metric(
                          context,
                          Icons.star_rounded,
                          '${UnitFormatter.of(context).number(plan.rating)} · ${publicRouteCount(context, plan.ratingCount, 'değerlendirme')}',
                        ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          context.tr('Rotayı keşfet'),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: context.colors.text,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 17,
                        color: context.colors.text,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metric(BuildContext context, IconData icon, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        icon,
        size: 15,
        color: icon == Icons.star_rounded
            ? context.colors.text
            : context.colors.muted,
      ),
      const SizedBox(width: 5),
      Flexible(
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            height: 1.4,
            color: context.colors.muted,
          ),
        ),
      ),
    ],
  );
}
