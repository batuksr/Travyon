import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';

import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/wallet_repository.dart';
import 'wallet_editor.dart';
import 'wallet_pocket.dart';
import 'wallet_design.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({
    super.key,
    required this.uid,
    required this.repository,
    required this.plansRepository,
  });
  final String uid;
  final WalletRepository repository;
  final TravelPlansRepository plansRepository;
  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  final GlobalKey _recordsKey = GlobalKey();
  late Stream<List<WalletEntry>> _entries = widget.repository.watch(widget.uid);
  late Stream<List<TravelPlanSummary>> _plans = widget.plansRepository
      .watchPlans(widget.uid);
  String _planId = 'general';
  String? _highlight;
  String? _category;
  bool _busy = false;
  bool _editing = false;

  @override
  void didUpdateWidget(covariant WalletPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.repository != widget.repository ||
        oldWidget.plansRepository != widget.plansRepository) {
      _entries = widget.repository.watch(widget.uid);
      _plans = widget.plansRepository.watchPlans(widget.uid);
      _planId = 'general';
      _category = _highlight = null;
    }
  }

  void _notice(String text) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
    }
  }

  Future<void> _edit([WalletEntry? entry, String? selectedPlanId]) async {
    if (_editing || _busy) return;
    _editing = true;
    final uid = widget.uid;
    try {
      final id = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (_) => WalletEditor(
            uid: widget.uid,
            planId: selectedPlanId ?? _planId,
            entry: entry,
            repository: widget.repository,
          ),
        ),
      );
      if (id != null && mounted && widget.uid == uid) {
        setState(() {
          _highlight = id;
          _category = null;
        });
        _notice('Cüzdanın kaydedildi.');
      }
    } finally {
      _editing = false;
    }
  }

  Future<void> _remove(WalletEntry entry) async {
    final confirmed = await showAppConfirmation(
      context,
      title: 'Kayıt silinsin mi?',
      message: context.tr(
        '“{title}” cüzdanından kaldırılacak. Bu işlem geri alınamaz.',
        values: {'title': entry.title},
      ),
      confirmLabel: 'Sil',
      icon: Icons.delete_outline_rounded,
      tone: AppDialogTone.destructive,
    );
    if (confirmed != true || !mounted || _busy) return;
    setState(() => _busy = true);
    try {
      await widget.repository.remove(widget.uid, entry.id);
      _notice('Kayıt silindi.');
    } catch (_) {
      _notice('Silinemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _open(WalletEntry entry) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (c) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .65,
        minChildSize: .35,
        maxChildSize: .94,
        builder: (c, scroll) => ListView(
          key: const ValueKey('wallet-details-list'),
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 30),
          children: [
            Row(
              children: [
                Icon(walletIcon(entry.category), color: context.colors.forest),
                const SizedBox(width: 12),
                Expanded(child: Text(walletCategories[entry.category]!)),
                IconButton(
                  tooltip: context.tr('Kapat'),
                  onPressed: () => Navigator.pop(c),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SelectableText(
              entry.title,
              style: Theme.of(c).textTheme.headlineMedium,
            ),
            const SizedBox(height: 20),
            if (entry.reference.isNotEmpty) ...[
              Text(
                'Rezervasyon / bilet kodu',
                style: TextStyle(color: context.colors.muted),
              ),
              Row(
                children: [
                  Expanded(
                    child: SelectableText(
                      entry.reference,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: context.tr('Kodu kopyala'),
                    onPressed: () async {
                      try {
                        await Clipboard.setData(
                          ClipboardData(text: entry.reference),
                        );
                        _notice('Kod kopyalandı.');
                      } catch (_) {
                        _notice('Kod kopyalanamadı.');
                      }
                    },
                    icon: const Icon(Icons.copy),
                  ),
                ],
              ),
            ],
            for (final field in {
              'Tarih': entry.date,
              for (final e in entry.details.entries)
                (walletFields[entry.category]?[e.key] ?? e.key): e.value,
              'Not': entry.note,
            }.entries)
              if (field.value.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        field.key,
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        field.key == 'Tarih' ||
                                walletDateFields.any(
                                  (key) =>
                                      walletFields[entry.category]?[key] ==
                                      field.key,
                                )
                            ? walletDisplayDate(c, field.value)
                            : field.value,
                      ),
                    ],
                  ),
                ),
            if (entry.url.isNotEmpty && walletUrl(entry.url) != null)
              OutlinedButton.icon(
                onPressed: () async {
                  try {
                    if (!await launchUrl(
                      Uri.parse(walletUrl(entry.url)!),
                      mode: LaunchMode.externalApplication,
                    )) {
                      _notice('Bağlantı açılamadı.');
                    }
                  } catch (_) {
                    _notice('Bağlantı açılamadı.');
                  }
                },
                icon: const Icon(Icons.open_in_new),
                label: const Text('Bağlantıyı aç'),
              ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => Navigator.pop(c, 'edit'),
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Düzenle'),
            ),
            TextButton.icon(
              onPressed: () => Navigator.pop(c, 'delete'),
              style: TextButton.styleFrom(
                foregroundColor: context.colors.danger,
              ),
              icon: const Icon(Icons.delete_outline),
              label: const Text('Kaydı sil'),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    if (action == 'edit') await _edit(entry);
    if (action == 'delete') await _remove(entry);
  }

  Widget _walletStatus(int count, String selectedPlanId) {
    final leading = count == 0
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: context.colors.forest,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  walletRecordCount(context, count),
                  style: TextStyle(color: context.colors.muted, fontSize: 12),
                ),
              ),
            ],
          )
        : TextButton.icon(
            key: const ValueKey('wallet-view-items'),
            onPressed: () {
              final recordsContext = _recordsKey.currentContext;
              if (recordsContext != null) {
                Scrollable.ensureVisible(
                  recordsContext,
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  alignment: .08,
                );
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: context.colors.forest,
              padding: const EdgeInsets.symmetric(horizontal: 2),
              textStyle: const TextStyle(
                fontFamily: AppTypography.body,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            icon: const Icon(Icons.view_agenda_outlined, size: 17),
            label: Text(
              context.tr('Kartlar ({count})', values: {'count': count}),
            ),
          );
    final add = TextButton.icon(
      key: const ValueKey('wallet-add'),
      onPressed: _busy ? null : () => _edit(null, selectedPlanId),
      style: TextButton.styleFrom(
        foregroundColor: context.colors.accent,
        textStyle: const TextStyle(
          fontFamily: AppTypography.body,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
      icon: const Icon(Icons.add_rounded, size: 19),
      label: Text(context.tr('Kart ekle')),
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        final largeText = MediaQuery.textScalerOf(context).scale(13) > 18;
        if (largeText || constraints.maxWidth < 340) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              leading,
              Align(alignment: Alignment.centerRight, child: add),
            ],
          );
        }
        return Row(children: [leading, const Spacer(), add]);
      },
    );
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<List<TravelPlanSummary>>(
    key: ValueKey(widget.uid),
    stream: _plans,
    builder: (context, plans) => StreamBuilder<List<WalletEntry>>(
      stream: _entries,
      builder: (context, wallet) {
        final all = wallet.data ?? <WalletEntry>[];
        final trips = <String, String>{
          'general': context.tr('Genel cüzdan'),
          for (final p in plans.data ?? <TravelPlanSummary>[]) p.id: p.title,
          for (final e in all)
            if (!(plans.data ?? <TravelPlanSummary>[]).any(
                  (p) => p.id == e.planId,
                ) &&
                e.planId != 'general')
              e.planId: context.tr('Arşivlenmiş seyahat'),
        };
        final selected = trips.containsKey(_planId) ? _planId : 'general';
        final entries = sortedWalletEntries(
          all.where((e) => e.planId == selected),
        );
        final category = entries.any((e) => e.category == _category)
            ? _category
            : null;
        final filtered = category == null
            ? entries
            : entries.where((e) => e.category == category).toList();
        final loading = wallet.connectionState == ConnectionState.waiting;
        return ListView(
          key: PageStorageKey('wallet-scroll-${widget.uid}'),
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
          children: [
            _WalletIntro(hasEntries: entries.isNotEmpty),
            const SizedBox(height: 22),
            if (trips.length > 1) ...[
              DropdownButtonFormField<String>(
                key: ValueKey('wallet-trip-$selected-${trips.keys.join()}'),
                initialValue: selected,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: context.tr('Seyahatin'),
                  prefixIcon: const Icon(Icons.route_outlined),
                ),
                items: trips.entries
                    .map(
                      (e) => DropdownMenuItem(
                        value: e.key,
                        child: Text(
                          e.value,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: AppTypography.body,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _busy
                    ? null
                    : (value) {
                        if (value != null) {
                          setState(() {
                            _planId = value;
                            _highlight = _category = null;
                          });
                        }
                      },
              ),
              const SizedBox(height: 24),
            ],
            if (plans.hasError) ...[
              WalletLoadError(
                key: const ValueKey('wallet-plans-error'),
                message: 'Seyahat listesi alınamadı. Mevcut cüzdan kayıtlarını kullanabilirsin.',
                onRetry: () => setState(() {
                  _plans = widget.plansRepository.watchPlans(widget.uid);
                }),
              ),
              const SizedBox(height: 16),
            ],
            if (wallet.hasError)
              WalletLoadError(
                key: const ValueKey('wallet-load-error'),
                message:
                    'Cüzdan yüklenemedi. Bağlantını kontrol edip tekrar dene.',
                onRetry: () => setState(() {
                  _entries = widget.repository.watch(widget.uid);
                }),
              )
            else if (loading)
              const SizedBox(
                height: 220,
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              if (entries.isEmpty) ...[
                const WalletEmptyGuide(),
                const SizedBox(height: 22),
              ],
              WalletPocket(
                entries: entries,
                city: trips[selected]!,
                onOpen: _busy ? null : _open,
                onAdd: _busy ? null : () => _edit(null, selected),
                highlightId: _highlight,
              ),
              const SizedBox(height: 6),
              _walletStatus(entries.length, selected),
              if (entries.isEmpty) ...[
                const SizedBox(height: 4),
                Center(
                  child: Text(
                    context.tr('İlk kartın için cüzdanında yer hazır.'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: context.colors.muted,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ),
              ] else ...[
                const SizedBox(height: 22),
                Row(
                  key: _recordsKey,
                  children: [
                    Expanded(
                      child: Text(
                        'Kayıtların',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      walletRecordCount(context, filtered.length),
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (entries.map((e) => e.category).toSet().length > 1) ...[
                  WalletCategories(
                    entries: entries,
                    selected: category,
                    onSelect: (value) => setState(() => _category = value),
                  ),
                  const SizedBox(height: 14),
                ],
                for (final entry in filtered)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: WalletRecordCard(
                      entry: entry,
                      highlight: entry.id == _highlight,
                      onOpen: _busy ? null : () => _open(entry),
                    ),
                  ),
              ],
              if (_busy) const LinearProgressIndicator(),
            ],
          ],
        );
      },
    ),
  );
}

class _WalletIntro extends StatelessWidget {
  const _WalletIntro({required this.hasEntries});

  final bool hasEntries;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const TravyonIconBadge(
        icon: Icons.account_balance_wallet_outlined,
        size: 46,
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cüzdan', style: Theme.of(context).textTheme.headlineLarge),
            if (hasEntries) ...[
              const SizedBox(height: 5),
              Text(
                'Bilet ve rezervasyonların, elinin altında.',
                style: TextStyle(
                  color: context.colors.muted,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    ],
  );
}
