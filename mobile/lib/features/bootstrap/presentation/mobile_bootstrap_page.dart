import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../help/presentation/help_center_page.dart';
import 'welcome_backdrop.dart';

class MobileBootstrapPage extends StatefulWidget {
  const MobileBootstrapPage({
    super.key,
    this.initializationError,
    this.onStart,
    this.onRegister,
    this.onGoogle,
    this.onApple,
  });

  final Object? initializationError;
  final VoidCallback? onStart, onRegister;
  final Future<void> Function()? onGoogle, onApple;

  @override
  State<MobileBootstrapPage> createState() => _MobileBootstrapPageState();
}

class _MobileBootstrapPageState extends State<MobileBootstrapPage> {
  String? _provider, _error;
  bool _authenticating = false;
  bool get _ready => widget.initializationError == null && _provider == null;

  Future<void> _social(bool apple) async {
    final action = apple ? widget.onApple : widget.onGoogle;
    if (!_ready || action == null) return;
    setState(() {
      _provider = apple ? 'apple' : 'google';
      _error = null;
    });
    try {
      if (apple && (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS)) {
        await showAppInformation(
          context,
          title: 'Apple ile devam et',
          message: 'Apple ile giriş yalnızca iPhone ve iPad’de kullanılabilir.',
          icon: Icons.apple,
        );
        return;
      }
      // Social sign-in may create an account. Obtain explicit consent first,
      // just as the email registration form does.
      final accepted = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AppDialog(
          title: apple ? 'Apple ile devam et' : 'Google ile devam et',
          message: 'Devam etmeden önce Kullanım Koşulları ve Gizlilik Politikası’nı inceleyip kabul et.',
          icon: Icons.shield_outlined,
          content: Wrap(
            spacing: 8,
            children: [
              for (final section in [HelpSection.terms, HelpSection.privacy])
                TextButton(
                  onPressed: () =>
                      openHelpCenter(dialogContext, section: section),
                  child: Text(
                    dialogContext.tr(
                      section == HelpSection.terms
                          ? 'Kullanım Koşulları'
                          : 'Gizlilik Politikası',
                    ),
                  ),
                ),
            ],
          ),
          confirmLabel: 'Kabul et ve devam et',
          cancelLabel: 'Vazgeç',
          onConfirm: () => Navigator.pop(dialogContext, true),
          onCancel: () => Navigator.pop(dialogContext, false),
        ),
      );
      if (!mounted || accepted != true) return;
      setState(() => _authenticating = true);
      await action();
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'İşlem tamamlanamadı. Lütfen tekrar dene.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _provider = null;
          _authenticating = false;
        });
      }
    }
  }

  Widget _action({
    required String keyName,
    required String label,
    required VoidCallback? onPressed,
    Widget? icon,
    bool primary = false,
    bool busy = false,
  }) => FilledButton(
    key: ValueKey(keyName),
    onPressed: _ready ? onPressed : null,
    style: FilledButton.styleFrom(
      backgroundColor: primary ? AppColors.accent : Colors.white,
      foregroundColor: primary ? Colors.white : AppColors.text,
      disabledBackgroundColor: Colors.white.withValues(alpha: .7),
      disabledForegroundColor: AppColors.text,
      minimumSize: const Size.fromHeight(54),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
      shape: const StadiumBorder(),
      textStyle: const TextStyle(
        fontFamily: AppTypography.body,
        fontSize: 14,
        fontWeight: FontWeight.w600,
        height: 1.4,
      ),
    ),
    child: Row(
      children: [
        if (icon != null) ...[
          ExcludeSemantics(
            child: busy
                ? const SizedBox.square(
                    dimension: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.text,
                    ),
                  )
                : icon,
          ),
          const SizedBox(width: 12),
        ],
        Expanded(child: Text(context.tr(label), textAlign: TextAlign.center)),
        if (icon != null) const SizedBox(width: 34),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
    value: const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
      systemNavigationBarContrastEnforced: false,
    ),
    child: Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const WelcomeBackdrop(),
          SafeArea(
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
                              height: math.max(40, constraints.maxHeight * .18),
                            ),
                            const Spacer(),
                            const Center(
                              child: WelcomePlaneMark(
                                key: ValueKey('welcome-plane'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Semantics(
                              header: true,
                              child: Text(
                                context.tr('Yeni yerler.\nYeni hikâyeler.'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontFamily: AppTypography.body,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  height: 1.15,
                                  letterSpacing: -.8,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(height: 28),
                            if (widget.initializationError != null) ...[
                              _InitializationNotice(colors: context.colors),
                              const SizedBox(height: 14),
                            ],
                            if (_error != null) ...[
                              Semantics(
                                liveRegion: true,
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: context.colors.surface,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Text(
                                    context.tr(_error!),
                                    style: TextStyle(
                                      color: context.colors.danger,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),
                            ],
                            _action(
                              keyName: 'welcome-register',
                              label: 'Hesap oluştur',
                              primary: true,
                              onPressed: widget.onRegister,
                            ),
                            const SizedBox(height: 12),
                            _action(
                              keyName: 'welcome-google',
                              label: 'Google ile devam et',
                              icon: const SizedBox.square(
                                dimension: 22,
                                child: Center(
                                  child: Text(
                                    'G',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF4285F4),
                                    ),
                                  ),
                                ),
                              ),
                              busy: _authenticating && _provider == 'google',
                              onPressed: widget.onGoogle == null
                                  ? null
                                  : () => _social(false),
                            ),
                            const SizedBox(height: 12),
                            _action(
                              keyName: 'welcome-apple',
                              label: 'Apple ile devam et',
                              icon: const Icon(Icons.apple, size: 22),
                              busy: _authenticating && _provider == 'apple',
                              onPressed: widget.onApple == null
                                  ? null
                                  : () => _social(true),
                            ),
                            const SizedBox(height: 14),
                            Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(
                                  context.tr('Zaten hesabın var mı?'),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                  ),
                                ),
                                TextButton(
                                  key: const ValueKey('welcome-sign-in'),
                                  onPressed: _ready ? widget.onStart : null,
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    disabledForegroundColor: Colors.white70,
                                    minimumSize: const Size(48, 48),
                                    textStyle: const TextStyle(
                                      fontFamily: AppTypography.body,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                  child: Text(context.tr('Giriş yap')),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 4,
                              children: [
                                for (final section in [
                                  HelpSection.terms,
                                  HelpSection.privacy,
                                ])
                                  TextButton(
                                    key: ValueKey('welcome-${section.name}'),
                                    onPressed: _provider != null
                                        ? null
                                        : () => openHelpCenter(
                                            context,
                                            section: section,
                                          ),
                                    style: TextButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      disabledForegroundColor: Colors.white70,
                                      minimumSize: const Size(48, 44),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 10,
                                      ),
                                      textStyle: const TextStyle(
                                        fontFamily: AppTypography.body,
                                        fontSize: 11,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                    child: Text(
                                      context.tr(
                                        section == HelpSection.terms
                                            ? 'Kullanım Koşulları'
                                            : 'Gizlilik Politikası',
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                          ],
                        ),
                      ),
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
