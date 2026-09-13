import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';

/// Keeps the draft on validation, lookup and save failures; blocks dismissal
/// while a write is pending so it cannot silently complete after closing.
class StopEditorSheet extends StatefulWidget {
  const StopEditorSheet({super.key, required this.save, this.note});
  final String? note;
  final Future<void> Function(Map<String, dynamic>) save;
  @override
  State<StopEditorSheet> createState() => _StopEditorSheetState();
}

class _StopEditorSheetState extends State<StopEditorSheet> {
  late final _name = TextEditingController(text: widget.note ?? '');
  final _cost = TextEditingController(text: '0');
  final _description = TextEditingController();
  String _period = 'Sabah';
  bool _busy = false;
  String? _error;
  bool get _isNote => widget.note != null;
  @override
  void dispose() {
    _name.dispose();
    _cost.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    final cost = double.tryParse(_cost.text.trim().replaceAll(',', '.'));
    if (!_isNote &&
        (_name.text.trim().isEmpty ||
            _name.text.trim().length > 150 ||
            cost == null ||
            !cost.isFinite ||
            cost < 0)) {
      setState(() => _error = 'Mekân adını ve geçerli bir tahmini tutar gir.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.save(
        _isNote
            ? {'note': _name.text.trim()}
            : {
                'placeName': _name.text.trim(),
                'period': _period,
                'estimatedCost': cost,
                'description': _description.text.trim(),
              },
      );
      if (mounted) {
        setState(() => _busy = false);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is StateError
              ? e.message.toString()
              : 'Kaydedilemedi. Bağlantını kontrol et; yazdıkların korunuyor.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _isNote ? 'Durak notun' : 'Yeni durak ekle',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Text(
              _isNote ? 'Notunu temizleyip kaydederek silebilirsin.' : 'Mekânın konumu bulunup seçili güne eklenecek. Tutar, planın para birimindedir.',
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _name,
              enabled: !_busy,
              maxLength: _isNote ? 2000 : 150,
              minLines: _isNote ? 3 : 1,
              maxLines: _isNote ? 6 : 2,
              decoration: InputDecoration(
                labelText: context.tr(_isNote ? 'Not' : 'Mekân adı ve adresi'),
              ),
            ),
            if (!_isNote) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _period,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: context.tr('Günün bölümü'),
                ),
                items: [
                  for (final p in [
                    'Sabah',
                    'Öğle',
                    'Öğleden Sonra',
                    'Akşam',
                    'Gece',
                  ])
                    DropdownMenuItem(value: p, child: Text(p)),
                ],
                onChanged: _busy
                    ? null
                    : (value) => setState(() => _period = value!),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _cost,
                enabled: !_busy,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: context.tr('Tahmini tutar'),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _description,
                enabled: !_busy,
                maxLength: 1000,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: context.tr('Açıklama (isteğe bağlı)'),
                ),
              ),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Kaydediliyor…' : 'Kaydet'),
            ),
            TextButton(
              onPressed: _busy ? null : () => Navigator.pop(context),
              child: const Text('Vazgeç'),
            ),
          ],
        ),
      ),
    ),
  );
}
