import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../data/notification_repository.dart';

class TravelNoticeCard extends StatelessWidget {
  const TravelNoticeCard({
    super.key,
    required this.notice,
    required this.onAction,
    required this.onDismiss,
    this.onPlan,
    this.onSource,
    this.opening = false,
  });

  final TravelNotice notice;
  final VoidCallback? onAction, onDismiss, onPlan, onSource;
  final bool opening;

  @override
  Widget build(BuildContext context) {
    final n = notice;
    final (icon, category) = switch (n.kind) {
      TravelNoticeKind.trip => (Icons.luggage_outlined, 'Seyahat'),
      TravelNoticeKind.ticket => (
        Icons.confirmation_number_outlined,
        'Bilet ve rezervasyon',
      ),
      TravelNoticeKind.budget => (
        Icons.account_balance_wallet_outlined,
        'Bütçe',
      ),
      TravelNoticeKind.weather => (Icons.cloud_outlined, 'Hava durumu'),
    };
    final level = switch (n.level) {
      0 => 'Önemli',
      1 => 'Hatırlatma',
      _ => 'Bilgi',
    };
    final important = n.level == 0;
    return TravyonSurface(
      margin: const EdgeInsets.only(bottom: 14),
      borderRadius: 20,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: context.colors.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, size: 20, color: context.colors.text),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            context.tr(category),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: context.colors.text,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: important
                                  ? context.colors.orangeTint
                                  : context.colors.background,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              context.tr(level),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: important
                                    ? context.colors.text
                                    : context.colors.muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (n.contextLabel.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          n.contextLabel,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            color: context.colors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  tooltip: context.tr('Bildirimi kapat'),
                  onPressed: onDismiss,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  color: context.colors.muted,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(n.title),
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                height: 1.4,
                color: context.colors.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              context.tr(n.body, values: n.bodyValues),
              style: TextStyle(
                fontSize: 13,
                height: 1.6,
                color: context.colors.muted,
              ),
            ),
            for (final tip in n.tips)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  context.tr(tip),
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: context.colors.text,
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: context.colors.divider),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _NoticeAction(notice: n, onPressed: onAction, opening: opening),
                if (onPlan != null)
                  TextButton(
                    onPressed: onPlan,
                    style: TextButton.styleFrom(
                      foregroundColor: context.colors.text,
                      textStyle: const TextStyle(
                        fontFamily: AppTypography.body,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    child: Text(context.tr('Planı gör')),
                  ),
              ],
            ),
            if (n.kind == TravelNoticeKind.ticket) ...[
              const SizedBox(height: 6),
              Text(
                context.tr('GetYourGuide · Bilet ve tur seçenekleri'),
                style: TextStyle(fontSize: 10, color: context.colors.muted),
              ),
            ],
            if (n.sourceLabel != null && onSource != null)
              TextButton(
                onPressed: onSource,
                style: TextButton.styleFrom(
                  foregroundColor: context.colors.muted,
                  textStyle: const TextStyle(
                    fontFamily: AppTypography.body,
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    decoration: TextDecoration.underline,
                  ),
                ),
                child: Text(n.sourceLabel!),
              ),
          ],
        ),
      ),
    );
  }
}

class _NoticeAction extends StatelessWidget {
  const _NoticeAction({
    required this.notice,
    required this.onPressed,
    required this.opening,
  });
  final TravelNotice notice;
  final VoidCallback? onPressed;
  final bool opening;

  @override
  Widget build(BuildContext context) {
    final important = notice.level == 0;
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(child: Text(context.tr(notice.actionLabel))),
        const SizedBox(width: 8),
        if (opening)
          SizedBox.square(
            dimension: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: important ? context.colors.onAccent : context.colors.text,
            ),
          )
        else
          Icon(
            notice.actionUri == null
                ? Icons.arrow_forward_rounded
                : Icons.open_in_new_rounded,
            size: 16,
          ),
      ],
    );
    final buttonKey = ValueKey('notice-action-${notice.id}');
    const textStyle = TextStyle(
      fontFamily: AppTypography.body,
      fontSize: 12,
      fontWeight: FontWeight.w600,
    );
    if (important) {
      return FilledButton(
        key: buttonKey,
        onPressed: opening ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: context.colors.accent,
          foregroundColor: context.colors.onAccent,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          minimumSize: const Size(48, 48),
          shape: const StadiumBorder(),
          textStyle: textStyle,
        ),
        child: content,
      );
    }
    return TextButton(
      key: buttonKey,
      onPressed: opening ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor: context.colors.text,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
        textStyle: textStyle,
      ),
      child: content,
    );
  }
}
