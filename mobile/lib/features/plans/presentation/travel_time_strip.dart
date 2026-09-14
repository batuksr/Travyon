import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/travel_times_repository.dart';

class TravelTimeStrip extends StatefulWidget {
  const TravelTimeStrip({
    super.key,
    required this.day,
    required this.index,
    required this.cache,
    this.onOpen,
  });
  final PlanDay day;
  final int index;
  final TravelTimesCache cache;
  final Future<bool> Function(Uri)? onOpen;
  @override
  State<TravelTimeStrip> createState() => _TravelTimeStripState();
}

class _TravelTimeStripState extends State<TravelTimeStrip> {
  late Future<TravelTimes> _request = widget.cache.load(widget.day);
  bool _opening = false;
  @override
  void didUpdateWidget(covariant TravelTimeStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.cache != oldWidget.cache ||
        widget.cache.key(widget.day) != oldWidget.cache.key(oldWidget.day)) {
      _request = widget.cache.load(widget.day);
    }
  }

  Future<void> _open(String mode) async {
    if (_opening) return;
    setState(() => _opening = true);
    try {
      final uri = segmentDirections(
        widget.day.stops[widget.index],
        widget.day.stops[widget.index + 1],
        mode,
      );
      final opened =
          await (widget.onOpen?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (!opened) throw StateError('Harita açılamadı');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('Google Maps açılamadı. Tekrar dene.')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  static const labels = {
    'driving': 'Araba',
    'transit': 'Toplu taşıma',
    'walking': 'Yürüyüş',
    'cycling': 'Bisiklet',
  };
  static const icons = {
    'driving': Icons.directions_car_outlined,
    'transit': Icons.directions_transit_outlined,
    'walking': Icons.directions_walk,
    'cycling': Icons.directions_bike,
  };
  String duration(BuildContext context, int minutes) {
    if (context.l10n.isEnglish) {
      return minutes < 60
          ? '$minutes min'
          : '${minutes ~/ 60} hr${minutes % 60 == 0 ? '' : ' ${minutes % 60} min'}';
    }
    return minutes < 60
        ? '$minutes dk'
        : '${minutes ~/ 60} sa${minutes % 60 == 0 ? '' : ' ${minutes % 60} dk'}';
  }

  @override
  Widget build(BuildContext context) {
    if (widget.index < 0 || widget.index + 1 >= widget.day.stops.length) {
      return const SizedBox.shrink();
    }
    final origin = widget.day.stops[widget.index];
    final destination = widget.day.stops[widget.index + 1];
    if (origin.location == null || destination.location == null) {
      return const SizedBox.shrink();
    }
    final distance = UnitFormatter.of(context)
        .distance(distanceBetweenKm(origin.location!, destination.location!));

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
      child: FutureBuilder<TravelTimes>(
        future: _request,
        builder: (context, snapshot) {
          final loading = snapshot.connectionState != ConnectionState.done;
          final times = snapshot.data?[widget.index] ?? <String, int>{};
          final fastest = times.isEmpty
              ? null
              : times.values.reduce((a, b) => a < b ? a : b);

          return Wrap(
            spacing: 6,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Tooltip(
                message: context.tr(
                  'Kuş uçuşu mesafedir; yol mesafesi farklı olabilir.',
                ),
                child: Text(
                  '↕ $distance',
                  key: const ValueKey('segment-distance'),
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (loading)
                Text(
                  context.tr('Ulaşım süreleri hesaplanıyor…'),
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                )
              else if (snapshot.hasError || times.isEmpty)
                Tooltip(
                  message: context.tr('Ulaşım süresi alınamadı.'),
                  child: TextButton(
                    onPressed: () => setState(() {
                      _request = widget.cache.load(widget.day, retry: true);
                    }),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      textStyle: const TextStyle(
                        fontFamily: AppTypography.body,
                        fontSize: 11,
                      ),
                    ),
                    child: Text(context.tr('Tekrar dene')),
                  ),
                )
              else ...[
                const Text('·', style: TextStyle(color: AppColors.muted)),
                for (final mode in travelModes)
                  if (times.containsKey(mode))
                    Tooltip(
                      message: context.tr(
                        times[mode] == fastest
                            ? '{mode} · {duration} · En hızlı'
                            : '{mode} · {duration}',
                        values: {
                          'mode': context.tr(labels[mode]!),
                          'duration': duration(context, times[mode]!),
                        },
                      ),
                      child: OutlinedButton(
                        onPressed: _opening ? null : () => _open(mode),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(48, 28),
                          tapTargetSize: MaterialTapTargetSize.padded,
                          shape: const StadiumBorder(),
                          side: BorderSide(
                            color: times[mode] == fastest
                                ? AppColors.accent.withValues(alpha: 0.4)
                                : AppColors.divider,
                          ),
                          backgroundColor: times[mode] == fastest
                              ? const Color(0xFFFFE5D3)
                              : AppColors.surface,
                          foregroundColor: times[mode] == fastest
                              ? const Color(0xFF98491C)
                              : AppColors.muted,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 4,
                          ),
                          textStyle: const TextStyle(
                            fontFamily: AppTypography.body,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(icons[mode], size: 14),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(duration(context, times[mode]!)),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ],
          );
        },
      ),
    );
  }
}
