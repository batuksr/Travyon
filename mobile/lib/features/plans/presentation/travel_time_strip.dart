import 'package:flutter/material.dart';
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
          const SnackBar(content: Text('Google Maps açılamadı. Tekrar dene.')),
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
  String duration(int minutes) => minutes < 60
      ? '$minutes dk'
      : '${minutes ~/ 60} sa${minutes % 60 == 0 ? '' : ' ${minutes % 60} dk'}';
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
    child: FutureBuilder<TravelTimes>(
      future: _request,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Text(
            'Ulaşım süreleri hesaplanıyor…',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          );
        }
        final times = snapshot.data?[widget.index] ?? <String, int>{};
        if (snapshot.hasError || times.isEmpty) {
          return Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text(
                'Ulaşım süresi alınamadı.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
              TextButton(
                onPressed: () => setState(() {
                  _request = widget.cache.load(widget.day, retry: true);
                }),
                child: const Text('Tekrar dene'),
              ),
            ],
          );
        }
        final fastest = times.values.reduce((a, b) => a < b ? a : b);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sonraki durak: ${widget.day.stops[widget.index + 1].name}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppColors.muted),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                for (final mode in travelModes)
                  if (times.containsKey(mode))
                    OutlinedButton.icon(
                      onPressed: _opening ? null : () => _open(mode),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: times[mode] == fastest
                            ? const Color(0xFFFFE5D3)
                            : AppColors.surface,
                        foregroundColor: times[mode] == fastest
                            ? const Color(0xFF98491C)
                            : AppColors.text,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.body,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      icon: Icon(icons[mode], size: 16),
                      label: Text(
                        '${labels[mode]} · ${duration(times[mode]!)}${times[mode] == fastest ? ' · En hızlı' : ''}',
                      ),
                    ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Tahmini sürelerdir; seyahat gününde değişebilir.',
              style: TextStyle(color: AppColors.muted, fontSize: 10),
            ),
          ],
        );
      },
    ),
  );
}
