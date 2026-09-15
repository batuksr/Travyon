import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

/// A decorative adaptation of web/AuthTravelDesk: no account or ticket data.
/// Painted locally so the welcome screen does not wait for images or a map API.
class WelcomeTravelScene extends StatelessWidget {
  const WelcomeTravelScene({super.key});

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: RepaintBoundary(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: CustomPaint(
          painter: _TravelDeskPainter(
            rome: context.tr('Roma'),
            istanbul: context.tr('İstanbul'),
            ticket: context.tr('Biletlerin'),
            wallet: context.tr('Seyahat cüzdanın'),
          ),
          child: const SizedBox.expand(),
        ),
      ),
    ),
  );
}

class _TravelDeskPainter extends CustomPainter {
  const _TravelDeskPainter({
    required this.rome,
    required this.istanbul,
    required this.ticket,
    required this.wallet,
  });
  final String rome, istanbul, ticket, wallet;

  @override
  void paint(Canvas canvas, Size size) {
    final background = Offset.zero & size;
    canvas.drawRect(
      background,
      Paint()
        ..shader = const RadialGradient(
          center: Alignment(0.45, -0.6),
          radius: 1.3,
          colors: [Color(0xFF48634C), Color(0xFF283F33)],
        ).createShader(background),
    );
    final grid = Paint()
      ..color = const Color(0x12E9E0C3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.7;
    for (double x = 0; x <= size.width; x += 28) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y <= size.height; y += 28) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.53, size.height * 0.5),
        width: size.width * 1.15,
        height: size.height * 0.86,
      ),
      grid,
    );
    final scale = math.min(size.width / 360, size.height / 220);
    canvas.save();
    canvas.translate(
      (size.width - 360 * scale) / 2,
      (size.height - 220 * scale) / 2,
    );
    canvas.scale(scale);
    _map(canvas);
    _boardingPass(canvas);
    _wallet(canvas);
    canvas.restore();
  }

  void _paper(Canvas canvas, Rect rect, Color color, {double radius = 8}) {
    final shape = RRect.fromRectAndRadius(rect, Radius.circular(radius));
    canvas.drawShadow(
      Path()..addRRect(shape),
      const Color(0x990F2119),
      9,
      false,
    );
    canvas.drawRRect(shape, Paint()..color = color);
    canvas.drawRRect(
      shape,
      Paint()
        ..color = const Color(0x55FFFFED)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );
  }

  void _map(Canvas canvas) {
    canvas.save();
    canvas.translate(47, 30);
    canvas.rotate(-0.10);
    const paper = Rect.fromLTWH(0, 0, 258, 150);
    _paper(canvas, paper, const Color(0xFFEFE9D6));
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(paper, const Radius.circular(8)));
    final land = Path()
      ..moveTo(0, 28)
      ..lineTo(26, 34)
      ..lineTo(47, 26)
      ..lineTo(66, 33)
      ..lineTo(85, 16)
      ..lineTo(110, 19)
      ..lineTo(124, 2)
      ..lineTo(258, 0)
      ..lineTo(258, 98)
      ..lineTo(236, 100)
      ..lineTo(220, 91)
      ..lineTo(197, 105)
      ..lineTo(182, 94)
      ..lineTo(168, 101)
      ..lineTo(160, 90)
      ..lineTo(145, 96)
      ..lineTo(137, 83)
      ..lineTo(126, 86)
      ..lineTo(141, 105)
      ..lineTo(155, 120)
      ..lineTo(151, 129)
      ..lineTo(138, 119)
      ..lineTo(126, 112)
      ..lineTo(113, 95)
      ..lineTo(91, 99)
      ..lineTo(76, 109)
      ..lineTo(66, 133)
      ..lineTo(41, 131)
      ..lineTo(23, 113)
      ..lineTo(0, 116)
      ..close();
    canvas.drawPath(land, Paint()..color = const Color(0xFFD7DEC4));
    canvas.drawPath(
      land,
      Paint()
        ..color = const Color(0xFFB9C5AA)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    final roads = Paint()
      ..color = const Color(0xBBFFFDF3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    canvas.drawPath(
      Path()
        ..moveTo(19, 57)
        ..cubicTo(71, 105, 91, 41, 137, 61)
        ..cubicTo(167, 93, 213, 58, 260, 82),
      roads,
    );
    canvas.drawPath(
      Path()
        ..moveTo(60, 123)
        ..cubicTo(94, 72, 151, 75, 235, 115),
      roads,
    );
    canvas.drawPath(
      Path()
        ..moveTo(108, 8)
        ..lineTo(120, 54)
        ..lineTo(152, 70)
        ..lineTo(161, 95),
      roads,
    );
    final fold = Paint()
      ..color = const Color(0x19556642)
      ..strokeWidth = 1;
    for (final x in [86.0, 172.0]) {
      canvas.drawLine(Offset(x, 0), Offset(x, 150), fold);
      canvas.drawLine(
        Offset(x + 1, 0),
        Offset(x + 1, 150),
        Paint()..color = const Color(0x70FFFDF3),
      );
    }
    final route = Path()
      ..moveTo(216, 93)
      ..cubicTo(199, 61, 162, 63, 141, 100)
      ..cubicTo(123, 128, 76, 96, 85, 57);
    final routePaint = Paint()
      ..color = AppColors.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    for (final metric in route.computeMetrics()) {
      for (double distance = 0; distance < metric.length; distance += 7) {
        canvas.drawPath(
          metric.extractPath(distance, math.min(distance + 3.5, metric.length)),
          routePaint,
        );
      }
    }
    for (final point in [
      const Offset(216, 93),
      const Offset(141, 100),
      const Offset(85, 57),
    ]) {
      canvas.drawCircle(point, 5, Paint()..color = AppColors.surface);
      canvas.drawCircle(point, 2.7, Paint()..color = AppColors.accent);
    }
    _text(
      canvas,
      'TRAVYON ATLAS',
      const Offset(13, 10),
      6.5,
      AppColors.forest,
      weight: FontWeight.w700,
    );
    _text(canvas, 'Paris', const Offset(66, 43), 8, AppColors.forest);
    _text(canvas, rome, const Offset(143, 109), 8, AppColors.forest);
    _text(
      canvas,
      istanbul,
      const Offset(207, 101),
      7,
      AppColors.forest,
      maxWidth: 50,
    );
    canvas.restore();
    canvas.restore();
  }

  void _boardingPass(Canvas canvas) {
    canvas.save();
    canvas.translate(183, 109);
    canvas.rotate(0.08);
    const paper = Rect.fromLTWH(0, 0, 146, 91);
    _paper(canvas, paper, AppColors.surface);
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(paper, const Radius.circular(8)));
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 146, 23),
      Paint()..color = AppColors.accent,
    );
    _icon(
      canvas,
      Icons.flight_takeoff_rounded,
      const Offset(11, 6),
      11,
      AppColors.surface,
    );
    _text(
      canvas,
      ticket,
      const Offset(28, 7),
      8,
      AppColors.surface,
      weight: FontWeight.w600,
      maxWidth: 101,
    );
    _text(
      canvas,
      'IST',
      const Offset(13, 32),
      22,
      AppColors.text,
      weight: FontWeight.w700,
    );
    _text(
      canvas,
      'FCO',
      const Offset(88, 32),
      22,
      AppColors.text,
      weight: FontWeight.w700,
    );
    _icon(
      canvas,
      Icons.flight_takeoff_rounded,
      const Offset(64, 39),
      15,
      AppColors.accent,
    );
    final dash = Paint()
      ..color = AppColors.divider
      ..strokeWidth = 0.8;
    for (double x = 10; x < 136; x += 6) {
      canvas.drawLine(Offset(x, 64), Offset(x + 3, 64), dash);
    }
    for (var i = 0; i < 25; i++) {
      final x = 90 + i * 1.5;
      canvas.drawRect(
        Rect.fromLTWH(x, 73, i % 3 == 0 ? 1 : 0.5, 10),
        Paint()..color = AppColors.forest.withValues(alpha: 0.6),
      );
    }
    _text(
      canvas,
      'TRAVYON',
      const Offset(13, 75),
      6.5,
      AppColors.muted,
      weight: FontWeight.w600,
    );
    canvas.restore();
    canvas.restore();
  }

  void _wallet(Canvas canvas) {
    canvas.save();
    canvas.translate(30, 128);
    canvas.rotate(-0.08);
    _paper(
      canvas,
      const Rect.fromLTWH(0, 0, 124, 75),
      const Color(0xFF304633),
      radius: 12,
    );
    _paper(
      canvas,
      const Rect.fromLTWH(8, -14, 106, 46),
      const Color(0xFFE3E8D5),
      radius: 5,
    );
    _icon(
      canvas,
      Icons.hotel_outlined,
      const Offset(17, -6),
      12,
      AppColors.forest,
    );
    _text(
      canvas,
      rome,
      const Offset(36, -5),
      8,
      AppColors.forest,
      weight: FontWeight.w600,
    );
    _paper(
      canvas,
      const Rect.fromLTWH(11, 7, 108, 43),
      const Color(0xFFEBD7B4),
      radius: 5,
    );
    _icon(
      canvas,
      Icons.confirmation_number_outlined,
      const Offset(20, 11),
      12,
      AppColors.forest,
    );
    _text(canvas, 'Colosseo', const Offset(39, 13), 8, AppColors.forest);
    final front = RRect.fromRectAndRadius(
      const Rect.fromLTWH(0, 28, 124, 62),
      const Radius.circular(12),
    );
    canvas.drawRRect(
      front,
      Paint()
        ..shader = const LinearGradient(
          colors: [Color(0xFF627452), Color(0xFF3C553C)],
        ).createShader(front.outerRect),
    );
    canvas.drawRRect(
      front.deflate(5),
      Paint()
        ..color = const Color(0x667F9470)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.7,
    );
    _icon(
      canvas,
      Icons.near_me_outlined,
      const Offset(13, 41),
      14,
      const Color(0xFFE6DEBB),
    );
    _text(
      canvas,
      'travyon',
      const Offset(32, 39),
      17,
      const Color(0xFFE6DEBB),
      heading: true,
    );
    _text(
      canvas,
      wallet,
      const Offset(13, 71),
      6,
      const Color(0xFFD7DCBF),
      maxWidth: 100,
    );
    final strap = RRect.fromRectAndRadius(
      const Rect.fromLTWH(111, 45, 21, 23),
      const Radius.circular(5),
    );
    canvas.drawShadow(
      Path()..addRRect(strap),
      const Color(0x66192B20),
      2,
      false,
    );
    canvas.drawRRect(strap, Paint()..color = const Color(0xFF637553));
    canvas.drawCircle(
      const Offset(121, 56),
      5.5,
      Paint()..color = const Color(0xFFD8C487),
    );
    canvas.restore();
  }

  void _icon(
    Canvas canvas,
    IconData icon,
    Offset offset,
    double size,
    Color color,
  ) {
    final painter = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontFamily: icon.fontFamily,
          package: icon.fontPackage,
          fontSize: size,
          color: color,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    painter.paint(canvas, offset);
    painter.dispose();
  }

  void _text(
    Canvas canvas,
    String text,
    Offset offset,
    double size,
    Color color, {
    FontWeight weight = FontWeight.w400,
    bool heading = false,
    double maxWidth = 250,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontFamily: heading ? AppTypography.heading : AppTypography.body,
          fontSize: size,
          color: color,
          fontWeight: weight,
          height: 1.1,
        ),
      ),
      maxLines: 1,
      ellipsis: '…',
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: maxWidth);
    painter.paint(canvas, offset);
    painter.dispose();
  }

  @override
  bool shouldRepaint(_TravelDeskPainter oldDelegate) =>
      oldDelegate.rome != rome ||
      oldDelegate.istanbul != istanbul ||
      oldDelegate.ticket != ticket ||
      oldDelegate.wallet != wallet;
}
