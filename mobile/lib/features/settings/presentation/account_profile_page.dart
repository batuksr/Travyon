import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../onboarding/data/onboarding_data.dart';
import '../../help/presentation/help_style.dart';
import '../data/settings_fields.dart';
import '../data/settings_repository.dart';
import 'account_widgets.dart';

class AccountProfilePage extends StatefulWidget {
  const AccountProfilePage({super.key, required this.repository});
  final SettingsRepository repository;
  @override
  State<AccountProfilePage> createState() => _AccountProfilePageState();
}

class _AccountProfilePageState extends State<AccountProfilePage> {
  final _form = GlobalKey<FormState>();
  final _section = settingsSections.firstWhere(
    (section) => section.id == 'profile',
  );
  final _controllers = <String, TextEditingController>{};
  final _values = <String, dynamic>{};
  bool _loading = true, _busy = false, _dirty = false, _saved = false;
  String? _loadError, _saveError;
  String _name = '', _photo = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final data = await widget.repository.load();
      if (!mounted) return;
      for (final controller in _controllers.values) {
        controller.dispose();
      }
      _controllers.clear();
      _values.clear();
      for (final field in _section.fields) {
        var value = data[field.key] ?? field.initial;
        if (field.options != null && !field.options!.containsKey(value)) {
          value = field.initial;
        }
        _values[field.key] = value;
        if (field.options == null) {
          _controllers[field.key] = TextEditingController(
            text: field.key == 'nationality' && value == 'Türkiye'
                ? context.tr('Türkiye')
                : '$value',
          );
        }
      }
      _name = data['displayName'] as String? ?? '';
      _photo = data['photoURL'] as String? ?? '';
    } catch (error) {
      if (mounted) _loadError = settingsError(error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _changed() => setState(() {
    _dirty = true;
    _saved = false;
    _saveError = null;
  });

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _saved = false;
      _saveError = null;
    });
    try {
      await widget.repository.save(_section, {
        ..._values,
        for (final entry in _controllers.entries) entry.key: entry.value.text,
      });
      if (!mounted) return;
      setState(() {
        _dirty = false;
        _saved = true;
        _name = _controllers['displayName']!.text.trim();
      });
    } catch (error) {
      if (mounted) setState(() => _saveError = settingsError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _birthDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final parsed = DateTime.tryParse(_controllers['birthDate']!.text);
    final picked = await showDatePicker(
      context: context,
      initialDate:
          parsed != null &&
              !parsed.isBefore(DateTime(1900)) &&
              !parsed.isAfter(today)
          ? parsed
          : today,
      firstDate: DateTime(1900),
      lastDate: today,
    );
    if (picked == null || !mounted) return;
    _controllers['birthDate']!.text = dateKey(picked);
    _changed();
  }

  Widget _field(String key) {
    final field = _section.fields.firstWhere((field) => field.key == key);
    final Widget input;
    if (field.options != null) {
      input = DropdownButtonFormField<String>(
        key: ValueKey('profile-$key'),
        initialValue: '${_values[key]}',
        isExpanded: true,
        decoration: accountInput(context, field.label),
        style: TextStyle(
          fontFamily: AppTypography.body,
          fontSize: 14,
          color: context.colors.text,
        ),
        items: field.options!.entries
            .map(
              (entry) => DropdownMenuItem(
                value: entry.key,
                child: Text(context.tr(entry.value)),
              ),
            )
            .toList(),
        onChanged: _busy
            ? null
            : (value) {
                _values[key] = value;
                _changed();
              },
      );
    } else {
      input = TextFormField(
        key: ValueKey('profile-$key'),
        controller: _controllers[key],
        enabled: !_busy,
        readOnly: field.date,
        maxLength: field.max,
        minLines: key == 'address' ? 3 : 1,
        maxLines: key == 'address' ? 5 : 1,
        keyboardType: key == 'phone'
            ? TextInputType.phone
            : key == 'address'
            ? TextInputType.multiline
            : TextInputType.text,
        textInputAction: key == 'address'
            ? TextInputAction.newline
            : TextInputAction.next,
        textCapitalization: key == 'displayName' || key == 'nationality'
            ? TextCapitalization.words
            : TextCapitalization.none,
        autofillHints: switch (key) {
          'displayName' => const [AutofillHints.name],
          'phone' => const [AutofillHints.telephoneNumber],
          'address' => const [AutofillHints.fullStreetAddress],
          _ => null,
        },
        decoration: accountInput(
          context,
          field.label,
          suffix: field.date
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: context.tr('Tarih seç'),
                      onPressed: _busy ? null : _birthDate,
                      icon: const Icon(Icons.calendar_today_outlined, size: 19),
                    ),
                    if (_controllers[key]!.text.isNotEmpty)
                      IconButton(
                        tooltip: context.tr('Tarihi temizle'),
                        onPressed: _busy
                            ? null
                            : () {
                                _controllers[key]!.clear();
                                _changed();
                              },
                        icon: const Icon(Icons.close, size: 19),
                      ),
                  ],
                )
              : null,
        ),
        onTap: field.date && !_busy ? _birthDate : null,
        onChanged: (_) => _changed(),
        validator: (value) {
          final error = validateSetting(field, value ?? '');
          return error == null ? null : context.tr(error);
        },
      );
    }
    return Padding(padding: const EdgeInsets.only(bottom: 18), child: input);
  }

  Widget _identity() {
    final uri = Uri.tryParse(_photo);
    final hasPhoto =
        uri?.scheme == 'https' ||
        (_photo.startsWith('http://10.0.2.2:') ||
            _photo.startsWith('http://127.0.0.1:'));
    final fallback = Center(
      child: Text(
        _name.trim().isEmpty
            ? '?'
            : _name.trim().characters.first.toUpperCase(),
        style: const TextStyle(
          fontSize: 24,
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    return HelpPanel(
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            clipBehavior: Clip.antiAlias,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.forest,
            ),
            child: hasPhoto
                ? Image.network(
                    _photo,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => fallback,
                  )
                : fallback,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              _name.isEmpty ? context.tr('Gezgin') : _name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AccountScreen(
    title: 'Profil bilgileri',
    busy: _busy,
    dirty: _dirty,
    child: _loading
        ? const Padding(
            padding: EdgeInsets.all(48),
            child: Center(child: CircularProgressIndicator()),
          )
        : _loadError != null
        ? Column(
            children: [
              AccountNotice(message: _loadError!, error: true),
              AccountSaveButton(
                label: 'Tekrar dene',
                onPressed: _load,
                icon: Icons.refresh,
              ),
            ],
          )
        : Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const AccountHeader(
                  title: 'Profilini güncel tut.',
                  subtitle: 'Bilgilerini tek yerden düzenle; değişikliklerin hesabına kaydedilsin.',
                  icon: Icons.person_outline_rounded,
                ),
                _identity(),
                AccountCard(
                  title: 'Kişisel bilgiler',
                  icon: Icons.badge_outlined,
                  children: [
                    _field('displayName'),
                    _field('username'),
                    _field('birthDate'),
                    _field('nationality'),
                    _field('gender'),
                  ],
                ),
                AccountCard(
                  title: 'İletişim bilgileri',
                  icon: Icons.contact_mail_outlined,
                  children: [_field('phone'), _field('address')],
                ),
                const AccountNotice(
                  message: 'Ad soyad zorunludur. Diğer profil alanlarını boş bırakabilirsin.',
                  icon: Icons.info_outline_rounded,
                ),
                if (_saveError != null)
                  AccountNotice(message: _saveError!, error: true),
                if (_saved)
                  const AccountNotice(
                    message: 'Değişikliklerin kaydedildi.',
                    icon: Icons.check_circle_outline,
                  ),
                AccountSaveButton(
                  key: const ValueKey('profile-save'),
                  label: 'Değişiklikleri kaydet',
                  busy: _busy,
                  onPressed: _save,
                ),
              ],
            ),
          ),
  );
}
