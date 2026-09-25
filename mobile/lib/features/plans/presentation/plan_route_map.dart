import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/mobile_places_repository.dart';
import 'google_place_sheet.dart';

const _routeMapStyle = '''[
  {"featureType":"poi.business","elementType":"labels","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.attraction","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#e2ecdf"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#c9e2e4"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#68665f"}]}
]''';

const _darkRouteMapStyle = '''[
  {"elementType":"geometry","stylers":[{"color":"#2b241d"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#baaFA1"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#211c17"}]},
  {"featureType":"poi.business","elementType":"labels","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.attraction","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#303c2d"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#51463a"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#66503c"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#f2e8da"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#1b3036"}]}
]''';

class PlanRouteMap extends StatelessWidget {
  const PlanRouteMap({
    super.key,
    required this.day,
    required this.onDirections,
    this.destination = '',
    this.placesRepository,
    this.mapBuilder,
    this.fullscreen = false,
    this.onToggleFullscreen,
    this.preview = false,
  });
  final PlanDay day;
  final String destination;
  final ValueChanged<PlanStop> onDirections;
  final MobilePlacesRepository? placesRepository;
  final bool fullscreen;
  final VoidCallback? onToggleFullscreen;

  /// A non-interactive overview embedded in the itinerary's scroll view.
  final bool preview;

  /// Allows tests to exercise markers without a native platform view.
  final Widget Function(GoogleMap)? mapBuilder;

  @override
  Widget build(BuildContext context) => _RouteCanvas(
    key: ValueKey(
      '${day.index}:${day.date}:${day.stops.map((s) => '${s.name}:${s.location}').join('|')}',
    ),
    stops: day.stops,
    destination: destination,
    places: placesRepository ?? FirebaseMobilePlacesRepository(),
    mapBuilder: mapBuilder,
    fullscreen: fullscreen,
    onToggleFullscreen: onToggleFullscreen,
    preview: preview,
  );
}

class _RouteCanvas extends StatefulWidget {
  const _RouteCanvas({
    super.key,
    required this.stops,
    required this.destination,
    required this.places,
    required this.fullscreen,
    required this.preview,
    this.onToggleFullscreen,
    this.mapBuilder,
  });
  final List<PlanStop> stops;
  final String destination;
  final MobilePlacesRepository places;
  final bool fullscreen;
  final bool preview;
  final VoidCallback? onToggleFullscreen;
  final Widget Function(GoogleMap)? mapBuilder;

  @override
  State<_RouteCanvas> createState() => _RouteCanvasState();
}

class _RouteCanvasState extends State<_RouteCanvas> {
  GoogleMapController? _controller;
  int _selected = 0;
  bool _sheetOpen = false;
  final _icons =
      <int, ({BitmapDescriptor normal, BitmapDescriptor selected})>{};
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
    if (widget.mapBuilder == null && _configured) _makeIcons();
  }

  @override
  void didUpdateWidget(covariant _RouteCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fullscreen != widget.fullscreen) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _fit();
      });
    }
  }

  Future<BitmapDescriptor> _markerIcon(
    int number, {
    required bool selected,
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawCircle(const Offset(48, 48), 46, Paint()..color = Colors.white);
    canvas.drawCircle(
      const Offset(48, 48),
      39,
      Paint()..color = selected ? AppColors.forest : AppColors.accent,
    );
    final text = TextPainter(
      text: TextSpan(
        text: '$number',
        style: const TextStyle(
          fontSize: 37,
          fontFamily: AppTypography.body,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    text.paint(canvas, Offset(48 - text.width / 2, 48 - text.height / 2));
    text.dispose();
    final picture = recorder.endRecording();
    final image = await picture.toImage(96, 96);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    picture.dispose();
    image.dispose();
    return bytes == null
        ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange)
        : BitmapDescriptor.bytes(
            bytes.buffer.asUint8List(),
            width: selected ? 34 : 28,
            height: selected ? 34 : 28,
          );
  }

  Future<void> _makeIcons() async {
    final icons =
        <int, ({BitmapDescriptor normal, BitmapDescriptor selected})>{};
    for (final stop in _located) {
      final normal = await _markerIcon(stop.index + 1, selected: false);
      if (!mounted) return;
      final selected = await _markerIcon(stop.index + 1, selected: true);
      if (!mounted) return;
      icons[stop.index] = (normal: normal, selected: selected);
    }
    if (mounted) setState(() => _icons.addAll(icons));
  }

  Future<void> _camera(CameraUpdate update) async {
    try {
      await _controller?.animateCamera(update);
    } catch (_) {
      // A day change can dispose the native view during a camera animation.
    }
  }

  void _fit() {
    final points = _located.map(_point).toList();
    if (points.isEmpty) return;
    double south = points.first.latitude,
        north = south,
        west = points.first.longitude,
        east = west;
    for (final point in points) {
      if (point.latitude < south) south = point.latitude;
      if (point.latitude > north) north = point.latitude;
      if (point.longitude < west) west = point.longitude;
      if (point.longitude > east) east = point.longitude;
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
          36,
        ),
      );
    }
  }

  void _select(int index) {
    if (!mounted || index < 0 || index >= widget.stops.length) return;
    setState(() => _selected = index);
    final stop = widget.stops[index];
    if (stop.location != null) _camera(CameraUpdate.newLatLng(_point(stop)));
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

  Future<void> _chooseStop() async {
    final index = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: context.colors.surface,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        builder: (context, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.tr('Duraklar'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: context.tr('Kapat'),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 10),
            for (final stop in widget.stops)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  selected: stop.index == _selected,
                  selectedTileColor: context.colors.tone(
                    const Color(0xFFEAF0E9),
                  ),
                  selectedColor: context.colors.forest,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  leading: CircleAvatar(
                    backgroundColor: stop.index == _selected
                        ? AppColors.forest
                        : context.colors.tone(const Color(0xFFF8EADC)),
                    foregroundColor: stop.index == _selected
                        ? Colors.white
                        : context.colors.tone(const Color(0xFFA74F21)),
                    child: Text(
                      '${stop.index + 1}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  title: Text(
                    stop.name,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    context.tr(
                      stop.location == null
                          ? 'Bu durağın konumu kayıtlı değil.'
                          : stop.period,
                    ),
                    style: TextStyle(fontSize: 12, color: context.colors.muted),
                  ),
                  trailing: Icon(
                    stop.index == _selected
                        ? Icons.check_rounded
                        : Icons.chevron_right_rounded,
                    size: 20,
                  ),
                  onTap: () => Navigator.pop(context, stop.index),
                ),
              ),
          ],
        ),
      ),
    );
    if (index != null && mounted) _select(index);
  }

  void _routeInfo() {
    final missing = widget.stops.length - _located.length;
    final distance = routeDistanceKm(widget.stops.map((stop) => stop.location));
    showAppInformation(
      context,
      title: 'Rota bilgisi',
      icon: Icons.route_outlined,
      message: context.tr(
        distance > 0 && missing > 0
            ? 'Noktalar arası yaklaşık {distance}. Çizgiler durak sırasıdır, yol tarifi değildir. {count} konum eksik.'
            : distance > 0
            ? 'Noktalar arası yaklaşık {distance}. Çizgiler durak sırasıdır, yol tarifi değildir.'
            : missing > 0
            ? 'Çizgiler durak sırasıdır, yol tarifi değildir. {count} konum eksik.'
            : 'Çizgiler durak sırasıdır, yol tarifi değildir.',
        values: {
          'distance': UnitFormatter.of(context).distance(distance),
          'count': missing,
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.stops.isEmpty && !widget.preview) {
      return Column(
        children: [
          if (widget.fullscreen && widget.onToggleFullscreen != null)
            Align(
              alignment: Alignment.centerRight,
              child: _control(
                'Tam ekrandan çık',
                Icons.fullscreen_exit_rounded,
                widget.onToggleFullscreen,
              ),
            ),
          Expanded(
            child: Center(
              child: Text(context.tr('Bu gün için henüz durak yok.')),
            ),
          ),
        ],
      );
    }
    final located = _located;
    final available = located.isNotEmpty && _configured;
    return Padding(
      padding: widget.fullscreen || widget.preview
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(10, 0, 10, 8),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final largeText = MediaQuery.textScalerOf(context).scale(14) > 20;
          final panelHeight = widget.preview
              ? 0.0
              : (largeText ? 144.0 : 112.0).clamp(
                  0.0,
                  constraints.maxHeight * 0.32,
                );
          final mapPadding = widget.preview
              ? const EdgeInsets.fromLTRB(12, 44, 12, 48)
              : EdgeInsets.fromLTRB(12, 64, 60, panelHeight + 28);
          Widget map;
          if (!available) {
            map = ColoredBox(
              color: context.colors.background,
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 64, 20, panelHeight + 16),
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.map_outlined,
                          color: context.colors.muted,
                          size: 32,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          context.tr(
                            widget.preview
                                ? (located.isEmpty
                                      ? 'Durakların konumu henüz eklenmemiş.'
                                      : 'Harita önizlemesi şu anda kullanılamıyor.')
                                : located.isEmpty
                                ? 'Bu günün duraklarında konum bilgisi yok.\nDurak kartına dokunarak mekân detaylarını açabilirsin.'
                                : 'Harita şu anda gösterilemiyor. Durak listesinden devam edebilirsin.',
                          ),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: context.colors.muted,
                            fontSize: 13,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
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
              style: context.colors.isDark
                  ? _darkRouteMapStyle
                  : _routeMapStyle,
              padding: mapPadding,
              mapToolbarEnabled: false,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              tiltGesturesEnabled: false,
              rotateGesturesEnabled: false,
              compassEnabled: false,
              scrollGesturesEnabled: !widget.preview,
              zoomGesturesEnabled: !widget.preview,
              liteModeEnabled: widget.preview,
              gestureRecognizers: widget.preview
                  ? {}
                  : {
                      Factory<OneSequenceGestureRecognizer>(
                        () => EagerGestureRecognizer(),
                      ),
                    },
              markers: {
                for (final place in located)
                  Marker(
                    markerId: MarkerId('stop-${place.index}'),
                    position: _point(place),
                    anchor: const Offset(0.5, 0.5),
                    icon:
                        (_selected == place.index
                            ? _icons[place.index]?.selected
                            : _icons[place.index]?.normal) ??
                        BitmapDescriptor.defaultMarkerWithHue(
                          BitmapDescriptor.hueOrange,
                        ),
                    zIndexInt: _selected == place.index ? 2 : 1,
                    infoWindow: InfoWindow(
                      title: '${place.index + 1}. ${place.name}',
                    ),
                    consumeTapEvents: true,
                    onTap: widget.preview ? null : () => _select(place.index),
                  ),
              },
              polylines: {
                for (int i = 1; i < widget.stops.length; i++)
                  if (widget.stops[i - 1].location != null &&
                      widget.stops[i].location != null)
                    Polyline(
                      polylineId: PolylineId('leg-$i'),
                      points: [
                        _point(widget.stops[i - 1]),
                        _point(widget.stops[i]),
                      ],
                      color: context.colors.accent.withValues(alpha: 0.85),
                      width: 2,
                      patterns: [PatternItem.dot, PatternItem.gap(10)],
                    ),
              },
            );
            map = widget.mapBuilder?.call(googleMap) ?? googleMap;
          }
          return ClipRRect(
            key: ValueKey(
              widget.preview ? 'plan-map-preview' : 'route-map-viewport',
            ),
            borderRadius: BorderRadius.circular(
              widget.fullscreen || widget.preview ? 0 : 24,
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                map,
                if (!widget.preview)
                  Positioned(
                    top: 10,
                    left: 10,
                    right: 10,
                    child: Row(
                      children: [
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Material(
                              color: context.colors.surface,
                              elevation: 2,
                              shadowColor: Colors.black12,
                              borderRadius: BorderRadius.circular(16),
                              child: TextButton.icon(
                                onPressed: _chooseStop,
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                  textStyle: const TextStyle(
                                    fontFamily: AppTypography.body,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                icon: const Icon(
                                  Icons.format_list_numbered_rounded,
                                  size: 19,
                                ),
                                label: Text(
                                  context.tr('Duraklar'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _control(
                          'Rota bilgisi',
                          Icons.info_outline_rounded,
                          _routeInfo,
                        ),
                        if (widget.onToggleFullscreen != null) ...[
                          const SizedBox(width: 8),
                          _control(
                            widget.fullscreen
                                ? 'Tam ekrandan çık'
                                : 'Tam ekran harita',
                            widget.fullscreen
                                ? Icons.fullscreen_exit_rounded
                                : Icons.fullscreen_rounded,
                            widget.onToggleFullscreen,
                          ),
                        ],
                      ],
                    ),
                  ),
                if (available && !widget.preview)
                  Positioned(
                    top: 68,
                    right: 10,
                    child: Column(
                      children: [
                        _control(
                          'Tüm durakları göster',
                          Icons.center_focus_strong_rounded,
                          _fit,
                        ),
                        if (constraints.maxHeight >= 420) ...[
                          const SizedBox(height: 10),
                          _control(
                            'Yakınlaştır',
                            Icons.add_rounded,
                            () => _camera(CameraUpdate.zoomIn()),
                          ),
                          const SizedBox(height: 6),
                          _control(
                            'Uzaklaştır',
                            Icons.remove_rounded,
                            () => _camera(CameraUpdate.zoomOut()),
                          ),
                        ],
                      ],
                    ),
                  ),
                if (!widget.preview)
                  Positioned(
                    left: 10,
                    right: 10,
                    bottom: 10,
                    height: panelHeight,
                    child: _stopPanel(),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _control(String label, IconData icon, VoidCallback? onPressed) =>
      Material(
        color: context.colors.surface,
        elevation: 2,
        shadowColor: Colors.black12,
        borderRadius: BorderRadius.circular(16),
        child: IconButton(
          tooltip: context.tr(label),
          onPressed: onPressed,
          style: IconButton.styleFrom(
            minimumSize: const Size(48, 48),
            foregroundColor: context.colors.text,
          ),
          icon: Icon(icon, size: 22),
        ),
      );

  Widget _stopPanel() {
    final stop = widget.stops[_selected];
    return Material(
      color: context.colors.surface,
      elevation: 4,
      shadowColor: Colors.black12,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              child: InkWell(
                key: const ValueKey('route-stop-details'),
                onTap: () => _showDetails(stop),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr(
                          '{current} / {total} durak',
                          values: {
                            'current': _selected + 1,
                            'total': widget.stops.length,
                          },
                        ),
                        style: TextStyle(
                          fontSize: 11,
                          color: context.colors.muted,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        stop.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          height: 1.3,
                          fontWeight: FontWeight.w700,
                          color: context.colors.text,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        context.tr(
                          stop.location == null
                              ? 'Bu durağın konumu kayıtlı değil.'
                              : 'Mekân detayları',
                        ),
                        style: TextStyle(
                          fontSize: 11,
                          color: context.colors.text,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: context.tr('Önceki durak'),
            onPressed: _selected > 0 ? () => _select(_selected - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              tooltip: context.tr('Sonraki durak'),
              onPressed: _selected < widget.stops.length - 1
                  ? () => _select(_selected + 1)
                  : null,
              style: IconButton.styleFrom(
                minimumSize: const Size(48, 48),
                backgroundColor: context.colors.tone(const Color(0xFFEAF0E9)),
                foregroundColor: context.colors.forest,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.chevron_right_rounded),
            ),
          ),
        ],
      ),
    );
  }
}
