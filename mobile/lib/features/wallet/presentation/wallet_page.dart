import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/wallet_repository.dart';
import 'wallet_editor.dart';
import 'wallet_pocket.dart';

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
  late Stream<List<WalletEntry>> _entries = widget.repository.watch(widget.uid);
  late Stream<List<TravelPlanSummary>> _plans = widget.plansRepository
      .watchPlans(widget.uid);
  String _planId = 'general';
  String? _highlight;
  bool _busy = false;
  void _notice(String text) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
    }
  }

  Future<void> _edit([WalletEntry? entry, String? selectedPlanId]) async {
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
    if (id != null && mounted) {
      setState(() => _highlight = id);
      _notice('Cüzdanın kaydedildi.');
    }
  }

  Future<void> _remove(WalletEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Kayıt silinsin mi?'),
        content: Text(
          context.tr(
            '“{title}” web ve mobil cüzdanından kaldırılacak. Bu işlem geri alınamaz.',
            values: {'title': entry.title},
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Sil'),
          ),
        ],
      ),
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
                Icon(walletIcon(entry.category), color: AppColors.forest),
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
              const Text(
                'Rezervasyon / bilet kodu',
                style: TextStyle(color: AppColors.muted),
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
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(field.value),
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

  @override
  Widget build(BuildContext context) => StreamBuilder<List<TravelPlanSummary>>(
    stream: _plans,
    builder: (context, plans) => StreamBuilder<List<WalletEntry>>(
      stream: _entries,
      builder: (context, wallet) {
        final all = wallet.data ?? [];
        final trips = <String, String>{
          'general': 'Genel cüzdan',
          for (final p in plans.data ?? <TravelPlanSummary>[]) p.id: p.title,
          for (final e in all)
            if (!(plans.data ?? <TravelPlanSummary>[]).any(
                  (p) => p.id == e.planId,
                ) &&
                e.planId != 'general')
              e.planId: 'Arşivlenmiş seyahat',
        };
        final selected = trips.containsKey(_planId) ? _planId : 'general';
        final entries = sortedWalletEntries(
          all.where((e) => e.planId == selected),
        );
        final loading = wallet.connectionState == ConnectionState.waiting;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Text(
              'Seyahat cüzdanın',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Biletlerin, rezervasyonların ve yolculuk detayların bir arada.',
              style: TextStyle(color: AppColors.muted, height: 1.5),
            ),
            const SizedBox(height: 24),
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
                      ),
                    ),
                  )
                  .toList(),
              onChanged: _busy
                  ? null
                  : (v) => setState(() {
                      _planId = v!;
                      _highlight = null;
                    }),
            ),
            if (plans.hasError)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text(
                  'Seyahat listesi alınamadı. Genel cüzdanı kullanabilir veya tekrar deneyebilirsin.',
                ),
              ),
            const SizedBox(height: 28),
            if (loading)
              const SizedBox(
                height: 240,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (wallet.hasError) ...[
              const Text(
                'Cüzdan yüklenemedi. Bağlantını kontrol et. Yerel modda güncel Firestore kuralları yüklenmiş olmalı.',
              ),
              TextButton(
                onPressed: () => setState(() {
                  _entries = widget.repository.watch(widget.uid);
                  _plans = widget.plansRepository.watchPlans(widget.uid);
                }),
                child: const Text('Tekrar dene'),
              ),
            ] else ...[
              WalletPocket(
                entries: entries,
                city: trips[selected]!,
                onOpen: _busy ? (_) {} : _open,
                onAdd: () {
                  if (!_busy) _edit(null, selected);
                },
                highlightId: _highlight,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const ValueKey('wallet-add'),
                onPressed: _busy ? null : () => _edit(null, selected),
                icon: const Icon(Icons.add),
                label: const Text('Kayıt ekle'),
              ),
              const SizedBox(height: 28),
              Text(
                entries.isEmpty
                    ? 'İlk yolculuk detayını ekle'
                    : 'Tüm kayıtlar · ${entries.length}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              if (entries.isEmpty)
                const Text(
                  'Uçuşun, otelin veya etkinlik biletin hazır olduğunda buraya ekleyebilirsin.',
                  style: TextStyle(color: AppColors.muted, height: 1.5),
                ),
              for (final entry in entries)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Material(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    clipBehavior: Clip.antiAlias,
                    child: ListTile(
                      key: ValueKey('wallet-entry-${entry.id}'),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: CircleAvatar(
                        backgroundColor: walletCardColor(entry.category),
                        child: Icon(
                          walletIcon(entry.category),
                          color: AppColors.forest,
                        ),
                      ),
                      title: Text(
                        entry.title,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${walletCategories[entry.category]} · ${entry.date.isEmpty ? 'Tarih eklenmedi' : entry.date}${entry.details['time']?.isNotEmpty == true ? ' · ${entry.details['time']}' : ''}',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: _busy ? null : () => _open(entry),
                    ),
                  ),
                ),
              if (_busy) const LinearProgressIndicator(),
              const SizedBox(height: 24),
              const Text(
                'Yalnızca sana özel · Aynı hesapla webde ve telefonda',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ],
        );
      },
    ),
  );
}
