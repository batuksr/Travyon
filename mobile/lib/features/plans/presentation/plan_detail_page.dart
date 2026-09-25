import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../checklist/data/checklist_repository.dart';
import '../../checklist/presentation/travel_checklist_panel.dart';
import '../../wallet/data/wallet_repository.dart';
import '../data/plan_detail.dart';
import '../data/plan_editing_repository.dart';
import '../data/travel_times_repository.dart';
import '../data/travel_plans_repository.dart';
import '../data/plan_weather_repository.dart';
import 'plan_information_sheet.dart';
import 'plan_weather_sheet.dart';
import 'plan_journey_tools.dart';
import 'plan_budget_panel.dart';
import 'plan_expense_sheet.dart';
import 'plan_route_map.dart';
import 'plan_stop_card.dart';
import 'plan_detail_chrome.dart';
import 'stop_editor_sheet.dart';
import 'travel_time_strip.dart';

String money(String symbol, double value) =>
    '$symbol${value.toStringAsFixed(value == value.roundToDouble() ? 0 : 2)}';
String dayDate(String raw) {
  final date = DateTime.tryParse(raw);
  if (date == null) return raw;
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  return '${date.day} ${months[date.month - 1]}';
}

enum PlanDetailTab { itinerary, route, budget, checklist }

class PlanDetailPage extends StatefulWidget {
  const PlanDetailPage({
    super.key,
    required this.uid,
    required this.planId,
    required this.repository,
    this.initialDayIndex = 0,
    this.initialTab = PlanDetailTab.itinerary,
    this.editingRepository,
    this.walletRepository,
    this.travelTimesRepository,
    this.checklistRepository,
    this.weatherRepository,
  });
  final String uid;
  final String planId;
  final TravelPlansRepository repository;
  final int initialDayIndex;
  final PlanDetailTab initialTab;
  final PlanEditingRepository? editingRepository;
  final WalletRepository? walletRepository;
  final TravelTimesRepository? travelTimesRepository;
  final ChecklistRepository? checklistRepository;
  final PlanWeatherRepository? weatherRepository;
  @override
  State<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends State<PlanDetailPage> {
  late Stream<List<TravelPlanSummary>> _stream;
  late int _day = widget.initialDayIndex;
  late int _tab = widget.initialTab.index;
  bool _saving = false;
  bool _routeFullscreen = false;
  late final _travelTimes = TravelTimesCache(
    widget.travelTimesRepository ?? FirebaseTravelTimesRepository(),
  );
  late final _wallet = widget.walletRepository ?? FirebaseWalletRepository();
  late final _checklist =
      widget.checklistRepository ?? FirebaseChecklistRepository();
  late final _editing =
      widget.editingRepository ?? FirebasePlanEditingRepository();
  final _history = <({PlanDay before, PlanDay after})>[];
  late final _weather =
      widget.weatherRepository ?? OpenMeteoPlanWeatherRepository();

  Future<void> _replace(PlanDay day, Map<String, dynamic> replacement) async {
    if (_saving) throw StateError('Diğer işlemin bitmesini bekle.');
    setState(() => _saving = true);
    try {
      final after = await _editing.replaceDay(
        widget.uid,
        widget.planId,
        day,
        replacement,
      );
      if (mounted) {
        setState(() {
          _history.add((before: day, after: after));
          if (_history.length > 20) _history.removeAt(0);
        });
        _message('Değişiklik kaydedildi.');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _undo() async {
    if (_saving || _history.isEmpty) return;
    final entry = _history.last;
    setState(() => _saving = true);
    try {
      await _editing.replaceDay(
        widget.uid,
        widget.planId,
        entry.after,
        entry.before.raw,
      );
      if (mounted) {
        setState(() {
          _history.removeLast();
          _day = entry.before.index;
        });
      }
      _message('Son düzenleme geri alındı.');
    } catch (e) {
      _message(
        e is StateError ? e.message.toString() : 'Geri alınamadı. Tekrar dene.',
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _editor(
    PlanDay day, {
    PlanStop? stop,
    required String destination,
  }) async {
    if (_saving) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => StopEditorSheet(
        note: stop?.note,
        save: (fields) async {
          final stops = day.stops.map((s) => s.raw).toList();
          if (stop != null) {
            stops[stop.index] = {...stop.raw, ...fields};
          } else {
            if (stops.length >= 15) {
              throw StateError('Bir güne en fazla 15 durak ekleyebilirsin.');
            }
            final coordinates = await _editing.locate(
              fields['placeName'] as String,
              destination,
            );
            const periods = ['Sabah', 'Öğle', 'Öğleden Sonra', 'Akşam', 'Gece'];
            final rank = periods.indexOf(fields['period'] as String);
            final next = stops.indexWhere(
              (s) => periods.indexOf(s['period'] as String? ?? '') > rank,
            );
            stops.insert(next < 0 ? stops.length : next, {
              ...fields,
              'coordinates': coordinates,
            });
          }
          await _replace(day, {...day.raw, 'activities': stops});
        },
      ),
    );
  }

  Future<void> _stopAction(
    PlanDay day,
    PlanStop stop,
    String action,
    String destination,
  ) async {
    if (_saving) return;
    if (action == 'note') {
      await _editor(day, stop: stop, destination: destination);
      return;
    }
    if (action == 'delete') {
      final confirmed = await showAppConfirmation(
        context,
        title: 'Durak silinsin mi?',
        message: context.tr(
          '“{name}” notu ve durağa girilen harcamayla birlikte plandan kaldırılacak. Ayrı cüzdan kayıtların silinmez. Bu ekrandayken geri alabilirsin.',
          values: {'name': stop.name},
        ),
        confirmLabel: 'Durağı sil',
        icon: Icons.delete_outline_rounded,
        tone: AppDialogTone.destructive,
      );
      if (confirmed != true || !mounted) return;
    }
    final stops = day.stops.map((s) => s.raw).toList();
    if (action == 'delete') {
      stops.removeAt(stop.index);
    } else {
      final target = stop.index + (action == 'up' ? -1 : 1);
      if (target < 0 || target >= stops.length) return;
      final moved = stops.removeAt(stop.index);
      stops.insert(target, moved);
    }
    try {
      await _replace(day, {...day.raw, 'activities': stops});
    } catch (e) {
      _message(
        e is StateError ? e.message.toString() : 'Kaydedilemedi. Tekrar dene.',
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _stream = widget.repository.watchPlans(widget.uid);
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _persistStop(
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? cost,
  }) async {
    if (_saving) throw StateError('Diğer işlemin bitmesini bekle.');
    setState(() => _saving = true);
    try {
      await widget.repository.updateStop(
        widget.uid,
        widget.planId,
        day,
        stop,
        completed: completed,
        actualCost: cost,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _save(
    PlanDay day,
    PlanStop stop, {
    required bool completed,
  }) async {
    if (_saving) return;
    try {
      await _persistStop(day, stop, completed: completed);
      _message('Değişiklik kaydedildi.');
    } catch (error) {
      _message(
        error is StateError
            ? error.message.toString()
            : 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
      );
    }
  }

  Future<void> _expense(PlanDay day, PlanStop stop, String symbol) async {
    if (_saving) return;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: context.colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => PlanExpenseSheet(
        stop: stop,
        symbol: symbol,
        save: (amount) => _persistStop(day, stop, cost: amount),
      ),
    );
    if (saved == true && mounted) _message('Değişiklik kaydedildi.');
  }

  Future<void> _directions(PlanStop stop, String destination) async {
    try {
      if (!await launchUrl(
        stop.directions(destination),
        mode: LaunchMode.externalApplication,
      )) {
        _message('Harita açılamadı. Lütfen tekrar dene.');
      }
    } catch (_) {
      _message('Harita açılamadı. Lütfen tekrar dene.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_routeFullscreen,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _routeFullscreen) {
          setState(() => _routeFullscreen = false);
        }
      },
      child: Scaffold(
        appBar: _tab < 2
            ? null
            : AppBar(title: const Text('Yolculuğun'), centerTitle: true),
        bottomNavigationBar: _routeFullscreen
            ? null
            : PlanDetailNavigation(
                selected: _tab,
                onSelect: (value) => setState(() => _tab = value),
              ),
        body: SafeArea(
          child: StreamBuilder<List<TravelPlanSummary>>(
            stream: _stream,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return _Status(
                  icon: Icons.cloud_off_outlined,
                  text: 'Plan getirilemedi. Bağlantını kontrol et.',
                  onRetry: () => setState(
                    () => _stream = widget.repository.watchPlans(widget.uid),
                  ),
                );
              }
              if (!snapshot.hasData) {
                return Column(
                  children: [
                    if (_tab < 2)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: IconButton(
                          tooltip: context.tr('Geri'),
                          onPressed: () => Navigator.maybePop(context),
                          icon: const Icon(Icons.arrow_back_rounded),
                        ),
                      ),
                    const Expanded(
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  ],
                );
              }
              final matches = snapshot.data!.where(
                (p) => p.id == widget.planId,
              );
              if (matches.isEmpty) {
                return const _Status(
                  icon: Icons.bookmark_remove_outlined,
                  text: 'Bu plan artık bulunamıyor. Planlarına geri dönebilirsin.',
                );
              }
              final plan = matches.first;
              final days = plan.days;
              if (days.isEmpty) {
                return const _Status(
                  icon: Icons.route_outlined,
                  text: 'Bu plana henüz günlük rota eklenmemiş.',
                );
              }
              final selected = _day.clamp(0, days.length - 1);
              final day = days[selected];
              if (_tab == 0) {
                return Column(
                  children: [
                    if (_saving) const LinearProgressIndicator(minHeight: 2),
                    Expanded(
                      child: ListView(
                        key: ValueKey('0-$selected'),
                        padding: const EdgeInsets.only(bottom: 24),
                        children: [
                          PlanDetailHero(
                            plan: plan,
                            day: day,
                            uid: widget.uid,
                            onOpenMap: () => setState(() => _tab = 1),
                          ),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
                            child: _PlanHeader(
                              title: plan.title,
                              subtitle: plan.title == plan.destination
                                  ? null
                                  : plan.destination,
                              dateRange: [plan.startDate, plan.endDate]
                                  .where((date) => date.isNotEmpty)
                                  .toSet()
                                  .map((raw) {
                                    final date = DateTime.tryParse(raw);
                                    return date == null
                                        ? raw
                                        : MaterialLocalizations.of(context)
                                              .formatShortDate(date);
                                  })
                                  .join(' – '),
                              dayCount: days.length,
                              stopCount: plan.activityCount,
                            ),
                          ),
                          _daySelector(days, selected),
                          for (final item in _itinerary(plan, day))
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                              ),
                              child: item,
                            ),
                        ],
                      ),
                    ),
                  ],
                );
              }
              return Column(
                children: [
                  if (_tab == 1 && !_routeFullscreen)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(6, 4, 16, 6),
                      child: Row(
                        children: [
                          IconButton(
                            tooltip: context.tr('Geri'),
                            onPressed: () => Navigator.maybePop(context),
                            icon: const Icon(Icons.arrow_back_rounded),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  plan.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.titleLarge
                                      ?.copyWith(fontSize: 20),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '${days.length} gün · ${plan.activityCount} durak',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: context.colors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_tab != 1)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        TravyonSpace.page,
                        10,
                        TravyonSpace.page,
                        8,
                      ),
                      child: _PlanHeader(
                        title: plan.title,
                        dayCount: days.length,
                        stopCount: plan.activityCount,
                      ),
                    ),
                  if (_tab == 1) _daySelector(days, selected),
                  if (_saving) const LinearProgressIndicator(minHeight: 2),
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: MediaQuery.disableAnimationsOf(context)
                          ? Duration.zero
                          : const Duration(milliseconds: 220),
                      child: _tab == 1
                          ? PlanRouteMap(
                              key: ValueKey('route-$selected'),
                              day: day,
                              destination: plan.destination,
                              fullscreen: _routeFullscreen,
                              onToggleFullscreen: () => setState(
                                () => _routeFullscreen = !_routeFullscreen,
                              ),
                              onDirections: (stop) =>
                                  _directions(stop, plan.destination),
                            )
                          : _tab == 3
                          ? TravelChecklistPanel(
                              key: ValueKey('checklist-${plan.id}'),
                              uid: widget.uid,
                              planId: widget.planId,
                              destination: plan.destination,
                              repository: _checklist,
                            )
                          : ListView(
                              key: ValueKey('$_tab-$selected'),
                              padding: const EdgeInsets.fromLTRB(
                                20,
                                12,
                                20,
                                28,
                              ),
                              children: _budget(plan),
                            ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _daySelector(List<PlanDay> days, int selected) => SizedBox(
    height: MediaQuery.textScalerOf(context).scale(12) + 48,
    child: ListView.separated(
      padding: EdgeInsets.symmetric(
        horizontal: _tab == 1 ? 12 : 20,
        vertical: 8,
      ),
      scrollDirection: Axis.horizontal,
      itemCount: days.length,
      separatorBuilder: (_, _) => const SizedBox(width: 8),
      itemBuilder: (_, i) => ChoiceChip(
        selected: selected == i,
        selectedColor: context.colors.accent,
        backgroundColor: context.colors.surface,
        shape: const StadiumBorder(),
        side: BorderSide(
          color: selected == i ? Colors.transparent : context.colors.divider,
        ),
        labelStyle: TextStyle(
          fontFamily: AppTypography.body,
          fontSize: 12,
          fontWeight: selected == i ? FontWeight.w700 : FontWeight.w500,
          color: selected == i ? context.colors.onAccent : context.colors.text,
        ),
        showCheckmark: false,
        label: Text('${i + 1}. Gün  ·  ${dayDate(days[i].date)}'),
        onSelected: (_) => setState(() => _day = i),
      ),
    ),
  );

  List<Widget> _itinerary(TravelPlanSummary plan, PlanDay day) => [
    const SizedBox(height: 8),
    _DayOverview(day: day, symbol: plan.currencySymbol),
    const SizedBox(height: 8),
    Wrap(
      alignment: WrapAlignment.spaceBetween,
      spacing: 12,
      children: [
        TextButton.icon(
          onPressed: _saving
              ? null
              : () => _editor(day, destination: plan.destination),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Durak ekle'),
        ),
        TextButton.icon(
          onPressed: _saving || _history.isEmpty ? null : _undo,
          icon: const Icon(Icons.undo_rounded),
          label: const Text('Geri al'),
        ),
      ],
    ),
    const SizedBox(height: 4),
    for (final stop in day.stops) ...[
      if (stop.index == 0 || day.stops[stop.index - 1].period != stop.period)
        Padding(
          padding: const EdgeInsets.only(bottom: 10, top: 4),
          child: Text(
            stop.period.isEmpty ? 'KEŞİF ZAMANI' : stop.period,
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: .3,
            ),
          ),
        ),
      PlanStopCard(
        key: ValueKey('${day.index}-${stop.index}-${stop.name}'),
        stop: stop,
        symbol: plan.currencySymbol,
        busy: _saving,
        onComplete: () => _save(day, stop, completed: !stop.completed),
        onAction: (action) => _stopAction(day, stop, action, plan.destination),
        canMoveUp: stop.index > 0,
        canMoveDown: stop.index < day.stops.length - 1,
        onDirections: () => _directions(stop, plan.destination),
      ),
      const SizedBox(height: 14),
      if (stop.index + 1 < day.stops.length &&
          stop.location != null &&
          day.stops[stop.index + 1].location != null)
        TravelTimeStrip(
          key: ValueKey('travel-${day.index}-${stop.index}'),
          day: day,
          index: stop.index,
          cache: _travelTimes,
        ),
    ],
    if (day.stops.isEmpty)
      const _Status(
        icon: Icons.coffee_outlined,
        text: 'Bu gün için durak eklenmemiş.',
      ),
    const SizedBox(height: 16),
    NextStopPanel(
      day: day,
      onDirections: (stop) => _directions(stop, plan.destination),
    ),
    const SizedBox(height: 20),
    Text('Yolculuk araçları', style: Theme.of(context).textTheme.titleMedium),
    const SizedBox(height: 12),
    Wrap(
      spacing: 10,
      runSpacing: 6,
      children: [
        OutlinedButton.icon(
          key: const ValueKey('plan-guide'),
          onPressed: () =>
              showPlanInformation(context, PlanGuideSheet(plan: plan)),
          icon: const Icon(Icons.menu_book_outlined, size: 18),
          label: const Text('Rehber'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 44),
            backgroundColor: context.colors.surface,
            shape: const StadiumBorder(),
          ),
        ),
        OutlinedButton.icon(
          key: const ValueKey('plan-weather'),
          onPressed: () => showPlanInformation(
            context,
            PlanWeatherSheet(plan: plan, repository: _weather),
          ),
          icon: const Icon(Icons.cloud_outlined, size: 18),
          label: const Text('Hava durumu'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 44),
            backgroundColor: context.colors.surface,
            shape: const StadiumBorder(),
          ),
        ),
      ],
    ),
    const SizedBox(height: 12),
    PlanBudgetSummary(plan: plan, collapsible: true),
    const SizedBox(height: 12),
    DayWalletPanel(
      uid: widget.uid,
      planId: widget.planId,
      date: day.date,
      repository: _wallet,
    ),
  ];

  List<Widget> _budget(TravelPlanSummary plan) {
    return [
      PlanBudgetOverview(plan: plan),
      const SizedBox(height: 28),
      const Text(
        'Günlük harcamaların',
        style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 6),
      Text(
        'Bir durağa dokunarak ödediğin tutarı kaydet.',
        style: TextStyle(
          color: context.colors.muted,
          fontSize: 13,
          height: 1.5,
        ),
      ),
      for (final day in plan.days) ...[
        const SizedBox(height: 14),
        PlanBudgetDayCard(
          key: PageStorageKey('budget-${plan.id}-${day.index}'),
          day: day,
          label: context.tr('${day.index + 1}. Gün · ${dayDate(day.date)}'),
          symbol: plan.currencySymbol,
          busy: _saving,
          initiallyExpanded: day.index == 0,
          onExpense: (stop) => _expense(day, stop, plan.currencySymbol),
        ),
      ],
    ];
  }
}

class _PlanHeader extends StatelessWidget {
  const _PlanHeader({
    required this.title,
    required this.dayCount,
    required this.stopCount,
    this.subtitle,
    this.dateRange,
  });

  final String title;
  final int dayCount;
  final int stopCount;
  final String? subtitle, dateRange;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.headlineMedium
                  ?.copyWith(fontSize: 24, letterSpacing: -.6),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(color: context.colors.muted, fontSize: 13),
              ),
            ],
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 14,
                  color: context.colors.muted,
                ),
                if (dateRange != null && dateRange!.isNotEmpty)
                  Text(
                    dateRange!,
                    style: TextStyle(color: context.colors.muted, fontSize: 12),
                  ),
                Text(
                  '$dayCount gün · $stopCount durak',
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

class _DayOverview extends StatelessWidget {
  const _DayOverview({required this.day, required this.symbol});
  final PlanDay day;
  final String symbol;
  @override
  Widget build(BuildContext context) => TravyonSurface(
    borderRadius: 20,
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 16,
          runSpacing: 6,
          children: [
            Text(
              '${day.completed}/${day.stops.length} durak tamamlandı',
              style: TextStyle(
                color: context.colors.text,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              'Tahmini ${money(symbol, day.estimated)}',
              style: TextStyle(color: context.colors.muted, fontSize: 12),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: day.stops.isEmpty ? 0 : day.completed / day.stops.length,
            color: context.colors.accent,
            backgroundColor: context.colors.divider,
            minHeight: 4,
          ),
        ),
        if (day.summary.isNotEmpty) ...[
          const SizedBox(height: 12),
          _ExpandableText(text: day.summary),
        ],
      ],
    ),
  );
}

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text});
  final String text;
  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool expanded = false;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final style = TextStyle(
        color: context.colors.muted,
        fontFamily: AppTypography.body,
        fontSize: 13,
        height: 1.6,
      );
      final painter = TextPainter(
        text: TextSpan(text: widget.text, style: style),
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
            widget.text,
            style: style,
            maxLines: expanded ? null : 3,
            overflow: expanded ? null : TextOverflow.ellipsis,
          ),
          if (overflows)
            TextButton(
              style: TextButton.styleFrom(foregroundColor: context.colors.text),
              onPressed: () => setState(() => expanded = !expanded),
              child: Text(expanded ? 'Daha az' : 'Devamını oku'),
            ),
        ],
      );
    },
  );
}

class _Status extends StatelessWidget {
  const _Status({required this.icon, required this.text, this.onRetry});
  final IconData icon;
  final String text;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 36, color: context.colors.forest),
          const SizedBox(height: 16),
          Text(text, textAlign: TextAlign.center),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Tekrar dene')),
          if (Navigator.canPop(context))
            TextButton.icon(
              onPressed: () => Navigator.maybePop(context),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Geri'),
            ),
        ],
      ),
    ),
  );
}
