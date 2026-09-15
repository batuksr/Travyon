import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../help/presentation/help_style.dart';
import '../data/settings_repository.dart';

class BugReportPage extends StatefulWidget {
  const BugReportPage({super.key, required this.repository});
  final SettingsRepository repository;

  @override
  State<BugReportPage> createState() => _BugReportPageState();
}

class _BugReportPageState extends State<BugReportPage> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _scroll = ScrollController();
  bool _busy = false, _sent = false, _allowPop = false, _confirming = false;
  String? _error;
  bool get _dirty =>
      !_sent && (_title.text.isNotEmpty || _description.text.isNotEmpty);

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _leave() async {
    if (_busy || _confirming) return;
    if (!_dirty) {
      Navigator.of(context).pop();
      return;
    }
    FocusScope.of(context).unfocus();
    _confirming = true;
    final discard = await showAppConfirmation(
      context,
      title: 'Rapor taslağından vazgeç?',
      message: 'Henüz göndermediğin başlık ve açıklama kaybolacak.',
      confirmLabel: 'Kaydetmeden çık',
      cancelLabel: 'Düzenlemeye dön',
      icon: Icons.edit_note_rounded,
      tone: AppDialogTone.warning,
    );
    _confirming = false;
    if (!mounted || !discard) return;
    setState(() => _allowPop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Keep the existing authenticated/App Check-protected server flow.
      // Only the two user-entered fields are sent; no device logs or attachments.
      await widget.repository.support(
        _title.text.trim(),
        _description.text.trim(),
        bug: true,
      );
      if (!mounted) return;
      _title.clear();
      _description.clear();
      setState(() => _sent = true);
      _scroll.jumpTo(0);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is FirebaseFunctionsException
            ? switch (error.code) {
                'resource-exhausted' =>
                  'Çok fazla rapor gönderdin. Biraz bekleyip tekrar dene.',
                'unauthenticated' => 'Rapor göndermek için yeniden giriş yap.',
                'failed-precondition' =>
                  'Rapor göndermeden önce e-posta adresini doğrula.',
                _ => 'Rapor gönderilemedi. Yazdıkların burada; bağlantını kontrol edip tekrar dene.',
              }
            : 'Rapor gönderilemedi. Yazdıkların burada; bağlantını kontrol edip tekrar dene.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field({
    required String key,
    required String label,
    required String hint,
    required TextEditingController controller,
    required int limit,
    bool multiline = false,
  }) => TextFormField(
    key: ValueKey(key),
    controller: controller,
    enabled: !_busy,
    maxLength: limit,
    minLines: multiline ? 5 : 1,
    maxLines: multiline ? 8 : 1,
    textAlignVertical: TextAlignVertical.top,
    keyboardType: multiline ? TextInputType.multiline : TextInputType.text,
    textInputAction: multiline ? TextInputAction.newline : TextInputAction.next,
    textCapitalization: TextCapitalization.sentences,
    decoration: InputDecoration(
      labelText: context.tr(label),
      floatingLabelBehavior: FloatingLabelBehavior.always,
      alignLabelWithHint: true,
      hintText: context.tr(hint),
      hintMaxLines: 2,
      hintStyle: TextStyle(
        fontSize: 13,
        height: 1.5,
        color: context.colors.muted,
      ),
      contentPadding: const EdgeInsets.all(16),
      fillColor: context.colors.background.withValues(alpha: 0.28),
      errorMaxLines: 3,
    ),
    onChanged: (_) => setState(() {}),
    validator: (value) {
      final text = value?.trim() ?? '';
      if (text.isEmpty) return context.tr('Bu alanı doldur.');
      // Match the backend's UTF-16 limits, including multi-unit emoji.
      if (text.length > limit) {
        return context.tr(
          'En fazla {count} karakter kullan.',
          values: {'count': limit},
        );
      }
      return null;
    },
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _allowPop || (!_busy && !_dirty),
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) _leave();
    },
    child: Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Hata bildir')),
        leading: IconButton(
          tooltip: context.tr('Geri'),
          onPressed: _busy ? null : _leave,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          key: const ValueKey('bug-report-scroll'),
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: _sent
                  ? _success()
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: context.colors.forest.withValues(
                                  alpha: 0.10,
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Icon(
                                Icons.bug_report_outlined,
                                color: context.colors.forest,
                                size: 25,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                context.tr('GERİ BİLDİRİM'),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.2,
                                  color: context.colors.forest,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Semantics(
                          header: true,
                          child: Text(
                            context.tr('Birlikte daha iyi bir Travyon.'),
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(fontSize: 25),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          context.tr(
                            'Karşılaştığın sorunu anlat, deneyimini iyileştirmemize yardımcı ol.',
                          ),
                          style: TextStyle(
                            color: context.colors.muted,
                            height: 1.6,
                          ),
                        ),
                        const SizedBox(height: 24),
                        HelpPanel(
                          child: Form(
                            key: _form,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _field(
                                  key: 'bug-title',
                                  label: 'Hata başlığı',
                                  hint: 'Örn. Harita açılmıyor',
                                  controller: _title,
                                  limit: 200,
                                ),
                                const SizedBox(height: 20),
                                _field(
                                  key: 'bug-description',
                                  label: 'Detaylı açıklama',
                                  hint: 'Karşılaştığın sorunu anlat.',
                                  controller: _description,
                                  limit: 3000,
                                  multiline: true,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  context.tr(
                                    'Hangi ekrandaydın, ne yaptın ve ne olmasını bekliyordun?',
                                  ),
                                  style: TextStyle(
                                    fontSize: 12,
                                    height: 1.6,
                                    color: context.colors.muted,
                                  ),
                                ),
                                const SizedBox(height: 18),
                                Divider(
                                  color: context.colors.divider,
                                  height: 1,
                                ),
                                const SizedBox(height: 18),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.shield_outlined,
                                      size: 18,
                                      color: context.colors.forest,
                                    ),
                                    const SizedBox(width: 9),
                                    Expanded(
                                      child: Text(
                                        context.tr(
                                          'Şifre, kart bilgisi veya rezervasyon kodu paylaşma.',
                                        ),
                                        style: TextStyle(
                                          fontSize: 12,
                                          height: 1.6,
                                          color: context.colors.muted,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (_error != null) ...[
                                  const SizedBox(height: 18),
                                  Semantics(
                                    liveRegion: true,
                                    child: Container(
                                      key: const ValueKey('bug-error'),
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: context.colors.tone(
                                          const Color(0xFFF8E6E2),
                                        ),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Text(
                                        context.tr(_error!),
                                        style: TextStyle(
                                          color: context.colors.tone(
                                            const Color(0xFF9F3730),
                                          ),
                                          height: 1.5,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 22),
                                FilledButton.icon(
                                  key: const ValueKey('bug-send'),
                                  onPressed: _busy ? null : _submit,
                                  style: FilledButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 16,
                                    ),
                                    textStyle: const TextStyle(
                                      fontFamily: AppTypography.body,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  icon: _busy
                                      ? const SizedBox.square(
                                          dimension: 18,
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.send_outlined,
                                          size: 18,
                                        ),
                                  label: Text(
                                    context.tr(
                                      _busy ? 'Gönderiliyor…' : 'Raporu gönder',
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
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
  );

  Widget _success() => HelpPanel(
    child: Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          Icon(
            Icons.check_circle_outline_rounded,
            size: 54,
            color: context.colors.forest,
          ),
          const SizedBox(height: 20),
          Text(
            context.tr('Raporun bize ulaştı.'),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          Text(
            context.tr(
              'Travyon’u geliştirmemize yardımcı olduğun için teşekkürler.',
            ),
            textAlign: TextAlign.center,
            style: TextStyle(height: 1.6, color: context.colors.muted),
          ),
          const SizedBox(height: 26),
          FilledButton(
            key: const ValueKey('bug-done'),
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              context.tr('Ayarlara dön'),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            key: const ValueKey('bug-new-report'),
            onPressed: () => setState(() {
              _sent = false;
              _error = null;
            }),
            child: Text(
              context.tr('Yeni rapor oluştur'),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    ),
  );
}
