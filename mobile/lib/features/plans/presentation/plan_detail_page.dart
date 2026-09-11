import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/travel_plans_repository.dart';
import 'plan_route_map.dart';

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

class PlanDetailPage extends StatefulWidget {
  const PlanDetailPage({
    super.key,
    required this.uid,
    required this.planId,
    required this.repository,
  });
  final String uid;
  final String planId;
  final TravelPlansRepository repository;
  @override
  State<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends State<PlanDetailPage> {
  late Stream<List<TravelPlanSummary>> _stream;
  int _day = 0;
  int _tab = 0;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _stream = widget.repository.watchPlans(widget.uid);
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _save(
    PlanDay day,
    PlanStop stop, {
    bool? completed,
    double? cost,
  }) async {
    if (_saving) return;
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
      _message('Değişiklik kaydedildi.');
    } catch (error) {
      _message(
        error is StateError
            ? error.message.toString()
            : 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _expense(PlanDay day, PlanStop stop, String symbol) async {
    final value = await showModalBottomSheet<double>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ExpenseSheet(stop: stop, symbol: symbol),
    );
    if (value != null && mounted) await _save(day, stop, cost: value);
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
    return Scaffold(
      appBar: AppBar(title: const Text('Yolculuğun'), centerTitle: true),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() => _tab = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.view_day_outlined),
            label: 'Günlük plan',
          ),
          NavigationDestination(
            icon: Icon(Icons.route_outlined),
            label: 'Rota',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            label: 'Bütçe',
          ),
        ],
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
              return const Center(child: CircularProgressIndicator());
            }
            final matches = snapshot.data!.where((p) => p.id == widget.planId);
            if (matches.isEmpty) {
              return const _Status(
                icon: Icons.bookmark_remove_outlined,
                text:
                    'Bu plan artık bulunamıyor. Planlarına geri dönebilirsin.',
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
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.title,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${days.length} gün · ${plan.activityCount} durak',
                          style: const TextStyle(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_tab != 2)
                  SizedBox(
                    height: 72,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 8,
                      ),
                      scrollDirection: Axis.horizontal,
                      itemCount: days.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => ChoiceChip(
                        selected: selected == i,
                        labelStyle: TextStyle(
                          color: selected == i ? Colors.white : AppColors.text,
                        ),
                        showCheckmark: false,
                        label: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Text(
                            '${i + 1}. Gün  ·  ${dayDate(days[i].date)}',
                          ),
                        ),
                        onSelected: (_) => setState(() => _day = i),
                      ),
                    ),
                  ),
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
                            onDirections: (stop) =>
                                _directions(stop, plan.destination),
                          )
                        : ListView(
                            key: ValueKey('$_tab-$selected'),
                            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                            children: _tab == 2
                                ? _budget(plan)
                                : _itinerary(plan, day),
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _itinerary(TravelPlanSummary plan, PlanDay day) => [
    _DayOverview(day: day, symbol: plan.currencySymbol),
    const SizedBox(height: 22),
    for (final stop in day.stops) ...[
      if (stop.index == 0 || day.stops[stop.index - 1].period != stop.period)
        Padding(
          padding: const EdgeInsets.only(bottom: 10, top: 4),
          child: Text(
            stop.period.isEmpty ? 'KEŞİF ZAMANI' : stop.period,
            style: const TextStyle(
              color: AppColors.forest,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ),
      _StopCard(
        key: ValueKey('${day.index}-${stop.index}-${stop.name}'),
        stop: stop,
        symbol: plan.currencySymbol,
        busy: _saving,
        onComplete: () => _save(day, stop, completed: !stop.completed),
        onExpense: () => _expense(day, stop, plan.currencySymbol),
        onDirections: () => _directions(stop, plan.destination),
      ),
      const SizedBox(height: 14),
    ],
    if (day.stops.isEmpty)
      const _Status(
        icon: Icons.coffee_outlined,
        text: 'Bu gün için durak eklenmemiş.',
      ),
  ];

  List<Widget> _budget(TravelPlanSummary plan) {
    final stops = plan.days.expand((day) => day.stops);
    final spent = stops.fold<double>(
      0,
      (sum, stop) => sum + (stop.actual ?? 0),
    );
    final count = stops.where((stop) => stop.actual != null).length;
    return [
      _Paper(
        dark: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'KAYDETTİĞİN HARCAMA',
              style: TextStyle(
                color: Color(0xFFDCE5DC),
                fontSize: 12,
                letterSpacing: 1.3,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              money(plan.currencySymbol, spent),
              style: const TextStyle(
                color: AppColors.surface,
                fontSize: 36,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '$count / ${plan.activityCount} durağa harcama girildi.',
              style: const TextStyle(color: Color(0xFFDCE5DC)),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _Paper(
        child: Wrap(
          spacing: 12,
          runSpacing: 6,
          children: [
            const Text(
              'Tahmini plan maliyeti',
              style: TextStyle(color: AppColors.muted),
            ),
            Text(
              money(plan.currencySymbol, plan.estimatedCost),
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
      const SizedBox(height: 24),
      const Text(
        'Günlük harcamaların',
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 6),
      const Text(
        'Bir durağa dokunarak ödediğin tutarı kaydet.',
        style: TextStyle(color: AppColors.muted),
      ),
      for (final day in plan.days) ...[
        Padding(
          padding: const EdgeInsets.only(top: 22, bottom: 10),
          child: Text(
            '${day.index + 1}. Gün · ${dayDate(day.date)}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        _Paper(
          child: Column(
            children: [
              for (final stop in day.stops)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    stop.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    stop.actual == null
                        ? 'Harcama girilmedi'
                        : money(plan.currencySymbol, stop.actual!),
                  ),
                  trailing: IconButton(
                    key: ValueKey('expense-${day.index}-${stop.index}'),
                    tooltip: 'Harcama düzenle',
                    onPressed: _saving
                        ? null
                        : () => _expense(day, stop, plan.currencySymbol),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  leading: null,
                  onTap: _saving
                      ? null
                      : () => _expense(day, stop, plan.currencySymbol),
                  isThreeLine: false,
                ),
            ],
          ),
        ),
      ],
    ];
  }
}

class _Paper extends StatelessWidget {
  const _Paper({required this.child, this.dark = false});
  final Widget child;
  final bool dark;
  @override
  Widget build(BuildContext context) => Material(
    color: dark ? AppColors.forest : AppColors.surface,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(24),
      side: BorderSide(color: dark ? AppColors.forest : AppColors.divider),
    ),
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      child: child,
    ),
  );
}

class _DayOverview extends StatelessWidget {
  const _DayOverview({required this.day, required this.symbol});
  final PlanDay day;
  final String symbol;
  @override
  Widget build(BuildContext context) => _Paper(
    dark: true,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 16,
          runSpacing: 6,
          children: [
            Text(
              '${day.completed}/${day.stops.length} durak tamamlandı',
              style: const TextStyle(color: AppColors.surface),
            ),
            Text(
              'Tahmini ${money(symbol, day.estimated)}',
              style: const TextStyle(color: Color(0xFFDCE5DC)),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: day.stops.isEmpty ? 0 : day.completed / day.stops.length,
            color: const Color(0xFFE7B478),
            backgroundColor: Colors.white12,
            minHeight: 5,
          ),
        ),
        if (day.summary.isNotEmpty) ...[
          const SizedBox(height: 18),
          _ExpandableText(text: day.summary, light: true),
        ],
      ],
    ),
  );
}

class _Number extends StatelessWidget {
  const _Number({required this.stop});
  final PlanStop stop;
  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: 18,
    backgroundColor: stop.completed
        ? AppColors.forest
        : const Color(0xFFF6E6D7),
    foregroundColor: stop.completed ? Colors.white : AppColors.accent,
    child: stop.completed
        ? const Icon(Icons.check, size: 18)
        : Text('${stop.index + 1}'),
  );
}

class _StopCard extends StatelessWidget {
  const _StopCard({
    super.key,
    required this.stop,
    required this.symbol,
    required this.busy,
    required this.onComplete,
    required this.onExpense,
    required this.onDirections,
  });
  final PlanStop stop;
  final String symbol;
  final bool busy;
  final VoidCallback onComplete, onExpense, onDirections;
  @override
  Widget build(BuildContext context) => _Paper(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Number(stop: stop),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                stop.name,
                style: const TextStyle(
                  fontSize: 18,
                  height: 1.35,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (stop.description.isNotEmpty)
          _ExpandableText(text: stop.description),
        if (stop.note.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              'Notun: ${stop.note}',
              style: const TextStyle(color: AppColors.forest, height: 1.5),
            ),
          ),
        const SizedBox(height: 12),
        Text(
          'Tahmini ${money(symbol, stop.estimated)}',
          style: const TextStyle(color: AppColors.muted, fontSize: 13),
        ),
        const Divider(height: 28),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            OutlinedButton.icon(
              onPressed: busy ? null : onComplete,
              icon: Icon(
                stop.completed ? Icons.check_circle : Icons.circle_outlined,
                size: 18,
              ),
              label: Text(stop.completed ? 'Gezildi' : 'Gezdim'),
            ),
            TextButton.icon(
              onPressed: busy ? null : onExpense,
              icon: const Icon(Icons.payments_outlined, size: 18),
              label: Text(
                stop.actual == null
                    ? 'Harcama ekle'
                    : money(symbol, stop.actual!),
              ),
            ),
            TextButton.icon(
              onPressed: onDirections,
              icon: const Icon(Icons.near_me_outlined, size: 18),
              label: const Text('Yol tarifi'),
            ),
          ],
        ),
      ],
    ),
  );
}

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text, this.light = false});
  final String text;
  final bool light;
  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool expanded = false;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final style = TextStyle(
        color: widget.light ? AppColors.surface : AppColors.muted,
        fontSize: 14,
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
              style: TextButton.styleFrom(
                foregroundColor: widget.light
                    ? const Color(0xFFE7B478)
                    : AppColors.accent,
              ),
              onPressed: () => setState(() => expanded = !expanded),
              child: Text(expanded ? 'Daha az' : 'Devamını oku'),
            ),
        ],
      );
    },
  );
}

class _ExpenseSheet extends StatefulWidget {
  const _ExpenseSheet({required this.stop, required this.symbol});
  final PlanStop stop;
  final String symbol;
  @override
  State<_ExpenseSheet> createState() => _ExpenseSheetState();
}

class _ExpenseSheetState extends State<_ExpenseSheet> {
  late final controller = TextEditingController(
    text: widget.stop.actual?.toString() ?? '',
  );
  String? error;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.fromLTRB(
      24,
      0,
      24,
      MediaQuery.viewInsetsOf(context).bottom + 28,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Harcamanı kaydet',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(widget.stop.name),
        const SizedBox(height: 22),
        TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Ödediğin tutar (${widget.symbol})',
            errorText: error,
          ),
        ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: () {
            final value = double.tryParse(
              controller.text.trim().replaceAll(',', '.'),
            );
            if (value == null || !value.isFinite || value < 0) {
              setState(() => error = 'Geçerli bir tutar gir (ör. 12,50).');
              return;
            }
            Navigator.pop(context, value);
          },
          child: const Text('Kaydet'),
        ),
      ],
    ),
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
          Icon(icon, size: 36, color: AppColors.forest),
          const SizedBox(height: 16),
          Text(text, textAlign: TextAlign.center),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Tekrar dene')),
        ],
      ),
    ),
  );
}
