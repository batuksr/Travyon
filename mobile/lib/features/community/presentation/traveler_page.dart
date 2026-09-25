import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../data/community_repository.dart';
import 'community_design.dart';
import 'community_page.dart'
    show CommunityLoading, communityNotice, confirmCommunity;
import 'community_plan_page.dart';
import 'traveler_profile_widgets.dart';

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
  late Stream<Set<String>> _following = widget.repository.following(widget.uid);
  late Stream<List<CommunityPlan>> _plans = widget.repository.sharedBy(
    widget.target,
  );
  bool _busy = false, _confirming = false;
  int _generation = 0;

  @override
  void didUpdateWidget(covariant TravelerPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.target != widget.target ||
        oldWidget.repository != widget.repository) {
      _generation++;
      _busy = false;
      _confirming = false;
      _profile = widget.repository.profile(widget.target);
      _following = widget.repository.following(widget.uid);
      _plans = widget.repository.sharedBy(widget.target);
    }
  }

  Future<void> _toggle(bool follows) async {
    if (_busy || _confirming || widget.uid == widget.target) return;
    final generation = _generation;
    _confirming = true;
    try {
      if (follows &&
          !await confirmCommunity(
            context,
            'Takipten çık?',
            'Bu gezgin takip ettiklerin listesinden kaldırılacak.',
            confirmLabel: 'Takipten çık',
            icon: Icons.person_remove_outlined,
          )) {
        return;
      }
      if (!mounted || generation != _generation) return;
      setState(() => _busy = true);
      await widget.repository.follow(widget.uid, widget.target, !follows);
    } catch (error) {
      if (mounted && generation == _generation) {
        communityNotice(context, communityError(error));
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() {
          _busy = false;
          _confirming = false;
        });
      }
    }
  }

  Widget _followAction({bool private = false}) => StreamBuilder<Set<String>>(
    stream: _following,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.tr('Takip durumu alınamadı.'),
              style: TextStyle(color: context.colors.muted, fontSize: 12),
            ),
            TextButton.icon(
              key: const ValueKey('traveler-follow-retry'),
              onPressed: () => setState(
                () => _following = widget.repository.following(widget.uid),
              ),
              style: TextButton.styleFrom(foregroundColor: context.colors.text),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(context.tr('Tekrar dene')),
            ),
          ],
        );
      }
      final follows = snapshot.data?.contains(widget.target) == true;
      if (private && !follows) return const SizedBox.shrink();
      final waiting =
          snapshot.connectionState == ConnectionState.waiting ||
          !snapshot.hasData;
      return FilledButton.icon(
        key: const ValueKey('traveler-follow'),
        onPressed: waiting || _busy ? null : () => _toggle(follows),
        style: FilledButton.styleFrom(
          backgroundColor: follows
              ? context.colors.surface
              : context.colors.accent,
          foregroundColor: follows
              ? context.colors.text
              : context.colors.onAccent,
          disabledBackgroundColor: context.colors.surface,
          disabledForegroundColor: context.colors.muted,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          side: BorderSide(
            color: follows || waiting || _busy
                ? context.colors.divider
                : Colors.transparent,
          ),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(
            fontFamily: AppTypography.body,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        icon: _busy || waiting
            ? SizedBox(
                width: 17,
                height: 17,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: context.colors.muted,
                ),
              )
            : Icon(
                follows
                    ? Icons.person_outline_rounded
                    : Icons.person_add_alt_1_outlined,
                size: 19,
              ),
        label: Text(
          context.tr(
            _busy
                ? 'İşleniyor…'
                : waiting
                ? 'Yükleniyor…'
                : follows
                ? 'Takip ediliyor'
                : 'Takip et',
          ),
        ),
      );
    },
  );

  Widget _status(
    String title,
    String message,
    IconData icon, {
    VoidCallback? onRetry,
  }) => CommunityEmptyState(
    title: title,
    message: message,
    icon: icon,
    onAction: onRetry,
    actionLabel: onRetry == null ? null : 'Tekrar dene',
  );

  Widget _routes(TravelerProfile profile) => StreamBuilder<List<CommunityPlan>>(
    stream: _plans,
    builder: (context, snapshot) {
      final ready =
          !snapshot.hasError &&
          snapshot.connectionState != ConnectionState.waiting &&
          snapshot.hasData;
      final plans = ready ? snapshot.data! : <CommunityPlan>[];
      return ListView(
        key: PageStorageKey('traveler-${widget.target}'),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          TravelerProfileCard(
            profile: profile,
            stats: ready ? TravelerStats(plans) : null,
            followAction: widget.uid == widget.target ? null : _followAction(),
          ),
          const SizedBox(height: 28),
          Semantics(
            header: true,
            child: Text(
              context.tr('Paylaşılan rotalar'),
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontSize: 18, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 14),
          if (snapshot.hasError)
            _status(
              'Rotalar yüklenemedi',
              communityError(snapshot.error!),
              Icons.cloud_off_outlined,
              onRetry: () => setState(
                () => _plans = widget.repository.sharedBy(widget.target),
              ),
            )
          else if (!ready)
            const CommunityLoading()
          else if (plans.isEmpty)
            _status(
              'Henüz paylaşılan rota yok',
              'Bu gezginin paylaştığı rotalar burada yer alacak.',
              Icons.route_outlined,
            )
          else
            for (final plan in plans)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TravelerRouteCard(
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
              ),
        ],
      );
    },
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.tr('Gezgin profili'))),
    body: SafeArea(
      top: false,
      child: FutureBuilder<TravelerProfile>(
        future: _profile,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _status(
                'Profil yüklenemedi',
                communityError(snapshot.error!),
                Icons.cloud_off_outlined,
                onRetry: () => setState(() {
                  _profile = widget.repository.profile(widget.target);
                }),
              ),
            );
          }
          if (snapshot.connectionState == ConnectionState.waiting ||
              !snapshot.hasData) {
            return const CommunityLoading();
          }
          final profile = snapshot.data!;
          if (!profile.visible) {
            final exists = profile.data['exists'] == true;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _status(
                  exists ? 'Bu profil gizli' : 'Gezgin bulunamadı',
                  exists
                      ? 'Bu gezgin profilini topluluğa kapatmış.'
                      : 'Bu gezgin kartı artık kullanılamıyor.',
                  exists
                      ? Icons.lock_outline_rounded
                      : Icons.person_off_outlined,
                ),
                if (exists && widget.uid != widget.target) ...[
                  const SizedBox(height: 16),
                  _followAction(private: true),
                ],
              ],
            );
          }
          return _routes(profile);
        },
      ),
    ),
  );
}
