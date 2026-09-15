import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../help/presentation/help_style.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    required this.title,
    required this.child,
    this.busy = false,
    this.dirty = false,
  });
  final String title;
  final Widget child;
  final bool busy, dirty;
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _allowPop = false, _confirming = false;

  Future<void> _back() async {
    if (widget.busy || _confirming) return;
    if (!widget.dirty) {
      Navigator.of(context).pop();
      return;
    }
    FocusScope.of(context).unfocus();
    _confirming = true;
    final leave = await showAppConfirmation(
      context,
      title: 'Değişikliklerden vazgeç?',
      message: 'Kaydetmediğin değişiklikler kaybolacak.',
      confirmLabel: 'Kaydetmeden çık',
      cancelLabel: 'Düzenlemeye dön',
      icon: Icons.edit_note_rounded,
      tone: AppDialogTone.warning,
    );
    _confirming = false;
    if (!mounted || !leave) return;
    setState(() => _allowPop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _allowPop || (!widget.busy && !widget.dirty),
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) _back();
    },
    child: Scaffold(
      appBar: AppBar(
        title: Text(context.tr(widget.title)),
        leading: IconButton(
          tooltip: context.tr('Geri'),
          onPressed: widget.busy ? null : _back,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          key: const ValueKey('account-scroll'),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: widget.child,
            ),
          ),
        ),
      ),
    ),
  );
}

class AccountHeader extends StatelessWidget {
  const AccountHeader({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
  });
  final String title, subtitle;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.colors.forest.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: context.colors.forest, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  context.tr(title),
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontSize: 23, height: 1.25),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          context.tr(subtitle),
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 14,
            height: 1.6,
          ),
        ),
      ],
    ),
  );
}

class AccountCard extends StatelessWidget {
  const AccountCard({
    super.key,
    required this.title,
    required this.icon,
    required this.children,
  });
  final String title;
  final IconData icon;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => HelpPanel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: context.colors.forest),
            const SizedBox(width: 10),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  context.tr(title),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: context.colors.text,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        ...children,
      ],
    ),
  );
}

class AccountNotice extends StatelessWidget {
  const AccountNotice({
    super.key,
    required this.message,
    this.error = false,
    this.icon = Icons.info_outline_rounded,
  });
  final String message;
  final bool error;
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    final color = error
        ? context.colors.tone(const Color(0xFF9F3730))
        : context.colors.forest;
    return Semantics(
      liveRegion: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: error
              ? context.colors.tone(const Color(0xFFF8E6E2))
              : context.colors.tone(const Color(0xFFE8EFE8)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(error ? Icons.error_outline : icon, size: 19, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                context.tr(message),
                style: TextStyle(fontSize: 12, color: color, height: 1.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AccountSaveButton extends StatelessWidget {
  const AccountSaveButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon = Icons.check_rounded,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData icon;
  @override
  Widget build(BuildContext context) => FilledButton.icon(
    onPressed: busy ? null : onPressed,
    style: FilledButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      textStyle: const TextStyle(
        fontFamily: AppTypography.body,
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
    ),
    icon: busy
        ? const SizedBox.square(
            dimension: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          )
        : Icon(icon, size: 19),
    label: Text(
      context.tr(busy ? 'İşleniyor…' : label),
      textAlign: TextAlign.center,
    ),
  );
}

InputDecoration accountInput(
  BuildContext context,
  String label, {
  Widget? suffix,
  String? hint,
}) => InputDecoration(
  labelText: context.tr(label),
  floatingLabelBehavior: FloatingLabelBehavior.always,
  alignLabelWithHint: true,
  suffixIcon: suffix,
  hintText: hint == null ? null : context.tr(hint),
  hintMaxLines: 2,
  hintStyle: TextStyle(fontSize: 13, color: context.colors.muted),
  contentPadding: const EdgeInsets.all(16),
  fillColor: context.colors.background.withValues(alpha: 0.25),
  errorMaxLines: 3,
);
