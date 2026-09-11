import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class MobileBootstrapPage extends StatelessWidget {
  const MobileBootstrapPage({
    super.key,
    this.initializationError,
    this.onStart,
  });

  final Object? initializationError;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) {
    final firebaseReady = initializationError == null;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Wordmark(),
              const Spacer(),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(26),
                decoration: BoxDecoration(
                  color: AppColors.forest,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _RouteMark(),
                    const SizedBox(height: 28),
                    Text(
                      'Hayalindeki seyahat artık cebinde.',
                      style: Theme.of(context).textTheme.headlineLarge
                          ?.copyWith(color: AppColors.surface),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Webdeki planların, seyahat cüzdanın ve topluluğun aynı hesapla burada olacak.',
                      style: Theme.of(context).textTheme.bodyLarge
                          ?.copyWith(color: const Color(0xFFDCE5DC)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              _ConnectionStatus(firebaseReady: firebaseReady),
              const SizedBox(height: 22),
              FilledButton.icon(
                onPressed: firebaseReady ? onStart : null,
                icon: const Icon(Icons.arrow_forward_rounded),
                label: Text(
                  firebaseReady
                      ? 'Mobil yolculuğa başla'
                      : 'Bağlantı bekleniyor',
                ),
              ),
              const Spacer(),
              const Center(
                child: Text(
                  'Android ve iOS için ilk mobil temel hazır',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: const Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: 'trav',
              style: TextStyle(color: AppColors.text),
            ),
            TextSpan(
              text: 'yon',
              style: TextStyle(color: AppColors.accent),
            ),
          ],
        ),
        style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _RouteMark extends StatelessWidget {
  const _RouteMark();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 70,
      child: Row(
        children: [
          const Icon(Icons.flight_takeoff_rounded, color: AppColors.surface),
          const SizedBox(width: 12),
          Expanded(child: CustomPaint(painter: _DottedLinePainter())),
          const SizedBox(width: 12),
          const Icon(Icons.location_on_rounded, color: AppColors.accent),
        ],
      ),
    );
  }
}

class _DottedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF9FAF9E)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (double x = 0; x < size.width; x += 12) {
      canvas.drawLine(
        Offset(x, size.height / 2),
        Offset(x + 4, size.height / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ConnectionStatus extends StatelessWidget {
  const _ConnectionStatus({required this.firebaseReady});

  final bool firebaseReady;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.divider),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Icon(
              firebaseReady
                  ? Icons.cloud_done_outlined
                  : Icons.cloud_off_outlined,
              color: firebaseReady ? AppColors.forest : AppColors.accent,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    firebaseReady
                        ? 'Firebase bağlantısı hazır'
                        : 'Firebase başlatılamadı',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    firebaseReady
                        ? 'Web ve mobil aynı Travyon backend’ini kullanıyor.'
                        : 'Yapılandırmayı kontrol edip yeniden deneyeceğiz.',
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
