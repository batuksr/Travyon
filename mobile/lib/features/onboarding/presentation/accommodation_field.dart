import 'dart:async';
import 'dart:math';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/accommodation_repository.dart';

class AccommodationField extends StatefulWidget {
  const AccommodationField({
    super.key,
    required this.value,
    required this.destination,
    required this.repository,
    required this.onChanged,
    required this.onSelected,
    this.confirmed = false,
  });
  final String value, destination;
  final bool confirmed;
  final AccommodationRepository repository;
  final ValueChanged<String> onChanged;
  final ValueChanged<AccommodationSelection> onSelected;
  @override
  State<AccommodationField> createState() => _AccommodationFieldState();
}

class _AccommodationFieldState extends State<AccommodationField> {
  late final _controller = TextEditingController(text: widget.value);
  final _focus = FocusNode();
  Timer? _debounce;
  int _revision = 0;
  String _session = _token();
  bool _loading = false, _searched = false;
  String? _error;
  List<AccommodationSuggestion> _suggestions = [];
  static String _token() => List.generate(
    16,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();

  @override
  void didUpdateWidget(covariant AccommodationField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.destination != widget.destination) {
      _revision++;
      _debounce?.cancel();
      _suggestions = [];
      _loading = _searched = false;
      _session = _token();
    }
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _revision++;
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _edit(String text) {
    widget.onChanged(text);
    _debounce?.cancel();
    final revision = ++_revision;
    setState(() {
      _suggestions = [];
      _error = null;
      _searched = false;
      _loading = text.trim().length >= 3;
    });
    if (_loading) {
      _debounce = Timer(
        const Duration(milliseconds: 400),
        () => _search(text.trim(), revision),
      );
    }
  }

  String _message(Object error) {
    if (error is FirebaseFunctionsException) {
      if (error.code == 'not-found') {
        return 'Arama servisi hazır değil. Yerel Functions servisini yeniden başlatıp dene.';
      }
      if (error.code == 'resource-exhausted') {
        return 'Arama sınırına ulaşıldı. Biraz sonra tekrar dene.';
      }
      if (error.code == 'failed-precondition') {
        return 'Arama izni doğrulanamadı. Sunucudaki Places API (New) ayarlarını kontrol et.';
      }
    }
    return 'Öneriler alınamadı. Tekrar dene veya açık adresi kendin yaz.';
  }

  Future<void> _search(String text, int revision) async {
    try {
      final rows = await widget.repository
          .suggest(text, widget.destination, _session)
          .timeout(const Duration(seconds: 20));
      if (!mounted || revision != _revision) return;
      setState(() {
        _suggestions = rows;
        _loading = false;
        _searched = true;
      });
    } catch (error) {
      if (!mounted || revision != _revision) return;
      setState(() {
        _error = _message(error);
        _loading = false;
      });
    }
  }

  Future<void> _select(AccommodationSuggestion suggestion) async {
    _debounce?.cancel();
    final revision = ++_revision;
    final session = _session;
    _session = _token();
    setState(() {
      _loading = true;
      _error = null;
      _suggestions = [];
      _searched = false;
    });
    try {
      final selection = await widget.repository
          .resolve(suggestion, session)
          .timeout(const Duration(seconds: 20));
      if (!mounted || revision != _revision) return;
      _controller.text = selection.address;
      _focus.unfocus();
      setState(() => _loading = false);
      widget.onSelected(selection);
    } catch (error) {
      if (!mounted || revision != _revision) return;
      setState(() {
        _error = _message(error);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TextFormField(
        key: const ValueKey('accommodation-address'),
        controller: _controller,
        focusNode: _focus,
        maxLength: 300,
        minLines: 1,
        maxLines: 3,
        decoration: InputDecoration(
          hintText: context.tr('Otel adı veya adres yaz'),
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _loading
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : null,
        ),
        onChanged: _edit,
      ),
      if (_error != null) ...[
        Semantics(
          liveRegion: true,
          child: Text(_error!, style: const TextStyle(color: AppColors.muted)),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            onPressed: () => _edit(_controller.text),
            child: const Text('Tekrar dene'),
          ),
        ),
      ],
      if (_searched && _suggestions.isEmpty)
        const Text(
          'Sonuç bulunamadı. Otel adıyla birlikte semt veya sokak adını yaz.',
          style: TextStyle(color: AppColors.muted),
        ),
      if (_suggestions.isNotEmpty)
        Material(
          color: AppColors.surface,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            side: const BorderSide(color: AppColors.divider),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final row in _suggestions)
                ListTile(
                  key: ValueKey('accommodation-${row.id}'),
                  leading: const Icon(Icons.location_on_outlined),
                  title: Text(row.title),
                  subtitle: row.subtitle.isEmpty ? null : Text(row.subtitle),
                  onTap: () => _select(row),
                ),
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Google Maps',
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF5E5E5E),
                  ),
                ),
              ),
            ],
          ),
        ),
      if (widget.confirmed && !_loading)
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text(
            'Konaklama konumu seçildi · Google Maps',
            style: TextStyle(fontSize: 12, color: Color(0xFF5E5E5E)),
          ),
        ),
    ],
  );
}
