import 'package:flutter/material.dart';

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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller?.refresh(widget.uid);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _controller?.refresh(widget.uid);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      appBar: AppBar(title: const Text('Telefon bildirimleri')),
      body: controller == null
          ? const Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Bildirim hizmeti bu oturumda hazır değil. Uygulamayı yeniden başlat.',
              ),
            )
          : ListenableBuilder(
              listenable: controller,
              builder: (context, _) => ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const Icon(Icons.notifications_active_outlined, size: 48),
                  const SizedBox(height: 20),
                  Text(
                    'Bu cihazın bildirim izni',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Telefon bildirimi için iznin ve internet bağlantın gerekir. Bu seçim yalnızca bu cihaz içindir; uygulama içindeki hatırlatma tercihlerini değiştirmez.',
                  ),
                  const SizedBox(height: 20),
                  if (!controller.available)
                    Text(controller.unavailableReason)
                  else ...[
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Telefon bildirimlerini aç'),
                      subtitle: Text(
                        controller.enabled
                            ? 'Bu cihaz kayıtlı'
                            : 'Bu cihazda kapalı',
                      ),
                      value: controller.enabled,
                      onChanged: controller.busy
                          ? null
                          : (value) {
                              if (value) {
                                controller.enable(widget.uid);
                              } else {
                                controller.disable(widget.uid);
                              }
                            },
                    ),
                    if (controller.permission == PushPermission.denied)
                      const Text(
                        'Sistem izni kapalı. Telefon Ayarları → Travyon → Bildirimler bölümünden izin verebilirsin.',
                      ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: controller.busy || !controller.enabled
                          ? null
                          : () async {
                              final sent = await controller.test(widget.uid);
                              if (sent && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Test FCM servisine iletildi. Telefona ulaşmasını kontrol et; bu sonuç teslim garantisi değildir.',
                                    ),
                                  ),
                                );
                              }
                            },
                      icon: const Icon(Icons.send_outlined),
                      label: const Text('Bu cihaza test bildirimi gönder'),
                    ),
                    TextButton(
                      onPressed: controller.busy
                          ? null
                          : () => controller.refresh(widget.uid),
                      child: const Text('İzin durumunu yenile'),
                    ),
                    TextButton(
                      onPressed: controller.busy
                          ? null
                          : () => controller.disable(widget.uid),
                      child: const Text('Bu cihazın bildirim kaydını kapat'),
                    ),
                  ],
                  if (controller.busy) const LinearProgressIndicator(),
                  if (controller.error != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      controller.error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const Text(
                    'İlk aşama: izin, cihaz kaydı ve test gönderimi. Otomatik seyahat ve topluluk push bildirimleri henüz bağlı değil. Kilit ekranındaki test mesajı özel seyahat veya cüzdan bilgisi içermez.',
                  ),
                ],
              ),
            ),
    );
  }
}
