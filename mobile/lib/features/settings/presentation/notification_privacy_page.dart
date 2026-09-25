import 'package:flutter/material.dart';

import '../../community/presentation/community_page.dart';
import '../data/settings_fields.dart';
import '../data/settings_repository.dart';
import 'account_widgets.dart';
import 'privacy_widgets.dart';

class NotificationPrivacyPage extends StatefulWidget {
  const NotificationPrivacyPage({
    super.key,
    required this.section,
    required this.repository,
  });
  final SettingsSection section;
  final SettingsRepository repository;
  static bool supports(String id) =>
      id == 'notifications' || id == 'dataPrivacy';
  @override
  State<NotificationPrivacyPage> createState() =>
      _NotificationPrivacyPageState();
}

class _NotificationPrivacyPageState extends State<NotificationPrivacyPage> {
  final _values = <String, bool>{};
  bool _loading = true, _busy = false, _dirty = false, _saved = false;
  String? _loadError, _saveError;
  bool get _notifications => widget.section.id == 'notifications';
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
      _values.clear();
      for (final field in widget.section.fields) {
        _values[field.key] = (data[field.key] ?? field.initial) == true;
      }
    } catch (error) {
      if (mounted) _loadError = settingsError(error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_busy || _loading || _loadError != null) return;
    setState(() {
      _busy = true;
      _saveError = null;
      _saved = false;
    });
    try {
      await widget.repository.save(
        widget.section,
        Map<String, dynamic>.of(_values),
      );
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

  Widget _toggle(String key, String description, IconData icon) =>
      PrivacyToggleCard(
        key: ValueKey('privacy-$key'),
        title: widget.section.fields.firstWhere((f) => f.key == key).label,
        description: description,
        icon: icon,
        value: _values[key] == true,
        onChanged: _busy
            ? null
            : (value) => setState(() {
                _values[key] = value;
                _dirty = true;
                _saved = false;
                _saveError = null;
              }),
      );

  @override
  Widget build(BuildContext context) => AccountScreen(
    title: widget.section.title,
    dirty: _dirty,
    busy: _busy,
    child: _loading
        ? const CommunityLoading()
        : _loadError != null
        ? CommunityStatus(message: _loadError!, onRetry: _load)
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AccountHeader(
                subtitle: _notifications
                    ? 'İlgilendiğin haberleri seç, bildirimlerini kendine göre düzenle.'
                    : 'Kullanım verileri ve konum hakkında tercihlerini yönet.',
              ),
              if (_notifications) ...[
                const PrivacySectionHeading(title: 'Uygulama bildirimleri'),
                _toggle(
                  'appPlanNotif',
                  'Yaklaşan yolculuklar ve plan hatırlatmaları.',
                  Icons.route_outlined,
                ),
                _toggle(
                  'appCommunityNotif',
                  'Yeni takipler, puanlar ve takip ettiğin gezginlerin paylaşımları.',
                  Icons.people_outline_rounded,
                ),
                _toggle(
                  'appUpdateNotif',
                  'Yeni özellikler ve uygulamayla ilgili duyurular.',
                  Icons.auto_awesome_outlined,
                ),
                const AccountNotice(
                  message: 'Telefonuna bildirim gelmesi için ayrıca cihaz izni gerekir.',
                  icon: Icons.phonelink_ring_outlined,
                ),
                const PrivacySectionHeading(
                  title: 'E-posta bildirimleri',
                  note: 'Tercihlerini kaydedebilirsin; e-posta gönderimi henüz aktif değil.',
                ),
                _toggle(
                  'emailPlanNotif',
                  'Planlarınla ilgili bilgilerin e-postayla iletilmesi.',
                  Icons.mark_email_unread_outlined,
                ),
                _toggle(
                  'emailWeeklyDigest',
                  'Haftalık seyahat ve keşif özeti.',
                  Icons.calendar_view_week_outlined,
                ),
                _toggle(
                  'emailPromoNotif',
                  'Kampanyalar ve özel teklifler.',
                  Icons.local_offer_outlined,
                ),
              ] else ...[
                const PrivacyStatus(
                  title: 'Konum geçmişi tutulmuyor',
                  message: 'Uygulama konum geçmişini toplamaz. Bu ekrandaki seçim telefonunun konum iznini değiştirmez.',
                  icon: Icons.location_off_outlined,
                ),
                const PrivacySectionHeading(title: 'Kullanım verileri'),
                _toggle(
                  'analyticsEnabled',
                  'Uygulamayı geliştirmeye yönelik kullanım analizi tercihini yönet.',
                  Icons.insights_outlined,
                ),
                const AccountNotice(
                  message: 'Bu seçim profil görünürlüğünü veya plan paylaşımını değiştirmez.',
                  icon: Icons.lock_outline_rounded,
                ),
              ],
              if (_saveError != null)
                AccountNotice(message: _saveError!, error: true),
              if (_saved)
                const AccountNotice(
                  message: 'Değişikliklerin kaydedildi.',
                  icon: Icons.check_circle_outline_rounded,
                ),
              const SizedBox(height: 8),
              AccountSaveButton(
                key: const ValueKey('privacy-save'),
                label: 'Değişiklikleri kaydet',
                onPressed: _save,
                busy: _busy,
              ),
            ],
          ),
  );
}
