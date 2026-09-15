import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/travel_plans_repository.dart';

Future<void> showPlanInformation(BuildContext context, Widget sheet) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: context.colors.background,
    builder: (_) => FractionallySizedBox(heightFactor: 0.92, child: sheet),
  );
}

class PlanInformationSheet extends StatelessWidget {
  const PlanInformationSheet({
    super.key,
    required this.title,
    required this.destination,
    required this.child,
  });
  final String title, destination;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 8, 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontFamily: AppTypography.heading,
                      fontSize: 23,
                      color: context.colors.text,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    destination,
                    style: TextStyle(fontSize: 13, color: context.colors.muted),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: context.tr('Kapat'),
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded),
            ),
          ],
        ),
      ),
      Expanded(child: SafeArea(top: false, child: child)),
    ],
  );
}

class PlanGuideSheet extends StatelessWidget {
  const PlanGuideSheet({super.key, required this.plan});
  final TravelPlanSummary plan;

  @override
  Widget build(BuildContext context) {
    final guide = planMap(plan.planData['cityGuide']);
    final sections =
        [
              (
                'transportationTips',
                'Ulaşım',
                Icons.directions_transit_outlined,
              ),
              ('localCustoms', 'Yerel kültür', Icons.people_outline_rounded),
              (
                'generalAdvice',
                'Faydalı bilgiler',
                Icons.lightbulb_outline_rounded,
              ),
            ]
            .where(
              (section) =>
                  guide[section.$1] is String &&
                  (guide[section.$1] as String).trim().isNotEmpty,
            )
            .toList();

    return PlanInformationSheet(
      title: context.tr('Şehir rehberi'),
      destination: plan.destination,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          if (sections.isEmpty)
            Text(
              context.tr('Bu plan için rehber bilgisi bulunmuyor.'),
              style: TextStyle(color: context.colors.muted, height: 1.6),
            ),
          for (final section in sections)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: context.colors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: context.colors.divider),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(section.$3, color: context.colors.forest, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.tr(section.$2),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: context.colors.forest,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Saved AI/user content stays in its original language, as on web.
                  Text(
                    (guide[section.$1] as String).trim(),
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.7,
                      color: context.colors.text,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
