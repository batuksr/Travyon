import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/assistant_controller.dart';
import '../data/assistant_repository.dart';
import 'travel_assistant_page.dart';

/// Retains chat while this entry point remains mounted; never persists it.
class AssistantLauncher extends StatefulWidget {
  const AssistantLauncher({
    super.key,
    required this.uid,
    this.plan,
    this.repository,
    this.tonal = true,
  });
  final String uid;
  final TravelPlanSummary? plan;
  final TravelAssistantRepository? repository;
  final bool tonal;

  @override
  State<AssistantLauncher> createState() => _AssistantLauncherState();
}

class _AssistantLauncherState extends State<AssistantLauncher> {
  late TravelAssistantController _controller = _create();
  bool _open = false;
  MaterialPageRoute<void>? _route;
  NavigatorState? _navigator;

  TravelAssistantController _create() => TravelAssistantController(
    widget.repository ?? FirebaseTravelAssistantRepository(widget.uid),
  );

  @override
  void didUpdateWidget(covariant AssistantLauncher oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.plan?.id != widget.plan?.id ||
        oldWidget.repository != widget.repository) {
      _release();
      _controller = _create();
    }
  }

  @override
  void dispose() {
    _release();
    super.dispose();
  }

  void _release() {
    _controller.dispose();
    final route = _route;
    final navigator = _navigator;
    _route = null;
    _open = false;
    // Session changes can happen while the chat route is on top. Remove only
    // this launcher's route after the current build, never another page.
    if (route != null && navigator != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (navigator.mounted && route.isActive) navigator.removeRoute(route);
      });
    }
  }

  Future<void> _show() async {
    if (_open) return;
    _open = true;
    final controller = _controller;
    final plan = widget.plan;
    final route = MaterialPageRoute<void>(
      builder: (_) => TravelAssistantPage(controller: controller, plan: plan),
    );
    _route = route;
    _navigator = Navigator.of(context);
    await _navigator!.push<void>(route);
    if (_route == route) {
      _route = null;
      _open = false;
    }
  }

  @override
  Widget build(BuildContext context) => widget.tonal
      ? IconButton.filledTonal(
          tooltip: context.tr('Asistana sor'),
          onPressed: _show,
          icon: const Icon(Icons.auto_awesome_rounded, size: 21),
        )
      : IconButton(
          tooltip: context.tr('Asistana sor'),
          onPressed: _show,
          icon: const Icon(Icons.auto_awesome_rounded, size: 21),
        );
}
