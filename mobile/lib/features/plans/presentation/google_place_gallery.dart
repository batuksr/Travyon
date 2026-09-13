import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/mobile_places_repository.dart';

class GooglePlaceGallery extends StatefulWidget {
  const GooglePlaceGallery({
    super.key,
    required this.photos,
    required this.repository,
    required this.onOpenSource,
    required this.onRefresh,
    this.imageBuilder,
  });
  final List<Map<String, dynamic>> photos;
  final MobilePlacesRepository repository;
  final ValueChanged<String> onOpenSource;
  final VoidCallback onRefresh;
  final Widget Function(String)? imageBuilder;
  @override
  State<GooglePlaceGallery> createState() => _GooglePlaceGalleryState();
}

class _GooglePlaceGalleryState extends State<GooglePlaceGallery> {
  int _index = 0;
  late Future<String> _photo;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _photo = widget.repository.photo(widget.photos[_index]['name'] as String);
  }

  Widget _failure() => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.broken_image_outlined, color: AppColors.muted),
        const Text('Fotoğraf yüklenemedi.'),
        TextButton(
          onPressed: widget.onRefresh,
          child: const Text('Fotoğrafları yenile'),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final authors = planList(widget.photos[_index]['authorAttributions']);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Mekân fotoğrafları',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                '${_index + 1} / ${widget.photos.length}',
                style: const TextStyle(color: AppColors.muted),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: ColoredBox(
              color: AppColors.background,
              child: SizedBox(
                height: 210,
                child: PageView.builder(
                  itemCount: widget.photos.length,
                  onPageChanged: (index) => setState(() {
                    _index = index;
                    _load();
                  }),
                  itemBuilder: (context, index) {
                    // Adjacent pages must not trigger additional billable photo requests.
                    if (index != _index) return const SizedBox.expand();
                    return Semantics(
                      label: context.tr(
                        '{count}. mekân fotoğrafı',
                        values: {'count': index + 1},
                      ),
                      child: FutureBuilder<String>(
                        key: ValueKey(index),
                        future: _photo,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState !=
                              ConnectionState.done) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          if (snapshot.hasError || !snapshot.hasData) {
                            return _failure();
                          }
                          return widget.imageBuilder?.call(snapshot.data!) ??
                              Image.network(
                                snapshot.data!,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                loadingBuilder: (context, child, progress) =>
                                    progress == null
                                    ? child
                                    : const Center(
                                        child: CircularProgressIndicator(),
                                      ),
                                errorBuilder: (_, _, _) => _failure(),
                              );
                        },
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
          if (widget.photos.length > 1)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'Diğer fotoğraflar için kaydır',
                style: TextStyle(fontSize: 12, color: AppColors.muted),
              ),
            ),
          // Attribution stays next to its photo, including when there are multiple authors.
          for (final raw in authors)
            Builder(
              builder: (_) {
                final author = planMap(raw);
                final name =
                    author['displayName'] as String? ?? 'Fotoğraf sahibi';
                final rawUri = author['uri'] as String? ?? '';
                final uri = rawUri.startsWith('//') ? 'https:$rawUri' : rawUri;
                if (Uri.tryParse(uri)?.scheme == 'https') {
                  return TextButton(
                    onPressed: () => widget.onOpenSource(uri),
                    child: Text('Fotoğraf: $name'),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Fotoğraf: $name',
                    style: const TextStyle(fontSize: 12),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
