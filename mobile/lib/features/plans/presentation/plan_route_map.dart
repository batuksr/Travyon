import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/mobile_places_repository.dart';
import 'google_place_sheet.dart';

class PlanRouteMap extends StatelessWidget {
  const PlanRouteMap({
    super.key,
    required this.day,
    required this.onDirections,
    this.destination = '',
    this.placesRepository,
    this.mapBuilder,
  });
  final PlanDay day;
  final String destination;
  final ValueChanged<PlanStop> onDirections;
  final MobilePlacesRepository? placesRepository;

  /// Allows tests to exercise markers without a native platform view.
  final Widget Function(GoogleMap)? mapBuilder;
  @override
  Widget build(BuildContext context) => _RouteCanvas(
    key: ValueKey(
      '${day.index}:${day.date}:${day.stops.map((s) => '${s.name}:${s.location}').join('|')}',
    ),
    stops: day.stops,
    destination: destination,
    onDirections: onDirections,
    places: placesRepository ?? FirebaseMobilePlacesRepository(),
    mapBuilder: mapBuilder,
  );
}

class _RouteCanvas extends StatefulWidget {
  const _RouteCanvas({
    super.key,
    required this.stops,
    required this.destination,
    required this.onDirections,
    required this.places,
    this.mapBuilder,
  });
  final List<PlanStop> stops;
  final String destination;
  final ValueChanged<PlanStop> onDirections;
  final MobilePlacesRepository places;
  final Widget Function(GoogleMap)? mapBuilder;
  @override
  State<_RouteCanvas> createState() => _RouteCanvasState();
}

class _RouteCanvasState extends State<_RouteCanvas> {
  GoogleMapController? _controller;
  int _selected = 0;
  bool _sheetOpen = false;
  final Map<int, BitmapDescriptor> _icons = {};
  List<PlanStop> get _located =>
      widget.stops.where((s) => s.location != null).toList();
  LatLng _point(PlanStop s) => LatLng(s.location!.lat, s.location!.lng);
  bool get _configured =>
      widget.mapBuilder != null ||
      (!kIsWeb &&
          switch (defaultTargetPlatform) {
            TargetPlatform.android => const String.fromEnvironment(
              'GOOGLE_MAPS_ANDROID_API_KEY',
            ).isNotEmpty,
            TargetPlatform.iOS => const String.fromEnvironment(
              'GOOGLE_MAPS_IOS_API_KEY',
            ).isNotEmpty,
            _ => false,
          });
  @override
  void initState() {
    super.initState();
    if (widget.mapBuilder == null) _makeIcons();
  }

  Future<void> _makeIcons() async {
    for (final stop in _located) {
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawCircle(
        const Offset(48, 48),
        46,
        Paint()..color = Colors.white,
      );
      canvas.drawCircle(
        const Offset(48, 48),
        40,
        Paint()..color = AppColors.accent,
      );
      final text = TextPainter(
        text: TextSpan(
          text: '${stop.index + 1}',
          style: const TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      text.paint(canvas, Offset(48 - text.width / 2, 48 - text.height / 2));
      final picture = recorder.endRecording();
      final image = await picture.toImage(96, 96);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      picture.dispose();
      image.dispose();
      if (!mounted) return;
      if (bytes != null) {
        setState(
          () => _icons[stop.index] = BitmapDescriptor.bytes(
            bytes.buffer.asUint8List(),
            width: 48,
            height: 48,
          ),
        );
      }
    }
  }

  Future<void> _camera(CameraUpdate update) async {
    try {
      await _controller?.animateCamera(update);
    } catch (_) {
      /* View may close during day changes. */
    }
  }

  void _fit() {
    final points = _located.map(_point).toList();
    if (points.isEmpty) return;
    double south = points.first.latitude,
        north = south,
        west = points.first.longitude,
        east = west;
    for (final p in points) {
      if (p.latitude < south) south = p.latitude;
      if (p.latitude > north) north = p.latitude;
      if (p.longitude < west) west = p.longitude;
      if (p.longitude > east) east = p.longitude;
    }
    if ((north - south).abs() < 0.0001 && (east - west).abs() < 0.0001) {
      _camera(CameraUpdate.newLatLngZoom(points.first, 15));
    } else {
      _camera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(
            southwest: LatLng(south, west),
            northeast: LatLng(north, east),
          ),
          48,
        ),
      );
    }
  }

  void _select(int index, {bool details = false}) {
    setState(() => _selected = index);
    final stop = widget.stops[index];
    if (stop.location != null) _camera(CameraUpdate.newLatLng(_point(stop)));
    if (details) _showDetails(stop);
  }

  Future<void> _showDetails(PlanStop stop) async {
    if (_sheetOpen) return;
    _sheetOpen = true;
    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        builder: (_) => GooglePlaceSheet(
          stop: stop,
          destination: widget.destination,
          repository: widget.places,
        ),
      );
    } finally {
      _sheetOpen = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.stops.isEmpty) {
      return const Center(child: Text('Bu gün için henüz durak yok.'));
    }
    final located = _located;
    final stop = widget.stops[_selected];
    final missing = widget.stops.length - located.length;
    Widget map;
    if (located.isEmpty) {
      map = const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Bu günün duraklarında konum bilgisi yok.\nAşağıdan bir durak seçip yol tarifi açabilirsin.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else if (!_configured) {
      map = const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Google Maps anahtarı yüklenmedi. Uygulamayı --dart-define-from-file=maps-config.local.json seçeneğiyle yeniden başlat.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else {
      final googleMap = GoogleMap(
        initialCameraPosition: CameraPosition(
          target: _point(located.first),
          zoom: 14,
        ),
        onMapCreated: (controller) {
          _controller = controller;
          _fit();
        },
        mapToolbarEnabled: false,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
        tiltGesturesEnabled: false,
        markers: {
          for (final place in located)
            Marker(
              markerId: MarkerId('stop-${place.index}'),
              position: _point(place),
              icon:
                  _icons[place.index] ??
                  BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueOrange,
                  ),
              zIndexInt: _selected == place.index ? 2 : 1,
              infoWindow: InfoWindow(
                title: '${place.index + 1}. ${place.name}',
              ),
              consumeTapEvents: true,
              onTap: () => _select(place.index, details: true),
            ),
        },
        polylines: {
          for (int i = 1; i < widget.stops.length; i++)
            if (widget.stops[i - 1].location != null &&
                widget.stops[i].location != null)
              Polyline(
                polylineId: PolylineId('leg-$i'),
                points: [_point(widget.stops[i - 1]), _point(widget.stops[i])],
                color: AppColors.forest,
                width: 3,
                patterns: [PatternItem.dot, PatternItem.gap(10)],
              ),
        },
      );
      map = Stack(
        children: [
          widget.mapBuilder?.call(googleMap) ?? googleMap,
          Positioned(
            top: 10,
            right: 12,
            child: IconButton.filled(
              tooltip: 'Tüm durakları göster',
              onPressed: _fit,
              style: IconButton.styleFrom(
                backgroundColor: AppColors.surface,
                foregroundColor: AppColors.forest,
              ),
              icon: const Icon(Icons.fit_screen),
            ),
          ),
        ],
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) => Column(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              child: map,
            ),
          ),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: constraints.maxHeight * 0.43,
            ),
            child: Material(
              color: AppColors.surface,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (located.isNotEmpty)
                      Text(
                        'Çizgiler durak sırasını gösterir, yol tarifi değildir.${missing > 0 ? ' $missing durağın konumu eksik.' : ''}',
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 11,
                        ),
                      ),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${_selected + 1} / ${widget.stops.length} durak · ${stop.period}',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Önceki durak',
                          onPressed: _selected > 0
                              ? () => _select(_selected - 1)
                              : null,
                          icon: const Icon(Icons.chevron_left),
                        ),
                        IconButton(
                          tooltip: 'Sonraki durak',
                          onPressed: _selected < widget.stops.length - 1
                              ? () => _select(_selected + 1)
                              : null,
                          icon: const Icon(Icons.chevron_right),
                        ),
                      ],
                    ),
                    Text(
                      stop.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (stop.location == null)
                      const Text(
                        'Konumu kayıtlı değil; adıyla yol tarifi aranacak.',
                        style: TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    TextButton.icon(
                      onPressed: () => _showDetails(stop),
                      icon: const Icon(Icons.star_outline, size: 18),
                      label: const Text('Google puanı ve yorumlar'),
                    ),
                    TextButton.icon(
                      onPressed: () => widget.onDirections(stop),
                      icon: const Icon(Icons.near_me_outlined, size: 18),
                      label: const Text('Google Maps’te yol tarifi'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
