import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/contact_repository.dart';
import 'help_style.dart';

class ContactForm extends StatefulWidget {
  const ContactForm({
    super.key,
    required this.content,
    required this.repository,
    required this.onStateChanged,
    required this.onEmail,
    this.initialName = '',
    this.initialEmail = '',
  });

  final Map<String, dynamic> content;
  final ContactRepository repository;
  final void Function(bool sending, bool dirty) onStateChanged;
  final VoidCallback onEmail;
  final String initialName, initialEmail;

  @override
  State<ContactForm> createState() => _ContactFormState();
}

class _ContactFormState extends State<ContactForm> {
  final _form = GlobalKey<FormState>();
  late final _fields = <String, TextEditingController>{
    'name': TextEditingController(text: widget.initialName),
    'email': TextEditingController(text: widget.initialEmail),
    'subject': TextEditingController(),
    'message': TextEditingController(),
  };
  bool _sending = false, _sent = false, _dirty = false;
  String? _errorKey;
  String label(String key) => widget.content['form'][key] as String;

  @override
  void dispose() {
    for (final controller in _fields.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _changed() {
    _dirty = true;
    widget.onStateChanged(_sending, _dirty);
  }

  Future<void> _submit() async {
    if (_sending || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _errorKey = null;
    });
    widget.onStateChanged(true, _dirty);
    try {
      await widget.repository.send(
        name: _fields['name']!.text.trim(),
        email: _fields['email']!.text.trim(),
        subject: _fields['subject']!.text.trim(),
        message: _fields['message']!.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _sent = true;
        _dirty = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorKey =
            error is FirebaseFunctionsException &&
                error.code == 'resource-exhausted'
            ? 'errorCooldown'
            : 'errorGeneric';
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        widget.onStateChanged(false, _dirty);
      }
    }
  }

  Widget _field(String name, int maxLength) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      key: ValueKey('contact-$name'),
      controller: _fields[name],
      enabled: !_sending,
      maxLength: maxLength,
      minLines: name == 'message' ? 5 : 1,
      maxLines: name == 'message' ? 8 : 1,
      keyboardType: switch (name) {
        'email' => TextInputType.emailAddress,
        'message' => TextInputType.multiline,
        _ => TextInputType.text,
      },
      textInputAction: name == 'message'
          ? TextInputAction.newline
          : TextInputAction.next,
      autofillHints: switch (name) {
        'name' => const [AutofillHints.name],
        'email' => const [AutofillHints.email],
        _ => null,
      },
      decoration: InputDecoration(
        labelText: label('${name}Label'),
        hintText: label('${name}Placeholder'),
        errorMaxLines: 3,
      ),
      onChanged: (_) => _changed(),
      validator: (value) {
        final text = value?.trim() ?? '';
        if (text.isEmpty) return context.tr('Bu alanı doldur.');
        if (name == 'email' &&
            !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(text)) {
          return context.tr('Geçerli bir e-posta adresi gir.');
        }
        return null;
      },
    ),
  );

  @override
  Widget build(BuildContext context) => ListView(
    key: const PageStorageKey('help-contact-scroll'),
    padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
    children: [
      HelpHeading(
        title: widget.content['title'] as String,
        subtitle: widget.content['subtitle'] as String,
        icon: Icons.chat_bubble_outline_rounded,
      ),
      for (final (key, icon) in [
        ('email', Icons.mail_outline_rounded),
        ('address', Icons.location_on_outlined),
        ('hours', Icons.schedule_rounded),
      ])
        HelpPanel(
          padding: 8,
          child: ListTile(
            key: ValueKey('contact-info-$key'),
            leading: Icon(icon, color: context.colors.forest),
            title: Text(
              widget.content['infoCards'][key]['title'] as String,
              style: TextStyle(fontSize: 12, color: context.colors.muted),
            ),
            subtitle: Text(
              widget.content['infoCards'][key]['value'] as String,
              style: TextStyle(color: context.colors.text, height: 1.5),
            ),
            trailing: key == 'email'
                ? const Icon(Icons.north_east, size: 18)
                : null,
            onTap: key == 'email' ? widget.onEmail : null,
          ),
        ),
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 6, 4, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.content['quickReplyTitle'] as String,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: context.colors.forest,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              widget.content['quickReplyDesc'] as String,
              style: TextStyle(color: context.colors.muted, height: 1.5),
            ),
          ],
        ),
      ),
      HelpPanel(
        child: _sent
            ? Semantics(
                liveRegion: true,
                child: Column(
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      color: context.colors.forest,
                      size: 44,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      label('successTitle'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 10),
                    Text(label('successDesc'), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    TextButton(
                      key: const ValueKey('contact-new-message'),
                      onPressed: () {
                        for (final controller in _fields.values) {
                          controller.clear();
                        }
                        setState(() => _sent = false);
                      },
                      child: Text(
                        label('newMessageButton'),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              )
            : Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _field('name', 100),
                    _field('email', 200),
                    _field('subject', 200),
                    _field('message', 5000),
                    if (_errorKey != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            label(_errorKey!),
                            style: TextStyle(
                              color: context.colors.tone(
                                const Color(0xFF9F3730),
                              ),
                              height: 1.5,
                            ),
                          ),
                        ),
                      ),
                    FilledButton.icon(
                      key: const ValueKey('contact-send'),
                      onPressed: _sending ? null : _submit,
                      icon: _sending
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_outlined, size: 18),
                      label: Text(
                        label(_sending ? 'sendingButton' : 'sendButton'),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
      ),
    ],
  );
}
