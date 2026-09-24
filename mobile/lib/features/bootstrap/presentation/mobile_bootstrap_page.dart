import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

class MobileBootstrapPage extends StatelessWidget {
  const MobileBootstrapPage({
    super.key,
    this.initializationError,
    this.onStart,
    this.onRegister,
  });

  final Object? initializationError;
  final VoidCallback? onStart, onRegister;

  @override
  Widget build(BuildContext context) {
    final ready = initializationError == null;
    const actionText = TextStyle(
      fontFamily: AppTypography.body,
      fontSize: 15,
      fontWeight: FontWeight.w600,
      height: 1.3,
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: AppColors.accent,
        systemNavigationBarIconBrightness: Brightness.dark,
        systemNavigationBarContrastEnforced: false,
      ),
      child: Scaffold(
        backgroundColor: AppColors.accent,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              key: const ValueKey('welcome-scroll'),
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: 480,
                    minHeight: constraints.maxHeight,
                  ),
                  child: IntrinsicHeight(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SizedBox(
                            height: math.max(
                              24,
                              constraints.maxHeight / 2 - 28,
                            ),
                          ),
                          const Center(child: _AnimatedWordmark()),
                          Expanded(
                            child: Align(
                              alignment: Alignment.bottomCenter,
                              child: Padding(
                                padding: const EdgeInsets.only(
                                  top: 32,
                                  bottom: 24,
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    if (!ready) ...[
                                      _InitializationNotice(
                                        colors: context.colors,
                                      ),
                                      const SizedBox(height: 14),
                                    ],
                                    FilledButton(
                                      key: const ValueKey('welcome-sign-in'),
                                      onPressed: ready ? onStart : null,
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.surface,
                                        foregroundColor: AppColors.text,
                                        disabledBackgroundColor: AppColors
                                            .surface
                                            .withValues(alpha: .35),
                                        disabledForegroundColor: AppColors.text
                                            .withValues(alpha: .6),
                                        minimumSize: const Size.fromHeight(54),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 22,
                                          vertical: 16,
                                        ),
                                        textStyle: actionText,
                                      ),
                                      child: Text(
                                        context.tr('Giriş yap'),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    TextButton(
                                      key: const ValueKey('welcome-register'),
                                      onPressed: ready ? onRegister : null,
                                      style: TextButton.styleFrom(
                                        foregroundColor: AppColors.text,
                                        disabledForegroundColor: AppColors.text
                                            .withValues(alpha: .6),
                                        minimumSize: const Size.fromHeight(52),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 22,
                                          vertical: 14,
                                        ),
                                        textStyle: actionText,
                                      ),
                                      child: Text(
                                        context.tr('Hesap oluştur'),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InitializationNotice extends StatelessWidget {
  const _InitializationNotice({required this.colors});

  final AppPalette colors;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.tone(const Color(0xFFF8E6E2)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.cloud_off_outlined,
            size: 20,
            color: colors.tone(const Color(0xFFA83E35)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              context.tr(
                'Şu anda bağlantı kurulamıyor. Uygulamayı kapatıp yeniden açmayı dene.',
              ),
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: colors.tone(const Color(0xFF873D35)),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _AnimatedWordmark extends StatefulWidget {
  const _AnimatedWordmark();

  @override
  State<_AnimatedWordmark> createState() => _AnimatedWordmarkState();
}

class _AnimatedWordmarkState extends State<_AnimatedWordmark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );
  bool _reduceMotion = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    if (_reduceMotion) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontFamily: AppTypography.heading,
      fontSize: 48,
      fontWeight: FontWeight.w400,
      height: 1.1,
    );
    return Semantics(
      label: 'Travyon',
      excludeSemantics: true,
      child: RepaintBoundary(
        child: SizedBox(
          width: 190,
          height: 56,
          child: FittedBox(
            fit: BoxFit.contain,
            child: AnimatedBuilder(
              key: const ValueKey('welcome-logo-animation'),
              animation: _controller,
              child: Text.rich(
                const TextSpan(
                  children: [
                    TextSpan(
                      text: 'trav',
                      style: TextStyle(color: Colors.black),
                    ),
                    TextSpan(text: 'yon'),
                  ],
                ),
                textScaler: TextScaler.noScaling,
                style: style.copyWith(color: AppColors.background),
              ),
              builder: (context, child) => ShaderMask(
                blendMode: BlendMode.srcATop,
                shaderCallback: (bounds) {
                  // Sweep across the entire wordmark, then pause offscreen.
                  final progress = const Interval(
                    0,
                    .75,
                    curve: Curves.easeInOut,
                  ).transform(_controller.value);
                  return LinearGradient(
                    colors: [
                      Colors.transparent,
                      Colors.white.withValues(alpha: _reduceMotion ? 0 : .95),
                      Colors.transparent,
                    ],
                  ).createShader(
                    Rect.fromLTWH(
                      bounds.left + bounds.width * (1.6 * progress - .45),
                      bounds.top,
                      bounds.width * .45,
                      bounds.height,
                    ),
                  );
                },
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
