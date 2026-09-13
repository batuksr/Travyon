import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/theme/app_theme.dart';

class EmailVerificationPage extends StatefulWidget {
  const EmailVerificationPage({
    super.key,
    required this.session,
    required this.repository,
  });

  final AuthSession session;
  final AuthRepository repository;

  @override
  State<EmailVerificationPage> createState() => _EmailVerificationPageState();
}

class _EmailVerificationPageState extends State<EmailVerificationPage> {
  bool _loading = false;
  String? _message;
  bool _error = false;

  Future<void> _run(Future<void> Function() action, String success) async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      await action();
      if (mounted) {
        setState(() {
          _message = success;
          _error = false;
        });
      }
    } on AuthFailure catch (failure) {
      if (mounted) {
        setState(() {
          _message = failure.message;
          _error = true;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _loading ? null : widget.repository.signOut,
                  child: const Text('Çıkış yap'),
                ),
              ),
              const Spacer(),
              Container(
                width: 78,
                height: 78,
                decoration: const BoxDecoration(
                  color: AppColors.forest,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mark_email_unread_outlined,
                  size: 36,
                  color: AppColors.surface,
                ),
              ),
              const SizedBox(height: 26),
              Text(
                'E-postanı doğrula',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 12),
              Text(
                '${widget.session.email} adresine gönderilen bağlantıya dokun. Ardından buraya dönüp kontrol et.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              if (_message != null) ...[
                const SizedBox(height: 20),
                Text(
                  _message!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _error ? const Color(0xFF9B3535) : AppColors.forest,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: _loading
                    ? null
                    : () => _run(
                        widget.repository.refreshSession,
                        'Doğrulama henüz görünmüyorsa birkaç saniye sonra tekrar dene.',
                      ),
                icon: _loading
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.refresh_rounded),
                label: const Text('Doğrulamayı kontrol et'),
              ),
              TextButton(
                onPressed: _loading
                    ? null
                    : () => _run(
                        widget.repository.sendEmailVerification,
                        'Doğrulama e-postası yeniden gönderildi.',
                      ),
                child: const Text('E-postayı yeniden gönder'),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }
}
