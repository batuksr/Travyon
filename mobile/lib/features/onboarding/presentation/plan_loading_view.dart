import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

/// A compact, indeterminate waiting state, not a server progress estimate.
class PlanLoadingView extends StatefulWidget {
  const PlanLoadingView({
    super.key,
    required this.destination,
    required this.elapsedSeconds,
  });

  final String destination;
  final int elapsedSeconds;

  @override
  State<PlanLoadingView> createState() => _PlanLoadingViewState();
}

class _PlanLoadingViewState extends State<PlanLoadingView>
    with SingleTickerProviderStateMixin {
  late final _sheen = AnimationController(
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
      _sheen.stop();
    } else if (!_sheen.isAnimating) {
      _sheen.repeat();
    }
  }

  @override
  void dispose() {
    _sheen.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final elapsed = Duration(seconds: math.max(0, widget.elapsedSeconds));
    final time =
        '${elapsed.inMinutes.toString().padLeft(2, '0')}:'
        '${(elapsed.inSeconds % 60).toString().padLeft(2, '0')}';

    return LayoutBuilder(
      builder: (context, viewport) => SingleChildScrollView(
        key: const ValueKey('plan-loading-scroll'),
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 300,
              minHeight: math.max(0, viewport.maxHeight - 48),
            ),
            child: IntrinsicHeight(
              child: Column(
                children: [
                  Expanded(
                    child: Center(
                      child: Column(
                        key: const ValueKey('plan-loading-content'),
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _wordmark(),
                          const SizedBox(height: 22),
                          Semantics(
                            liveRegion: true,
                            child: Text(
                              context.tr(
                                '{destination} için rotan hazırlanıyor…',
                                values: {'destination': widget.destination},
                              ),
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: colors.muted,
                                fontSize: 14,
                                height: 1.5,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Semantics(
                            label: context.tr(
                              'Geçen süre: {time}',
                              values: {'time': time},
                            ),
                            excludeSemantics: true,
                            child: Text(
                              time,
                              style: TextStyle(
                                color: colors.muted,
                                fontSize: 12,
                                letterSpacing: 1,
                                fontFeatures: const [
                                  FontFeature.tabularFigures(),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    context.tr('Lütfen ekranı açık tut.'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: colors.muted,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _wordmark() {
    final colors = context.colors;
    final style = TextStyle(
      fontFamily: AppTypography.logo,
      fontSize: 40,
      fontWeight: FontWeight.w400,
      height: 1.2,
    );

    return Semantics(
      label: 'travyon',
      excludeSemantics: true,
      child: RepaintBoundary(
        child: SizedBox(
          width: 160,
          child: FittedBox(
            fit: BoxFit.contain,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'trav',
                  textScaler: TextScaler.noScaling,
                  style: style.copyWith(color: colors.text),
                ),
                AnimatedBuilder(
                  key: const ValueKey('plan-loading-sheen'),
                  animation: _sheen,
                  child: Text(
                    'yon',
                    textScaler: TextScaler.noScaling,
                    style: style.copyWith(color: colors.accent),
                  ),
                  builder: (context, child) => ShaderMask(
                    blendMode: BlendMode.srcATop,
                    shaderCallback: (bounds) {
                      // A soft sweep followed by a pause; no abrupt loop reset.
                      final progress = const Interval(
                        0,
                        .7,
                        curve: Curves.easeInOut,
                      ).transform(_sheen.value);
                      return LinearGradient(
                        colors: [
                          Colors.transparent,
                          Colors.white.withValues(
                            alpha: _reduceMotion ? 0 : .32,
                          ),
                          Colors.transparent,
                        ],
                      ).createShader(
                        Rect.fromLTWH(
                          bounds.left + bounds.width * (3 * progress - 1),
                          bounds.top,
                          bounds.width,
                          bounds.height,
                        ),
                      );
                    },
                    child: child,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
