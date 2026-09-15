import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../help/presentation/help_style.dart';
import '../data/settings_repository.dart';
import 'account_widgets.dart';

class AccountSecurityPage extends StatefulWidget {
  const AccountSecurityPage({
    super.key,
    required this.emailMode,
    required this.passwordProvider,
    required this.repository,
    this.currentEmail = '',
  });
  final bool emailMode, passwordProvider;
  final SettingsRepository repository;
  final String currentEmail;
  @override
  State<AccountSecurityPage> createState() => _AccountSecurityPageState();
}

class _AccountSecurityPageState extends State<AccountSecurityPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _repeat = TextEditingController();
  final _visible = <String>{};
  bool _busy = false, _success = false;
  String? _error;
  String _submittedEmail = '';
  bool get _dirty =>
      !_success &&
      [_email, _current, _new, _repeat].any((field) => field.text.isNotEmpty);

  @override
  void dispose() {
    for (final field in [_email, _current, _new, _repeat]) {
      field.dispose();
    }
    super.dispose();
  }

  void _change() => setState(() {
    _error = null;
  });

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (widget.emailMode) {
        await widget.repository.changeEmail(_email.text.trim(), _current.text);
      } else {
        await widget.repository.changePassword(_current.text, _new.text);
      }
      if (!mounted) return;
      _submittedEmail = _email.text.trim();
      for (final field in [_email, _current, _new, _repeat]) {
        field.clear();
      }
      _visible.clear();
      setState(() => _success = true);
    } catch (error) {
      if (mounted) setState(() => _error = settingsError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _password(
    String key,
    String label,
    TextEditingController controller,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: TextFormField(
      key: ValueKey('account-$key'),
      controller: controller,
      enabled: !_busy,
      obscureText: !_visible.contains(key),
      autocorrect: false,
      enableSuggestions: false,
      keyboardType: TextInputType.visiblePassword,
      textInputAction: key == 'repeat' || (widget.emailMode && key == 'current')
          ? TextInputAction.done
          : TextInputAction.next,
      autofillHints: key == 'current'
          ? const [AutofillHints.password]
          : const [AutofillHints.newPassword],
      maxLength: key == 'current' ? null : 150,
      decoration: accountInput(
        context,
        label,
        suffix: IconButton(
          key: ValueKey('toggle-$key'),
          tooltip: context.tr(
            _visible.contains(key) ? 'Şifreyi gizle' : 'Şifreyi göster',
          ),
          onPressed: _busy
              ? null
              : () => setState(() {
                  if (!_visible.add(key)) _visible.remove(key);
                }),
          icon: Icon(
            _visible.contains(key)
                ? Icons.visibility_off_outlined
                : Icons.visibility_outlined,
            size: 21,
          ),
        ),
      ).copyWith(counterText: ''),
      onChanged: (_) => _change(),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return context.tr(
            key == 'current' ? 'Mevcut şifreni gir.' : 'Bu alanı doldur.',
          );
        }
        if (key == 'new') {
          if (value.length < 8) return context.tr('En az 8 karakter kullan.');
          if (widget.passwordProvider && value == _current.text) {
            return context.tr('En az 8 karakterlik farklı bir şifre seç.');
          }
        }
        if (key == 'repeat' && value != _new.text) {
          return context.tr('Şifreler eşleşmiyor.');
        }
        return null;
      },
    ),
  );

  Widget _rule(String label, bool satisfied) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          satisfied ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
          size: 17,
          color: satisfied ? context.colors.forest : context.colors.muted,
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            context.tr(label),
            style: TextStyle(
              fontSize: 12,
              color: satisfied ? context.colors.forest : context.colors.muted,
              height: 1.5,
            ),
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => AccountScreen(
    title: widget.emailMode ? 'E-posta adresi' : 'Şifre ve güvenlik',
    busy: _busy,
    dirty: _dirty,
    child: _success
        ? _successPanel()
        : Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AccountHeader(
                  title: widget.emailMode
                      ? 'E-postanı güncelle.'
                      : 'Hesabını koru.',
                  subtitle: widget.emailMode
                      ? 'E-posta adresini değiştirmek için yeni adresini doğrula.'
                      : 'Güçlü bir şifre seçerek hesabını güvende tut.',
                  icon: widget.emailMode
                      ? Icons.alternate_email_rounded
                      : Icons.lock_outline_rounded,
                ),
                if (widget.currentEmail.isNotEmpty)
                  HelpPanel(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.account_circle_outlined,
                          size: 25,
                          color: context.colors.forest,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr(
                                  widget.emailMode
                                      ? 'Mevcut e-posta'
                                      : 'Giriş yaptığın hesap',
                                ),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: context.colors.muted,
                                ),
                              ),
                              const SizedBox(height: 6),
                              SelectableText(
                                widget.currentEmail,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                AccountNotice(
                  message: widget.passwordProvider
                      ? 'Bu değişiklik için mevcut şifrenle kimliğini doğrulaman gerekir.'
                      : 'Google ile giriş yapıyorsun. Değişikliği kaydetmeden önce Google hesabınla yeniden doğrulama istenecek.',
                  icon: Icons.verified_user_outlined,
                ),
                AccountCard(
                  title: widget.emailMode
                      ? 'Yeni e-posta adresin'
                      : 'Şifreni güncelle',
                  icon: widget.emailMode
                      ? Icons.mail_outline_rounded
                      : Icons.password_rounded,
                  children: [
                    if (widget.emailMode) ...[
                      TextFormField(
                        key: const ValueKey('account-email'),
                        controller: _email,
                        enabled: !_busy,
                        maxLength: 150,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: widget.passwordProvider
                            ? TextInputAction.next
                            : TextInputAction.done,
                        autocorrect: false,
                        autofillHints: const [AutofillHints.email],
                        decoration: accountInput(
                          context,
                          'Yeni e-posta',
                          hint: 'ornek@eposta.com',
                        ),
                        onChanged: (_) => _change(),
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                              .hasMatch(email)) {
                            return context.tr('Geçerli bir e-posta gir.');
                          }
                          if (widget.currentEmail.isNotEmpty &&
                              email.toLowerCase() ==
                                  widget.currentEmail.trim().toLowerCase()) {
                            return context.tr(
                              'Mevcut adresinden farklı bir e-posta gir.',
                            );
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                    ],
                    if (widget.passwordProvider)
                      _password('current', 'Mevcut şifren', _current),
                    if (!widget.emailMode) ...[
                      _password('new', 'Yeni şifre', _new),
                      _password('repeat', 'Yeni şifreyi tekrar yaz', _repeat),
                      _rule('En az 8 karakter', _new.text.length >= 8),
                      _rule(
                        'Şifreler eşleşiyor',
                        _repeat.text.isNotEmpty && _repeat.text == _new.text,
                      ),
                      if (widget.passwordProvider)
                        _rule(
                          'Mevcut şifrenden farklı',
                          _new.text.isNotEmpty &&
                              _current.text.isNotEmpty &&
                              _new.text != _current.text,
                        ),
                      const SizedBox(height: 4),
                      Text(
                        context.tr(
                          'Daha güçlü bir şifre için harf, rakam ve sembolleri birlikte kullan.',
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.5,
                          color: context.colors.muted,
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],
                    if (widget.emailMode) ...[
                      Text(
                        context.tr(
                          'Doğrulama bağlantısı yeni adresine gönderilir. Bağlantıyı açana kadar mevcut e-postan değişmez.',
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          color: context.colors.muted,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 22),
                    ],
                    if (_error != null)
                      AccountNotice(message: _error!, error: true),
                    AccountSaveButton(
                      key: const ValueKey('account-submit'),
                      label: widget.emailMode
                          ? 'Doğrulama bağlantısı gönder'
                          : 'Şifreyi güncelle',
                      icon: widget.emailMode
                          ? Icons.mark_email_read_outlined
                          : Icons.lock_reset_rounded,
                      busy: _busy,
                      onPressed: _submit,
                    ),
                  ],
                ),
              ],
            ),
          ),
  );

  Widget _successPanel() => HelpPanel(
    child: Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          Icon(
            widget.emailMode
                ? Icons.mark_email_read_outlined
                : Icons.check_circle_outline_rounded,
            color: context.colors.forest,
            size: 48,
          ),
          const SizedBox(height: 20),
          Text(
            context.tr(
              widget.emailMode
                  ? 'E-postanı kontrol et.'
                  : 'Şifren güncellendi.',
            ),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          if (widget.emailMode) ...[
            const SizedBox(height: 14),
            SelectableText(
              _submittedEmail,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 14),
          Text(
            context.tr(
              widget.emailMode
                  ? 'Yeni adresine gönderilen doğrulama bağlantısını aç. Ardından Ayarlar ekranını yenile.'
                  : 'Bir sonraki girişinde yeni şifreni kullanabilirsin.',
            ),
            textAlign: TextAlign.center,
            style: TextStyle(color: context.colors.muted, height: 1.6),
          ),
          const SizedBox(height: 24),
          AccountSaveButton(
            key: const ValueKey('account-done'),
            label: 'Ayarlara dön',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    ),
  );
}
