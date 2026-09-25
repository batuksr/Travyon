import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../assistant/presentation/assistant_launcher.dart';
import '../data/plan_detail.dart';
import '../data/travel_plans_repository.dart';
import 'plan_route_map.dart';

/// Only real, located stops are drawn. Missing map configuration is explained
/// by PlanRouteMap rather than replaced with an unrelated destination image.
class PlanDetailHero extends StatelessWidget {
  const PlanDetailHero({
    super.key,
    required this.plan,
    required this.day,
    required this.uid,
    required this.onOpenMap,
  });

  final TravelPlanSummary plan;
  final PlanDay day;
  final String uid;
  final VoidCallback onOpenMap;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 218 + (MediaQuery.textScalerOf(context).scale(14) - 14),
    child: Stack(
      fit: StackFit.expand,
      children: [
        // Prevent the native map from taking vertical scroll gestures.
        IgnorePointer(
          child: ExcludeSemantics(
            child: PlanRouteMap(
              day: day,
              destination: plan.destination,
              preview: true,
              onDirections: (_) {},
            ),
          ),
        ),
        Positioned(
          top: 12,
          left: 16,
          child: Material(
            color: context.colors.surface,
            shape: const CircleBorder(),
            child: IconButton(
              tooltip: context.tr('Geri'),
              icon: const Icon(Icons.arrow_back_rounded, size: 21),
              onPressed: () => Navigator.maybePop(context),
            ),
          ),
        ),
        Positioned(
          top: 12,
          right: 16,
          child: Material(
            color: context.colors.surface,
            shape: const CircleBorder(),
            child: AssistantLauncher(uid: uid, plan: plan),
          ),
        ),
        Positioned(
          right: 16,
          bottom: 12,
          child: OutlinedButton.icon(
            key: const ValueKey('plan-open-map'),
            onPressed: onOpenMap,
            style: OutlinedButton.styleFrom(
              backgroundColor: context.colors.surface,
              minimumSize: const Size(0, 44),
              shape: const StadiumBorder(),
              textStyle: const TextStyle(
                fontFamily: AppTypography.body,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            icon: const Icon(Icons.map_outlined, size: 18),
            label: Text(context.tr('Haritada aç')),
          ),
        ),
      ],
    ),
  );
}

/// Trip tools keep their existing navigation contract, in the same restrained
/// floating pill treatment as the app's main navigation.
class PlanDetailNavigation extends StatelessWidget {
  const PlanDetailNavigation({
    super.key,
    required this.selected,
    required this.onSelect,
  });
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(16, 8, 16, 10),
    child: Container(
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(36),
        border: Border.all(color: context.colors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: NavigationBarTheme(
        data: NavigationBarThemeData(
          height: 66,
          indicatorColor: Colors.transparent,
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              fontFamily: AppTypography.body,
              fontSize: 10,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w500,
              color: states.contains(WidgetState.selected)
                  ? context.colors.accent
                  : context.colors.muted,
            ),
          ),
          iconTheme: WidgetStateProperty.resolveWith(
            (states) => IconThemeData(
              size: 21,
              color: states.contains(WidgetState.selected)
                  ? context.colors.accent
                  : context.colors.muted,
            ),
          ),
        ),
        child: NavigationBar(
          backgroundColor: Colors.transparent,
          selectedIndex: selected,
          onDestinationSelected: onSelect,
          destinations: [
            for (final item in [
              (Icons.format_list_bulleted_rounded, 'Günlük plan'),
              (Icons.map_outlined, 'Rota'),
              (Icons.account_balance_wallet_outlined, 'Bütçe'),
              (Icons.checklist_rounded, 'Hazırlık'),
            ])
              NavigationDestination(
                icon: Icon(item.$1),
                label: context.tr(item.$2),
              ),
          ],
        ),
      ),
    ),
  );
}
