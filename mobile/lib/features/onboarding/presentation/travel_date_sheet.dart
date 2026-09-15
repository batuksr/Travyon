import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/onboarding_data.dart';
import 'onboarding_widgets.dart';

const travelMonths = [
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
String travelDateLabel(String raw) {
  final date = DateTime.tryParse(raw);
  return date == null
      ? 'Tarih seç'
      : '${date.day} ${travelMonths[date.month - 1]} ${date.year}';
}

/// A Monday-first month grid. Changes stay local until explicitly confirmed.
class TravelDateSheet extends StatefulWidget {
  const TravelDateSheet({super.key, required this.today, this.start, this.end});
  final DateTime today;
  final DateTime? start, end;
  @override
  State<TravelDateSheet> createState() => _TravelDateSheetState();
}

class _TravelDateSheetState extends State<TravelDateSheet> {
  late final _min = DateUtils.dateOnly(widget.today);
  late final _max = DateTime(_min.year + 3, 12, 31);
  late DateTime _month;
  DateTime? _start, _end;
  String? _error;
  int get _count => _start == null || _end == null
      ? 0
      : DateTime.utc(_end!.year, _end!.month, _end!.day)
                .difference(
                  DateTime.utc(_start!.year, _start!.month, _start!.day),
                )
                .inDays +
            1;

  @override
  void initState() {
    super.initState();
    final start = widget.start == null
        ? _min
        : DateUtils.dateOnly(widget.start!);
    final end = widget.end == null
        ? DateTime(_min.year, _min.month, _min.day + 1)
        : DateUtils.dateOnly(widget.end!);
    if (!start.isBefore(_min) && !end.isBefore(start) && !end.isAfter(_max)) {
      _start = start;
      _end = end;
      if (_count > 31) _end = null;
    }
    _month = DateTime((_start ?? _min).year, (_start ?? _min).month);
  }

  void _pick(DateTime day) => setState(() {
    _error = null;
    if (_start == null || _end != null || day.isBefore(_start!)) {
      _start = day;
      _end = null;
    } else {
      _end = day;
      if (_count > 31) {
        _end = null;
        _error = 'Bir plan en fazla 31 gün olabilir. Daha yakın bir dönüş tarihi seç.';
      }
    }
  });

  @override
  Widget build(BuildContext context) {
    final first = DateTime(_month.year, _month.month);
    final offset = first.weekday - 1;
    final total = DateUtils.getDaysInMonth(_month.year, _month.month);
    final cells = ((offset + total) / 7).ceil() * 7;
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Seyahat tarihleri',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Önce gidiş, sonra dönüş gününü seç.',
                    style: TextStyle(color: context.colors.muted, height: 1.5),
                  ),
                  const SizedBox(height: 18),
                  OnboardingPair(
                    first: OnboardingValueTile(
                      title: 'Gidiş',
                      value: _start == null
                          ? 'Tarih seç'
                          : travelDateLabel(dateKey(_start!)),
                      icon: Icons.flight_takeoff_rounded,
                    ),
                    second: OnboardingValueTile(
                      title: 'Dönüş',
                      value: _end == null
                          ? 'Tarih seç'
                          : travelDateLabel(dateKey(_end!)),
                      icon: Icons.flight_land_rounded,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      IconButton(
                        tooltip: context.tr('Önceki ay'),
                        onPressed:
                            first.isAfter(DateTime(_min.year, _min.month))
                            ? () => setState(
                                () => _month = DateTime(
                                  _month.year,
                                  _month.month - 1,
                                ),
                              )
                            : null,
                        icon: const Icon(Icons.chevron_left_rounded),
                      ),
                      Expanded(
                        child: Text(
                          '${travelMonths[_month.month - 1]} ${_month.year}',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      IconButton(
                        tooltip: context.tr('Sonraki ay'),
                        onPressed:
                            first.isBefore(DateTime(_max.year, _max.month))
                            ? () => setState(
                                () => _month = DateTime(
                                  _month.year,
                                  _month.month + 1,
                                ),
                              )
                            : null,
                        icon: const Icon(Icons.chevron_right_rounded),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      for (final day in [
                        'Pzt',
                        'Sal',
                        'Çar',
                        'Per',
                        'Cum',
                        'Cmt',
                        'Paz',
                      ])
                        Expanded(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 10),
                            child: Text(
                              day,
                              textAlign: TextAlign.center,
                              textScaler: TextScaler.noScaling,
                              style: TextStyle(
                                color: context.colors.muted,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 7,
                          mainAxisExtent: 48,
                        ),
                    itemCount: cells,
                    itemBuilder: (context, index) {
                      final number = index - offset + 1;
                      if (number < 1 || number > total) {
                        return const SizedBox.shrink();
                      }
                      final day = DateTime(_month.year, _month.month, number);
                      final disabled = day.isBefore(_min) || day.isAfter(_max);
                      final edge =
                          DateUtils.isSameDay(day, _start) ||
                          DateUtils.isSameDay(day, _end);
                      final inside =
                          _start != null &&
                          _end != null &&
                          day.isAfter(_start!) &&
                          day.isBefore(_end!);
                      return Semantics(
                        label: context.tr(travelDateLabel(dateKey(day))),
                        selected: edge || inside,
                        button: true,
                        enabled: !disabled,
                        excludeSemantics: true,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Material(
                            color: edge
                                ? context.colors.accent
                                : inside
                                ? context.colors.tone(const Color(0xFFFFE4D1))
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(edge ? 14 : 0),
                            child: InkWell(
                              key: ValueKey('calendar-${dateKey(day)}'),
                              borderRadius: BorderRadius.circular(14),
                              onTap: disabled ? null : () => _pick(day),
                              child: Center(
                                child: Text(
                                  '$number',
                                  textScaler: TextScaler.noScaling,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: edge
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: disabled
                                        ? context.colors.muted.withValues(
                                            alpha: .35,
                                          )
                                        : edge
                                        ? context.colors.onAccent
                                        : context.colors.text,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            _count > 0
                                ? '$_count gün · ${_count - 1} gece'
                                : 'Dönüş gününü seç',
                            style: TextStyle(
                              color: context.colors.forest,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => setState(() {
                          _start = null;
                          _end = null;
                          _error = null;
                        }),
                        child: const Text('Temizle'),
                      ),
                    ],
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Semantics(
                        liveRegion: true,
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: context.colors.tone(const Color(0xFF9B3020)),
                            height: 1.5,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: FilledButton(
              onPressed: _count > 0 && _count <= 31
                  ? () => Navigator.pop(
                      context,
                      DateTimeRange(start: _start!, end: _end!),
                    )
                  : null,
              child: const Text('Tarihleri seç'),
            ),
          ),
        ],
      ),
    );
  }
}
