import 'package:flutter/material.dart';

class WelcomeBackdrop extends StatelessWidget {
  const WelcomeBackdrop({super.key});

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          'assets/images/welcome-istanbul.jpg',
          key: const ValueKey('welcome-travel-photo'),
          fit: BoxFit.cover,
          alignment: Alignment.topCenter,
          errorBuilder: (_, _, _) => const ColoredBox(color: Color(0xFF33251F)),
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x26000000), Color(0x66000000), Color(0xED000000)],
              stops: [0, .35, 1],
            ),
          ),
        ),
      ],
    ),
  );
}

/// Matches the paper-plane geometry used in the iOS icon and Android splash.
class WelcomePlaneMark extends StatelessWidget {
  const WelcomePlaneMark({super.key, this.size = 88});

  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Travyon',
    image: true,
    child: SizedBox.square(
      dimension: size,
      child: const CustomPaint(painter: _PlanePainter()),
    ),
  );
}

class _PlanePainter extends CustomPainter {
  const _PlanePainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 100, size.height / 100);
    final paper = Path()
      ..moveTo(16, 46)
      ..lineTo(84, 19)
      ..lineTo(64, 82)
      ..lineTo(47, 59)
      ..close();
    canvas.drawPath(paper, Paint()..color = const Color(0xFFFFF7EA));
    canvas.drawPath(
      Path()
        ..moveTo(47, 59)
        ..lineTo(64, 82)
        ..lineTo(56, 63)
        ..lineTo(84, 19)
        ..close(),
      Paint()..color = const Color(0xFFE8D8C0),
    );
    final pen = Paint()
      ..color = const Color(0xFF315142)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(47, 59), const Offset(84, 19), pen);
    canvas.drawPath(paper, pen);
  }

  @override
  bool shouldRepaint(_PlanePainter oldDelegate) => false;
}
