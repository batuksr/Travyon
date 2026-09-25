import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/presentation/plan_information_sheet.dart';
import '../data/community_repository.dart';

String publicRouteMoney(BuildContext context, String symbol, double amount) =>
    '$symbol${UnitFormatter.of(context).number(amount, fractionDigits: 2)}';

String publicRouteCount(BuildContext context, int count, String noun) => context
    .tr(count == 1 ? '1 $noun' : '{count} $noun', values: {'count': count});

class CommunityRouteOverview extends StatelessWidget {
  const CommunityRouteOverview({super.key, required this.plan, this.onAuthor});
  final CommunityPlan plan;
  final VoidCallback? onAuthor;

  @override
  Widget build(BuildContext context) {
    final summary = plan.summary;
    final description = summary.planData['overallSummary'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          plan.destination,
          key: const ValueKey('community-destination'),
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 14),
        Material(
          color: Colors.transparent,
          child: InkWell(
            key: const ValueKey('community-author'),
            onTap: onAuthor,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: context.colors.greenTint,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.person_outline_rounded,
                      color: context.colors.text,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('Rotayı paylaşan'),
                          style: TextStyle(
                            fontSize: 11,
                            color: context.colors.muted,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          plan.profilePublic
                              ? plan.author
                              : context.tr('Gezgin'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: context.colors.text,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (onAuthor != null)
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: context.colors.muted,
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        TravyonSurface(
          key: const ValueKey('community-route-metrics'),
          borderRadius: 20,
          padding: const EdgeInsets.all(4),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final columns =
                  constraints.maxWidth < 300 ||
                      MediaQuery.textScalerOf(context).scale(12) > 18
                  ? 1
                  : 3;
              final items = [
                (
                  Icons.calendar_today_outlined,
                  context.tr('Rota süresi'),
                  publicRouteCount(context, summary.dayCount, 'gün'),
                ),
                (
                  Icons.route_outlined,
                  context.tr('Duraklar'),
                  '${summary.activityCount}',
                ),
                (
                  Icons.account_balance_wallet_outlined,
                  context.tr('Tahmini maliyet'),
                  publicRouteMoney(
                    context,
                    summary.currencySymbol,
                    summary.estimatedCost,
                  ),
                ),
              ];
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in items)
                    SizedBox(
                      width:
                          (constraints.maxWidth - (columns - 1) * 8) / columns,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: columns == 1
                            ? Row(
                                children: [
                                  Icon(
                                    item.$1,
                                    size: 20,
                                    color: context.colors.muted,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      item.$2,
                                      style: TextStyle(
                                        color: context.colors.muted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Flexible(
                                    child: Text(
                                      item.$3,
                                      textAlign: TextAlign.end,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: context.colors.text,
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    item.$1,
                                    size: 19,
                                    color: context.colors.muted,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    item.$3,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: context.colors.text,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.$2,
                                    style: TextStyle(
                                      fontSize: 11,
                                      height: 1.4,
                                      color: context.colors.muted,
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
        ),
        if (description is String && description.trim().isNotEmpty) ...[
          const SizedBox(height: 18),
          CommunityRouteCopy(text: description.trim(), lines: 3),
        ],
      ],
    );
  }
}

/// Bounded descriptions keep long shared content readable without hiding it.
class CommunityRouteCopy extends StatefulWidget {
  const CommunityRouteCopy({super.key, required this.text, this.lines = 4});
  final String text;
  final int lines;
  @override
  State<CommunityRouteCopy> createState() => _CommunityRouteCopyState();
}

class _CommunityRouteCopyState extends State<CommunityRouteCopy> {
  bool expanded = false;
  @override
  void didUpdateWidget(covariant CommunityRouteCopy oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) expanded = false;
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final style = DefaultTextStyle.of(context).style
          .copyWith(fontSize: 13, height: 1.6, color: context.colors.muted);
      final painter = TextPainter(
        text: TextSpan(text: widget.text, style: style),
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
        maxLines: widget.lines,
      )..layout(maxWidth: constraints.maxWidth);
      final overflows = painter.didExceedMaxLines;
      painter.dispose();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.text,
            style: style,
            maxLines: expanded ? null : widget.lines,
            overflow: expanded ? null : TextOverflow.ellipsis,
          ),
          if (overflows)
            TextButton(
              onPressed: () => setState(() => expanded = !expanded),
              style: TextButton.styleFrom(
                foregroundColor: context.colors.text,
                padding: EdgeInsets.zero,
                textStyle: const TextStyle(
                  fontFamily: AppTypography.body,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              child: Text(context.tr(expanded ? 'Daha az' : 'Devamını oku')),
            ),
        ],
      );
    },
  );
}

class CommunityRouteDays extends StatelessWidget {
  const CommunityRouteDays({
    super.key,
    required this.days,
    required this.selected,
    required this.onSelect,
  });
  final List<PlanDay> days;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    key: const ValueKey('community-days'),
    scrollDirection: Axis.horizontal,
    child: Row(
      children: [
        for (final day in days)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Semantics(
              selected: selected == day.index,
              inMutuallyExclusiveGroup: true,
              child: OutlinedButton(
                key: ValueKey('community-day-${day.index}'),
                onPressed: () => onSelect(day.index),
                style: OutlinedButton.styleFrom(
                  backgroundColor: selected == day.index
                      ? context.colors.orangeTint
                      : context.colors.surface,
                  foregroundColor: context.colors.text,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  side: BorderSide(
                    color: selected == day.index
                        ? context.colors.accent
                        : context.colors.divider,
                  ),
                  shape: const StadiumBorder(),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: Text(
                  context.tr(
                    '{number}. Gün',
                    values: {'number': day.index + 1},
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class CommunityDaySummary extends StatelessWidget {
  const CommunityDaySummary({
    super.key,
    required this.day,
    required this.symbol,
  });
  final PlanDay day;
  final String symbol;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              publicRouteCount(context, day.stops.length, 'durak'),
              style: TextStyle(
                color: context.colors.text,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            Text(
              context.tr(
                'Tahmini {amount}',
                values: {
                  'amount': publicRouteMoney(context, symbol, day.estimated),
                },
              ),
              style: TextStyle(color: context.colors.muted, fontSize: 12),
            ),
          ],
        ),
        if (day.summary.trim().isNotEmpty) ...[
          const SizedBox(height: 12),
          CommunityRouteCopy(text: day.summary, lines: 3),
        ],
      ],
    ),
  );
}

/// No edit, visited, actual-expense or personal-note controls on public stops.
class CommunityRouteStop extends StatelessWidget {
  const CommunityRouteStop({
    super.key,
    required this.stop,
    required this.symbol,
    required this.onDirections,
  });
  final PlanStop stop;
  final String symbol;
  final VoidCallback onDirections;
  @override
  Widget build(BuildContext context) => TravyonSurface(
    borderRadius: 20,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: context.colors.background,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${stop.index + 1}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: context.colors.text,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      stop.name,
                      style: TextStyle(
                        fontSize: 16,
                        height: 1.35,
                        fontWeight: FontWeight.w700,
                        color: context.colors.text,
                      ),
                    ),
                  ),
                ],
              ),
              if (stop.description.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                CommunityRouteCopy(text: stop.description),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final cost = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('Tahmini maliyet'),
                    style: TextStyle(fontSize: 11, color: context.colors.muted),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    publicRouteMoney(context, symbol, stop.estimated),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.colors.text,
                    ),
                  ),
                ],
              );
              final directions = TextButton.icon(
                key: ValueKey('community-directions-${stop.index}'),
                onPressed: onDirections,
                style: TextButton.styleFrom(
                  foregroundColor: context.colors.text,
                  minimumSize: const Size(0, 48),
                  shape: const StadiumBorder(),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                icon: const Icon(Icons.near_me_outlined, size: 17),
                label: Text(context.tr('Yol tarifi')),
              );
              if (constraints.maxWidth < 280 ||
                  MediaQuery.textScalerOf(context).scale(12) > 16) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [cost, const SizedBox(height: 8), directions],
                );
              }
              return Row(
                children: [
                  Expanded(child: cost),
                  const SizedBox(width: 8),
                  directions,
                ],
              );
            },
          ),
        ),
      ],
    ),
  );
}

class CommunityRouteDistance extends StatelessWidget {
  const CommunityRouteDistance({
    super.key,
    required this.from,
    required this.to,
  });
  final PlanStop from, to;
  @override
  Widget build(BuildContext context) {
    if (from.location == null || to.location == null) {
      return const SizedBox(height: 12);
    }
    final distance = UnitFormatter.of(context)
        .distance(distanceBetweenKm(from.location!, to.location!));
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      child: Tooltip(
        message: context.tr(
          'Kuş uçuşu mesafedir; yol mesafesi farklı olabilir.',
        ),
        child: Text(
          '↕ $distance',
          key: const ValueKey('community-distance'),
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class CommunityRouteRating extends StatelessWidget {
  const CommunityRouteRating({
    super.key,
    required this.plan,
    required this.busy,
    required this.onRate,
    this.myRating,
  });
  final CommunityPlan plan;
  final bool busy;
  final int? myRating;
  final ValueChanged<int>? onRate;
  @override
  Widget build(BuildContext context) => TravyonSurface(
    key: const ValueKey('community-rating'),
    padding: const EdgeInsets.all(18),
    borderRadius: 20,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('Gezgin değerlendirmeleri'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Icon(Icons.star_rounded, color: context.colors.text, size: 22),
            if (plan.ratingCount > 0)
              Text(
                UnitFormatter.of(context).number(plan.rating),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: context.colors.text,
                ),
              ),
            Text(
              plan.ratingCount > 0
                  ? publicRouteCount(context, plan.ratingCount, 'değerlendirme')
                  : context.tr('Henüz değerlendirme yok'),
              style: TextStyle(color: context.colors.muted, fontSize: 12),
            ),
          ],
        ),
        if (onRate != null) ...[
          const SizedBox(height: 18),
          Text(
            context.tr('Bu rotayı nasıl buldun?'),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: context.colors.text,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 0,
            runSpacing: 4,
            children: [
              for (var rating = 1; rating <= 5; rating++)
                Semantics(
                  selected: myRating == rating,
                  child: IconButton(
                    tooltip: context.tr(
                      '{count} yıldız ver',
                      values: {'count': rating},
                    ),
                    onPressed: busy ? null : () => onRate!(rating),
                    style: IconButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      foregroundColor: rating <= (myRating ?? 0)
                          ? context.colors.accent
                          : context.colors.muted,
                    ),
                    icon: Icon(
                      rating <= (myRating ?? 0)
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      size: 27,
                    ),
                  ),
                ),
            ],
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: LinearProgressIndicator(),
            ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              'Yeni bir puan seçersen önceki değerlendirmen güncellenir.',
            ),
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 11,
              height: 1.5,
            ),
          ),
        ],
      ],
    ),
  );
}

/// The public route keeps its own two views, without adding app-level actions.
class CommunityRouteNavigation extends StatelessWidget {
  const CommunityRouteNavigation({
    super.key,
    required this.selected,
    required this.onSelect,
  });

  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(16, 8, 16, 10),
    child: TravyonSurface(
      borderRadius: 36,
      child: NavigationBarTheme(
        data: NavigationBarThemeData(
          height: 66,
          backgroundColor: Colors.transparent,
          indicatorColor: context.colors.orangeTint,
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              fontFamily: AppTypography.body,
              fontSize: 12,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w600
                  : FontWeight.w500,
              color: context.colors.text,
            ),
          ),
          iconTheme: WidgetStateProperty.resolveWith(
            (states) => IconThemeData(
              size: 21,
              color: states.contains(WidgetState.selected)
                  ? context.colors.accent
                  : context.colors.muted,
            ),
          ),
        ),
        child: NavigationBar(
          selectedIndex: selected,
          onDestinationSelected: onSelect,
          destinations: [
            NavigationDestination(
              key: const ValueKey('community-tab-plan'),
              icon: const Icon(Icons.format_list_bulleted_rounded),
              label: context.tr('Günlük plan'),
            ),
            NavigationDestination(
              key: const ValueKey('community-tab-map'),
              icon: const Icon(Icons.map_outlined),
              label: context.tr('Harita'),
            ),
          ],
        ),
      ),
    ),
  );
}

class CommunityPreferencesSheet extends StatelessWidget {
  const CommunityPreferencesSheet({super.key, required this.plan});
  final CommunityPlan plan;
  @override
  Widget build(BuildContext context) {
    String value(Object? raw) {
      if (raw is List) {
        return raw
            .whereType<String>()
            .map((v) => context.tr(communityPreference(v)))
            .join(' · ');
      }
      if (raw is bool) return context.tr(raw ? 'Evet' : 'Hayır');
      return context.tr(communityPreference(raw));
    }

    // Explicit public fields only; never render arbitrary document keys.
    final rows = [
      (
        Icons.calendar_today_outlined,
        'Rota süresi',
        publicRouteCount(context, plan.summary.dayCount, 'gün'),
      ),
      for (final item in [
        ('peopleCount', 'Kişi sayısı', Icons.people_outline_rounded),
        ('travelType', 'Yolculuk türü', Icons.backpack_outlined),
        ('pace', 'Tempo', Icons.directions_walk_rounded),
        ('tripPurpose', 'Seyahat amacı', Icons.explore_outlined),
        ('earlyBird', 'Erken başlangıç', Icons.wb_sunny_outlined),
        ('purposes', 'İlgi alanları', Icons.interests_outlined),
        ('transport', 'Ulaşım tercihi', Icons.directions_transit_outlined),
        ('accommodation', 'Konaklama türü', Icons.hotel_outlined),
        ('foodPhilosophy', 'Yemek Felsefesi', Icons.restaurant_outlined),
        ('dietaryRestrictions', 'Beslenme Tercihleri', Icons.eco_outlined),
      ])
        if (plan.data[item.$1] != null &&
            value(plan.data[item.$1]).trim().isNotEmpty)
          (item.$3, item.$2, value(plan.data[item.$1])),
    ];
    return PlanInformationSheet(
      title: context.tr('Rota tercihleri'),
      destination: plan.destination,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text(
            context.tr('Bu yolculuğa yön veren seçimler.'),
            style: TextStyle(
              fontSize: 13,
              height: 1.5,
              color: context.colors.muted,
            ),
          ),
          const SizedBox(height: 18),
          for (final row in rows)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.colors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: context.colors.divider),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(row.$1, color: context.colors.text, size: 21),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr(row.$2),
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          row.$3,
                          style: TextStyle(
                            color: context.colors.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
