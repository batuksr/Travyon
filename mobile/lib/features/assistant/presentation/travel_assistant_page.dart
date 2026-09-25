import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/assistant_controller.dart';
import '../data/assistant_repository.dart';

const _generalQuestions = [
  (
    label: 'Şehir öner',
    question: 'Avrupa için en iyi 3 şehir?',
    icon: Icons.travel_explore_outlined,
  ),
  (
    label: 'Bütçe',
    question: '1.000€ ile nereye gidebilirim?',
    icon: Icons.account_balance_wallet_outlined,
  ),
  (
    label: 'İpuçları',
    question: 'İlk seyahatim için birkaç pratik ipucu ver.',
    icon: Icons.lightbulb_outline_rounded,
  ),
];
const _planQuestions = [
  (
    label: 'Günlerim',
    question: 'Hangi günüm en yoğun?',
    icon: Icons.calendar_today_outlined,
  ),
  (
    label: 'Bütçe',
    question: 'Bu rotanın bütçesini nasıl azaltabilirim?',
    icon: Icons.account_balance_wallet_outlined,
  ),
  (
    label: 'İpuçları',
    question: 'Gitmeden bilmem gereken şeyler?',
    icon: Icons.lightbulb_outline_rounded,
  ),
];
const _followups = [
  'Daha detay ver',
  'Bütçe ne olmalı?',
  'En iyi ay hangisi?',
  'Otel mi Airbnb mi?',
];

class TravelAssistantPage extends StatefulWidget {
  const TravelAssistantPage({super.key, required this.controller, this.plan});
  final TravelAssistantController controller;
  final TravelPlanSummary? plan;

  @override
  State<TravelAssistantPage> createState() => _TravelAssistantPageState();
}

class _TravelAssistantPageState extends State<TravelAssistantPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _scrollQueued = false;
  bool _dataSharingApproved = false;
  bool _consentPromptOpen = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_updated);
    if (widget.controller.messages.isNotEmpty) _toBottom();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_updated);
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _updated() {
    if (!mounted) return;
    final follow =
        !_scroll.hasClients ||
        _scroll.position.maxScrollExtent - _scroll.offset < 160;
    setState(() {});
    if (widget.controller.messages.isEmpty) {
      if (_scroll.hasClients) _scroll.jumpTo(0);
    } else if (follow) {
      _toBottom();
    }
  }

  void _toBottom() {
    if (_scrollQueued) return;
    _scrollQueued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollQueued = false;
      if (mounted && _scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  String get _language => context.l10n.isEnglish ? 'en' : 'tr';

  Future<void> _send([String? question]) async {
    final text = question ?? _input.text;
    if (text.trim().isEmpty || widget.controller.busy) return;
    if (!_dataSharingApproved) {
      if (_consentPromptOpen) return;
      FocusManager.instance.primaryFocus?.unfocus();
      _consentPromptOpen = true;
      final hasPlan = widget.plan != null;
      final approved = await showAppConfirmation(
        context,
        title: 'Yapay zekâ ile veri paylaşımı',
        message: hasPlan
            ? 'Yazdığın mesaj ve planının rota özeti, yanıt üretmek için Google Gemini ile paylaşılacak. Hassas bilgi yazma.'
            : 'Yazdığın mesaj, yanıt üretmek için Google Gemini ile paylaşılacak. Hassas bilgi yazma.',
        confirmLabel: 'Kabul et ve gönder',
        cancelLabel: 'Vazgeç',
        icon: Icons.security_outlined,
      );
      _consentPromptOpen = false;
      if (!mounted || !approved) return;
      _dataSharingApproved = true;
    }
    if (widget.controller.send(text, language: _language, plan: widget.plan)) {
      _input.clear();
      _toBottom();
    }
  }

  Future<void> _clear() async {
    final confirmed = await showAppConfirmation(
      context,
      title: 'Sohbet temizlensin mi?',
      message: 'Bu sohbetteki mesajlar temizlenecek.',
      confirmLabel: 'Sohbeti temizle',
      icon: Icons.forum_outlined,
    );
    if (confirmed && mounted) widget.controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final chat = widget.controller;
    final messages = chat.messages;
    final hasPlan = widget.plan != null;
    final compact =
        MediaQuery.sizeOf(context).height -
            MediaQuery.viewInsetsOf(context).bottom <
        450;
    final canSend =
        !chat.busy &&
        _input.text.trim().isNotEmpty &&
        _input.text.trim().length <= assistantQuestionLimit;
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => Navigator.maybePop(context)),
        title: const Text(
          'Travyon AI',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            tooltip: context.tr('Asistan hakkında'),
            onPressed: () => showAppInformation(
              context,
              title: 'Asistan hakkında',
              message: hasPlan
                  ? 'Mesajların ve planının özeti, yanıt için Google Gemini ile paylaşılır.'
                  : 'Mesajların, yanıt için Google Gemini ile paylaşılır.',
            ),
            icon: const Icon(Icons.info_outline_rounded),
          ),
          if (messages.isNotEmpty)
            IconButton(
              tooltip: context.tr('Sohbeti temizle'),
              onPressed: _clear,
              icon: const Icon(Icons.delete_sweep_outlined),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              key: const ValueKey('assistant-messages'),
              controller: _scroll,
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  sliver: messages.isEmpty
                      ? SliverFillRemaining(
                          hasScrollBody: false,
                          child: _EmptyConversation(
                            plan: widget.plan,
                            onQuestion: (question) => _send(question),
                          ),
                        )
                      : SliverList.list(
                          children: [
                            if (hasPlan) _PlanContext(plan: widget.plan!),
                            for (final message in messages)
                              _MessageBubble(
                                key: ValueKey(
                                  'assistant-message-${message.id}',
                                ),
                                message: message,
                                onRetry:
                                    !chat.busy && message.id == messages.last.id
                                    ? () => chat.retry(
                                        language: _language,
                                        plan: widget.plan,
                                      )
                                    : null,
                              ),
                            if (!chat.busy && messages.last.error == null) ...[
                              const SizedBox(height: 6),
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    for (final question in _followups)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          right: 8,
                                        ),
                                        child: ActionChip(
                                          shape: const StadiumBorder(),
                                          label: Text(context.tr(question)),
                                          labelStyle: TextStyle(
                                            color: context.colors.text,
                                            fontFamily: AppTypography.body,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                          ),
                                          backgroundColor:
                                              context.colors.surface,
                                          surfaceTintColor: Colors.transparent,
                                          side: BorderSide(
                                            color: context.colors.divider,
                                          ),
                                          onPressed: () =>
                                              _send(context.tr(question)),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                ),
              ],
            ),
          ),
          Container(
            color: context.colors.background,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Container(
                  key: const ValueKey('assistant-composer'),
                  padding: const EdgeInsets.fromLTRB(4, 4, 6, 4),
                  decoration: BoxDecoration(
                    color: context.colors.surface,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: context.colors.divider),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          key: const ValueKey('assistant-input'),
                          controller: _input,
                          minLines: 1,
                          maxLines: compact ? 1 : 3,
                          maxLength: assistantQuestionLimit,
                          textCapitalization: TextCapitalization.sentences,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                          onChanged: (_) => setState(() {}),
                          style: const TextStyle(fontSize: 14),
                          decoration: InputDecoration(
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            hintStyle: TextStyle(
                              color: context.colors.muted,
                              fontSize: 14,
                            ),
                            hintText: context.tr(
                              hasPlan ? 'Planın hakkında sor…' : 'Bir şey sor…',
                            ),
                            counterText: '',
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      IconButton.filled(
                        key: const ValueKey('assistant-send'),
                        tooltip: context.tr('Gönder'),
                        onPressed: canSend ? () => _send() : null,
                        style: IconButton.styleFrom(
                          minimumSize: const Size(48, 48),
                          backgroundColor: context.colors.accent,
                          foregroundColor: context.colors.onAccent,
                        ),
                        icon: const Icon(Icons.arrow_upward_rounded),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanContext extends StatelessWidget {
  const _PlanContext({required this.plan});
  final TravelPlanSummary plan;

  @override
  Widget build(BuildContext context) => TravyonSurface(
    margin: const EdgeInsets.only(bottom: 20),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    borderRadius: 16,
    child: Row(
      children: [
        Icon(Icons.route_outlined, size: 19, color: context.colors.muted),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            plan.destination,
            style: TextStyle(
              color: context.colors.text,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
        ),
      ],
    ),
  );
}

class _EmptyConversation extends StatelessWidget {
  const _EmptyConversation({required this.plan, required this.onQuestion});
  final TravelPlanSummary? plan;
  final ValueChanged<String> onQuestion;

  @override
  Widget build(BuildContext context) => Column(
    key: const ValueKey('assistant-welcome'),
    mainAxisAlignment: MainAxisAlignment.center,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (plan != null) _PlanContext(plan: plan!),
      Text(
        context.tr(plan == null ? 'Nereye gidelim?' : 'Rotanı konuşalım.'),
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 10),
      Text(
        context.tr(
          plan == null
              ? 'Şehirleri keşfet, bütçeni konuş, yolculuğunu şekillendir.'
              : 'Günlerini, bütçeni ve duraklarını birlikte gözden geçirelim.',
        ),
        style: TextStyle(
          color: context.colors.muted,
          fontSize: 13,
          height: 1.6,
        ),
      ),
      const SizedBox(height: 24),
      Column(
        key: const ValueKey('assistant-suggestions'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final question
              in plan == null ? _generalQuestions : _planQuestions)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OutlinedButton(
                onPressed: () => onQuestion(context.tr(question.question)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: context.colors.text,
                  backgroundColor: context.colors.surface,
                  padding: const EdgeInsets.all(16),
                  side: BorderSide(color: context.colors.divider),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: Row(
                  children: [
                    TravyonIconBadge(
                      icon: question.icon,
                      size: 36,
                      color: context.colors.text,
                      background: context.colors.background,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr(question.label),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            context.tr(question.question),
                            style: TextStyle(
                              color: context.colors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: context.colors.muted,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ],
  );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({super.key, required this.message, this.onRetry});
  final AssistantMessage message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Align(
    alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: EdgeInsets.only(
        bottom: 16,
        left: message.isUser ? 24 : 0,
        right: message.isUser ? 0 : 12,
      ),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: message.isUser
            ? context.colors.orangeTint
            : context.colors.surface,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(20),
          topRight: const Radius.circular(20),
          bottomLeft: Radius.circular(message.isUser ? 20 : 6),
          bottomRight: Radius.circular(message.isUser ? 6 : 20),
        ),
        border: message.isUser
            ? null
            : Border.all(color: context.colors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!message.isUser) ...[
            Text(
              'Travyon AI',
              style: TextStyle(
                color: context.colors.text,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 10),
          ],
          // User and model output is content, never an application translation key.
          if (message.text.isNotEmpty)
            SelectableText(
              message.text,
              style: TextStyle(
                fontSize: 14,
                height: 1.6,
                color: context.colors.text,
              ),
            ),
          if (message.pending)
            Padding(
              padding: EdgeInsets.only(top: message.text.isEmpty ? 0 : 10),
              child: Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: context.colors.accent,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.tr('Yanıt hazırlanıyor…'),
                      style: TextStyle(
                        fontSize: 12,
                        color: context.colors.muted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (message.error != null) ...[
            if (message.text.isNotEmpty) const SizedBox(height: 12),
            Text(
              context.tr(message.error!),
              style: TextStyle(
                color: context.colors.danger,
                fontSize: 13,
                height: 1.5,
              ),
            ),
            if (onRetry != null)
              TextButton.icon(
                onPressed: onRetry,
                style: TextButton.styleFrom(
                  foregroundColor: context.colors.text,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: Text(context.tr('Tekrar dene')),
              ),
          ],
        ],
      ),
    ),
  );
}
