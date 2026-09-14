import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
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
    final (color, background, level) = switch (n.level) {
      0 => (const Color(0xFFA54A24), const Color(0xFFFBE7DC), 'Önemli'),
      1 => (const Color(0xFF82611A), const Color(0xFFF6EDCF), 'Hatırlatma'),
      _ => (AppColors.forest, const Color(0xFFE8EFE8), 'Bilgi'),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.divider),
      ),
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
                    color: background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, size: 20, color: color),
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
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: color,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: background,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              context.tr(level),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: color,
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
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.muted,
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
                  color: AppColors.muted,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(n.title),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                height: 1.4,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              context.tr(n.body, values: n.bodyValues),
              style: const TextStyle(
                fontSize: 13,
                height: 1.6,
                color: AppColors.muted,
              ),
            ),
            for (final tip in n.tips)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  context.tr(tip),
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.forest,
                  ),
                ),
              ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: AppColors.divider),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                FilledButton(
                  key: ValueKey('notice-action-${n.id}'),
                  onPressed: opening ? null : onAction,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.forest,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(48, 48),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    textStyle: const TextStyle(
                      fontFamily: AppTypography.body,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (opening)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Icon(
                          n.actionUri == null
                              ? switch (n.destination) {
                                  NoticeDestination.checklist =>
                                    Icons.checklist_rounded,
                                  NoticeDestination.budget =>
                                    Icons.account_balance_wallet_outlined,
                                  NoticeDestination.weather =>
                                    Icons.cloud_outlined,
                                  NoticeDestination.plan =>
                                    Icons.route_outlined,
                                }
                              : Icons.open_in_new_rounded,
                          size: 16,
                        ),
                      const SizedBox(width: 7),
                      Flexible(child: Text(context.tr(n.actionLabel))),
                    ],
                  ),
                ),
                if (onPlan != null)
                  TextButton(
                    onPressed: onPlan,
                    style: TextButton.styleFrom(
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
                style: const TextStyle(fontSize: 10, color: AppColors.muted),
              ),
            ],
            if (n.sourceLabel != null && onSource != null)
              TextButton(
                onPressed: onSource,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.muted,
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
