import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../plans/data/plan_detail.dart';
import '../../plans/presentation/plan_route_map.dart';
import '../data/community_repository.dart';
import 'community_page.dart';

/// Public plans are read-only. No private-plan repository or wallet is exposed.
class CommunityPlanPage extends StatefulWidget {
  const CommunityPlanPage({
    super.key,
    required this.uid,
    required this.id,
    required this.repository,
  });
  final String uid, id;
  final CommunityRepository repository;
  @override
  State<CommunityPlanPage> createState() => _CommunityPlanPageState();
}

class _CommunityPlanPageState extends State<CommunityPlanPage> {
  late final _plan = widget.repository.plan(widget.id);
  int _day = 0, _tab = 0;
  bool _busy = false;
  int? _myRating;
  Future<void> _rate(int rating) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await widget.repository.rate(widget.id, rating);
      if (mounted) {
        setState(() => _myRating = rating);
        communityNotice(context, 'Değerlendirmen kaydedildi.');
      }
    } catch (e) {
      if (mounted) communityNotice(context, communityError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _directions(PlanStop stop, String destination) async {
    try {
      if (!await launchUrl(
        stop.directions(destination),
        mode: LaunchMode.externalApplication,
      )) {
        throw StateError('url');
      }
    } catch (_) {
      if (mounted) communityNotice(context, 'Yol tarifi açılamadı.');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Topluluk rotası')),
    body: StreamBuilder<CommunityPlan?>(
      stream: _plan,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return CommunityStatus(message: communityError(snapshot.error!));
        }
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CommunityLoading();
        }
        final plan = snapshot.data;
        if (plan == null) {
          return const CommunityStatus(
            message: 'Bu paylaşım kaldırılmış veya artık bulunamıyor.',
          );
        }
        final days = plan.summary.days;
        final selected = days.isEmpty
            ? null
            : days[_day.clamp(0, days.length - 1)];
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              plan.destination,
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            TextButton.icon(
              onPressed: plan.profilePublic
                  ? () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => TravelerPage(
                          uid: widget.uid,
                          target: plan.owner,
                          repository: widget.repository,
                        ),
                      ),
                    )
                  : null,
              icon: const Icon(Icons.account_circle_outlined),
              label: Text(plan.author),
            ),
            Text(
              '${days.length} gün · ${plan.summary.activityCount} durak · ${plan.summary.currencySymbol}${plan.summary.estimatedCost.toStringAsFixed(0)} tahmini',
            ),
            const SizedBox(height: 14),
            Text(
              plan.data['planData'] is Map
                  ? planMap(plan.data['planData'])['overallSummary']
                            as String? ??
                        ''
                  : '',
            ),
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (i, title) in [
                    'Günlük plan',
                    'Harita',
                    'Rehber',
                    'Tercihler',
                  ].indexed)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(title),
                        selected: _tab == i,
                        onSelected: (_) => setState(() => _tab = i),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_tab <= 1) ...[
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final day in days)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${day.index + 1}. Gün'),
                          selected: selected?.index == day.index,
                          onSelected: (_) => setState(() => _day = day.index),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (selected == null)
                const CommunityStatus(
                  message: 'Bu planda günlük rota bulunamadı.',
                )
              else if (_tab == 1)
                SizedBox(
                  height: 520,
                  child: PlanRouteMap(
                    day: selected,
                    destination: plan.destination,
                    onDirections: (s) => _directions(s, plan.destination),
                  ),
                )
              else ...[
                Text(
                  selected.summary,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 18),
                for (final stop in selected.stops)
                  CommunityPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${stop.index + 1} · ${stop.period}',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          stop.name,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(stop.description),
                        const SizedBox(height: 12),
                        Text(
                          '${plan.summary.currencySymbol}${stop.estimated.toStringAsFixed(0)} tahmini',
                        ),
                        TextButton.icon(
                          onPressed: () => _directions(stop, plan.destination),
                          icon: const Icon(Icons.directions_outlined),
                          label: const Text('Yol tarifi'),
                        ),
                      ],
                    ),
                  ),
              ],
            ] else if (_tab == 2) ...[
              for (final (key, title) in [
                ('transportationTips', 'Ulaşım'),
                ('localCustoms', 'Yerel kültür'),
                ('generalAdvice', 'Gezgin notları'),
              ])
                CommunityPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        planMap(
                                  planMap(plan.data['planData'])['cityGuide'],
                                )[key]
                                as String? ??
                            'Bu plan için rehber bilgisi yok.',
                      ),
                    ],
                  ),
                ),
            ] else ...[
              for (final (key, title) in [
                ('travelType', 'Yolculuk türü'),
                ('peopleCount', 'Kişi sayısı'),
                ('pace', 'Tempo'),
                ('tripPurpose', 'Seyahat amacı'),
                ('transport', 'Ulaşım tercihi'),
                ('accommodation', 'Konaklama türü'),
              ])
                if (plan.data[key] != null &&
                    plan.data[key].toString().isNotEmpty)
                  CommunityPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        Text(communityPreference(plan.data[key])),
                      ],
                    ),
                  ),
            ],
            const SizedBox(height: 20),
            CommunityPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '★ ${plan.rating.toStringAsFixed(1)} · ${plan.ratingCount} değerlendirme',
                  ),
                  if (plan.owner != widget.uid) ...[
                    const SizedBox(height: 10),
                    const Text('Bu rotayı nasıl buldun?'),
                    Wrap(
                      children: [
                        for (var i = 1; i <= 5; i++)
                          IconButton(
                            tooltip: '$i yıldız ver',
                            onPressed: _busy ? null : () => _rate(i),
                            icon: Icon(
                              i <= (_myRating ?? 0)
                                  ? Icons.star_rounded
                                  : Icons.star_outline_rounded,
                            ),
                          ),
                      ],
                    ),
                    const Text(
                      'Yeni bir puan seçersen önceki değerlendirmen güncellenir.',
                    ),
                  ],
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
}
