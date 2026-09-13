import 'dart:math';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../data/wallet_repository.dart';
import '../../onboarding/data/onboarding_data.dart' show dateKey;

class WalletEditor extends StatefulWidget {
  const WalletEditor({
    super.key,
    required this.uid,
    required this.planId,
    required this.repository,
    this.entry,
  });
  final String uid, planId;
  final WalletRepository repository;
  final WalletEntry? entry;
  @override
  State<WalletEditor> createState() => _WalletEditorState();
}

class _WalletEditorState extends State<WalletEditor> {
  final _form = GlobalKey<FormState>();
  final _scroll = ScrollController();
  late String _category = widget.entry?.category ?? 'flight';
  late final _createdAt =
      widget.entry?.createdAt ?? DateTime.now().millisecondsSinceEpoch;
  late final _id =
      widget.entry?.id ??
      'wallet_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 32).toRadixString(16)}';
  late final Map<String, TextEditingController> _fields = {
    'title': TextEditingController(text: widget.entry?.title),
    'reference': TextEditingController(text: widget.entry?.reference),
    'date': TextEditingController(text: widget.entry?.date),
    'note': TextEditingController(text: widget.entry?.note),
    'url': TextEditingController(text: widget.entry?.url),
    for (final key in walletFields.values.expand((v) => v.keys).toSet())
      key: TextEditingController(text: widget.entry?.details[key]),
  };
  bool _busy = false, _dirty = false;
  String? _error;
  @override
  void dispose() {
    _scroll.dispose();
    for (final c in _fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _back() async {
    if (_busy) return;
    if (_dirty) {
      final discard = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: const Text('Değişiklikler bırakılsın mı?'),
          content: const Text('Kaydetmediğin bilgiler silinecek.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Devam et'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Vazgeç'),
            ),
          ],
        ),
      );
      if (discard != true || !mounted) return;
    }
    if (mounted) Navigator.pop(context);
  }

  String? _validDate(String? value) {
    if (value == null || value.isEmpty) return null;
    final date = DateTime.tryParse(value);
    return date == null || dateKey(date) != value ? 'Geçerli tarih seç.' : null;
  }

  Future<void> _date(String key) async {
    final parsed = DateTime.tryParse(_fields[key]!.text);
    final date = await showDatePicker(
      context: context,
      initialDate: parsed != null && parsed.year >= 1900 && parsed.year <= 2200
          ? parsed
          : DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime(2200, 12, 31),
    );
    if (date != null && mounted) {
      setState(() {
        _fields[key]!.text = dateKey(date);
        _dirty = true;
      });
    }
  }

  Future<void> _time(String key) async {
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (c, child) => MediaQuery(
        data: MediaQuery.of(c).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (time != null && mounted) {
      setState(() {
        _fields[key]!.text =
            '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
        _dirty = true;
      });
    }
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    if (_category == 'stay' &&
        _fields['date']!.text.isNotEmpty &&
        _fields['checkOut']!.text.isNotEmpty &&
        _fields['checkOut']!.text.compareTo(_fields['date']!.text) < 0) {
      setState(() => _error = 'Çıkış tarihi giriş tarihinden önce olamaz.');
      if (_scroll.hasClients) _scroll.jumpTo(0);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final entry = WalletEntry(
      id: _id,
      planId: widget.entry?.planId ?? widget.planId,
      category: _category,
      title: _fields['title']!.text,
      reference: _fields['reference']!.text,
      date: _fields['date']!.text,
      note: _fields['note']!.text,
      url: _fields['url']!.text,
      details: {
        for (final key in walletFields[_category]!.keys)
          key: _fields[key]!.text,
      },
      createdAt: _createdAt,
      updatedAt: widget.entry?.updatedAt ?? 0,
    );
    try {
      await widget.repository.save(
        widget.uid,
        entry,
        create: widget.entry == null,
      );
      if (mounted) Navigator.pop(context, entry.id);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is StateError ? e.message.toString() : 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene; bilgilerin korunuyor.',
        );
        if (_scroll.hasClients) _scroll.jumpTo(0);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _input(
    String key,
    String label, {
    int limit = 160,
    bool required = false,
    bool date = false,
    bool time = false,
    int lines = 1,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      key: ValueKey('wallet-$key'),
      controller: _fields[key],
      enabled: !_busy,
      readOnly: date || time,
      maxLength: limit,
      maxLines: lines,
      keyboardType: key == 'url' ? TextInputType.url : TextInputType.text,
      decoration: InputDecoration(
        labelText: context.tr(label),
        counterText: '',
        suffixIcon: date || time
            ? IconButton(
                tooltip: context.tr('Temizle'),
                onPressed: _busy
                    ? null
                    : () => setState(() {
                        _fields[key]!.clear();
                        _dirty = true;
                      }),
                icon: const Icon(Icons.clear, size: 18),
              )
            : null,
      ),
      onTap: date
          ? () => _date(key)
          : time
          ? () => _time(key)
          : null,
      onChanged: (_) {
        _dirty = true;
      },
      validator: (v) {
        if (required && (v ?? '').trim().isEmpty) {
          return context.tr('Başlık gir.');
        }
        if (date) {
          final error = _validDate(v);
          return error == null ? null : context.tr(error);
        }
        if (key == 'url' && walletUrl(v ?? '') == null) {
          return context.tr('Geçerli bir http veya https bağlantısı gir.');
        }
        return null;
      },
    ),
  );
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) _back();
    },
    child: Scaffold(
      appBar: AppBar(
        title: Text(widget.entry == null ? 'Cüzdanına ekle' : 'Kaydı düzenle'),
        leading: IconButton(
          tooltip: context.tr('Geri'),
          onPressed: _busy ? null : _back,
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.all(20),
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ),
              DropdownButtonFormField<String>(
                initialValue: _category,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: context.tr('Kayıt türü'),
                ),
                items: walletCategories.entries
                    .map(
                      (e) =>
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                    )
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) => setState(() {
                        _category = v!;
                        _dirty = true;
                      }),
              ),
              const SizedBox(height: 20),
              _input('title', 'Başlık', required: true, limit: 100),
              _input('reference', 'Rezervasyon / bilet kodu', limit: 80),
              _input(
                'date',
                _category == 'stay' ? 'Giriş tarihi' : 'Tarih',
                date: true,
              ),
              for (final field in walletFields[_category]!.entries)
                _input(
                  field.key,
                  field.value,
                  date: walletDateFields.contains(field.key),
                  time: field.key == 'time',
                  lines: field.key == 'address' ? 2 : 1,
                ),
              _input('note', 'Not (isteğe bağlı)', limit: 500, lines: 3),
              _input('url', 'Bağlantı (isteğe bağlı)', limit: 2048),
              const Text(
                'Bu bilgiler yalnızca senin hesabında görünür. Buradan satın alma veya rezervasyon yapılmaz. Belge dosyası yükleme henüz yok.',
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
          child: FilledButton.icon(
            key: const ValueKey('wallet-save'),
            onPressed: _busy ? null : _save,
            icon: const Icon(Icons.check),
            label: Text(_busy ? 'Kaydediliyor…' : 'Cüzdana kaydet'),
          ),
        ),
      ),
    ),
  );
}
