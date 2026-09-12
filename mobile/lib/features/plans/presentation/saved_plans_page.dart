import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../community/presentation/community_page.dart';
import '../../settings/data/settings_repository.dart';
import '../data/plan_management_repository.dart';
import '../data/travel_plans_repository.dart';

class SavedPlansPage extends StatefulWidget {
  const SavedPlansPage({
    super.key,
    required this.uid,
    required this.repository,
    required this.management,
    required this.onOpen,
    required this.onCreate,
  });
  final String uid;
  final TravelPlansRepository repository;
  final PlanManagementRepository management;
  final ValueChanged<TravelPlanSummary> onOpen;
  final VoidCallback onCreate;
  @override
  State<SavedPlansPage> createState() => _SavedPlansPageState();
}

class _SavedPlansPageState extends State<SavedPlansPage> {
  late var _plans = widget.repository.watchPlans(widget.uid);
  final _search = TextEditingController();
  PlanFilter _filter = PlanFilter.all;
  bool _byDate = false;
  final _busy = <String>{};
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _run(
    TravelPlanSummary plan,
    Future<void> Function() action,
  ) async {
    if (_busy.contains(plan.id)) return;
    setState(() => _busy.add(plan.id));
    try {
      await action();
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy.remove(plan.id));
    }
  }

  Future<void> _action(TravelPlanSummary p, String action) async {
    if (action == 'rename') {
      await showDialog<void>(
        context: context,
        builder: (_) => _RenameDialog(
          plan: p,
          save: (name) => widget.management.rename(widget.uid, p, name),
        ),
      );
    } else if (action == 'delete') {
      if (!await confirmCommunity(
        context,
        '“${p.title}” silinsin mi?',
        'Plan web ve mobil hesabından silinir; varsa paylaşımı kaldırılır. Cüzdan kayıtların arşivlenmiş plan grubunda korunur. Plan silme geri alınamaz.',
      )) {
        return;
      }
      if (!mounted) return;
      await _run(p, () async {
        await widget.management.delete(widget.uid, p.id);
        if (mounted) {
          communityNotice(context, 'Plan silindi. Cüzdan kayıtların korundu.');
        }
      });
    } else if (action == 'link') {
      if (!await confirmCommunity(
        context,
        'Plan bağlantısını oluştur?',
        'Bağlantıya sahip kişiler giriş yaparak paylaşılan rotayı görebilir. Cüzdan, kişisel notlar ve gerçek harcamalar aktarılmaz. Zaten toplulukta olan paylaşımın görünürlüğü değişmez.',
      )) {
        return;
      }
      if (!mounted) return;
      await _run(p, () async {
        final url = await widget.management.shareLink(widget.uid, p.id);
        await Clipboard.setData(ClipboardData(text: url.toString()));
        if (mounted) communityNotice(context, 'Plan bağlantısı kopyalandı.');
      });
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
    children: [
      Text(
        'Yolculuk arşivin',
        style: Theme.of(context).textTheme.labelLarge
            ?.copyWith(color: AppColors.accent),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: Text(
              'Planlarım',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
          ),
          IconButton(
            tooltip: 'Planları yenile',
            onPressed: () => setState(() {
              _plans = widget.repository.watchPlans(widget.uid);
            }),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      const SizedBox(height: 8),
      const Text('Rotanı aç, favorilerini sakla, sonraki keşfini planla.'),
      const SizedBox(height: 20),
      FilledButton.icon(
        onPressed: widget.onCreate,
        icon: const Icon(Icons.add),
        label: const Text('Yeni plan oluştur'),
      ),
      const SizedBox(height: 18),
      TextField(
        controller: _search,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.search),
          hintText: 'Şehir veya plan adı ara',
        ),
      ),
      const SizedBox(height: 12),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final (value, title) in [
              (PlanFilter.all, 'Tümü'),
              (PlanFilter.favorites, 'Favoriler'),
              (PlanFilter.upcoming, 'Yaklaşan / devam eden'),
              (PlanFilter.past, 'Geçmiş'),
            ])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(title),
                  selected: _filter == value,
                  onSelected: (_) => setState(() => _filter = value),
                ),
              ),
          ],
        ),
      ),
      Align(
        alignment: Alignment.centerRight,
        child: TextButton.icon(
          onPressed: () => setState(() => _byDate = !_byDate),
          icon: const Icon(Icons.sort),
          label: Text(_byDate ? 'Seyahat tarihine göre' : 'En yeni kayıtlar'),
        ),
      ),
      StreamBuilder<List<TravelPlanSummary>>(
        stream: _plans,
        builder: (context, s) {
          if (s.hasError) {
            return CommunityStatus(message: settingsError(s.error!));
          }
          if (!s.hasData) return const CommunityLoading();
          if (s.data!.isEmpty) {
            return const CommunityStatus(
              message: 'Henüz kayıtlı planın yok. İlk yolculuğunu oluşturarak başla.',
            );
          }
          final filtered = filterSavedPlans(
            s.data!,
            _search.text,
            _filter,
            DateTime.now(),
            byTripDate: _byDate,
          );
          if (filtered.isEmpty) {
            return const CommunityStatus(
              message: 'Bu arama veya filtreye uygun plan bulunamadı.',
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${filtered.length} plan'),
              const SizedBox(height: 12),
              for (final p in filtered)
                CommunityPanel(
                  key: ValueKey(p.id),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.forest,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Expanded(
                                  child: Icon(
                                    Icons.explore_outlined,
                                    color: Colors.white,
                                    size: 32,
                                  ),
                                ),
                                IconButton(
                                  tooltip: p.isFavorite
                                      ? 'Favorilerden çıkar'
                                      : 'Favorilere ekle',
                                  onPressed: _busy.contains(p.id)
                                      ? null
                                      : () => _run(
                                          p,
                                          () => widget.management.favorite(
                                            widget.uid,
                                            p.id,
                                            !p.isFavorite,
                                          ),
                                        ),
                                  icon: Icon(
                                    p.isFavorite
                                        ? Icons.star_rounded
                                        : Icons.star_outline_rounded,
                                    color: const Color(0xffffdda0),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            Text(
                              p.title,
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(color: Colors.white),
                            ),
                            if (p.title != p.destination)
                              Text(
                                p.destination,
                                style: const TextStyle(color: Colors.white70),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Chip(label: Text('${p.dayCount} gün')),
                          Chip(label: Text('${p.activityCount} durak')),
                          Chip(
                            label: Text(
                              '${p.currencySymbol}${p.estimatedCost.toStringAsFixed(0)} tahmini',
                            ),
                          ),
                        ],
                      ),
                      if (p.startDate.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text('${p.startDate} – ${p.endDate}'),
                        ),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _busy.contains(p.id)
                                  ? null
                                  : () => widget.onOpen(p),
                              icon: const Icon(Icons.route_outlined),
                              label: const Text('Planı aç'),
                            ),
                          ),
                          if (_busy.contains(p.id))
                            const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                            )
                          else
                            PopupMenuButton<String>(
                              tooltip: 'Plan işlemleri',
                              onSelected: (value) => _action(p, value),
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'rename',
                                  child: Text('Adını değiştir'),
                                ),
                                PopupMenuItem(
                                  value: 'link',
                                  child: Text('Bağlantıyı kopyala'),
                                ),
                                PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Planı sil'),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    ],
  );
}

class _RenameDialog extends StatefulWidget {
  const _RenameDialog({required this.plan, required this.save});
  final TravelPlanSummary plan;
  final Future<void> Function(String) save;
  @override
  State<_RenameDialog> createState() => _RenameDialogState();
}

class _RenameDialogState extends State<_RenameDialog> {
  late final _name = TextEditingController(text: widget.plan.title);
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Plan adına bir şey yaz.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.save(_name.text.trim());
      if (mounted) {
        setState(() => _busy = false);
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = settingsError(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: const Text('Planın adı'),
      content: TextField(
        controller: _name,
        enabled: !_busy,
        maxLength: 100,
        decoration: InputDecoration(labelText: 'Plan adı', errorText: _error),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Vazgeç'),
        ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Kaydediliyor…' : 'Kaydet'),
        ),
      ],
    ),
  );
}
