import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/community_repository.dart';
import 'community_plan_page.dart';
import 'community_design.dart';

class CommunityPage extends StatefulWidget {
  const CommunityPage({
    super.key,
    required this.uid,
    required this.repository,
    required this.plansRepository,
  });
  final String uid;
  final CommunityRepository repository;
  final TravelPlansRepository plansRepository;
  @override
  State<CommunityPage> createState() => _CommunityPageState();
}

class _CommunityPageState extends State<CommunityPage> {
  late var _feed = widget.repository.feed();
  late var _following = widget.repository.following(widget.uid);
  late var _own = widget.repository.sharedBy(widget.uid, own: true);
  late var _saved = widget.plansRepository.watchPlans(widget.uid);
  int _tab = 0;
  String _query = '';
  bool _busy = false;
  final _search = TextEditingController();

  void _selectTab(int tab) => setState(() {
    _tab = tab;
    _query = '';
    _search.clear();
  });

  void _refresh() => setState(() {
    _feed = widget.repository.feed();
    _following = widget.repository.following(widget.uid);
    _own = widget.repository.sharedBy(widget.uid, own: true);
    _saved = widget.plansRepository.watchPlans(widget.uid);
  });

  void _clearSearch() => setState(() {
    _query = '';
    _search.clear();
  });
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _share(String id, bool remove) async {
    if (_busy) return;
    final yes = await confirmCommunity(
      context,
      remove ? 'Paylaşımı kaldır?' : 'Planını toplulukla paylaş?',
      remove
          ? 'Planın topluluktan kaldırılır. Kendi kayıtlı planın ve cüzdanın korunur.'
          : 'Rotan, tarihlerin ve seyahat tercihlerin herkese açık olur. Cüzdan kayıtların, kişisel notların ve gerçek harcamaların paylaşılmaz.',
    );
    if (!yes || !mounted) return;
    setState(() => _busy = true);
    try {
      if (remove) {
        await widget.repository.unshare(id);
      } else {
        await widget.repository.share(widget.uid, id);
      }
      if (mounted) {
        communityNotice(
          context,
          remove ? 'Paylaşım kaldırıldı.' : 'Planın toplulukta!',
        );
      }
    } catch (e) {
      if (mounted) communityNotice(context, communityError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _profile(String uid) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => TravelerPage(
        uid: widget.uid,
        target: uid,
        repository: widget.repository,
      ),
    ),
  );
  void _open(CommunityPlan plan) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CommunityPlanPage(
        uid: widget.uid,
        id: plan.id,
        repository: widget.repository,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => ListView(
    key: const PageStorageKey('community-feed'),
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
    children: [
      Row(
        children: [
          Expanded(
            child: Text(
              'Topluluk',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
          ),
          IconButton(
            tooltip: context.tr('Topluluğu yenile'),
            onPressed: _busy ? null : _refresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            tooltip: context.tr('Topluluk gizliliği'),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => CommunityPrivacyPage(
                  uid: widget.uid,
                  repository: widget.repository,
                ),
              ),
            ),
            icon: const Icon(Icons.tune_rounded),
          ),
        ],
      ),
      const SizedBox(height: 4),
      const Text(
        'Yeni rotalar keşfet, kendi hikâyeni paylaş.',
        style: TextStyle(color: AppColors.muted, fontSize: 14, height: 1.5),
      ),
      const SizedBox(height: 20),
      TextField(
        controller: _search,
        onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search),
          hintText: context.tr('Şehir veya gezgin ara'),
          suffixIcon: _query.isEmpty
              ? null
              : IconButton(
                  tooltip: context.tr('Aramayı temizle'),
                  onPressed: _clearSearch,
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
        ),
      ),
      const SizedBox(height: 16),
      CommunityTabs(selected: _tab, onSelect: _selectTab),
      const SizedBox(height: 24),
      if (_tab == 3) ...[
        const Text(
          'Paylaşmak istediğin kayıtlı planı seç. Değiştirdiğin bir planı yeniden paylaşarak güncelleyebilirsin.',
        ),
        const SizedBox(height: 14),
        StreamBuilder<List<CommunityPlan>>(
          stream: _own,
          builder: (context, shared) {
            if (shared.hasError) {
              return CommunityStatus(message: communityError(shared.error!));
            }
            if (!shared.hasData) return const CommunityLoading();
            return StreamBuilder<List<TravelPlanSummary>>(
              stream: _saved,
              builder: (context, saved) {
                if (saved.hasError) {
                  return CommunityStatus(message: communityError(saved.error!));
                }
                if (!saved.hasData) return const CommunityLoading();
                final published = {for (final p in shared.data!) p.id: p};
                final titles = {for (final p in saved.data!) p.id: p.title};
                final ids = {...titles.keys, ...published.keys}.where(
                  (id) => (titles[id] ?? published[id]!.destination)
                      .toLowerCase()
                      .contains(_query),
                );
                if (ids.isEmpty) {
                  return CommunityEmptyState(
                    title: _query.isEmpty
                        ? 'Hikâyen burada başlasın'
                        : 'Eşleşen plan bulunamadı',
                    icon: Icons.bookmarks_outlined,
                    message: _query.isEmpty
                        ? 'Henüz plan yok. Planlar sekmesinden ilk rotanı oluştur.'
                        : 'Başka bir şehir veya plan adı dene; filtrelerini de temizleyebilirsin.',
                    actionLabel: _query.isEmpty ? null : 'Aramayı temizle',
                    onAction: _query.isEmpty ? null : _clearSearch,
                  );
                }
                return Column(
                  children: [
                    for (final id in ids)
                      CommunityPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              titles[id] ?? published[id]!.destination,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            Text(
                              published[id] == null
                                  ? 'Yalnızca sende'
                                  : published[id]!.visible
                                  ? 'Toplulukta paylaşılıyor'
                                  : 'Bağlantıya özel',
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              children: [
                                if (titles.containsKey(id))
                                  TextButton.icon(
                                    onPressed: _busy
                                        ? null
                                        : () => _share(id, false),
                                    icon: const Icon(Icons.public),
                                    label: Text(
                                      published[id] == null
                                          ? 'Paylaş'
                                          : 'Yeniden paylaş',
                                    ),
                                  ),
                                if (published.containsKey(id))
                                  TextButton(
                                    onPressed: _busy
                                        ? null
                                        : () => _share(id, true),
                                    child: const Text('Paylaşımı kaldır'),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            );
          },
        ),
      ] else if (_tab == 1)
        StreamBuilder<Set<String>>(
          stream: _following,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return CommunityStatus(message: communityError(snapshot.error!));
            }
            if (!snapshot.hasData) return const CommunityLoading();
            if (snapshot.data!.isEmpty) {
              return CommunityEmptyState(
                title: 'Yol arkadaşlarını keşfet',
                icon: Icons.people_outline_rounded,
                message: 'Henüz kimseyi takip etmiyorsun. Bir rotanın gezgin kartından başlayabilirsin.',
                actionLabel: 'Rotaları keşfet',
                onAction: () => _selectTab(0),
              );
            }
            return _FollowingPeople(
              ids: snapshot.data!,
              repository: widget.repository,
              query: _query,
              onOpen: _profile,
            );
          },
        )
      else
        StreamBuilder<List<CommunityPlan>>(
          stream: _feed,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return CommunityStatus(message: communityError(snapshot.error!));
            }
            if (!snapshot.hasData) return const CommunityLoading();
            final plans = snapshot.data!
                .where(
                  (p) =>
                      p.owner != widget.uid &&
                      '${p.destination} ${p.author}'.toLowerCase().contains(
                        _query,
                      ) &&
                      (_tab != 2 || p.ratingCount > 0),
                )
                .toList();
            if (_tab == 2) {
              plans.sort((a, b) {
                final byRating = b.rating.compareTo(a.rating);
                return byRating == 0
                    ? b.ratingCount.compareTo(a.ratingCount)
                    : byRating;
              });
            }
            if (plans.isEmpty) {
              return CommunityEmptyState(
                title: _query.isNotEmpty
                    ? 'Aradığın rota henüz burada değil'
                    : _tab == 2
                    ? 'Yeni favoriler yolda'
                    : 'İlk ilham senden gelsin',
                icon: _query.isNotEmpty
                    ? Icons.search_rounded
                    : _tab == 2
                    ? Icons.star_outline_rounded
                    : Icons.route_rounded,
                message: _query.isNotEmpty
                    ? 'Farklı bir şehir veya gezgin adıyla tekrar dene.'
                    : _tab == 2
                    ? 'Puanlanan rotalar burada öne çıkar. Keşfettiğin rotaları değerlendirerek katkıda bulun.'
                    : 'Burada henüz rota yok. İlk ilhamı sen paylaşabilirsin.',
                actionLabel: _query.isNotEmpty
                    ? 'Aramayı temizle'
                    : _tab == 2
                    ? 'Rotaları keşfet'
                    : 'Planını paylaş',
                onAction: _query.isNotEmpty
                    ? _clearSearch
                    : () => _selectTab(_tab == 2 ? 0 : 3),
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _tab == 2
                      ? 'Son 50 paylaşım arasından en beğenilen rotalar'
                      : 'Gezginlerden en yeni rotalar',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                for (final plan in plans)
                  CommunityPlanCard(
                    plan: plan,
                    onOpen: () => _open(plan),
                    onProfile: plan.profilePublic
                        ? () => _profile(plan.owner)
                        : null,
                  ),
              ],
            );
          },
        ),
    ],
  );
}

class CommunityPlanCard extends StatelessWidget {
  const CommunityPlanCard({
    super.key,
    required this.plan,
    required this.onOpen,
    this.onProfile,
  });
  final CommunityPlan plan;
  final VoidCallback onOpen;
  final VoidCallback? onProfile;
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    key: ValueKey(plan.id),
    tween: Tween(begin: 0, end: 1),
    duration: const Duration(milliseconds: 280),
    builder: (context, value, child) => Opacity(
      opacity: MediaQuery.disableAnimationsOf(context) ? 1 : value,
      child: child,
    ),
    child: Container(
      margin: const EdgeInsets.only(bottom: 18),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Material(
            color: const Color(0xFFEAF0E9),
            child: InkWell(
              onTap: onOpen,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.route_rounded,
                          size: 22,
                          color: AppColors.forest,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            plan.purpose.isEmpty
                                ? 'Topluluk rotası'
                                : plan.purpose,
                            style: const TextStyle(
                              color: AppColors.forest,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.north_east_rounded,
                          size: 20,
                          color: AppColors.forest,
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      plan.destination,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  children: [
                    CommunityMetric(
                      icon: Icons.calendar_today_outlined,
                      label: '${plan.summary.dayCount} gün',
                    ),
                    CommunityMetric(
                      icon: Icons.place_outlined,
                      label: '${plan.summary.activityCount} durak',
                    ),
                    CommunityMetric(
                      icon: Icons.account_balance_wallet_outlined,
                      label:
                          '${plan.summary.currencySymbol}${plan.summary.estimatedCost.toStringAsFixed(0)} tahmini',
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(),
                ),
                Row(
                  children: [
                    Expanded(
                      child: TextButton.icon(
                        onPressed: onProfile,
                        style: TextButton.styleFrom(
                          alignment: Alignment.centerLeft,
                          padding: EdgeInsets.zero,
                          textStyle: const TextStyle(
                            fontFamily: AppTypography.body,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        icon: const CircleAvatar(
                          radius: 16,
                          backgroundColor: Color(0xFFF5E9DB),
                          child: Icon(
                            Icons.person_outline_rounded,
                            size: 20,
                            color: AppColors.accent,
                          ),
                        ),
                        label: Text(
                          plan.author,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppColors.text),
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  plan.ratingCount == 0
                      ? 'Henüz değerlendirme yok'
                      : '★ ${plan.rating.toStringAsFixed(1)} · ${plan.ratingCount} değerlendirme',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: onOpen,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                    label: const Text('Rotayı keşfet'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _FollowingPeople extends StatefulWidget {
  const _FollowingPeople({
    required this.ids,
    required this.repository,
    required this.query,
    required this.onOpen,
  });
  final Set<String> ids;
  final CommunityRepository repository;
  final String query;
  final ValueChanged<String> onOpen;
  @override
  State<_FollowingPeople> createState() => _FollowingPeopleState();
}

class _FollowingPeopleState extends State<_FollowingPeople> {
  late Future<List<TravelerProfile>> _profiles = _load();
  Future<List<TravelerProfile>> _load() =>
      Future.wait(widget.ids.map(widget.repository.profile));
  @override
  void didUpdateWidget(covariant _FollowingPeople oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ids.length != widget.ids.length ||
        !oldWidget.ids.containsAll(widget.ids)) {
      _profiles = _load();
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<TravelerProfile>>(
    future: _profiles,
    builder: (context, s) {
      if (s.hasError) {
        return CommunityStatus(
          message: communityError(s.error!),
          onRetry: () => setState(() {
            _profiles = _load();
          }),
        );
      }
      if (!s.hasData) return const CommunityLoading();
      final profiles = s.data!.where(
        (p) => p.name.toLowerCase().contains(widget.query),
      );
      if (profiles.isEmpty) {
        return const CommunityStatus(
          message: 'Aramana uygun gezgin bulunamadı.',
        );
      }
      return Column(
        children: [
          for (final p in profiles)
            CommunityPanel(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.account_circle_outlined, size: 36),
                title: Text(p.name),
                subtitle: Text(
                  p.visible
                      ? 'Gezgin kartını ve rotalarını aç'
                      : 'Profilini gizlemiş',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => widget.onOpen(p.uid),
              ),
            ),
        ],
      );
    },
  );
}

class TravelerPage extends StatefulWidget {
  const TravelerPage({
    super.key,
    required this.uid,
    required this.target,
    required this.repository,
  });
  final String uid, target;
  final CommunityRepository repository;
  @override
  State<TravelerPage> createState() => _TravelerPageState();
}

class _TravelerPageState extends State<TravelerPage> {
  late Future<TravelerProfile> _profile = widget.repository.profile(
    widget.target,
  );
  late final _following = widget.repository.following(widget.uid);
  late final _plans = widget.repository.sharedBy(widget.target);
  bool _busy = false;
  Future<void> _toggle(bool follows) async {
    if (follows &&
        !await confirmCommunity(
          context,
          'Takipten çık?',
          'Bu gezgin takip ettiklerin listesinden kaldırılacak.',
        )) {
      return;
    }
    if (!mounted || _busy) return;
    setState(() => _busy = true);
    try {
      await widget.repository.follow(widget.uid, widget.target, !follows);
    } catch (e) {
      if (mounted) communityNotice(context, communityError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Gezgin kartı')),
    body: FutureBuilder<TravelerProfile>(
      future: _profile,
      builder: (context, s) {
        if (s.hasError) {
          return CommunityStatus(
            message: communityError(s.error!),
            onRetry: () => setState(() {
              _profile = widget.repository.profile(widget.target);
            }),
          );
        }
        if (!s.hasData) return const CommunityLoading();
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.forest,
                borderRadius: BorderRadius.circular(28),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.explore_outlined,
                    color: Colors.white,
                    size: 42,
                  ),
                  const SizedBox(height: 22),
                  Text(
                    s.data!.name,
                    style: Theme.of(context).textTheme.headlineMedium
                        ?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    s.data!.visible
                        ? 'TRAVYON · GEZGİN KARTI'
                        : 'Bu profil herkese açık değil.',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            if (widget.uid != widget.target)
              StreamBuilder<Set<String>>(
                stream: _following,
                builder: (context, f) {
                  if (f.hasError) {
                    return CommunityStatus(message: communityError(f.error!));
                  }
                  final follows = f.data?.contains(widget.target) == true;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: OutlinedButton.icon(
                      onPressed:
                          !f.hasData || _busy || (!s.data!.visible && !follows)
                          ? null
                          : () => _toggle(follows),
                      icon: Icon(
                        follows
                            ? Icons.person_remove_outlined
                            : Icons.person_add_alt,
                      ),
                      label: Text(
                        _busy
                            ? 'İşleniyor…'
                            : follows
                            ? 'Takip ediliyor'
                            : 'Takip et',
                      ),
                    ),
                  );
                },
              ),
            if (s.data!.visible)
              StreamBuilder<List<CommunityPlan>>(
                stream: _plans,
                builder: (context, p) {
                  if (p.hasError) {
                    return CommunityStatus(message: communityError(p.error!));
                  }
                  if (!p.hasData) return const CommunityLoading();
                  if (p.data!.isEmpty) {
                    return const CommunityStatus(
                      message: 'Henüz herkese açık rota yok.',
                    );
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          '${p.data!.length} paylaşılan plan · ${p.data!.map((p) => p.destination).toSet().length} farklı şehir',
                        ),
                      ),
                      for (final plan in p.data!)
                        CommunityPlanCard(
                          plan: plan,
                          onOpen: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => CommunityPlanPage(
                                uid: widget.uid,
                                id: plan.id,
                                repository: widget.repository,
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
          ],
        );
      },
    ),
  );
}

class CommunityPrivacyPage extends StatefulWidget {
  const CommunityPrivacyPage({
    super.key,
    required this.uid,
    required this.repository,
  });
  final String uid;
  final CommunityRepository repository;
  @override
  State<CommunityPrivacyPage> createState() => _CommunityPrivacyPageState();
}

class _CommunityPrivacyPageState extends State<CommunityPrivacyPage> {
  Map<String, bool>? _values;
  Object? _error;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final values = await widget.repository.privacy(widget.uid);
      if (mounted) setState(() => _values = Map.of(values));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.repository.savePrivacy(_values!);
      if (mounted) {
        communityNotice(context, 'Gizlilik ayarların kaydedildi.');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Topluluk gizliliği')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Web ve mobilde aynı ayarlar kullanılır. Plan paylaşımını kapatmak mevcut paylaşımlarını bağlantıya özel yapar; bağlantıya sahip kişiler açabilir.',
        ),
        const SizedBox(height: 20),
        if (_error != null)
          CommunityStatus(
            message: communityError(_error!),
            onRetry: _values == null ? _load : null,
          ),
        if (_values == null && _error == null) const CommunityLoading(),
        if (_values != null) ...[
          for (final (key, title, subtitle) in [
            (
              'profilePublic',
              'Herkese açık profil',
              'Adın ve gezgin kartın toplulukta görünür.',
            ),
            (
              'plansPublic',
              'Plan paylaşımına izin ver',
              'Seçtiğin planları toplulukta paylaşabilirsin. Otomatik paylaşılmaz.',
            ),
            (
              'followPublic',
              'Herkes takip edebilir',
              'Gezginler seni onaysız takip edebilir.',
            ),
          ])
            CommunityPanel(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(title),
                subtitle: Text(subtitle),
                value: _values![key] == true,
                onChanged: _busy
                    ? null
                    : (v) => setState(() => _values![key] = v),
              ),
            ),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Kaydediliyor…' : 'Kaydet ve uygula'),
          ),
        ],
      ],
    ),
  );
}

class CommunityPanel extends StatelessWidget {
  const CommunityPanel({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: AppColors.divider),
    ),
    child: Material(color: Colors.transparent, child: child),
  );
}

class CommunityStatus extends StatelessWidget {
  const CommunityStatus({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      children: [
        const Icon(Icons.explore_outlined, size: 36, color: AppColors.forest),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
        if (onRetry != null)
          TextButton(onPressed: onRetry, child: const Text('Tekrar dene')),
      ],
    ),
  );
}

class CommunityLoading extends StatelessWidget {
  const CommunityLoading({super.key});
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(32),
    child: Center(child: CircularProgressIndicator()),
  );
}

void communityNotice(BuildContext context, String message) =>
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
Future<bool> confirmCommunity(
  BuildContext context,
  String title,
  String message,
) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    ) ??
    false;
