import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/wallet_repository.dart';

IconData walletIcon(String category) => switch (category) {
  'flight' => Icons.flight_takeoff_rounded,
  'stay' => Icons.hotel_outlined,
  'ticket' => Icons.confirmation_number_outlined,
  'insurance' => Icons.shield_outlined,
  'document' => Icons.description_outlined,
  _ => Icons.explore_outlined,
};

/// Physical paper stays white in both themes; its ink never inherits dark text.
Color walletCardColor(String category) => Colors.white;

String walletRecordCount(BuildContext context, int count) => context.tr(
  count == 1 ? '1 kayıt' : '{count} kayıt',
  values: {'count': count},
);

class WalletPocket extends StatelessWidget {
  const WalletPocket({
    super.key,
    required this.entries,
    required this.city,
    required this.onOpen,
    required this.onAdd,
    this.highlightId,
  });
  final List<WalletEntry> entries;
  final String city;
  final ValueChanged<WalletEntry>? onOpen;
  final VoidCallback? onAdd;
  final String? highlightId;

  @override
  Widget build(BuildContext context) {
    final cards = entries.take(3).toList();
    final scaler = MediaQuery.textScalerOf(context);
    // Earlier cards expose only a compact header. The first sorted card stays
    // at the front, while the stack stops growing after three visible cards.
    final peekHeight = 34 + math.max(0, scaler.scale(11) - 11) * 1.3;
    final activeHeight = 78 + math.max(0, scaler.scale(14) - 14) * 2.5;
    final count = math.max(1, cards.length);
    final frontTop = 4 + activeHeight + peekHeight * (count - 1);
    final frontHeight = 126 + math.max(0, scaler.scale(12) - 12) * 2;
    return Semantics(
      label: context.tr('Seyahat cüzdanı'),
      child: SizedBox(
        key: const ValueKey('wallet-pocket'),
        height: frontTop + frontHeight + 12,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 10,
              right: 10,
              top: 22,
              bottom: 20,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFF512B1D),
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: .12),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
              ),
            ),
            if (cards.isEmpty)
              Positioned(
                left: 16,
                right: 16,
                top: 4,
                child: _PocketCard(
                  cardKey: const ValueKey('wallet-pocket-add'),
                  height: activeHeight + 28,
                  title: context.tr('İlk kaydı ekle'),
                  label: context.tr('Bir sonraki yolculuğun'),
                  icon: Icons.add_rounded,
                  onTap: onAdd,
                ),
              ),
            for (var i = cards.length - 1; i >= 0; i--)
              Positioned(
                left: 16,
                right: 16,
                top: 4 + peekHeight * (cards.length - 1 - i),
                child: TweenAnimationBuilder<double>(
                  key: ValueKey('${cards[i].id}-$highlightId'),
                  tween: Tween(
                    begin: cards[i].id == highlightId ? -16 : 0,
                    end: 0,
                  ),
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  builder: (context, offset, child) => Transform.translate(
                    offset: Offset(0, offset),
                    child: child,
                  ),
                  child: _PocketCard(
                    cardKey: ValueKey('wallet-pocket-${cards[i].id}'),
                    height: activeHeight + 28,
                    title: cards[i].title,
                    label: context.tr(
                      walletCategories[cards[i].category] ?? 'Diğer',
                    ),
                    icon: walletIcon(cards[i].category),
                    onTap: onOpen == null ? null : () => onOpen!(cards[i]),
                  ),
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              top: frontTop,
              bottom: 12,
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(18),
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
                child: CustomPaint(
                  painter: const _LeatherPainter(),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const ExcludeSemantics(
                          child: Row(
                            children: [
                              Icon(
                                Icons.near_me_outlined,
                                color: Color(0xFFFFE4D1),
                                size: 23,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'travyon',
                                textScaler: TextScaler.noScaling,
                                style: TextStyle(
                                  color: Color(0xFFFFE4D1),
                                  fontFamily: AppTypography.heading,
                                  fontSize: 25,
                                  letterSpacing: -.7,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Text(
                                context.tr('KİŞİSEL SEYAHAT CÜZDANI'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFFFFE4D1),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1.1,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: Text(
                                city == context.tr('Genel cüzdan')
                                    ? context.tr('GENEL SEYAHAT')
                                    : city,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.end,
                                style: const TextStyle(
                                  color: Color(0xFFF2BE9C),
                                  fontSize: 9,
                                  letterSpacing: .8,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: -3,
              top: frontTop + 20,
              child: ExcludeSemantics(
                child: Container(
                  width: 44,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFB45A32),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE09B72)),
                  ),
                  child: Center(
                    child: Container(
                      width: 17,
                      height: 17,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [Color(0xFFFFD69B), Color(0xFFD4934F)],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x33000000),
                            blurRadius: 3,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PocketCard extends StatelessWidget {
  const _PocketCard({
    required this.cardKey,
    required this.height,
    required this.title,
    required this.label,
    required this.icon,
    required this.onTap,
  });
  final Key cardKey;
  final double height;
  final String title, label;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
    key: cardKey,
    color: Colors.white,
    surfaceTintColor: Colors.transparent,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: const BorderSide(color: Color(0xFFE7E7E2)),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 13, 14, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF0E7),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: AppColors.forest, size: 19),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        height: 1.3,
                        color: Color(0xFF7A7068),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                        fontSize: 14,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Icon(
                  Icons.north_east_rounded,
                  color: AppColors.forest,
                  size: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _LeatherPainter extends CustomPainter {
  const _LeatherPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFB85C33), Color(0xFF7C371F)],
        ).createShader(rect),
    );
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(rect.deflate(9), const Radius.circular(20)),
      );
    final stitch = Paint()
      ..color = const Color(0x55E8A57C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = .8;
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 7) {
        canvas.drawPath(
          metric.extractPath(d, math.min(d + 3, metric.length)),
          stitch,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _LeatherPainter oldDelegate) => false;
}
