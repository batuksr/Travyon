import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/mobile_places_repository.dart';
import 'google_place_gallery.dart';

class GooglePlaceSheet extends StatefulWidget {
  const GooglePlaceSheet({
    super.key,
    required this.stop,
    required this.destination,
    required this.repository,
  });
  final PlanStop stop;
  final String destination;
  final MobilePlacesRepository repository;
  @override
  State<GooglePlaceSheet> createState() => _GooglePlaceSheetState();
}

class _GooglePlaceSheetState extends State<GooglePlaceSheet> {
  late Future<Map<String, dynamic>?> _details;
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _details = widget.repository.details(widget.stop, widget.destination);
  }

  Future<void> _open(String raw) async {
    final uri = Uri.tryParse(raw);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return;
    try {
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
    } catch (_) {}
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Bağlantı açılamadı.')));
    }
  }

  String _error(Object? error) {
    if (error is FirebaseFunctionsException) {
      if (error.code == 'failed-precondition' ||
          error.code == 'resource-exhausted') {
        return error.message ?? 'Google bilgileri şu an alınamıyor.';
      }
      if (error.code == 'not-found' || error.code == 'unimplemented') {
        return 'Mekân servisi hazır değil. Functions emülatörünü güncel kodla yeniden başlat.';
      }
    }
    return 'Google bilgileri alınamadı. Bağlantını kontrol edip tekrar dene.';
  }

  @override
  Widget build(BuildContext context) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.72,
    minChildSize: 0.4,
    maxChildSize: 0.95,
    builder: (context, controller) => ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Google Maps',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
            ),
            IconButton(
              tooltip: context.tr('Kapat'),
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        Text(
          widget.stop.name,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        FutureBuilder<Map<String, dynamic>?>(
          future: _details,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return Column(
                children: [
                  Text(_error(snapshot.error)),
                  TextButton(
                    onPressed: () => setState(_load),
                    child: const Text('Tekrar dene'),
                  ),
                ],
              );
            }
            final place = snapshot.data;
            if (place == null) {
              return const Text(
                'Bu durak için eşleşen bir Google mekânı bulunamadı.',
              );
            }
            final reviews = planList(place['reviews']);
            final photos = planList(place['photos'])
                .map(planMap)
                .where(
                  (p) =>
                      p['name'] is String && (p['name'] as String).isNotEmpty,
                )
                .take(10)
                .toList();
            final hours = planList(
              planMap(place['regularOpeningHours'])['weekdayDescriptions'],
            );
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (photos.isNotEmpty)
                  GooglePlaceGallery(
                    key: ValueKey(photos.map((p) => p['name']).join('|')),
                    photos: photos,
                    repository: widget.repository,
                    onOpenSource: _open,
                    onRefresh: () => setState(_load),
                  )
                else
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Bu mekân için fotoğraf bulunmuyor.',
                      style: TextStyle(color: context.colors.muted),
                    ),
                  ),
                Text(
                  planMap(place['displayName'])['text'] as String? ??
                      widget.stop.name,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(place['formattedAddress'] as String? ?? ''),
                const SizedBox(height: 12),
                Text(
                  place['rating'] is num
                      ? '★ ${place['rating']}  ·  ${place['userRatingCount'] ?? 0} değerlendirme'
                      : 'Henüz puan bilgisi yok',
                  style: TextStyle(
                    color: context.colors.forest,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (place['googleMapsUri'] is String)
                  TextButton(
                    onPressed: () => _open(place['googleMapsUri']),
                    child: const Text('Google Maps’te tüm yorumları gör'),
                  ),
                if (hours.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Çalışma saatleri',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  for (final hour in hours) Text('$hour'),
                ],
                if (place['websiteUri'] is String)
                  TextButton(
                    onPressed: () => _open(place['websiteUri']),
                    child: const Text('Mekânın web sitesi'),
                  ),
                const SizedBox(height: 20),
                const Text(
                  'Google yorumları',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                Text(
                  'Google’ın sağladığı, alaka düzeyine göre sıralanmış yorumlar.',
                  style: TextStyle(color: context.colors.muted, fontSize: 12),
                ),
                if (reviews.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('Gösterilebilecek yorum bulunmuyor.'),
                  ),
                for (final raw in reviews) _review(planMap(raw)),
                for (final raw in planList(place['attributions']))
                  TextButton(
                    onPressed: () =>
                        _open(planMap(raw)['providerUri'] as String? ?? ''),
                    child: Text(
                      planMap(raw)['provider'] as String? ?? 'Veri sağlayıcı',
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    ),
  );

  Widget _review(Map<String, dynamic> review) {
    final author = planMap(review['authorAttribution']);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Divider(),
          if (author['photoUri'] is String &&
              Uri.tryParse(author['photoUri'])?.scheme == 'https')
            ClipOval(
              child: Image.network(
                author['photoUri'],
                width: 36,
                height: 36,
                errorBuilder: (_, _, _) =>
                    const Icon(Icons.account_circle, size: 36),
              ),
            ),
          TextButton(
            onPressed: author['uri'] is String
                ? () => _open(author['uri'])
                : null,
            child: Text(
              author['displayName'] as String? ?? 'Google kullanıcısı',
            ),
          ),
          Text(
            '★ ${review['rating'] ?? '—'} · ${review['relativePublishTimeDescription'] ?? ''}',
            style: TextStyle(color: context.colors.muted),
          ),
          const SizedBox(height: 8),
          Text(
            planMap(review['text'])['text'] as String? ??
                planMap(review['originalText'])['text'] as String? ??
                '',
          ),
          if (review['googleMapsUri'] is String)
            TextButton(
              onPressed: () => _open(review['googleMapsUri']),
              child: const Text('Yorumu Google Maps’te aç'),
            ),
        ],
      ),
    );
  }
}
