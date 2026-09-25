import 'package:flutter/material.dart';

/// Keeps action widgets mounted so opening the menu preserves assistant history.
class HubActionsMenu extends StatefulWidget {
  const HubActionsMenu({super.key, required this.children});

  final List<Widget> children;

  @override
  State<HubActionsMenu> createState() => _HubActionsMenuState();
}

class _HubActionsMenuState extends State<HubActionsMenu> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) => TapRegion(
    onTapOutside: (_) {
      if (_expanded) setState(() => _expanded = false);
    },
    child: Material(
      color: _expanded
          ? Theme.of(context).colorScheme.surface
          : Colors.transparent,
      shape: const StadiumBorder(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRect(
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: _expanded ? 1 : 0),
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 240),
              curve: Curves.easeOutCubic,
              builder: (context, value, child) => Align(
                alignment: Alignment.centerRight,
                widthFactor: value,
                child: Opacity(opacity: value, child: child),
              ),
              child: ExcludeSemantics(
                excluding: !_expanded,
                child: ExcludeFocus(
                  excluding: !_expanded,
                  child: IgnorePointer(
                    ignoring: !_expanded,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: widget.children,
                    ),
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            key: const ValueKey('home-actions-menu'),
            tooltip: MaterialLocalizations.of(context).showMenuTooltip,
            isSelected: _expanded,
            onPressed: () => setState(() => _expanded = !_expanded),
            icon: const Icon(Icons.more_horiz_rounded),
            selectedIcon: const Icon(Icons.close_rounded),
          ),
        ],
      ),
    ),
  );
}
