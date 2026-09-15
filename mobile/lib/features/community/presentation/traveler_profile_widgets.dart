import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
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

/// A code-drawn passport card matching the website's TravelerProfileCard.
/// Cream ink on the forest artwork is deliberately constant in both themes.
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
  static const ink = Color(0xFFF7EEDB);
  static const mutedInk = Color(0xFFD5DCC7);
  static const rule = Color(0xFF62735B);

  @override
  void didUpdateWidget(covariant TravelerProfileCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid) _allCities = false;
  }

  Widget _identity(BuildContext context, bool stacked) {
    final name = widget.profile.name == 'Gezgin'
        ? context.tr('Gezgin')
        : widget.profile.name;
    final avatar = ExcludeSemantics(
      child: Transform.rotate(
        angle: -.045,
        child: Container(
          width: 64,
          height: 76,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: ink, width: 3),
            color: const Color(0xFF607154),
          ),
          clipBehavior: Clip.antiAlias,
          child: widget.profile.photoUrl == null
              ? _initials(name)
              : Image.network(
                  widget.profile.photoUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => _initials(name),
                  loadingBuilder: (_, child, progress) =>
                      progress == null ? child : _initials(name),
                ),
        ),
      ),
    );
    final identity = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('Her rota, yeni bir hikâye'),
          style: const TextStyle(color: mutedInk, fontSize: 10, height: 1.4),
        ),
        const SizedBox(height: 7),
        Text(
          name,
          key: const ValueKey('traveler-name'),
          style: const TextStyle(
            fontFamily: AppTypography.heading,
            fontSize: 24,
            height: 1.25,
            color: ink,
          ),
        ),
      ],
    );
    return stacked
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [avatar, const SizedBox(height: 18), identity],
          )
        : Row(
            children: [
              avatar,
              const SizedBox(width: 18),
              Expanded(child: identity),
            ],
          );
  }

  Widget _initials(String name) => Center(
    child: Text(
      travelerInitials(name),
      key: const ValueKey('traveler-initials'),
      style: const TextStyle(
        fontFamily: AppTypography.heading,
        color: ink,
        fontSize: 24,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final stats = widget.stats;
    final cities = stats?.cities ?? <String>[];
    final largeText = MediaQuery.textScalerOf(context).scale(12) > 18;
    return Container(
      key: const ValueKey('traveler-passport'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: rule),
        gradient: const RadialGradient(
          center: Alignment.topLeft,
          radius: 1.4,
          colors: [Color(0xFF516447), Color(0xFF293F34)],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .08),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: CustomPaint(
        painter: const _PassportMapPainter(),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                spacing: 14,
                runSpacing: 10,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.explore_outlined,
                        color: mutedInk,
                        size: 17,
                      ),
                      const SizedBox(width: 7),
                      Flexible(
                        child: Text(
                          context.tr('Gezgin kartı'),
                          style: const TextStyle(color: mutedInk, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                  const ExcludeSemantics(
                    child: Text(
                      'travyon',
                      style: TextStyle(
                        fontFamily: AppTypography.heading,
                        fontSize: 21,
                        color: mutedInk,
                      ),
                    ),
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 18),
                child: Divider(height: 1, color: rule),
              ),
              _identity(context, largeText),
              if (widget.followAction != null) ...[
                const SizedBox(height: 18),
                widget.followAction!,
              ],
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(height: 1, color: rule),
              ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final rows = [
                    (stats?.routes, 'Paylaşılan rota'),
                    (stats?.days, 'Planlanan gün'),
                    (stats?.cities.length, 'Farklı şehir'),
                  ];
                  return Wrap(
                    spacing: 10,
                    runSpacing: 14,
                    children: [
                      for (final row in rows)
                        SizedBox(
                          width: largeText
                              ? constraints.maxWidth
                              : (constraints.maxWidth - 20) / 3,
                          child: Semantics(
                            label:
                                '${context.tr(row.$2)}: ${row.$1 ?? context.tr('Yükleniyor…')}',
                            excludeSemantics: true,
                            child: largeText
                                ? Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          context.tr(row.$2),
                                          style: const TextStyle(
                                            color: mutedInk,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${row.$1 ?? '—'}',
                                        style: const TextStyle(
                                          color: ink,
                                          fontSize: 25,
                                        ),
                                      ),
                                    ],
                                  )
                                : Column(
                                    children: [
                                      Text(
                                        '${row.$1 ?? '—'}',
                                        style: const TextStyle(
                                          color: ink,
                                          fontFamily: AppTypography.heading,
                                          fontSize: 27,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        context.tr(row.$2),
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          color: mutedInk,
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
              if (cities.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Divider(height: 1, color: rule),
                ),
                Text(
                  context.tr('Planlarındaki şehirler'),
                  style: const TextStyle(color: mutedInk, fontSize: 11),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final city in _allCities ? cities : cities.take(3))
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 9,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF998F68)),
                          color: const Color(0xFF43513D),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.place_outlined,
                              size: 15,
                              color: Color(0xFFE7D6B0),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                city,
                                style: const TextStyle(
                                  color: Color(0xFFE7D6B0),
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
                  TextButton(
                    key: const ValueKey('traveler-all-cities'),
                    onPressed: () => setState(() => _allCities = !_allCities),
                    style: TextButton.styleFrom(
                      foregroundColor: ink,
                      textStyle: const TextStyle(
                        fontFamily: AppTypography.body,
                        fontSize: 12,
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
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PassportMapPainter extends CustomPainter {
  const _PassportMapPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final pen = Paint()
      ..color = const Color(0xFFC1C9A5).withValues(alpha: .11)
      ..style = PaintingStyle.stroke
      ..strokeWidth = .7;
    final center = Offset(size.width * .88, size.height * .38);
    for (final radius in [65.0, 98.0, 133.0, 170.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: center,
          width: radius * 2,
          height: radius * 2.5,
        ),
        pen,
      );
    }
    canvas.drawLine(
      Offset(size.width * .6, 0),
      Offset(size.width, size.height),
      pen,
    );
    canvas.drawLine(
      Offset(size.width * .3, size.height * .7),
      Offset(size.width, size.height * .25),
      pen,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        (Offset.zero & size).deflate(8),
        const Radius.circular(21),
      ),
      pen,
    );
  }

  @override
  bool shouldRepaint(_PassportMapPainter oldDelegate) => false;
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
    return Material(
      color: context.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: context.colors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('traveler-route-${plan.id}'),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: context.colors.greenTint,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.route_outlined,
                      size: 21,
                      color: context.colors.forest,
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
                            fontSize: 18,
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
                              color: context.colors.forest,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
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
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Divider(height: 1, color: context.colors.divider),
              ),
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
                            fontWeight: FontWeight.w700,
                            color: context.colors.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 17,
                        color: context.colors.accent,
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
            ? context.colors.accent
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
