import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialog.dart';
import '../data/contact_repository.dart';
import '../data/help_content.dart';
import 'contact_form.dart';
import 'help_style.dart';

export '../data/help_content.dart' show HelpSection;

const _sectionIcons = {
  HelpSection.faq: Icons.help_outline_rounded,
  HelpSection.privacy: Icons.shield_outlined,
  HelpSection.terms: Icons.description_outlined,
  HelpSection.contact: Icons.chat_bubble_outline_rounded,
};

Future<void> openHelpCenter(
  BuildContext context, {
  HelpSection section = HelpSection.faq,
  String name = '',
  String email = '',
}) => Navigator.of(context).push<void>(
  MaterialPageRoute(
    builder: (_) => HelpCenterPage(
      initialSection: section,
      initialName: name,
      initialEmail: email,
    ),
  ),
);

class HelpCenterPage extends StatefulWidget {
  const HelpCenterPage({
    super.key,
    this.initialSection = HelpSection.faq,
    this.repository = const FirebaseContactRepository(),
    this.initialName = '',
    this.initialEmail = '',
    this.openLink,
  });
  final HelpSection initialSection;
  final ContactRepository repository;
  final String initialName, initialEmail;
  final Future<bool> Function(Uri)? openLink;

  @override
  State<HelpCenterPage> createState() => _HelpCenterPageState();
}

class _HelpCenterPageState extends State<HelpCenterPage> {
  late HelpSection _section = widget.initialSection;
  bool _sending = false, _dirty = false, _allowPop = false, _confirming = false;

  void _selectSection(HelpSection section) {
    FocusScope.of(context).unfocus();
    setState(() => _section = section);
  }

  Future<void> _leave() async {
    if (_sending || _confirming) return;
    if (!_dirty) {
      Navigator.of(context).pop();
      return;
    }
    _confirming = true;
    final discard = await showAppConfirmation(
      context,
      title: context.tr('Mesaj taslağından vazgeç?'),
      message: context.tr('Henüz göndermediğin mesaj kaybolacak.'),
      confirmLabel: context.tr('Kaydetmeden çık'),
      cancelLabel: context.tr('Düzenlemeye dön'),
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

  Future<void> _openUri(Uri uri) async {
    try {
      final opened =
          await (widget.openLink?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (opened) return;
    } catch (_) {
      /* Present a safe message; keep the document and draft open. */
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('Bağlantı açılamadı. Tekrar dene.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = HelpContent(context.l10n.locale.languageCode);
    return PopScope(
      canPop: _allowPop || (!_sending && !_dirty),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('Yardım ve yasal')),
          leading: IconButton(
            tooltip: context.tr('Geri'),
            onPressed: _sending ? null : _leave,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
        ),
        body: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        for (final section in HelpSection.values)
                          ChoiceChip(
                            key: ValueKey('help-tab-${section.name}'),
                            label: Text(content.tab(section)),
                            labelStyle: TextStyle(
                              fontFamily: AppTypography.body,
                              fontSize: 12,
                              color: _section == section
                                  ? Colors.white
                                  : context.colors.text,
                            ),
                            selected: _section == section,
                            showCheckmark: false,
                            onSelected: _sending
                                ? null
                                : (_) => _selectSection(section),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    // Keep the draft, expanded answers and scroll positions when switching tabs.
                    child: IndexedStack(
                      index: _section.index,
                      children: [
                        _faq(content),
                        _policy(content, HelpSection.privacy),
                        _policy(content, HelpSection.terms),
                        ContactForm(
                          content: content.page(HelpSection.contact),
                          repository: widget.repository,
                          initialName: widget.initialName,
                          initialEmail: widget.initialEmail,
                          onEmail: () => _openUri(
                            Uri.parse('mailto:iletisim@travyon.app'),
                          ),
                          onStateChanged: (sending, dirty) => setState(() {
                            _sending = sending;
                            _dirty = dirty;
                          }),
                        ),
                      ],
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

  Widget _faq(HelpContent content) => ListView(
    key: const PageStorageKey('help-faq-scroll'),
    padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
    children: [
      HelpHeading(
        title: content.page(HelpSection.faq)['title'] as String,
        subtitle: content.page(HelpSection.faq)['subtitle'] as String,
        icon: _sectionIcons[HelpSection.faq]!,
      ),
      for (final section in content.sections(HelpSection.faq)) ...[
        _category(section['category'] as String),
        for (final item in section['items'] as List)
          _answer(item['q'] as String, item['a'] as String),
      ],
      _category(context.tr('Mobil uygulama')),
      for (final (question, answer) in mobileFaqItems)
        _answer(context.tr(question), context.tr(answer)),
      const SizedBox(height: 12),
      OutlinedButton.icon(
        key: const ValueKey('faq-contact'),
        onPressed: () => _selectSection(HelpSection.contact),
        icon: const Icon(Icons.chat_bubble_outline_rounded, size: 19),
        label: Text(
          context.tr('Yanıtını bulamadın mı? Bize yaz.'),
          textAlign: TextAlign.center,
        ),
      ),
    ],
  );

  Widget _category(String title) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
    child: Semantics(
      header: true,
      child: Text(
        title,
        style: TextStyle(
          color: context.colors.forest,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
  );

  Widget _answer(String question, String answer) => HelpPanel(
    padding: 0,
    child: ExpansionTile(
      key: PageStorageKey(question),
      tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
      childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
      shape: const Border(),
      collapsedShape: const Border(),
      iconColor: context.colors.forest,
      title: Text(
        question,
        style: TextStyle(
          color: context.colors.text,
          fontFamily: AppTypography.body,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          height: 1.5,
        ),
      ),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: SelectableText(
            key: PageStorageKey('faq-answer-$question'),
            answer,
            style: TextStyle(color: context.colors.muted, height: 1.7),
          ),
        ),
      ],
    ),
  );

  Widget _policy(HelpContent content, HelpSection section) {
    final page = content.page(section);
    return ListView(
      key: PageStorageKey('help-${section.name}-scroll'),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
      children: [
        HelpHeading(
          title: page['title'] as String,
          subtitle: page['subtitle'] as String,
          icon: _sectionIcons[section]!,
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: SelectableText(
            key: PageStorageKey('policy-${section.name}-intro'),
            page['intro'] as String,
            style: const TextStyle(height: 1.7),
          ),
        ),
        for (final entry in content.sections(section))
          HelpPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    entry['title'] as String,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                      height: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SelectableText(
                  key: PageStorageKey(
                    'policy-${section.name}-${entry['title']}',
                  ),
                  entry['content'] as String,
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 14,
                    height: 1.75,
                  ),
                ),
                if ((entry['content'] as String).contains(
                  'iletisim@travyon.app',
                ))
                  TextButton.icon(
                    onPressed: () =>
                        _openUri(Uri.parse('mailto:iletisim@travyon.app')),
                    icon: const Icon(Icons.mail_outline, size: 18),
                    label: Text(content.tab(HelpSection.contact)),
                  ),
                for (final (url, label) in const [
                  (
                    'https://policies.google.com/privacy',
                    'Google Gizlilik Politikası',
                  ),
                  (
                    'https://policies.google.com/terms',
                    'Google Hizmet Şartları',
                  ),
                ])
                  if ((entry['content'] as String).contains(url))
                    TextButton.icon(
                      onPressed: () => _openUri(Uri.parse(url)),
                      icon: const Icon(Icons.open_in_new_rounded, size: 17),
                      label: Text(context.tr(label)),
                    ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            content.text('lastUpdated'),
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: context.colors.muted),
          ),
        ),
      ],
    );
  }
}

/// Public links also work when authentication/Firebase initialization is unavailable.
class HelpLinks extends StatelessWidget {
  const HelpLinks({
    super.key,
    this.sections = HelpSection.values,
    this.enabled = true,
  });
  final List<HelpSection> sections;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final content = HelpContent(context.l10n.locale.languageCode);
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 4,
      children: [
        for (final section in sections)
          TextButton(
            key: ValueKey('help-link-${section.name}'),
            onPressed: enabled
                ? () => openHelpCenter(context, section: section)
                : null,
            style: TextButton.styleFrom(
              foregroundColor: context.colors.text,
              textStyle: const TextStyle(
                fontFamily: AppTypography.body,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: Text(content.tab(section), textAlign: TextAlign.center),
          ),
      ],
    );
  }
}
