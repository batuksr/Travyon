import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../data/checklist_catalog.dart';
import '../data/checklist_repository.dart';

class TravelChecklistPanel extends StatefulWidget {
  const TravelChecklistPanel({
    super.key,
    required this.uid,
    required this.planId,
    required this.destination,
    required this.repository,
  });

  final String uid;
  final String planId;
  final String destination;
  final ChecklistRepository repository;

  @override
  State<TravelChecklistPanel> createState() => _TravelChecklistPanelState();
}

class _TravelChecklistPanelState extends State<TravelChecklistPanel> {
  late Stream<TravelChecklistState> _stream;
  final Set<String> _busyItems = {};
  final Set<String> _openGroups = {
    for (final group in travelChecklistGroups) group.id,
  };
  bool _resetting = false;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  @override
  void didUpdateWidget(covariant TravelChecklistPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.planId != widget.planId ||
        oldWidget.repository != widget.repository) {
      _connect();
    }
  }

  void _connect() {
    _stream = widget.repository.watch(widget.uid, widget.planId);
  }

  void _notice(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _toggle(String itemId, bool checked) async {
    if (_busyItems.contains(itemId) || _resetting) return;
    setState(() => _busyItems.add(itemId));
    try {
      await widget.repository.toggle(
        widget.uid,
        widget.planId,
        itemId,
        checked,
      );
    } catch (_) {
      _notice('Madde kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      if (mounted) setState(() => _busyItems.remove(itemId));
    }
  }

  Future<void> _reset(Set<String> checked) async {
    if (_resetting || checked.isEmpty) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Liste sıfırlansın mı?'),
        content: const Text(
          'Tamamlandı olarak işaretlediğin tüm hazırlıklar yeniden açılacak.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sıfırla'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _resetting = true);
    try {
      await widget.repository.reset(widget.uid, widget.planId);
      _notice('Hazırlık listesi sıfırlandı.');
    } catch (_) {
      _notice('Liste sıfırlanamadı. Bağlantını kontrol edip tekrar dene.');
    } finally {
      if (mounted) setState(() => _resetting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<TravelChecklistState>(
      stream: _stream,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _ChecklistStatus(
            icon: Icons.cloud_off_outlined,
            text: 'Hazırlık listesi yüklenemedi.',
            detail: 'Bağlantını kontrol edip yeniden deneyebilirsin.',
            onRetry: () => setState(_connect),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final state = snapshot.data!;
        final checked = state.checkedIds;
        final progress = travelChecklistTotal == 0
            ? 0
            : ((checked.length / travelChecklistTotal) * 100).round();
        return ListView(
          key: const PageStorageKey('travel-checklist'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            _ChecklistHero(
              destination: widget.destination,
              checked: checked.length,
              total: travelChecklistTotal,
              progress: progress,
            ),
            const SizedBox(height: 14),
            _ProgressCard(
              checked: checked.length,
              total: travelChecklistTotal,
              progress: progress,
              resetting: _resetting,
              onReset: checked.isEmpty ? null : () => _reset(checked),
            ),
            const SizedBox(height: 10),
            _SyncStatus(state: state),
            const SizedBox(height: 18),
            for (final group in travelChecklistGroups) ...[
              _ChecklistGroupCard(
                group: group,
                checked: checked,
                open: _openGroups.contains(group.id),
                busyItems: _busyItems,
                onToggleGroup: () => setState(() {
                  if (!_openGroups.add(group.id)) {
                    _openGroups.remove(group.id);
                  }
                }),
                onToggleItem: _toggle,
              ),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _ChecklistHero extends StatelessWidget {
  const _ChecklistHero({
    required this.destination,
    required this.checked,
    required this.total,
    required this.progress,
  });

  final String destination;
  final int checked;
  final int total;
  final int progress;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(22),
    decoration: BoxDecoration(
      color: AppColors.forest,
      borderRadius: BorderRadius.circular(26),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                destination.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFFD9E5DD),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                'Seyahat listesi',
                style: Theme.of(context).textTheme.headlineSmall
                    ?.copyWith(color: Colors.white, fontSize: 25),
              ),
              const SizedBox(height: 5),
              Text(
                '$checked / $total madde tamamlandı',
                style: const TextStyle(color: Color(0xFFD9E5DD)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 14),
        Semantics(
          label: context.tr(
            'Hazırlık ilerlemesi yüzde {progress}',
            values: {'progress': progress},
          ),
          child: Container(
            width: 76,
            height: 76,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: Text(
              '%$progress',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 21,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({
    required this.checked,
    required this.total,
    required this.progress,
    required this.resetting,
    required this.onReset,
  });

  final int checked;
  final int total;
  final int progress;
  final bool resetting;
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: AppColors.divider),
    ),
    child: Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                progress == 100 ? 'Hazırsın!' : '$checked / $total tamamlandı',
                style: const TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: resetting ? null : onReset,
              icon: resetting
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded, size: 17),
              label: const Text('Sıfırla'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 9,
            value: progress / 100,
            backgroundColor: const Color(0xFFECE5DA),
            color: progress == 100 ? const Color(0xFF39956A) : AppColors.accent,
          ),
        ),
      ],
    ),
  );
}

class _ChecklistGroupCard extends StatelessWidget {
  const _ChecklistGroupCard({
    required this.group,
    required this.checked,
    required this.open,
    required this.busyItems,
    required this.onToggleGroup,
    required this.onToggleItem,
  });

  final TravelChecklistGroup group;
  final Set<String> checked;
  final bool open;
  final Set<String> busyItems;
  final VoidCallback onToggleGroup;
  final Future<void> Function(String itemId, bool checked) onToggleItem;

  @override
  Widget build(BuildContext context) {
    final completed = group.items
        .where((item) => checked.contains(item.id))
        .length;
    final allDone = completed == group.items.length;
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: onToggleGroup,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 15),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.forest.withValues(alpha: 0.09),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _groupIcon(group.id),
                      size: 20,
                      color: AppColors.forest,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      group.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: allDone
                          ? const Color(0xFFE3F4EA)
                          : const Color(0xFFF2EADF),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '$completed/${group.items.length}',
                      style: TextStyle(
                        color: allDone
                            ? const Color(0xFF28734E)
                            : AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (open) const Divider(height: 1, color: AppColors.divider),
          if (open)
            for (var index = 0; index < group.items.length; index++) ...[
              _ChecklistRow(
                item: group.items[index],
                checked: checked.contains(group.items[index].id),
                busy: busyItems.contains(group.items[index].id),
                onTap: () => onToggleItem(
                  group.items[index].id,
                  !checked.contains(group.items[index].id),
                ),
              ),
              if (index < group.items.length - 1)
                const Divider(height: 1, indent: 54, color: AppColors.divider),
            ],
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({
    required this.item,
    required this.checked,
    required this.busy,
    required this.onTap,
  });

  final TravelChecklistItem item;
  final bool checked;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    checked: checked,
    excludeSemantics: true,
    label: context.tr(item.label),
    hint: checked ? context.tr('Tamamlandı') : context.tr(item.tip),
    child: InkWell(
      onTap: busy ? null : onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(17, 14, 17, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: busy
                  ? const SizedBox.square(
                      dimension: 21,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      checked
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      size: 22,
                      color: checked
                          ? const Color(0xFF39956A)
                          : AppColors.muted,
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label,
                    style: TextStyle(
                      color: checked ? AppColors.muted : AppColors.text,
                      fontWeight: FontWeight.w600,
                      decoration: checked ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (!checked) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.tip,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _SyncStatus extends StatelessWidget {
  const _SyncStatus({required this.state});

  final TravelChecklistState state;

  @override
  Widget build(BuildContext context) {
    final (icon, text, color) = state.hasPendingWrites
        ? (Icons.sync_rounded, 'Değişiklikler kaydediliyor', AppColors.muted)
        : state.fromCache
        ? (
            Icons.cloud_off_outlined,
            'Çevrimdışı · bağlantı gelince eşitlenecek',
            AppColors.accent,
          )
        : (
            Icons.cloud_done_outlined,
            'Web ve telefonla senkronize',
            AppColors.forest,
          );
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              text,
              textAlign: TextAlign.center,
              style: TextStyle(color: color, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChecklistStatus extends StatelessWidget {
  const _ChecklistStatus({
    required this.icon,
    required this.text,
    required this.detail,
    required this.onRetry,
  });

  final IconData icon;
  final String text;
  final String detail;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 38, color: AppColors.forest),
          const SizedBox(height: 14),
          Text(text, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(
            detail,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: onRetry, child: const Text('Tekrar dene')),
        ],
      ),
    ),
  );
}

IconData _groupIcon(String id) => switch (id) {
  'documents' => Icons.description_outlined,
  'money' => Icons.account_balance_wallet_outlined,
  'health' => Icons.health_and_safety_outlined,
  'tech' => Icons.charging_station_outlined,
  _ => Icons.luggage_outlined,
};
