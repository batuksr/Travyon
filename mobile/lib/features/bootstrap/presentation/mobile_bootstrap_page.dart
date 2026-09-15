import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../help/presentation/help_center_page.dart';
import 'welcome_travel_scene.dart';

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

    return Scaffold(
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
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Expanded(child: _Wordmark()),
                          IconButton(
                            key: const ValueKey('welcome-help'),
                            tooltip: context.tr('Yardım ve yasal'),
                            onPressed: () => openHelpCenter(context),
                            icon: Icon(
                              Icons.help_outline_rounded,
                              color: context.colors.forest,
                            ),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: (constraints.maxHeight * 0.30).clamp(
                                160.0,
                                230.0,
                              ),
                              width: double.infinity,
                              child: const WelcomeTravelScene(),
                            ),
                            const SizedBox(height: 26),
                            Text(
                              context.tr('Planla. Keşfet. Yola çık.'),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: context.colors.forest,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Semantics(
                              header: true,
                              child: Text(
                                context.tr('Bir sonraki yolculuğun burada.'),
                                style: TextStyle(
                                  fontFamily: AppTypography.heading,
                                  fontSize: 32,
                                  height: 1.2,
                                  color: context.colors.text,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              context.tr(
                                'Sana özel rotalar, biletlerin ve keşiflerin. Hepsi tek bir yerde.',
                              ),
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: context.colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (!ready) ...[
                            Semantics(
                              liveRegion: true,
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: context.colors.tone(
                                    const Color(0xFFF8E6E2),
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.cloud_off_outlined,
                                      size: 20,
                                      color: context.colors.tone(
                                        const Color(0xFFA83E35),
                                      ),
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
                                          color: context.colors.tone(
                                            const Color(0xFF873D35),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                          ],
                          FilledButton(
                            key: const ValueKey('welcome-sign-in'),
                            onPressed: ready ? onStart : null,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(54),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 22,
                                vertical: 16,
                              ),
                              textStyle: actionText,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Flexible(
                                  child: Text(
                                    context.tr('Giriş yap'),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            key: const ValueKey('welcome-register'),
                            onPressed: ready ? onRegister : null,
                            style: OutlinedButton.styleFrom(
                              backgroundColor: context.colors.surface,
                              foregroundColor: context.colors.forest,
                              minimumSize: const Size.fromHeight(54),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 22,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18),
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
                    ],
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

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Travyon',
    excludeSemantics: true,
    child: Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'trav',
            style: TextStyle(color: context.colors.text),
          ),
          TextSpan(
            text: 'yon',
            style: TextStyle(color: context.colors.accent),
          ),
        ],
      ),
      style: TextStyle(fontFamily: AppTypography.heading, fontSize: 32),
    ),
  );
}
