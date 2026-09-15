import 'package:flutter/material.dart';

import '../../../core/localization/app_locale_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/app_unit_controller.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../../community/presentation/community_page.dart';
import '../../onboarding/data/onboarding_data.dart';
import '../data/settings_fields.dart';
import '../data/settings_repository.dart';
import 'account_widgets.dart';

/// The stored values stay compatible with web settings. UTC offsets in legacy
/// labels are not presented as live offsets (daylight saving can change them).
const travelTimezones = [
  'Europe/Istanbul (UTC+3)',
  'Europe/London (UTC+0)',
  'Europe/Paris (UTC+1)',
  'Europe/Berlin (UTC+1)',
  'Europe/Moscow (UTC+3)',
  'Europe/Athens (UTC+2)',
  'Europe/Rome (UTC+1)',
  'Europe/Madrid (UTC+1)',
  'Europe/Amsterdam (UTC+1)',
  'Europe/Warsaw (UTC+1)',
  'America/New_York (UTC-5)',
  'America/Chicago (UTC-6)',
  'America/Denver (UTC-7)',
  'America/Los_Angeles (UTC-8)',
  'America/Sao_Paulo (UTC-3)',
  'America/Buenos_Aires (UTC-3)',
  'America/Toronto (UTC-5)',
  'America/Mexico_City (UTC-6)',
  'Asia/Dubai (UTC+4)',
  'Asia/Riyadh (UTC+3)',
  'Asia/Tokyo (UTC+9)',
  'Asia/Seoul (UTC+9)',
  'Asia/Shanghai (UTC+8)',
  'Asia/Singapore (UTC+8)',
  'Asia/Kolkata (UTC+5:30)',
  'Asia/Bangkok (UTC+7)',
  'Asia/Jakarta (UTC+7)',
  'Asia/Tehran (UTC+3:30)',
  'Africa/Cairo (UTC+2)',
  'Africa/Johannesburg (UTC+2)',
  'Australia/Sydney',
  'Pacific/Auckland (UTC+12)',
];

class TravelPreferencesPage extends StatefulWidget {
  const TravelPreferencesPage({
    super.key,
    required this.section,
    required this.repository,
  });
  final SettingsSection section;
  final SettingsRepository repository;
  static bool supports(String id) =>
      const ['travel', 'passport', 'timezone', 'appearance'].contains(id);

  @override
  State<TravelPreferencesPage> createState() => _TravelPreferencesPageState();
}

class _TravelPreferencesPageState extends State<TravelPreferencesPage> {
  final _form = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  final _values = <String, dynamic>{};
  bool _loading = true, _busy = false, _dirty = false, _saved = false;
  String? _loadError, _saveError;
  String get _id => widget.section.id;

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
      if (_id == 'passport' && data['passportLoadError'] != null) {
        throw StateError(data['passportLoadError'].toString());
      }
      final source = _id == 'passport'
          ? Map<String, dynamic>.from(data['passport'] as Map? ?? {})
          : data;
      for (final controller in _controllers.values) {
        controller.dispose();
      }
      _controllers.clear();
      _values.clear();
      for (final field in widget.section.fields) {
        var value = source[field.key] ?? field.initial;
        if (field.options != null && !field.options!.containsKey(value)) {
          value = field.initial;
        }
        _values[field.key] = value;
        if (!field.toggle && field.options == null) {
          _controllers[field.key] = TextEditingController(
            text: field.key == 'country' && value == 'Türkiye'
                ? context.tr('Türkiye')
                : '$value',
          );
        }
      }
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

  void _changed([VoidCallback? change]) => setState(() {
    change?.call();
    _dirty = true;
    _saved = false;
    _saveError = null;
  });

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    final locale = _id == 'appearance' ? AppLocaleScope.of(context) : null;
    final units = _id == 'appearance' ? AppUnitScope.maybeOf(context) : null;
    final values = {
      ..._values,
      for (final entry in _controllers.entries) entry.key: entry.value.text,
    };
    setState(() {
      _busy = true;
      _saved = false;
      _saveError = null;
    });
    try {
      await widget.repository.save(widget.section, values);
      if (!mounted) return;
      if (_id == 'appearance') {
        await locale!.setLanguage(values['language']);
        await units?.setUnits(
          distanceKm: values['distanceKm'] != false,
          tempCelsius: values['tempCelsius'] != false,
        );
      }
      if (mounted) {
        setState(() {
          _dirty = false;
          _saved = true;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _saveError = settingsError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickExpiry() async {
    if (_busy) return;
    final parsed = DateTime.tryParse(_controllers['expiry']!.text);
    final initial =
        parsed != null &&
            !parsed.isBefore(DateTime(1900)) &&
            !parsed.isAfter(DateTime(2200))
        ? parsed
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: DateTime(2200),
    );
    if (!mounted || picked == null) return;
    _changed(() => _controllers['expiry']!.text = dateKey(picked));
  }

  Future<void> _pickTimezone() async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: context.colors.surface,
      builder: (_) => _TimezonePicker(current: _controllers['timezone']!.text),
    );
    if (!mounted || selected == null) return;
    _changed(() => _controllers['timezone']!.text = selected);
  }

  Widget _input(String key, {Widget? suffix, bool readOnly = false}) {
    final field = widget.section.fields.firstWhere((f) => f.key == key);
    return TextFormField(
      key: ValueKey('preference-$key'),
      controller: _controllers[key],
      enabled: !_busy,
      readOnly: readOnly,
      maxLength: field.max,
      keyboardType: field.number
          ? const TextInputType.numberWithOptions(decimal: true)
          : TextInputType.text,
      style: const TextStyle(fontSize: 14),
      decoration: accountInput(context, field.label, suffix: suffix),
      onTap: field.date ? _pickExpiry : null,
      onChanged: (_) => _changed(),
      validator: (value) {
        final error = validateSetting(field, value ?? '');
        return error == null ? null : context.tr(error);
      },
    );
  }

  Widget _choices(
    String field,
    List<({Object value, String title, String detail, IconData icon})> options,
  ) => LayoutBuilder(
    builder: (context, constraints) {
      final columns =
          constraints.maxWidth >= 280 &&
          MediaQuery.textScalerOf(context).scale(14) <= 20;
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final option in options)
            SizedBox(
              width: columns
                  ? (constraints.maxWidth - 10) / 2
                  : constraints.maxWidth,
              child: _PreferenceChoice(
                key: ValueKey('$field-${option.value}'),
                title: option.title,
                detail: option.detail,
                icon: option.icon,
                selected: _values[field] == option.value,
                onTap: _busy
                    ? null
                    : () => _changed(() => _values[field] = option.value),
              ),
            ),
        ],
      );
    },
  );

  Widget _travel() {
    final count = int.tryParse(_controllers['defaultPeopleCount']!.text) ?? 2;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AccountCard(
          title: 'Bütçe ve para birimi',
          icon: Icons.account_balance_wallet_outlined,
          children: [
            _input('defaultBudget'),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              key: const ValueKey('preference-defaultCurrency'),
              initialValue: _values['defaultCurrency'] as String,
              isExpanded: true,
              style: TextStyle(
                fontFamily: AppTypography.body,
                fontSize: 14,
                color: context.colors.text,
              ),
              decoration: accountInput(context, 'Para birimi'),
              items: [
                for (final currency in settingsCurrencies.keys)
                  DropdownMenuItem(value: currency, child: Text(currency)),
              ],
              onChanged: _busy
                  ? null
                  : (value) =>
                        _changed(() => _values['defaultCurrency'] = value),
            ),
          ],
        ),
        AccountCard(
          title: 'Kişi sayısı',
          icon: Icons.people_outline_rounded,
          children: [
            Row(
              children: [
                IconButton.outlined(
                  key: const ValueKey('people-decrease'),
                  tooltip: context.tr('Kişi sayısını azalt'),
                  onPressed: _busy || count <= 1
                      ? null
                      : () => _changed(
                          () => _controllers['defaultPeopleCount']!.text =
                              '${count - 1}',
                        ),
                  icon: const Icon(Icons.remove_rounded),
                ),
                Expanded(
                  child: Semantics(
                    liveRegion: true,
                    child: Column(
                      children: [
                        Text(
                          '$count',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          context.tr('kişi'),
                          style: TextStyle(
                            fontSize: 12,
                            color: context.colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton.outlined(
                  key: const ValueKey('people-increase'),
                  tooltip: context.tr('Kişi sayısını artır'),
                  onPressed: _busy || count >= 15
                      ? null
                      : () => _changed(
                          () => _controllers['defaultPeopleCount']!.text =
                              '${count + 1}',
                        ),
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
          ],
        ),
        AccountCard(
          title: 'Gezi temposu',
          icon: Icons.explore_outlined,
          children: [
            _choices('defaultPace', const [
              (
                value: 'rahat',
                title: 'Rahat',
                detail: 'Bol mola, sakin keşif',
                icon: Icons.weekend_outlined,
              ),
              (
                value: 'normal',
                title: 'Normal',
                detail: 'Keşif ve dinlenme dengesi',
                icon: Icons.directions_walk_rounded,
              ),
              (
                value: 'aktif',
                title: 'Aktif',
                detail: 'Daha çok durak, hareketli günler',
                icon: Icons.directions_run_rounded,
              ),
              (
                value: 'esnek',
                title: 'Esnek',
                detail: 'Günün akışına göre',
                icon: Icons.explore_outlined,
              ),
            ]),
          ],
        ),
        AccountNotice(message: widget.section.note),
      ],
    );
  }

  Widget _passport() {
    final expiry = DateTime.tryParse(_controllers['expiry']!.text);
    final now = DateTime.now();
    // Calendar-day arithmetic must not lose a day around DST transitions.
    final days = expiry == null
        ? null
        : DateTime.utc(
            expiry.year,
            expiry.month,
            expiry.day,
          ).difference(DateTime.utc(now.year, now.month, now.day)).inDays;
    final status = days == null
        ? 'Son geçerlilik tarihini ekle.'
        : days < 0
        ? 'Kayıtlı son geçerlilik tarihi geçmiş.'
        : days == 0
        ? 'Kayıtlı son geçerlilik tarihi bugün.'
        : days == 1
        ? 'Son geçerlilik tarihine 1 gün var.'
        : context.tr(
            'Son geçerlilik tarihine {days} gün var.',
            values: {'days': days},
          );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AccountCard(
          title: 'Pasaport bilgileri',
          icon: Icons.badge_outlined,
          children: [
            _input('country'),
            const SizedBox(height: 16),
            _input(
              'expiry',
              readOnly: true,
              suffix: IconButton(
                tooltip: context.tr('Tarih seç'),
                onPressed: _busy ? null : _pickExpiry,
                icon: const Icon(Icons.calendar_month_outlined),
              ),
            ),
            if (_controllers['expiry']!.text.isNotEmpty)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton.icon(
                  key: const ValueKey('expiry-clear'),
                  onPressed: _busy
                      ? null
                      : () => _changed(() => _controllers['expiry']!.clear()),
                  icon: const Icon(Icons.close_rounded, size: 16),
                  label: Text(context.tr('Tarihi temizle')),
                ),
              ),
          ],
        ),
        AccountNotice(
          message: status,
          error: days != null && days <= 0,
          icon: days != null && days <= 180
              ? Icons.event_busy_outlined
              : Icons.event_outlined,
        ),
        AccountNotice(
          message: widget.section.note,
          icon: Icons.phonelink_lock_outlined,
        ),
      ],
    );
  }

  Widget _timezone() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      AccountCard(
        title: 'Hesabının saat dilimi',
        icon: Icons.public_outlined,
        children: [
          _input('timezone'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            key: const ValueKey('timezone-choose'),
            onPressed: _busy ? null : _pickTimezone,
            icon: const Icon(Icons.search_rounded, size: 19),
            label: Text(
              context.tr('Şehirden saat dilimi seç'),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
      AccountNotice(message: widget.section.note, icon: Icons.sync_rounded),
    ],
  );

  Widget _appearance() {
    final format = UnitFormatter(
      distanceKm: _values['distanceKm'] != false,
      tempCelsius: _values['tempCelsius'] != false,
      english: _values['language'] == 'English',
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AccountCard(
          title: 'Hesap dili',
          icon: Icons.language_rounded,
          children: [
            _choices('language', const [
              (
                value: 'Türkçe',
                title: 'Türkçe',
                detail: 'TR',
                icon: Icons.translate_rounded,
              ),
              (
                value: 'English',
                title: 'English',
                detail: 'EN',
                icon: Icons.translate_rounded,
              ),
            ]),
          ],
        ),
        AccountCard(
          title: 'Mesafe birimi',
          icon: Icons.straighten_rounded,
          children: [
            _choices('distanceKm', const [
              (
                value: true,
                title: 'Kilometre',
                detail: 'km',
                icon: Icons.route_outlined,
              ),
              (
                value: false,
                title: 'Mil',
                detail: 'mi',
                icon: Icons.route_outlined,
              ),
            ]),
          ],
        ),
        AccountCard(
          title: 'Sıcaklık birimi',
          icon: Icons.thermostat_outlined,
          children: [
            _choices('tempCelsius', const [
              (
                value: true,
                title: 'Celsius',
                detail: '°C',
                icon: Icons.wb_sunny_outlined,
              ),
              (
                value: false,
                title: 'Fahrenheit',
                detail: '°F',
                icon: Icons.wb_sunny_outlined,
              ),
            ]),
          ],
        ),
        Container(
          key: const ValueKey('units-preview'),
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.forest,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('Önizleme'),
                style: const TextStyle(fontSize: 12, color: Colors.white70),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 28,
                runSpacing: 16,
                children: [
                  _previewValue(Icons.route_outlined, format.distance(2.4)),
                  _previewValue(
                    Icons.wb_sunny_outlined,
                    format.temperature(24),
                  ),
                ],
              ),
            ],
          ),
        ),
        const AccountNotice(
          message: 'Dil ve birim seçimlerin kaydettikten sonra uygulanır.',
          icon: Icons.sync_rounded,
        ),
      ],
    );
  }

  Widget _previewValue(IconData icon, String value) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, color: Colors.white70, size: 20),
      const SizedBox(width: 8),
      Flexible(
        child: Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 23,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) => AccountScreen(
    title: widget.section.title,
    busy: _busy,
    dirty: _dirty,
    child: _loading
        ? const CommunityLoading()
        : _loadError != null
        ? CommunityStatus(message: _loadError!, onRetry: _load)
        : Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AccountHeader(
                  title: switch (_id) {
                    'travel' => 'Senin yolculuk tarzın.',
                    'passport' => 'Yolculuk öncesi bir kontrol.',
                    'timezone' => 'Saat dilimini belirle.',
                    _ => 'Sana tanıdık gelen biçimde.',
                  },
                  subtitle: switch (_id) {
                    'travel' => 'Bütçeni, kişi sayısını ve temponu bir kez seç; yeni planlarına hazır başla.',
                    'passport' =>
                      'Pasaportunun son geçerlilik tarihini burada takip et.',
                    'timezone' =>
                      'Tercih ettiğin saat dilimini şehir adıyla bul.',
                    _ => 'Dilini ve ölçü birimlerini seç, nasıl görüneceğini hemen incele.',
                  },
                  icon: switch (_id) {
                    'travel' => Icons.tune_rounded,
                    'passport' => Icons.badge_outlined,
                    'timezone' => Icons.schedule_rounded,
                    _ => Icons.language_rounded,
                  },
                ),
                switch (_id) {
                  'travel' => _travel(),
                  'passport' => _passport(),
                  'timezone' => _timezone(),
                  _ => _appearance(),
                },
                if (_saveError != null)
                  AccountNotice(message: _saveError!, error: true),
                if (_saved)
                  const AccountNotice(
                    message: 'Değişikliklerin kaydedildi.',
                    icon: Icons.check_circle_outline_rounded,
                  ),
                AccountSaveButton(
                  key: const ValueKey('preferences-save'),
                  label: 'Değişiklikleri kaydet',
                  busy: _busy,
                  onPressed: _save,
                ),
              ],
            ),
          ),
  );
}

class _PreferenceChoice extends StatelessWidget {
  const _PreferenceChoice({
    super.key,
    required this.title,
    required this.detail,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String title, detail;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    child: Material(
      color: selected
          ? context.colors.tone(const Color(0xFFE8EFE8))
          : context.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: selected ? context.colors.forest : context.colors.divider,
          width: selected ? 1.5 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 21, color: context.colors.forest),
                  const Spacer(),
                  Icon(
                    selected
                        ? Icons.check_circle_rounded
                        : Icons.circle_outlined,
                    size: 19,
                    color: selected
                        ? context.colors.forest
                        : context.colors.divider,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                context.tr(title),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                context.tr(detail),
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: context.colors.muted,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _TimezonePicker extends StatefulWidget {
  const _TimezonePicker({required this.current});
  final String current;
  @override
  State<_TimezonePicker> createState() => _TimezonePickerState();
}

class _TimezonePickerState extends State<_TimezonePicker> {
  String _query = '';
  String _searchKey(String text) => text
      .trim()
      .replaceAll('İ', 'i')
      .replaceAll('ı', 'i')
      .toLowerCase()
      .replaceAll('_', ' ');
  @override
  Widget build(BuildContext context) {
    final zones = {widget.current, ...travelTimezones}
        .where(
          (zone) =>
              zone.isNotEmpty && _searchKey(zone).contains(_searchKey(_query)),
        )
        .toList();
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * .7,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      context.tr('Saat dilimi seç'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: context.tr('Kapat'),
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('timezone-search'),
                decoration: accountInput(
                  context,
                  'Şehir veya bölge ara',
                  suffix: const Icon(Icons.search_rounded),
                ),
                onChanged: (value) => setState(() => _query = value),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: zones.isEmpty
                    ? Center(
                        child: Text(context.tr('Eşleşen saat dilimi yok.')),
                      )
                    : ListView.builder(
                        itemCount: zones.length,
                        itemBuilder: (context, index) {
                          final zone = zones[index];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 4,
                            ),
                            title: Text(
                              zone.split(' (').first.replaceAll('_', ' '),
                              style: const TextStyle(fontSize: 14),
                            ),
                            trailing: zone == widget.current
                                ? Icon(
                                    Icons.check_circle_rounded,
                                    color: context.colors.forest,
                                  )
                                : null,
                            onTap: () => Navigator.pop(context, zone),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
