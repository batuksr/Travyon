import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/theme/app_theme.dart';

enum AuthMode { signIn, register }

class AuthPage extends StatefulWidget {
  const AuthPage({super.key, required this.repository});

  final AuthRepository repository;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  AuthMode _mode = AuthMode.signIn;
  bool _obscurePassword = true;
  bool _acceptedTerms = false;
  bool _loading = false;
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
    if (_mode == mode) return;
    setState(() {
      _mode = mode;
      _error = null;
      _notice = null;
    });
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_mode == AuthMode.register && !_acceptedTerms) {
      setState(
        () => _error = 'Devam etmek için kullanım koşullarını kabul et.',
      );
      return;
    }

    setState(() {
      _loading = true;
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
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    if (!email.contains('@')) {
      setState(() => _error = 'Önce geçerli e-posta adresini yaz.');
      return;
    }
    setState(() {
      _loading = true;
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
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signInWithGoogle() async {
    if (_mode == AuthMode.register && !_acceptedTerms) {
      setState(
        () => _error = 'Devam etmek için kullanım koşullarını kabul et.',
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
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
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final registering = _mode == AuthMode.register;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: context.tr('Geri'),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            24,
            10,
            24,
            24 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _AuthWordmark(),
                const SizedBox(height: 30),
                Text(
                  registering
                      ? 'Yolculuğun burada başlıyor'
                      : 'Tekrar hoş geldin',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 10),
                Text(
                  registering
                      ? 'Hesabını oluştur, planlarına her cihazdan ulaş.'
                      : 'Planlarına ve seyahat cüzdanına devam et.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 28),
                _ModeSwitch(mode: _mode, onChanged: _changeMode),
                const SizedBox(height: 24),
                if (registering) ...[
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.name],
                    decoration: InputDecoration(
                      labelText: context.tr('Ad soyad'),
                      prefixIcon: const Icon(Icons.person_outline_rounded),
                    ),
                    validator: (value) => (value?.trim().length ?? 0) < 2
                        ? context.tr('Adını ve soyadını yaz.')
                        : null,
                  ),
                  const SizedBox(height: 14),
                ],
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  autocorrect: false,
                  decoration: InputDecoration(
                    labelText: context.tr('E-posta'),
                    prefixIcon: const Icon(Icons.mail_outline_rounded),
                  ),
                  validator: (value) {
                    final email = value?.trim() ?? '';
                    return !email.contains('@') || !email.contains('.')
                        ? context.tr('Geçerli bir e-posta adresi gir.')
                        : null;
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.done,
                  autofillHints: [
                    registering
                        ? AutofillHints.newPassword
                        : AutofillHints.password,
                  ],
                  onFieldSubmitted: (_) {
                    if (!_loading) _submit();
                  },
                  decoration: InputDecoration(
                    labelText: context.tr('Şifre'),
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                    suffixIcon: IconButton(
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                      tooltip: context.tr(
                        _obscurePassword ? 'Şifreyi göster' : 'Şifreyi gizle',
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
                      onPressed: _loading ? null : _resetPassword,
                      child: const Text('Şifremi unuttum'),
                    ),
                  ),
                if (registering)
                  CheckboxListTile(
                    value: _acceptedTerms,
                    onChanged: _loading
                        ? null
                        : (value) =>
                              setState(() => _acceptedTerms = value ?? false),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text(
                      'Kullanım Koşulları ve Gizlilik Politikası’nı kabul ediyorum.',
                      style: TextStyle(fontSize: 12, color: AppColors.muted),
                    ),
                  ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  _FeedbackMessage(message: _error!, error: true),
                ],
                if (_notice != null) ...[
                  const SizedBox(height: 8),
                  _FeedbackMessage(message: _notice!, error: false),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox.square(
                          dimension: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(registering ? 'Hesabımı oluştur' : 'Giriş yap'),
                ),
                const SizedBox(height: 22),
                const _OrDivider(),
                const SizedBox(height: 22),
                OutlinedButton.icon(
                  onPressed: _loading ? null : _signInWithGoogle,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.text,
                    backgroundColor: AppColors.surface,
                    minimumSize: const Size.fromHeight(54),
                    side: const BorderSide(color: AppColors.divider),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    textStyle: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  icon: const _GoogleMark(),
                  label: const Text('Google ile devam et'),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'Webde kullandığın hesapla giriş yapabilirsin.',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: AppColors.muted),
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

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: Divider(color: AppColors.divider)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'VEYA',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 11,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(child: Divider(color: AppColors.divider)),
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

class _ModeSwitch extends StatelessWidget {
  const _ModeSwitch({required this.mode, required this.onChanged});

  final AuthMode mode;
  final ValueChanged<AuthMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          _ModeButton(
            label: 'Giriş yap',
            selected: mode == AuthMode.signIn,
            onTap: () => onChanged(AuthMode.signIn),
          ),
          _ModeButton(
            label: 'Kayıt ol',
            selected: mode == AuthMode.register,
            onTap: () => onChanged(AuthMode.register),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.forest : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
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
    final color = error ? const Color(0xFF9B3535) : AppColors.forest;
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

class _AuthWordmark extends StatelessWidget {
  const _AuthWordmark();

  @override
  Widget build(BuildContext context) {
    return const Text.rich(
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
      style: TextStyle(
        fontFamily: AppTypography.heading,
        fontSize: 28,
        fontWeight: FontWeight.w400,
      ),
    );
  }
}
