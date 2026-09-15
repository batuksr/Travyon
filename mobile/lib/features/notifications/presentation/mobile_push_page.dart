import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../settings/presentation/account_widgets.dart';
import '../../settings/presentation/privacy_widgets.dart';
import '../data/firebase_mobile_push.dart';
import '../data/mobile_push_controller.dart';

class MobilePushPage extends StatefulWidget {
  const MobilePushPage({super.key, required this.uid, this.controller});
  final String uid;
  final MobilePushController? controller;
  @override
  State<MobilePushPage> createState() => _MobilePushPageState();
}

class _MobilePushPageState extends State<MobilePushPage>
    with WidgetsBindingObserver {
  late final _controller = widget.controller ?? FirebaseMobilePush.controller;
  bool _acting = false;
  String? _notice;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Refresh reads consent; it never opens an OS permission prompt.
    _controller?.refresh(widget.uid);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        !_acting &&
        _controller?.busy == false) {
      if (mounted) setState(() => _notice = null);
      _controller?.refresh(widget.uid);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _run(Future<bool> Function() action, {String? success}) async {
    if (_acting || _controller?.busy == true) return;
    setState(() {
      _acting = true;
      _notice = null;
    });
    try {
      final completed = await action();
      if (mounted && completed) setState(() => _notice = success);
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Widget _content(MobilePushController controller) {
    final busy = _acting || controller.busy;
    final available = controller.available;
    final denied = controller.permission == PushPermission.denied;
    return AccountScreen(
      title: 'Telefon bildirimleri',
      busy: busy,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AccountHeader(
            title: 'Önemli anları kaçırma.',
            subtitle: 'Yolculuk hatırlatmalarını ve topluluktan haberleri al.',
            icon: Icons.notifications_active_outlined,
          ),
          if (busy) ...[
            const LinearProgressIndicator(minHeight: 3),
            const SizedBox(height: 16),
          ],
          PrivacyStatus(
            title: !available
                ? 'Bu sürümde kullanılamıyor'
                : busy
                ? 'Bildirim durumu kontrol ediliyor'
                : denied
                ? 'Sistem izni kapalı'
                : controller.enabled
                ? 'Bildirimler açık'
                : 'Bildirimler kapalı',
            message: !available
                ? controller.unavailableReason
                : denied
                ? 'Sistem izni kapalı. Telefon Ayarları → Travyon → Bildirimler bölümünden izin verebilirsin.'
                : controller.enabled
                ? 'Bu cihaz bildirim almaya hazır.'
                : 'Bildirimleri açtığında gerekirse sistem izni istenir.',
            icon: !available || denied
                ? Icons.notifications_off_outlined
                : controller.enabled
                ? Icons.notifications_active_outlined
                : Icons.notifications_none_rounded,
            warning: !available || denied,
          ),
          if (available) ...[
            PrivacyToggleCard(
              key: const ValueKey('push-enabled'),
              title: 'Telefon bildirimlerini aç',
              description: 'Bu seçim yalnızca bu cihaz içindir. Değişiklikler hemen uygulanır.',
              icon: Icons.smartphone_rounded,
              value: controller.enabled,
              onChanged: busy
                  ? null
                  : (value) => _run(
                      () => value
                          ? controller.enable(widget.uid)
                          : controller.disable(widget.uid),
                    ),
            ),
            TextButton.icon(
              key: const ValueKey('push-refresh'),
              onPressed: busy
                  ? null
                  : () => _run(() => controller.refresh(widget.uid)),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(
                context.tr('İzin durumunu yenile'),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 14),
            AccountCard(
              title: 'Bir deneme yap',
              icon: Icons.mark_chat_unread_outlined,
              children: [
                Text(
                  context.tr(
                    'Bildirimleri açtıktan sonra bu telefona bir test mesajı gönderebilirsin.',
                  ),
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.6,
                    color: context.colors.muted,
                  ),
                ),
                const SizedBox(height: 16),
                AccountSaveButton(
                  key: const ValueKey('push-test'),
                  label: 'Test bildirimi gönder',
                  icon: Icons.send_outlined,
                  onPressed: busy || !controller.enabled
                      ? null
                      : () => _run(
                          () => controller.test(widget.uid),
                          success: 'Test gönderimi kabul edildi. Telefonunun bildirim alanını kontrol et; bu sonuç teslim garantisi değildir.',
                        ),
                ),
              ],
            ),
          ],
          if (controller.error != null)
            AccountNotice(message: controller.error!, error: true),
          if (_notice != null)
            AccountNotice(
              message: _notice!,
              icon: Icons.check_circle_outline_rounded,
            ),
          const AccountNotice(
            message: 'Gezi yaklaşınca ve toplulukta takip, puan veya yeni paylaşım olduğunda tercihlerin açıksa bildirim alırsın. Kilit ekranındaki mesajlar özel seyahat veya cüzdan bilgisi içermez.',
            icon: Icons.lock_outline_rounded,
          ),
          if (available)
            TextButton.icon(
              key: const ValueKey('push-clear'),
              style: TextButton.styleFrom(
                foregroundColor: context.colors.tone(const Color(0xFF9F3730)),
              ),
              onPressed: busy
                  ? null
                  : () => _run(() => controller.disable(widget.uid)),
              icon: const Icon(Icons.notifications_off_outlined, size: 18),
              label: Text(
                context.tr('Bu cihazın bildirim kaydını kapat'),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) {
      return const AccountScreen(
        title: 'Telefon bildirimleri',
        child: AccountNotice(
          message: 'Bildirim hizmeti bu oturumda hazır değil. Uygulamayı yeniden başlat.',
          error: true,
        ),
      );
    }
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) => _content(controller),
    );
  }
}
