import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../help/presentation/help_center_page.dart';

enum AuthMode { signIn, register }

enum _AuthAction { email, google, apple, passwordReset }

class AuthPage extends StatefulWidget {
  const AuthPage({
    super.key,
    required this.repository,
    this.initialMode = AuthMode.signIn,
  });

  final AuthRepository repository;
  final AuthMode initialMode;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late AuthMode _mode = widget.initialMode;
  bool _obscurePassword = true;
  bool _acceptedTerms = false;
  _AuthAction? _action;
  bool get _loading => _action != null;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _changeMode(AuthMode mode) {
    if (_mode == mode || _loading) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _mode = mode;
      _error = null;
      _notice = null;
    });
  }

  Future<void> _submit() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_mode == AuthMode.register && !_acceptedTerms) {
      setState(
        () => _error = 'Devam etmek için kullanım koşullarını kabul et.',
      );
      return;
    }

    setState(() {
      _action = _AuthAction.email;
      _error = null;
      _notice = null;
    });
    try {
      if (_mode == AuthMode.signIn) {
        await widget.repository.signIn(
          email: _emailController.text,
          password: _passwordController.text,
        );
      } else {
        await widget.repository.register(
          name: _nameController.text,
          email: _emailController.text,
          password: _passwordController.text,
        );
      }
      if (mounted) Navigator.of(context).pop();
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'İşlem tamamlanamadı. Lütfen tekrar dene.');
      }
    } finally {
      if (mounted) setState(() => _action = null);
    }
  }

  Future<void> _resetPassword() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    final email = _emailController.text.trim();
    if (!email.contains('@')) {
      setState(() => _error = 'Önce geçerli e-posta adresini yaz.');
      return;
    }
    setState(() {
      _action = _AuthAction.passwordReset;
      _error = null;
      _notice = null;
    });
    try {
      await widget.repository.sendPasswordReset(email);
      if (mounted) {
        setState(
          () => _notice = 'Şifre yenileme bağlantısı e-postana gönderildi.',
        );
      }
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'İşlem tamamlanamadı. Lütfen tekrar dene.');
      }
    } finally {
      if (mounted) setState(() => _action = null);
    }
  }

  Future<void> _signInWithGoogle() async {
    if (_loading) return;
    if (_mode == AuthMode.register && !_acceptedTerms) {
      setState(
        () => _error = 'Devam etmek için kullanım koşullarını kabul et.',
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _action = _AuthAction.google;
      _error = null;
      _notice = null;
    });
    try {
      await widget.repository.signInWithGoogle();
      if (mounted) Navigator.of(context).pop();
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Google ile giriş yapılamadı. Lütfen tekrar dene.',
        );
      }
    } finally {
      if (mounted) setState(() => _action = null);
    }
  }

  Future<void> _signInWithApple() async {
    if (_loading) return;
    if (_mode == AuthMode.register && !_acceptedTerms) {
      setState(
        () => _error = 'Devam etmek için kullanım koşullarını kabul et.',
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _action = _AuthAction.apple;
      _error = null;
      _notice = null;
    });
    try {
      await widget.repository.signInWithApple();
      if (mounted) Navigator.of(context).pop();
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Apple ile giriş yapılamadı. Lütfen tekrar dene.',
        );
      }
    } finally {
      if (mounted) setState(() => _action = null);
    }
  }

  InputDecoration _decoration(String label, String hint, {Widget? suffix}) {
    final colors = context.colors;
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: colors.divider),
    );
    return InputDecoration(
      labelText: context.tr(label),
      hintText: context.tr(hint),
      floatingLabelBehavior: FloatingLabelBehavior.always,
      labelStyle: TextStyle(
        fontFamily: AppTypography.body,
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: colors.muted,
      ),
      hintStyle: TextStyle(color: colors.muted, fontSize: 14),
      fillColor: colors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: border,
      enabledBorder: border,
      disabledBorder: border,
      focusedBorder: border.copyWith(
        borderSide: BorderSide(color: colors.accent, width: 1.5),
      ),
      errorBorder: border.copyWith(
        borderSide: BorderSide(color: colors.danger),
      ),
      focusedErrorBorder: border.copyWith(
        borderSide: BorderSide(color: colors.danger, width: 1.5),
      ),
      errorMaxLines: 3,
      suffixIcon: suffix,
    );
  }

  @override
  Widget build(BuildContext context) {
    final registering = _mode == AuthMode.register;
    final showApple = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
    final colors = context.colors;
    const buttonText = TextStyle(
      fontFamily: AppTypography.body,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 1.4,
    );
    final fieldText = TextStyle(color: colors.text, fontSize: 15, height: 1.4);

    return PopScope(
      canPop: !_loading,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: colors.background,
          surfaceTintColor: Colors.transparent,
          actions: [
            IconButton(
              tooltip: context.tr('Yardım ve yasal'),
              onPressed: _loading ? null : () => openHelpCenter(context),
              icon: const Icon(Icons.help_outline_rounded, size: 21),
            ),
            const SizedBox(width: 8),
          ],
          leading: IconButton(
            onPressed: _loading ? null : () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back_rounded, size: 22),
            tooltip: context.tr('Geri'),
          ),
        ),
        body: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: SingleChildScrollView(
                key: const ValueKey('auth-scroll'),
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                child: AutofillGroup(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Semantics(
                          header: true,
                          child: Text(
                            registering ? 'Hesap oluştur' : 'Tekrar hoş geldin',
                            key: const ValueKey('auth-title'),
                            style: TextStyle(
                              fontFamily: AppTypography.heading,
                              fontSize: 26,
                              height: 1.2,
                              color: colors.text,
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                        if (registering) ...[
                          TextFormField(
                            key: const ValueKey('auth-name'),
                            controller: _nameController,
                            enabled: !_loading,
                            textCapitalization: TextCapitalization.words,
                            textInputAction: TextInputAction.next,
                            autofillHints: const [AutofillHints.name],
                            style: fieldText,
                            decoration: _decoration(
                              'Ad soyad',
                              'Adın ve soyadın',
                            ),
                            validator: (value) =>
                                (value?.trim().length ?? 0) < 2
                                ? context.tr('Adını ve soyadını yaz.')
                                : null,
                          ),
                          const SizedBox(height: 20),
                        ],
                        TextFormField(
                          key: const ValueKey('auth-email'),
                          controller: _emailController,
                          enabled: !_loading,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.email],
                          autocorrect: false,
                          style: fieldText,
                          decoration: _decoration(
                            'E-posta',
                            'ornek@eposta.com',
                          ),
                          validator: (value) {
                            final email = value?.trim() ?? '';
                            return !email.contains('@') || !email.contains('.')
                                ? context.tr('Geçerli bir e-posta adresi gir.')
                                : null;
                          },
                        ),
                        const SizedBox(height: 20),
                        TextFormField(
                          key: const ValueKey('auth-password'),
                          controller: _passwordController,
                          enabled: !_loading,
                          obscureText: _obscurePassword,
                          autocorrect: false,
                          enableSuggestions: false,
                          textInputAction: TextInputAction.done,
                          autofillHints: [
                            registering
                                ? AutofillHints.newPassword
                                : AutofillHints.password,
                          ],
                          style: fieldText,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: _decoration(
                            'Şifre',
                            registering ? 'En az 8 karakter' : 'Şifreni gir',
                            suffix: IconButton(
                              onPressed: _loading
                                  ? null
                                  : () => setState(
                                      () =>
                                          _obscurePassword = !_obscurePassword,
                                    ),
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                size: 20,
                                color: colors.muted,
                              ),
                              tooltip: context.tr(
                                _obscurePassword
                                    ? 'Şifreyi göster'
                                    : 'Şifreyi gizle',
                              ),
                            ),
                          ),
                          validator: (value) => (value?.length ?? 0) < 8
                              ? context.tr('Şifren en az 8 karakter olmalı.')
                              : null,
                        ),
                        if (!registering)
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              key: const ValueKey('auth-reset-password'),
                              onPressed: _loading ? null : _resetPassword,
                              style: TextButton.styleFrom(
                                textStyle: buttonText.copyWith(fontSize: 12),
                              ),
                              child: _action == _AuthAction.passwordReset
                                  ? _AuthSpinner(color: colors.forest)
                                  : const Text('Şifremi unuttum'),
                            ),
                          ),
                        if (registering) ...[
                          const SizedBox(height: 12),
                          CheckboxListTile(
                            key: const ValueKey('auth-terms'),
                            value: _acceptedTerms,
                            onChanged: _loading
                                ? null
                                : (value) => setState(
                                    () => _acceptedTerms = value ?? false,
                                  ),
                            contentPadding: EdgeInsets.zero,
                            controlAffinity: ListTileControlAffinity.leading,
                            activeColor: colors.forest,
                            checkColor: colors.background,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            title: Text(
                              'Kullanım Koşulları ve Gizlilik Politikası’nı kabul ediyorum.',
                              style: TextStyle(
                                fontSize: 12,
                                height: 1.5,
                                color: colors.muted,
                              ),
                            ),
                          ),
                          HelpLinks(
                            sections: const [
                              HelpSection.terms,
                              HelpSection.privacy,
                            ],
                            enabled: !_loading,
                          ),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 8),
                          _FeedbackMessage(message: _error!, error: true),
                        ],
                        if (_notice != null) ...[
                          const SizedBox(height: 8),
                          _FeedbackMessage(message: _notice!, error: false),
                        ],
                        const SizedBox(height: 16),
                        FilledButton(
                          key: const ValueKey('auth-submit'),
                          onPressed: _loading ? null : _submit,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(54),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            textStyle: buttonText,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: _action == _AuthAction.email
                              ? _AuthSpinner(color: colors.onAccent)
                              : Text(
                                  registering
                                      ? 'Hesabımı oluştur'
                                      : 'Giriş yap',
                                ),
                        ),
                        const SizedBox(height: 18),
                        const _OrDivider(),
                        const SizedBox(height: 18),
                        OutlinedButton.icon(
                          key: const ValueKey('auth-google'),
                          onPressed: _loading ? null : _signInWithGoogle,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: colors.text,
                            backgroundColor: colors.surface,
                            minimumSize: const Size.fromHeight(54),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                            side: BorderSide(color: colors.divider),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            textStyle: buttonText,
                          ),
                          icon: _action == _AuthAction.google
                              ? _AuthSpinner(color: colors.forest)
                              : const _GoogleMark(),
                          label: const Text(
                            'Google ile devam et',
                            textAlign: TextAlign.center,
                          ),
                        ),
                        if (showApple) ...[
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            key: const ValueKey('auth-apple'),
                            onPressed: _loading ? null : _signInWithApple,
                            style: FilledButton.styleFrom(
                              foregroundColor: Colors.white,
                              backgroundColor: Colors.black,
                              disabledForegroundColor: Colors.white70,
                              disabledBackgroundColor: Colors.black54,
                              minimumSize: const Size.fromHeight(54),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              textStyle: buttonText,
                            ),
                            icon: _action == _AuthAction.apple
                                ? const _AuthSpinner(color: Colors.white)
                                : const Icon(Icons.apple, size: 21),
                            label: const Text(
                              'Apple ile devam et',
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                        const SizedBox(height: 18),
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 2,
                          children: [
                            Text(
                              registering
                                  ? 'Zaten hesabın var mı?'
                                  : 'Hesabın yok mu?',
                              style: TextStyle(
                                color: colors.muted,
                                fontSize: 13,
                              ),
                            ),
                            TextButton(
                              key: const ValueKey('auth-switch-mode'),
                              onPressed: _loading
                                  ? null
                                  : () => _changeMode(
                                      registering
                                          ? AuthMode.signIn
                                          : AuthMode.register,
                                    ),
                              style: TextButton.styleFrom(
                                textStyle: buttonText.copyWith(fontSize: 13),
                              ),
                              child: Text(
                                registering ? 'Giriş yap' : 'Hesap oluştur',
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
      ),
    );
  }
}

class _AuthSpinner extends StatelessWidget {
  const _AuthSpinner({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: 20,
    child: CircularProgressIndicator(strokeWidth: 2, color: color),
  );
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: context.colors.divider)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'VEYA',
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 11,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(child: Divider(color: context.colors.divider)),
      ],
    );
  }
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'G',
      style: TextStyle(
        color: Color(0xFF4285F4),
        fontSize: 20,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _FeedbackMessage extends StatelessWidget {
  const _FeedbackMessage({required this.message, required this.error});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error
        ? context.colors.tone(const Color(0xFF9B3535))
        : context.colors.forest;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Text(message, style: TextStyle(color: color, fontSize: 13)),
      ),
    );
  }
}
