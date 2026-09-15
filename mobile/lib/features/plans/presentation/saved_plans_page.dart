import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';

import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../community/presentation/community_page.dart';
import '../../settings/data/settings_repository.dart';
import '../data/plan_management_repository.dart';
import '../data/travel_plans_repository.dart';
import 'saved_plan_card.dart';

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
        barrierColor: AppColors.text.withValues(alpha: 0.42),
        builder: (_) => _RenameDialog(
          plan: p,
          save: (name) => widget.management.rename(widget.uid, p, name),
        ),
      );
    } else if (action == 'delete') {
      if (!await confirmCommunity(
        context,
        '“${p.title}” silinsin mi?',
        'Plan hesabından silinir; varsa paylaşımı kaldırılır. Cüzdan kayıtların arşivlenmiş plan grubunda korunur. Plan silme geri alınamaz.',
        confirmLabel: 'Planı sil',
        icon: Icons.delete_outline_rounded,
        tone: AppDialogTone.destructive,
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
        confirmLabel: 'Bağlantı oluştur',
        icon: Icons.link_rounded,
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

  void _refresh() => setState(() {
    _plans = widget.repository.watchPlans(widget.uid);
  });

  void _clearFilters() => setState(() {
    _search.clear();
    _filter = PlanFilter.all;
  });

  @override
  Widget build(BuildContext context) => StreamBuilder<List<TravelPlanSummary>>(
    stream: _plans,
    builder: (context, snapshot) {
      final all = snapshot.data ?? <TravelPlanSummary>[];
      final ready = snapshot.hasData && !snapshot.hasError;
      final filtered = filterSavedPlans(
        all,
        _search.text,
        _filter,
        DateTime.now(),
        byTripDate: _byDate,
      );
      return ListView(
        key: const PageStorageKey('saved-plans'),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Planlarım',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
              ),
              IconButton(
                tooltip: context.tr('Planları yenile'),
                onPressed: _refresh,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            ready && all.isNotEmpty
                ? '${all.length} yolculuk, keşfedilecek yeni hikâyeler.'
                : 'Bir sonraki yolculuğuna buradan devam et.',
            style: TextStyle(color: context.colors.muted, height: 1.5),
          ),
          const SizedBox(height: 24),
          if (snapshot.hasError)
            _message(
              icon: Icons.cloud_off_outlined,
              title: 'Planlarına ulaşamadık',
              description: settingsError(snapshot.error!),
              action: 'Tekrar dene',
              onAction: _refresh,
            )
          else if (!snapshot.hasData)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 64),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (all.isEmpty)
            _message(
              icon: Icons.route_outlined,
              title: 'İlk rotana yer aç',
              description: 'Keşfetmek istediğin şehri seç, ilk rotanı birlikte oluşturalım.',
              action: 'İlk planımı oluştur',
              onAction: widget.onCreate,
            )
          else ...[
            TextField(
              key: const ValueKey('saved-plans-search'),
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search_rounded),
                hintText: context.tr('Şehir veya plan adı ara'),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: context.tr('Aramayı temizle'),
                        onPressed: () => setState(() => _search.clear()),
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
            const SizedBox(height: 14),
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
                        key: ValueKey('plan-filter-${value.name}'),
                        label: Text(title),
                        labelStyle: TextStyle(
                          fontFamily: AppTypography.body,
                          color: _filter == value
                              ? Colors.white
                              : context.colors.text,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        selectedColor: AppColors.forest,
                        backgroundColor: context.colors.surface,
                        showCheckmark: false,
                        selected: _filter == value,
                        onSelected: (_) => setState(() => _filter = value),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              children: [
                Text(
                  '${filtered.length} plan',
                  style: TextStyle(color: context.colors.muted, fontSize: 12),
                ),
                TextButton.icon(
                  onPressed: () => setState(() => _byDate = !_byDate),
                  icon: const Icon(Icons.sort_rounded, size: 18),
                  label: Text(
                    _byDate ? 'Seyahat tarihine göre' : 'En yeni kayıtlar',
                    style: const TextStyle(
                      fontFamily: AppTypography.body,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (filtered.isEmpty)
              _message(
                icon: _filter == PlanFilter.favorites && _search.text.isEmpty
                    ? Icons.star_outline_rounded
                    : Icons.search_off_rounded,
                title: _filter == PlanFilter.favorites && _search.text.isEmpty
                    ? 'Favorilerin burada toplanır'
                    : 'Eşleşen plan bulunamadı',
                description:
                    _filter == PlanFilter.favorites && _search.text.isEmpty
                    ? 'Bir planın yıldızına dokunarak onu favorilerine ekleyebilirsin.'
                    : 'Başka bir şehir veya plan adı dene; filtrelerini de temizleyebilirsin.',
                action: 'Tüm planları göster',
                onAction: _clearFilters,
              )
            else
              for (final p in filtered)
                SavedPlanCard(
                  key: ValueKey(p.id),
                  plan: p,
                  busy: _busy.contains(p.id),
                  onOpen: () => widget.onOpen(p),
                  onFavorite: () => _run(
                    p,
                    () => widget.management.favorite(
                      widget.uid,
                      p.id,
                      !p.isFavorite,
                    ),
                  ),
                  onAction: (value) => _action(p, value),
                ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: widget.onCreate,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Yeni yolculuk planla'),
            ),
          ],
        ],
      );
    },
  );

  Widget _message({
    required IconData icon,
    required String title,
    required String description,
    required String action,
    required VoidCallback onAction,
  }) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(28),
      border: Border.all(color: context.colors.divider),
    ),
    child: Column(
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: context.colors.tone(const Color(0xFFEAF0E8)),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: context.colors.forest, size: 32),
        ),
        const SizedBox(height: 22),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Text(
          description,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: context.colors.muted,
            height: 1.6,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(onPressed: onAction, child: Text(action)),
      ],
    ),
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
    child: AppDialog(
      title: 'Planın adı',
      icon: Icons.edit_outlined,
      confirmLabel: _busy ? 'Kaydediliyor…' : 'Kaydet',
      cancelLabel: 'Vazgeç',
      busy: _busy,
      onConfirm: _busy ? null : _save,
      onCancel: _busy ? null : () => Navigator.pop(context),
      content: TextField(
        controller: _name,
        enabled: !_busy,
        maxLength: 100,
        decoration: InputDecoration(
          labelText: context.tr('Plan adı'),
          errorText: _error == null ? null : context.tr(_error!),
        ),
      ),
    ),
  );
}
