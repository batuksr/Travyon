import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_locale_controller.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/preferences/app_unit_controller.dart';
import '../../../core/preferences/unit_formatter.dart';

import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_theme_controller.dart';
import '../../../core/firebase/firebase_environment.dart';
import '../../community/data/community_repository.dart';
import '../../community/presentation/community_page.dart';
import '../../onboarding/data/onboarding_data.dart';
import '../../plans/data/plan_detail.dart';
import '../data/settings_fields.dart';
import '../data/settings_repository.dart';
import '../../notifications/presentation/mobile_push_page.dart';
import '../../help/presentation/help_center_page.dart';
import 'bug_report_page.dart';
import 'account_profile_page.dart';
import 'account_security_page.dart';
import 'travel_preferences_page.dart';
import 'notification_privacy_page.dart';
import 'theme_settings_page.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({
    super.key,
    required this.uid,
    required this.repository,
    required this.onSignOut,
  });
  final String uid;
  final SettingsRepository repository;
  final Future<void> Function() onSignOut;
  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late Future<Map<String, dynamic>> _data = widget.repository.load();
  bool _busy = false;
  void _reload() => setState(() {
    _data = widget.repository.load();
  });
  Future<void> _open(Widget page) async {
    await Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => page));
    if (mounted) _reload();
  }

  Future<void> _signOut() async {
    if (_busy) return;
    if (!await confirmCommunity(
      context,
      'Çıkış yapılsın mı?',
      'Kayıtlı planların hesabında kalır.',
      confirmLabel: 'Çıkış yap',
      icon: Icons.logout_rounded,
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => _busy = true);
    try {
      await widget.onSignOut();
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _photo() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 70,
        requestFullMetadata: false,
      );
      if (image == null) return;
      await widget.repository.photo(await image.readAsBytes());
      if (mounted) {
        communityNotice(context, 'Profil fotoğrafın güncellendi.');
        _reload();
      }
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _export() async {
    if (_busy) return;
    if (!await confirmCommunity(
      context,
      'Verilerini dışa aktar?',
      'Dosya profil bilgilerini, kayıtlı planlarını, bu cihazdaki pasaport hatırlatıcını ve cüzdan kayıtlarını içerir. Yalnızca güvendiğin bir konuma kaydet. Web tarayıcısında kalan yerel veriler dahil değildir.',
      confirmLabel: 'Dışa aktar',
      icon: Icons.download_outlined,
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => _busy = true);
    try {
      final json = await widget.repository.exportData();
      if (!mounted) return;
      final box = context.findRenderObject() as RenderBox?;
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(
              Uint8List.fromList(utf8.encode(json)),
              mimeType: 'application/json',
            ),
          ],
          fileNameOverrides: ['travyon-verilerim.json'],
          sharePositionOrigin: box == null
              ? null
              : box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _tile(
    String title,
    IconData icon,
    VoidCallback action, {
    String? subtitle,
  }) => ListTile(
    leading: Icon(icon, color: context.colors.forest),
    title: Text(title),
    subtitle: subtitle == null ? null : Text(subtitle),
    trailing: const Icon(Icons.chevron_right),
    onTap: _busy ? null : action,
  );
  Widget _group(String title, List<Widget> children) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 12, 0, 10),
        child: Text(title, style: Theme.of(context).textTheme.titleSmall),
      ),
      CommunityPanel(child: Column(children: children)),
    ],
  );

  Widget _preferenceTile(
    String title,
    String subtitle,
    IconData icon,
    VoidCallback action,
  ) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
    leading: Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: context.colors.forest.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Icon(icon, size: 22, color: context.colors.forest),
    ),
    title: Text(
      title,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
    ),
    subtitle: Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          height: 1.5,
          color: context.colors.muted,
        ),
      ),
    ),
    trailing: const Icon(Icons.chevron_right_rounded, size: 20),
    onTap: _busy ? null : action,
  );
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Ayarlar')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _data,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const CommunityLoading();
          }
          if (snapshot.hasError) {
            return CommunityStatus(
              message: settingsError(snapshot.error!),
              onRetry: _reload,
            );
          }
          final data = snapshot.data!;
          void section(String id) => _open(
            SettingsEditor(
              section: settingsSections.firstWhere((s) => s.id == id),
              repository: widget.repository,
            ),
          );
          void action(String id, String title) => _open(
            SettingsActionPage(
              action: id,
              title: title,
              passwordProvider: data['passwordProvider'] == true,
              currentEmail: data['email'] as String? ?? '',
              repository: widget.repository,
            ),
          );
          final photo = data['photoURL'] as String?;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.forest,
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ClipOval(
                          child:
                              photo != null &&
                                  (Uri.tryParse(photo)?.scheme == 'https' ||
                                      photo.startsWith('http://10.0.2.2'))
                              ? Image.network(
                                  photo,
                                  width: 62,
                                  height: 62,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => const Icon(
                                    Icons.account_circle,
                                    color: Colors.white,
                                    size: 62,
                                  ),
                                )
                              : const Icon(
                                  Icons.account_circle,
                                  color: Colors.white,
                                  size: 62,
                                ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            data['displayName'] as String? ?? 'Gezgin',
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      data['email'] as String? ?? '',
                      style: const TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white,
                      ),
                      onPressed: _busy ? null : _photo,
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: Text(_busy ? 'İşleniyor…' : 'Fotoğrafı değiştir'),
                    ),
                    const Text(
                      'JPEG · En fazla 512 KB',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (data['passportLoadError'] != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    context.tr(
                      'Pasaport hatırlatıcısı yüklenemedi. Diğer ayarlarını kullanabilirsin. {error}',
                      values: {'error': data['passportLoadError']},
                    ),
                  ),
                ),
              _group('HESABIM', [
                _tile(
                  'Profil bilgileri',
                  Icons.person_outline,
                  () => section('profile'),
                ),
                _tile(
                  'E-posta adresi',
                  Icons.alternate_email,
                  () => action('email', 'E-posta değiştir'),
                ),
                _tile(
                  'Şifre ve güvenlik',
                  Icons.lock_outline,
                  () => action('password', 'Şifre değiştir'),
                ),
              ]),
              _group('SEYAHAT TERCİHLERİ', [
                _preferenceTile(
                  'Seyahat varsayılanları',
                  'Bütçe, kişi sayısı ve gezi temposu',
                  Icons.tune,
                  () => section('travel'),
                ),
                _preferenceTile(
                  'Pasaport hatırlatıcısı',
                  'Son geçerlilik tarihi · Yalnızca bu cihazda',
                  Icons.badge_outlined,
                  () => section('passport'),
                ),
                _preferenceTile(
                  'Saat dilimi',
                  'Şehir veya bölgeye göre seçim',
                  Icons.schedule,
                  () => section('timezone'),
                ),
                _preferenceTile(
                  'Dil ve birimler',
                  'Türkçe / English · km / mi · °C / °F',
                  Icons.language,
                  () => section('appearance'),
                ),
              ]),
              _group('GÖRÜNÜM', [
                _preferenceTile(
                  'Tema',
                  AppThemeScope.maybeOf(context)?.label ?? 'Sistem ayarı',
                  Icons.palette_outlined,
                  () => _open(const ThemeSettingsPage()),
                ),
              ]),
              _group('BİLDİRİMLER VE GİZLİLİK', [
                _preferenceTile(
                  'Telefon bildirimleri',
                  'Cihaz izni ve bildirim durumu',
                  Icons.notifications_active_outlined,
                  () => _open(MobilePushPage(uid: widget.uid)),
                ),
                _preferenceTile(
                  'Bildirim tercihleri',
                  'Planlar, topluluk ve e-postalar',
                  Icons.notifications_none,
                  () => section('notifications'),
                ),
                _preferenceTile(
                  'Profil ve plan gizliliği',
                  'Görünürlük, paylaşım ve takip',
                  Icons.visibility_outlined,
                  () => _open(
                    CommunityPrivacyPage(
                      uid: widget.uid,
                      repository: FirebaseCommunityRepository(),
                    ),
                  ),
                ),
                _preferenceTile(
                  'Veri ve konum gizliliği',
                  'Kullanım analizi ve konum bilgisi',
                  Icons.privacy_tip_outlined,
                  () => section('dataPrivacy'),
                ),
              ]),
              _group('ABONELİK VE FATURALAR', [
                _tile(
                  'Aboneliğim',
                  Icons.workspace_premium_outlined,
                  () => _open(SubscriptionInfoPage(data: data)),
                ),
                _tile(
                  'Ödeme geçmişi',
                  Icons.receipt_long_outlined,
                  () => _open(PaymentsPage(repository: widget.repository)),
                ),
                _tile(
                  'Fatura bilgileri',
                  Icons.receipt_outlined,
                  () => section('billing'),
                ),
              ]),
              _group('DESTEK VE YASAL', [
                _tile(
                  'Sık sorulan sorular',
                  Icons.help_outline,
                  () => openHelpCenter(context),
                ),
                _tile(
                  'İletişim',
                  Icons.chat_bubble_outline,
                  () => openHelpCenter(
                    context,
                    section: HelpSection.contact,
                    name: data['displayName'] as String? ?? '',
                    email: data['email'] as String? ?? '',
                  ),
                ),
                _tile(
                  'Gizlilik Politikası',
                  Icons.shield_outlined,
                  () => openHelpCenter(context, section: HelpSection.privacy),
                ),
                _tile(
                  'Kullanım Koşulları',
                  Icons.description_outlined,
                  () => openHelpCenter(context, section: HelpSection.terms),
                ),
                _tile(
                  'Hata bildir',
                  Icons.bug_report_outlined,
                  () => action('bug', 'Hata bildir'),
                ),
              ]),
              _group('VERİLERİM', [
                _tile(
                  'Verilerimi dışa aktar',
                  Icons.download_outlined,
                  _export,
                ),
                _tile(
                  'Hesabımı sil',
                  Icons.delete_outline,
                  () => action('delete', 'Hesabımı sil'),
                ),
              ]),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                key: const ValueKey('settings-sign-out'),
                onPressed: _busy ? null : _signOut,
                style: OutlinedButton.styleFrom(
                  foregroundColor: context.colors.tone(const Color(0xFFB33E32)),
                  backgroundColor: context.colors.tone(const Color(0xFFFFF0EB)),
                  side: BorderSide(
                    color: context.colors.tone(const Color(0xFFE5B8B1)),
                  ),
                  minimumSize: const Size.fromHeight(54),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                icon: const Icon(Icons.logout_rounded, size: 21),
                label: Text(
                  _busy ? 'İşleniyor…' : 'Çıkış yap',
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    ),
  );
}

class SettingsEditor extends StatefulWidget {
  const SettingsEditor({
    super.key,
    required this.section,
    required this.repository,
  });
  final SettingsSection section;
  final SettingsRepository repository;
  @override
  State<SettingsEditor> createState() => _SettingsEditorState();
}

class _SettingsEditorState extends State<SettingsEditor> {
  final _form = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  final _values = <String, dynamic>{};
  bool _loading = true, _busy = false, _dirty = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    if (widget.section.id != 'profile' &&
        !TravelPreferencesPage.supports(widget.section.id) &&
        !NotificationPrivacyPage.supports(widget.section.id)) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.repository.load();
      if (!mounted) return;
      if (widget.section.id == 'passport' &&
          data['passportLoadError'] != null) {
        throw StateError(data['passportLoadError'].toString());
      }
      final source = widget.section.id == 'passport'
          ? planMap(data['passport'])
          : data;
      for (final f in widget.section.fields) {
        var value = source[f.key] ?? f.initial;
        if (f.options != null && !f.options!.containsKey(value)) {
          value = f.initial;
        }
        _values[f.key] = value;
        if (!f.toggle && f.options == null) {
          final displayValue =
              (f.key == 'nationality' || f.key == 'country') &&
                  value == 'Türkiye'
              ? context.tr('Türkiye')
              : '$value';
          _controllers[f.key] = TextEditingController(text: displayValue);
        }
      }
    } catch (e) {
      if (mounted) _error = settingsError(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final values = {
      ..._values,
      for (final e in _controllers.entries) e.key: e.value.text,
    };
    final localeController = widget.section.id == 'appearance'
        ? AppLocaleScope.of(context)
        : null;
    final unitController = widget.section.id == 'appearance'
        ? AppUnitScope.maybeOf(context)
        : null;
    try {
      await widget.repository.save(widget.section, values);
      if (mounted) {
        if (widget.section.id == 'appearance') {
          await localeController!.setLanguage(values['language']);
          await unitController?.setUnits(
            distanceKm: values['distanceKm'] != false,
            tempCelsius: values['tempCelsius'] != false,
          );
          if (!mounted) return;
        }
        setState(() => _dirty = false);
        communityNotice(context, 'Değişikliklerin kaydedildi.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _date(SettingField field) async {
    final now = DateTime.now();
    final parsed = DateTime.tryParse(_controllers[field.key]!.text);
    final initial =
        parsed != null &&
            !parsed.isBefore(DateTime(1900)) &&
            !parsed.isAfter(DateTime(2200))
        ? parsed
        : now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: DateTime(2200),
    );
    if (picked != null && mounted) {
      setState(() {
        _controllers[field.key]!.text = dateKey(picked);
        _dirty = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) => widget.section.id == 'profile'
      ? AccountProfilePage(repository: widget.repository)
      : NotificationPrivacyPage.supports(widget.section.id)
      ? NotificationPrivacyPage(
          section: widget.section,
          repository: widget.repository,
        )
      : TravelPreferencesPage.supports(widget.section.id)
      ? TravelPreferencesPage(
          section: widget.section,
          repository: widget.repository,
        )
      : PopScope(
          canPop: !_busy && !_dirty,
          onPopInvokedWithResult: (didPop, result) async {
            if (didPop || _busy || !_dirty) return;
            if (await confirmCommunity(
                  context,
                  'Değişikliklerden vazgeç?',
                  'Kaydetmediğin değişiklikler kaybolacak.',
                  confirmLabel: 'Kaydetmeden çık',
                  cancelLabel: 'Düzenlemeye dön',
                  icon: Icons.edit_note_rounded,
                  tone: AppDialogTone.warning,
                ) &&
                context.mounted) {
              setState(() => _dirty = false);
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) Navigator.pop(context);
              });
            }
          },
          child: Scaffold(
            appBar: AppBar(title: Text(widget.section.title)),
            body: _loading
                ? const CommunityLoading()
                : _values.isEmpty
                ? CommunityStatus(
                    message: _error ?? 'Ayarlar yüklenemedi.',
                    onRetry: _load,
                  )
                : Form(
                    key: _form,
                    child: ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        if (widget.section.note.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Text(widget.section.note),
                          ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        for (final f in widget.section.fields)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 18),
                            child: f.toggle
                                ? CommunityPanel(
                                    child: SwitchListTile(
                                      contentPadding: EdgeInsets.zero,
                                      title: Text(f.label),
                                      value: _values[f.key] == true,
                                      onChanged: _busy
                                          ? null
                                          : (v) => setState(() {
                                              _values[f.key] = v;
                                              _dirty = true;
                                            }),
                                    ),
                                  )
                                : f.options != null
                                ? DropdownButtonFormField<String>(
                                    initialValue: '${_values[f.key]}',
                                    isExpanded: true,
                                    decoration: InputDecoration(
                                      labelText: context.tr(f.label),
                                    ),
                                    items: f.options!.entries
                                        .map(
                                          (e) => DropdownMenuItem(
                                            value: e.key,
                                            child: Text(e.value),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: _busy
                                        ? null
                                        : (v) => setState(() {
                                            _values[f.key] = v;
                                            _dirty = true;
                                          }),
                                  )
                                : TextFormField(
                                    controller: _controllers[f.key],
                                    enabled: !_busy,
                                    readOnly: f.date,
                                    maxLength: f.max,
                                    keyboardType: f.number
                                        ? const TextInputType.numberWithOptions(
                                            decimal: true,
                                          )
                                        : TextInputType.text,
                                    decoration: InputDecoration(
                                      labelText: context.tr(f.label),
                                      suffixIcon: f.date
                                          ? IconButton(
                                              tooltip: context.tr(
                                                'Tarihi temizle',
                                              ),
                                              onPressed: _busy
                                                  ? null
                                                  : () => setState(() {
                                                      _controllers[f.key]!
                                                          .clear();
                                                      _dirty = true;
                                                    }),
                                              icon: const Icon(Icons.close),
                                            )
                                          : null,
                                    ),
                                    onTap: f.date ? () => _date(f) : null,
                                    onChanged: (_) =>
                                        setState(() => _dirty = true),
                                    validator: (v) {
                                      final error = validateSetting(f, v ?? '');
                                      return error == null
                                          ? null
                                          : context.tr(error);
                                    },
                                  ),
                          ),
                        if (widget.section.id == 'appearance') ...[
                          Builder(
                            builder: (context) {
                              final formatter = UnitFormatter(
                                distanceKm: _values['distanceKm'] != false,
                                tempCelsius: _values['tempCelsius'] != false,
                                english: context.l10n.isEnglish,
                              );
                              return CommunityPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Önizleme',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Wrap(
                                      spacing: 18,
                                      runSpacing: 8,
                                      children: [
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.route_outlined,
                                              size: 18,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(formatter.distance(2.4)),
                                          ],
                                        ),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.thermostat_outlined,
                                              size: 18,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(formatter.temperature(24)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 18),
                        ],
                        FilledButton(
                          onPressed: _busy ? null : _save,
                          child: Text(
                            _busy ? 'Kaydediliyor…' : 'Değişiklikleri kaydet',
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        );
}

class SettingsActionPage extends StatefulWidget {
  const SettingsActionPage({
    super.key,
    required this.action,
    required this.title,
    required this.passwordProvider,
    required this.repository,
    this.currentEmail = '',
  });
  final String action, title;
  final bool passwordProvider;
  final String currentEmail;
  final SettingsRepository repository;
  @override
  State<SettingsActionPage> createState() => _SettingsActionPageState();
}

class _SettingsActionPageState extends State<SettingsActionPage> {
  final _form = GlobalKey<FormState>();
  final _first = TextEditingController(),
      _second = TextEditingController(),
      _password = TextEditingController();
  bool _busy = false, _show = false;
  String? _status;
  bool get _support => widget.action == 'bug' || widget.action == 'contact';
  @override
  void dispose() {
    _first.dispose();
    _second.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (!_form.currentState!.validate()) return;
    if (widget.action == 'delete' &&
        !await confirmCommunity(
          context,
          'Hesabın kalıcı olarak silinsin mi?',
          'Hesabın, özel planların, cüzdanın ve paylaşımların silinir. Bu işlem geri alınamaz. Aktif abonelik varsa sunucu silmeyi engeller.',
          confirmLabel: 'Hesabımı sil',
          icon: Icons.person_remove_outlined,
          tone: AppDialogTone.destructive,
        )) {
      return;
    }
    if (!mounted) return;
    setState(() {
      _busy = true;
      _status = null;
    });
    try {
      switch (widget.action) {
        case 'email':
          await widget.repository.changeEmail(
            _first.text.trim(),
            _password.text,
          );
          _status = 'Yeni adresine doğrulama bağlantısı gönderildi. Bağlantıyı açtıktan sonra Ayarlar ekranındaki yenile düğmesine bas.';
        case 'password':
          await widget.repository.changePassword(_password.text, _first.text);
          _status = 'Şifren güncellendi.';
        case 'delete':
          await widget.repository.deleteAccount(_password.text);
          if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
        default:
          await widget.repository.support(
            _first.text.trim(),
            _second.text.trim(),
            bug: widget.action == 'bug',
          );
          _status = 'Mesajın gönderildi.';
      }
      _first.clear();
      _second.clear();
      _password.clear();
    } catch (e) {
      _status = settingsError(e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => widget.action == 'bug'
      ? BugReportPage(repository: widget.repository)
      : widget.action == 'email' || widget.action == 'password'
      ? AccountSecurityPage(
          emailMode: widget.action == 'email',
          passwordProvider: widget.passwordProvider,
          currentEmail: widget.currentEmail,
          repository: widget.repository,
        )
      : PopScope(
          canPop: !_busy,
          child: Scaffold(
            appBar: AppBar(title: Text(widget.title)),
            body: Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (widget.action == 'delete' &&
                      FirebaseEnvironment.usesEmulators)
                    const Text(
                      'LOCAL geliştirme modunda hesap silme güvenlik nedeniyle kapalıdır. Giriş hesabın gerçek, diğer verilerin yereldir.',
                    ),
                  if (widget.action == 'delete')
                    const Text(
                      'Hesabın kalıcı olarak silinir. Devam etmek için aşağıya HESABIMI SİL yaz. Önce verilerini dışa aktarmanı öneririz.',
                    ),
                  if (!_support && !widget.passwordProvider)
                    const Text(
                      'İşlem sırasında Google hesabınla yeniden doğrulama istenecek.',
                    ),
                  const SizedBox(height: 18),
                  if (_status != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 18),
                      child: Text(_status!),
                    ),
                  TextFormField(
                    controller: _first,
                    enabled: !_busy,
                    obscureText: widget.action == 'password' && !_show,
                    maxLength: _support ? 200 : 150,
                    keyboardType: widget.action == 'email'
                        ? TextInputType.emailAddress
                        : TextInputType.text,
                    decoration: InputDecoration(
                      labelText: context.tr(switch (widget.action) {
                        'email' => 'Yeni e-posta',
                        'password' => 'Yeni şifre',
                        'delete' => 'HESABIMI SİL',
                        _ => 'Konu',
                      }),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return context.tr('Bu alanı doldur.');
                      }
                      final deletePhrase = context.l10n.isEnglish
                          ? 'DELETE MY ACCOUNT'
                          : 'HESABIMI SİL';
                      if (widget.action == 'delete' && v != deletePhrase) {
                        return context.tr('Onay metnini aynen yaz.');
                      }
                      if (widget.action == 'email' &&
                          !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                              .hasMatch(v.trim())) {
                        return context.tr('Geçerli bir e-posta gir.');
                      }
                      if (widget.action == 'password' && v.length < 8) {
                        return context.tr('En az 8 karakter kullan.');
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  if (_support || widget.action == 'password')
                    TextFormField(
                      controller: _second,
                      enabled: !_busy,
                      obscureText: !_support && !_show,
                      maxLines: _support ? 6 : 1,
                      maxLength: _support ? 3000 : 150,
                      decoration: InputDecoration(
                        labelText: context.tr(
                          _support
                              ? 'Mesajın (şifre veya rezervasyon kodu yazma)'
                              : 'Yeni şifreyi tekrar yaz',
                        ),
                      ),
                      validator: (v) => v == null || v.trim().isEmpty
                          ? context.tr('Bu alanı doldur.')
                          : !_support && v != _first.text
                          ? context.tr('Şifreler eşleşmiyor.')
                          : null,
                    ),
                  if (!_support && widget.passwordProvider) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      enabled: !_busy,
                      obscureText: !_show,
                      decoration: InputDecoration(
                        labelText: context.tr('Mevcut şifren'),
                      ),
                      validator: (v) => v == null || v.isEmpty
                          ? context.tr('Mevcut şifreni gir.')
                          : null,
                    ),
                  ],
                  if (!_support)
                    TextButton(
                      onPressed: () => setState(() => _show = !_show),
                      child: Text(
                        _show ? 'Şifreleri gizle' : 'Şifreleri göster',
                      ),
                    ),
                  const SizedBox(height: 22),
                  FilledButton(
                    onPressed:
                        _busy ||
                            (widget.action == 'delete' &&
                                FirebaseEnvironment.usesEmulators)
                        ? null
                        : _submit,
                    child: Text(
                      _busy
                          ? 'İşleniyor…'
                          : widget.action == 'delete'
                          ? 'Hesabımı kalıcı olarak sil'
                          : _support
                          ? 'Gönder'
                          : 'Devam et',
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
}

class SubscriptionInfoPage extends StatelessWidget {
  const SubscriptionInfoPage({super.key, required this.data});
  final Map<String, dynamic> data;
  @override
  Widget build(BuildContext context) {
    final end = data['currentPeriodEnd'];
    final endDate = end is Timestamp ? end.toDate() : null;
    final pro =
        data['isPro'] == true &&
        (endDate == null || endDate.isAfter(DateTime.now()));
    return Scaffold(
      appBar: AppBar(title: const Text('Aboneliğim')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          CommunityPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.workspace_premium_outlined,
                  size: 40,
                  color: context.colors.accent,
                ),
                const SizedBox(height: 16),
                Text(
                  pro ? 'Travyon Pro' : 'Ücretsiz hesap',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                Text(
                  'Bu ay oluşturulan plan: ${data['plansUsedThisMonth'] ?? 0}',
                ),
                if (endDate != null) Text('Dönem sonu: ${dateKey(endDate)}'),
                Text(
                  'Abonelik durumu: ${data['subscriptionStatus'] ?? 'Aktif abonelik yok'}',
                ),
              ],
            ),
          ),
          const Text(
            'App Store / Google Play satın alma ve abonelik yönetimi henüz kullanılamıyor; bu ekranda ödeme alınmaz.',
          ),
        ],
      ),
    );
  }
}

class PaymentsPage extends StatefulWidget {
  const PaymentsPage({super.key, required this.repository});
  final SettingsRepository repository;
  @override
  State<PaymentsPage> createState() => _PaymentsPageState();
}

class _PaymentsPageState extends State<PaymentsPage> {
  late Future<List<Map<String, dynamic>>> _payments = widget.repository
      .payments();
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Ödeme geçmişi')),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: _payments,
      builder: (context, s) {
        if (s.connectionState == ConnectionState.waiting) {
          return const CommunityLoading();
        }
        if (s.hasError) {
          return CommunityStatus(
            message: settingsError(s.error!),
            onRetry: () => setState(() {
              _payments = widget.repository.payments();
            }),
          );
        }
        if (s.data!.isEmpty) {
          return const CommunityStatus(message: 'Henüz ödeme kaydın yok.');
        }
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            for (final p in s.data!)
              CommunityPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${p['amount'] ?? '0'} ${p['currency'] ?? 'TRY'}',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (p['createdAt'] is Timestamp)
                      Text(dateKey((p['createdAt'] as Timestamp).toDate())),
                    Text(context.tr('İşlem: {id}', values: {'id': p['id']})),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}

class SettingsFaqPage extends StatelessWidget {
  const SettingsFaqPage({super.key});
  @override
  Widget build(BuildContext context) => const HelpCenterPage();
}
