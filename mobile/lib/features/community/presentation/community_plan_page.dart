import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/presentation/plan_information_sheet.dart';
import '../../plans/presentation/plan_route_map.dart';
import '../data/community_repository.dart';
import 'community_page.dart';
import 'community_route_widgets.dart';

/// Public plans remain read-only; ratings are the only mutation on this page.
class CommunityPlanPage extends StatefulWidget {
  const CommunityPlanPage({
    super.key,
    required this.uid,
    required this.id,
    required this.repository,
    this.mapBuilder,
    this.onOpenDirections,
  });
  final String uid, id;
  final CommunityRepository repository;
  final Widget Function(GoogleMap)? mapBuilder;
  final Future<bool> Function(Uri)? onOpenDirections;
  @override
  State<CommunityPlanPage> createState() => _CommunityPlanPageState();
}

class _CommunityPlanPageState extends State<CommunityPlanPage> {
  late Stream<CommunityPlan?> _plan = widget.repository.plan(widget.id);
  int _day = 0, _tab = 0;
  bool _busy = false, _openingDirections = false;
  int? _myRating;

  @override
  void didUpdateWidget(covariant CommunityPlanPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id ||
        oldWidget.repository != widget.repository) {
      _plan = widget.repository.plan(widget.id);
      _day = _tab = 0;
      _myRating = null;
      _busy = false;
    }
  }

  void _retry() => setState(() => _plan = widget.repository.plan(widget.id));

  Future<void> _rate(int rating) async {
    if (_busy) return;
    final id = widget.id;
    setState(() => _busy = true);
    try {
      await widget.repository.rate(id, rating);
      if (mounted && widget.id == id) {
        setState(() => _myRating = rating);
        communityNotice(context, 'Değerlendirmen kaydedildi.');
      }
    } catch (error) {
      if (mounted && widget.id == id) {
        communityNotice(context, communityError(error));
      }
    } finally {
      if (mounted && widget.id == id) setState(() => _busy = false);
    }
  }

  Future<void> _directions(PlanStop stop, String destination) async {
    if (_openingDirections) return;
    _openingDirections = true;
    try {
      final uri = stop.directions(destination);
      final opened =
          await (widget.onOpenDirections?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (!opened) throw StateError('url');
    } catch (_) {
      if (mounted) communityNotice(context, 'Yol tarifi açılamadı.');
    } finally {
      _openingDirections = false;
    }
  }

  void _author(CommunityPlan plan) {
    if (!plan.profilePublic) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => TravelerPage(
          uid: widget.uid,
          target: plan.owner,
          repository: widget.repository,
        ),
      ),
    );
  }

  Widget _tools(CommunityPlan plan) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      OutlinedButton.icon(
        key: const ValueKey('community-guide'),
        onPressed: () =>
            showPlanInformation(context, PlanGuideSheet(plan: plan.summary)),
        icon: const Icon(Icons.menu_book_outlined, size: 18),
        label: Text(context.tr('Rehber')),
      ),
      OutlinedButton.icon(
        key: const ValueKey('community-preferences'),
        onPressed: () =>
            showPlanInformation(context, CommunityPreferencesSheet(plan: plan)),
        icon: const Icon(Icons.tune_rounded, size: 18),
        label: Text(context.tr('Tercihler')),
      ),
    ],
  );

  Widget _days(List<PlanDay> days, int selected) => CommunityRouteDays(
    days: days,
    selected: selected,
    onSelect: (index) => setState(() => _day = index),
  );

  Widget _itinerary(CommunityPlan plan, PlanDay? selected) {
    final stops = selected?.stops ?? <PlanStop>[];
    return ListView(
      key: const PageStorageKey('community-route-scroll'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        CommunityRouteOverview(
          plan: plan,
          onAuthor: plan.profilePublic ? () => _author(plan) : null,
        ),
        const SizedBox(height: 18),
        _tools(plan),
        const SizedBox(height: 22),
        if (selected == null)
          CommunityStatus(
            message: context.tr('Bu planda günlük rota bulunamadı.'),
          )
        else ...[
          _days(plan.summary.days, selected.index),
          const SizedBox(height: 16),
          CommunityDaySummary(
            key: ValueKey('community-summary-${selected.index}'),
            day: selected,
            symbol: plan.summary.currencySymbol,
          ),
          const SizedBox(height: 20),
          if (stops.isEmpty)
            CommunityStatus(
              message: context.tr('Bu gün için henüz durak yok.'),
            ),
          for (var index = 0; index < stops.length; index++) ...[
            if (stops[index].period.trim().isNotEmpty &&
                (index == 0 || stops[index - 1].period != stops[index].period))
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 2, 4, 12),
                child: Text(
                  context.tr(stops[index].period),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: context.colors.forest,
                    letterSpacing: .4,
                  ),
                ),
              ),
            CommunityRouteStop(
              key: ValueKey(
                'community-stop-${selected.index}-$index-${stops[index].name}',
              ),
              stop: stops[index],
              symbol: plan.summary.currencySymbol,
              onDirections: () => _directions(stops[index], plan.destination),
            ),
            if (index + 1 < stops.length)
              CommunityRouteDistance(from: stops[index], to: stops[index + 1]),
          ],
        ],
        const SizedBox(height: 24),
        CommunityRouteRating(
          plan: plan,
          busy: _busy,
          myRating: _myRating,
          onRate: plan.owner == widget.uid ? null : _rate,
        ),
      ],
    );
  }

  Widget _map(CommunityPlan plan, PlanDay? selected) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 12),
        child: Text(
          plan.destination,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
      if (selected != null) ...[
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 0, 14),
          child: _days(plan.summary.days, selected.index),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              Widget map(double height) => SizedBox(
                height: height,
                child: PlanRouteMap(
                  day: selected,
                  destination: plan.destination,
                  mapBuilder: widget.mapBuilder,
                  onDirections: (stop) => _directions(stop, plan.destination),
                ),
              );
              // In landscape or at large text sizes, retain enough map space for
              // controls and let the map region scroll instead of overflowing.
              if (constraints.maxHeight < 380) {
                return SingleChildScrollView(child: map(440));
              }
              return map(constraints.maxHeight);
            },
          ),
        ),
      ] else
        Expanded(
          child: SingleChildScrollView(
            child: CommunityStatus(
              message: context.tr('Bu planda günlük rota bulunamadı.'),
            ),
          ),
        ),
    ],
  );

  @override
  Widget build(BuildContext context) => StreamBuilder<CommunityPlan?>(
    stream: _plan,
    builder: (context, snapshot) {
      final plan = snapshot.data;
      final ready =
          !snapshot.hasError &&
          snapshot.connectionState != ConnectionState.waiting &&
          plan != null;
      final days = plan?.summary.days ?? <PlanDay>[];
      final selected = days.isEmpty
          ? null
          : days[_day.clamp(0, days.length - 1)];
      return Scaffold(
        appBar: AppBar(title: Text(context.tr('Topluluk rotası'))),
        bottomNavigationBar: ready
            ? NavigationBar(
                selectedIndex: _tab,
                onDestinationSelected: (index) => setState(() => _tab = index),
                destinations: [
                  NavigationDestination(
                    key: const ValueKey('community-tab-plan'),
                    icon: const Icon(Icons.view_agenda_outlined),
                    selectedIcon: const Icon(Icons.view_agenda_rounded),
                    label: context.tr('Günlük plan'),
                  ),
                  NavigationDestination(
                    key: const ValueKey('community-tab-map'),
                    icon: const Icon(Icons.map_outlined),
                    selectedIcon: const Icon(Icons.map_rounded),
                    label: context.tr('Harita'),
                  ),
                ],
              )
            : null,
        body: SafeArea(
          top: false,
          bottom: !ready,
          child: snapshot.hasError
              ? SingleChildScrollView(
                  child: CommunityStatus(
                    message: communityError(snapshot.error!),
                    onRetry: _retry,
                  ),
                )
              : snapshot.connectionState == ConnectionState.waiting
              ? const CommunityLoading()
              : plan == null
              ? const SingleChildScrollView(
                  child: CommunityStatus(
                    message: 'Bu paylaşım kaldırılmış veya artık bulunamıyor.',
                  ),
                )
              : _tab == 0
              ? _itinerary(plan, selected)
              : _map(plan, selected),
        ),
      );
    },
  );
}
