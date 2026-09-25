import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/onboarding_data.dart';

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

/// Calendar constructors keep local dates stable across DST and year changes.
Map<String, DateTimeRange> travelDateShortcuts(DateTime today) {
  final date = DateUtils.dateOnly(today);
  final saturday = DateTime(
    date.year,
    date.month,
    date.day + (DateTime.saturday - date.weekday + 7) % 7,
  );
  final monday = DateTime(date.year, date.month, date.day + 8 - date.weekday);
  return {
    'Bu hafta sonu': DateTimeRange(
      start: saturday,
      end: DateTime(saturday.year, saturday.month, saturday.day + 1),
    ),
    'Gelecek hafta': DateTimeRange(
      start: monday,
      end: DateTime(monday.year, monday.month, monday.day + 6),
    ),
  };
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

  void _clear() => setState(() {
    _start = null;
    _end = null;
    _error = null;
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
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 8, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Seyahat tarihleri',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  key: const ValueKey('calendar-close'),
                  tooltip: context.tr('Kapat'),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Önce gidiş, sonra dönüş gününü seç.',
                    style: TextStyle(
                      color: context.colors.muted,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 14),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final preset in travelDateShortcuts(_min).entries)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              key: ValueKey('calendar-shortcut-${preset.key}'),
                              label: Text(preset.key),
                              selected:
                                  DateUtils.isSameDay(
                                    _start,
                                    preset.value.start,
                                  ) &&
                                  DateUtils.isSameDay(_end, preset.value.end),
                              selectedColor: context.colors.greenTint,
                              labelStyle: Theme.of(context)
                                  .textTheme
                                  .labelLarge!
                                  .copyWith(
                                    color: context.colors.text,
                                    fontSize: 12,
                                  ),
                              showCheckmark: false,
                              shape: const StadiumBorder(),
                              onSelected: (_) => setState(() {
                                _start = preset.value.start;
                                _end = preset.value.end;
                                _month = DateTime(_start!.year, _start!.month);
                                _error = null;
                              }),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: context.colors.background,
                      border: Border.all(color: context.colors.divider),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.calendar_today_outlined,
                          size: 18,
                          color: context.colors.muted,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '${_start == null ? context.tr('Gidiş') : context.tr(travelDateLabel(dateKey(_start!)))} → ${_end == null ? context.tr('Dönüş') : context.tr(travelDateLabel(dateKey(_end!)))}',
                            style: TextStyle(
                              color: context.colors.text,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
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
                                ? context.colors.greenTint
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(edge ? 12 : 0),
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
                              color: context.colors.text,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
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
            child: Row(
              children: [
                TextButton(onPressed: _clear, child: const Text('Temizle')),
                const SizedBox(width: 12),
                Expanded(
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
          ),
        ],
      ),
    );
  }
}
