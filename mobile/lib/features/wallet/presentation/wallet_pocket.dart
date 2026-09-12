import 'dart:math' as math;

import 'package:flutter/material.dart';

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
Color walletCardColor(String category) => switch (category) {
  'flight' => const Color(0xFFD7E8ED),
  'stay' => const Color(0xFFEAD6C4),
  'ticket' => const Color(0xFFF2E4AE),
  _ => const Color(0xFFE4E8D4),
};

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
  final ValueChanged<WalletEntry> onOpen;
  final VoidCallback onAdd;
  final String? highlightId;
  @override
  Widget build(BuildContext context) {
    final cards = entries.take(3).toList();
    // Increase exposed card height with system text scaling; the pocket stays
    // decorative and the full accessible list is always available below it.
    final cardHeight =
        68.0 * MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.8);
    final count = cards.isEmpty ? 1 : cards.length;
    final height = 170 + cardHeight * count;
    return Semantics(
      label: 'Seyahat cüzdanı',
      child: SizedBox(
        height: height + 16,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 10,
              right: 10,
              top: 24,
              bottom: 24,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFF20382C),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x30315142),
                      blurRadius: 25,
                      offset: Offset(0, 16),
                    ),
                  ],
                ),
              ),
            ),
            if (cards.isEmpty)
              Positioned(
                left: 20,
                right: 20,
                top: 6,
                child: _PocketCard(
                  height: cardHeight + 55,
                  color: walletCardColor('ticket'),
                  title: 'İlk biletini ekle',
                  label: 'YENİ BİR YOLCULUK',
                  icon: Icons.add,
                  onTap: onAdd,
                ),
              ),
            for (var i = 0; i < cards.length; i++)
              Positioned(
                left: 20,
                right: 20,
                top: 6 + i * cardHeight,
                child: TweenAnimationBuilder<double>(
                  key: ValueKey('${cards[i].id}-$highlightId'),
                  tween: Tween(
                    begin: cards[i].id == highlightId ? -32 : -10,
                    end: 0,
                  ),
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : Duration(milliseconds: 380 + i * 90),
                  curve: Curves.easeOutCubic,
                  builder: (context, offset, child) => Transform.translate(
                    offset: Offset(0, offset),
                    child: child,
                  ),
                  child: _PocketCard(
                    height: cardHeight + 55,
                    color: walletCardColor(cards[i].category),
                    title: cards[i].title,
                    label: walletCategories[cards[i].category]!.toUpperCase(),
                    icon: walletIcon(cards[i].category),
                    onTap: () => onOpen(cards[i]),
                  ),
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              top: count * cardHeight + 7,
              bottom: 16,
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(14),
                  topRight: Radius.circular(14),
                  bottomLeft: Radius.circular(30),
                  bottomRight: Radius.circular(30),
                ),
                child: CustomPaint(
                  painter: _LeatherPainter(),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.near_me_outlined,
                              color: Color(0xFFE1DFC2),
                              size: 28,
                            ),
                            SizedBox(width: 10),
                            Text(
                              'travyon',
                              textScaler: TextScaler.noScaling,
                              style: TextStyle(
                                color: Color(0xFFE1DFC2),
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          city.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFFDFDFC5),
                            fontSize: 11,
                            letterSpacing: 2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: -4,
              top: count * cardHeight + 28,
              child: ExcludeSemantics(
                child: Container(
                  width: 50,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF405C45),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF6A7952)),
                  ),
                  child: Center(
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [Color(0xFFE5D394), Color(0xFF9C8848)],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x55000000),
                            blurRadius: 3,
                            offset: Offset(1, 2),
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
    required this.height,
    required this.color,
    required this.title,
    required this.label,
    required this.icon,
    required this.onTap,
  });
  final double height;
  final Color color;
  final String title, label;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: color,
    borderRadius: BorderRadius.circular(16),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppColors.forest, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 10,
                        letterSpacing: 1.4,
                        color: AppColors.forest,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                        fontSize: 14,
                      ),
                    ),
                  ],
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
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF435E45), Color(0xFF2B4433)],
        ).createShader(rect),
    );
    final grain = Paint()
      ..color = const Color(0x227E9065)
      ..strokeWidth = .7;
    for (double y = 0; y < size.height; y += 5) {
      for (double x = 0; x < size.width; x += 5) {
        final offset = (y.toInt() % 2) * 2.0;
        canvas.drawLine(
          Offset(x + offset, y),
          Offset(x + offset + 1, y + 2),
          grain,
        );
      }
    }
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(rect.deflate(9), const Radius.circular(22)),
      );
    final stitch = Paint()
      ..color = const Color(0x667F9467)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final metric in path.computeMetrics()) {
      for (double d = 0; d < metric.length; d += 6) {
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
