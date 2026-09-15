import 'dart:math';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/theme/app_theme.dart';

import '../data/wallet_repository.dart';
import '../../onboarding/data/onboarding_data.dart' show dateKey;
import 'wallet_form_copy.dart';
import 'wallet_form_widgets.dart';
import 'wallet_pocket.dart';

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
      final discard = await showAppConfirmation(
        context,
        title: 'Değişikliklerden vazgeç?',
        message: 'Kaydetmediğin bilgiler silinecek.',
        confirmLabel: 'Kaydetmeden çık',
        cancelLabel: 'Düzenlemeye dön',
        icon: Icons.edit_note_rounded,
        tone: AppDialogTone.warning,
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

  String? _fieldError(String key, String value) {
    if (key == 'title' && value.trim().isEmpty) return 'Başlık gir.';
    if (key == 'date' || walletDateFields.contains(key)) {
      return _validDate(value);
    }
    if (key == 'url' && walletUrl(value) == null) {
      return 'Geçerli bir http veya https bağlantısı gir.';
    }
    return null;
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
    final current = _fields[key]!.text.split(':');
    final hour = current.length == 2 ? int.tryParse(current[0]) : null;
    final minute = current.length == 2 ? int.tryParse(current[1]) : null;
    final time = await showTimePicker(
      context: context,
      initialTime:
          hour != null &&
              minute != null &&
              hour >= 0 &&
              hour < 24 &&
              minute >= 0 &&
              minute < 60
          ? TimeOfDay(hour: hour, minute: minute)
          : TimeOfDay.now(),
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
    // Lazy list fields can be unmounted after scrolling. Validate their
    // controllers as well so off-screen fields cannot bypass validation.
    for (final key in [
      'title',
      'date',
      ...walletFields[_category]!.keys,
      'url',
    ]) {
      final error = _fieldError(key, _fields[key]!.text);
      if (error != null) {
        setState(() => _error = error);
        if (_scroll.hasClients) _scroll.jumpTo(0);
        return;
      }
    }
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
    required String hint,
    int limit = 160,
    bool required = false,
    bool date = false,
    bool time = false,
    int lines = 1,
  }) {
    final hasValue = _fields[key]!.text.isNotEmpty;
    final code = [
      'reference',
      'flightNumber',
      'terminal',
      'seat',
      'gate',
      'url',
    ].contains(key);
    final phone = key == 'contact' || key == 'emergencyPhone';
    final labelText = '${context.tr(label)}${required ? ' *' : ''}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(
            child: Text(
              labelText,
              style: TextStyle(
                color: context.colors.text,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 7),
          Semantics(
            label: labelText,
            child: TextFormField(
              key: ValueKey('wallet-$key'),
              controller: _fields[key],
              enabled: !_busy,
              readOnly: date || time,
              maxLength: limit,
              maxLines: lines,
              style: TextStyle(
                fontFamily: AppTypography.body,
                fontSize: 14,
                color: context.colors.text,
              ),
              keyboardType: key == 'url'
                  ? TextInputType.url
                  : phone
                  ? TextInputType.phone
                  : lines > 1
                  ? TextInputType.multiline
                  : TextInputType.text,
              textInputAction: lines > 1
                  ? TextInputAction.newline
                  : TextInputAction.next,
              autocorrect: !code && !phone,
              enableSuggestions: !code && !phone,
              decoration: InputDecoration(
                hintText: context.tr(hint),
                hintMaxLines: 3,
                hintStyle: TextStyle(
                  color: context.colors.muted,
                  fontSize: 13,
                  height: 1.5,
                ),
                errorMaxLines: 3,
                counterText: '',
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 15,
                ),
                suffixIcon: date || time
                    ? IconButton(
                        tooltip: context.tr(
                          hasValue
                              ? 'Temizle'
                              : date
                              ? 'Tarih seç'
                              : 'Saat seç',
                        ),
                        onPressed: _busy
                            ? null
                            : hasValue
                            ? () => setState(() {
                                _fields[key]!.clear();
                                _dirty = true;
                              })
                            : () => date ? _date(key) : _time(key),
                        icon: Icon(
                          hasValue
                              ? Icons.close_rounded
                              : date
                              ? Icons.calendar_today_outlined
                              : Icons.schedule_rounded,
                          size: 19,
                        ),
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
              validator: (value) {
                final error = _fieldError(key, value ?? '');
                return error == null ? null : context.tr(error);
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final copy = walletFormCopy[_category]!;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.entry == null ? 'Cüzdanına ekle' : 'Kaydı düzenle',
          ),
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
              key: const ValueKey('wallet-form-scroll'),
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              children: [
                Text(
                  'Bir başlık ekle; diğer alanları ihtiyacına göre doldur.',
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        _error!,
                        style: TextStyle(
                          color: context.colors.danger,
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                const WalletFormSection(
                  title: 'Kayıt türü',
                  icon: Icons.category_outlined,
                ),
                WalletTypePicker(
                  selected: _category,
                  onChanged: _busy
                      ? null
                      : (value) {
                          if (value == _category) return;
                          setState(() {
                            _category = value;
                            _dirty = true;
                            _error = null;
                          });
                        },
                ),
                const SizedBox(height: 20),
                const WalletFormSection(
                  title: 'Temel bilgiler',
                  icon: Icons.notes_rounded,
                ),
                _input(
                  'title',
                  'Başlık',
                  hint: copy.titleHint,
                  required: true,
                  limit: 100,
                ),
                _input(
                  'reference',
                  copy.referenceLabel,
                  hint: copy.referenceHint,
                  limit: 80,
                ),
                _input('date', copy.dateLabel, hint: 'Tarih seç', date: true),
                if (walletFields[_category]!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    decoration: BoxDecoration(
                      color: context.colors.greenTint.withValues(alpha: .5),
                      border: Border.all(color: context.colors.divider),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        WalletFormSection(
                          title: copy.sectionTitle,
                          icon: walletIcon(_category),
                          subtitle: 'Bu kayda ait bilgileri ekleyebilirsin.',
                        ),
                        for (final field in walletFields[_category]!.entries)
                          _input(
                            field.key,
                            walletDetailCopy[field.key]!.label,
                            hint: walletDetailCopy[field.key]!.hint,
                            date: walletDateFields.contains(field.key),
                            time: field.key == 'time',
                            lines: field.key == 'address' ? 2 : 1,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                const WalletFormSection(
                  title: 'Ek bilgiler',
                  icon: Icons.more_horiz_rounded,
                ),
                _input(
                  'url',
                  'Bağlantı (isteğe bağlı)',
                  hint: copy.urlHint,
                  limit: 2048,
                ),
                _input(
                  'note',
                  'Not (isteğe bağlı)',
                  hint: copy.noteHint,
                  limit: 500,
                  lines: 3,
                ),
                Text(
                  'Bu bilgiler yalnızca senin hesabında görünür. Buradan satın alma veya rezervasyon yapılmaz. Belge dosyası yükleme henüz yok.',
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 11,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: DecoratedBox(
          decoration: BoxDecoration(
            color: context.colors.surface,
            border: Border(top: BorderSide(color: context.colors.divider)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: FilledButton.icon(
                key: const ValueKey('wallet-save'),
                onPressed: _busy ? null : _save,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check_rounded, size: 20),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                label: Text(_busy ? 'Kaydediliyor…' : 'Cüzdana kaydet'),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
