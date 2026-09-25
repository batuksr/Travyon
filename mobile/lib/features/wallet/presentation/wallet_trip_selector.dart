import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

class WalletTripSelector extends StatefulWidget {
  const WalletTripSelector({
    super.key,
    required this.trips,
    required this.selected,
    required this.onChanged,
  });

  final Map<String, String> trips;
  final String selected;
  final ValueChanged<String>? onChanged;

  @override
  State<WalletTripSelector> createState() => _WalletTripSelectorState();
}

class _WalletTripSelectorState extends State<WalletTripSelector> {
  bool _open = false;

  Future<void> _choose() async {
    if (_open || widget.onChanged == null) return;
    setState(() => _open = true);
    try {
      final choice = await showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        backgroundColor: context.colors.surface,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * .75,
        ),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        builder: (_) =>
            _TripOptions(trips: widget.trips, selected: widget.selected),
      );
      if (!mounted || choice == null || !widget.trips.containsKey(choice)) {
        return;
      }
      if (choice != widget.selected) widget.onChanged?.call(choice);
    } finally {
      if (mounted) setState(() => _open = false);
    }
  }

  @override
  Widget build(BuildContext context) => Material(
    color: context.colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: BorderSide(color: context.colors.divider),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      key: const ValueKey('wallet-trip-select'),
      onTap: widget.onChanged == null || _open ? null : _choose,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            _TripIcon(general: widget.selected == 'general'),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('Seyahatin'),
                    style: TextStyle(color: context.colors.muted, fontSize: 11),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    widget.trips[widget.selected] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: context.colors.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Icon(
              _open ? Icons.expand_less_rounded : Icons.expand_more_rounded,
              size: 22,
              color: context.colors.muted,
            ),
          ],
        ),
      ),
    ),
  );
}

class _TripOptions extends StatelessWidget {
  const _TripOptions({required this.trips, required this.selected});
  final Map<String, String> trips;
  final String selected;

  @override
  Widget build(BuildContext context) {
    final options = trips.entries.toList();
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 8, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    context.tr('Seyahat seç'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  key: const ValueKey('wallet-trip-close'),
                  tooltip: context.tr('Kapat'),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView.separated(
              key: const ValueKey('wallet-trip-options'),
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              itemCount: options.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final trip = options[index];
                final active = trip.key == selected;
                return Semantics(
                  selected: active,
                  inMutuallyExclusiveGroup: true,
                  child: Material(
                    color: active
                        ? context.colors.greenTint
                        : context.colors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                      side: BorderSide(color: context.colors.divider),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      key: ValueKey('wallet-trip-option-${trip.key}'),
                      onTap: () => Navigator.pop(context, trip.key),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            _TripIcon(general: trip.key == 'general'),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                trip.value,
                                style: TextStyle(
                                  color: context.colors.text,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  height: 1.4,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            ExcludeSemantics(
                              child: Icon(
                                active
                                    ? Icons.check_circle_rounded
                                    : Icons.circle_outlined,
                                color: active
                                    ? context.colors.accent
                                    : context.colors.divider,
                                size: 22,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TripIcon extends StatelessWidget {
  const _TripIcon({required this.general});
  final bool general;

  @override
  Widget build(BuildContext context) => Container(
    width: 36,
    height: 36,
    decoration: BoxDecoration(
      color: context.colors.background,
      borderRadius: BorderRadius.circular(11),
    ),
    child: Icon(
      general ? Icons.account_balance_wallet_outlined : Icons.route_outlined,
      size: 20,
      color: context.colors.text,
    ),
  );
}
