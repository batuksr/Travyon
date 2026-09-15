import 'dart:math';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../community/data/community_repository.dart';
import '../../onboarding/data/onboarding_data.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/hub_content.dart';

/// Presentation-only home: navigation and Firebase ownership stay in the shell.
class HubHome extends StatelessWidget {
  const HubHome({
    super.key,
    required this.name,
    required this.plans,
    required this.community,
    required this.onCreate,
    required this.onOpen,
    required this.onPlans,
    required this.onCommunity,
    required this.onPublicPlan,
    this.now,
  });
  final String name;
  final AsyncSnapshot<List<TravelPlanSummary>> plans;
  final Stream<List<CommunityPlan>> community;
  final ValueChanged<OnboardingData?> onCreate;
  final ValueChanged<TravelPlanSummary> onOpen;
  final VoidCallback onPlans, onCommunity;
  final ValueChanged<String> onPublicPlan;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final today = now ?? DateTime.now();
    final featured = featuredHubPlan(plans.data ?? [], today);
    final weekend = weekendDraft(today);
    return ListView(
      key: const PageStorageKey('hub-home'),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
      children: [
        Text(
          'Merhaba, $name!',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Bir sonraki keşfin seni bekliyor.',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 24),
        if (plans.hasError)
          _PlanUnavailable(onPlans: onPlans, onCreate: () => onCreate(null))
        else if (plans.connectionState == ConnectionState.waiting &&
            !plans.hasData)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 45),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (featured == null)
          _WelcomeCard(onCreate: () => onCreate(null))
        else ...[
          _JourneyCard(
            plan: featured,
            now: today,
            onOpen: () => onOpen(featured),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            alignment: WrapAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: onPlans,
                icon: const Icon(Icons.bookmarks_outlined, size: 18),
                label: Text('Tüm planların (${plans.data!.length})'),
              ),
              TextButton.icon(
                onPressed: () => onCreate(null),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Yeni plan'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 28),
        Text(
          'Nereye gitmek istersin?',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 6),
        Text(
          'Bir şehir seç, gerisini birlikte planlayalım.',
          style: TextStyle(color: context.colors.muted, height: 1.5),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height:
              182 +
              MediaQuery.textScalerOf(context).scale(20) * 1.5 +
              MediaQuery.textScalerOf(context).scale(12) * 1.5 +
              MediaQuery.textScalerOf(context).scale(11) * 2.6,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: hubCities.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final city = hubCities[index];
              return _CityCard(
                city: city,
                onTap: () => onCreate(
                  OnboardingData()
                    ..destination = city.destinationFor(context.l10n.isEnglish),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 28),
        Text(
          'Küçük bir kaçamak?',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked =
                constraints.maxWidth < 330 ||
                MediaQuery.textScalerOf(context).scale(14) > 19;
            final cards = [
              _QuickCard(
                icon: Icons.calendar_month_outlined,
                title: 'Bu hafta sonu kaç',
                subtitle:
                    '${hubDate(weekend.startDate)} – ${hubDate(weekend.endDate)} · Tarihler hazır',
                onTap: () => onCreate(weekend),
              ),
              _QuickCard(
                icon: Icons.shuffle_rounded,
                title: 'Bana şehir öner',
                subtitle: 'Sürpriz bir yer keşfet',
                onTap: () => _suggestCity(context),
              ),
            ];
            if (stacked) {
              return Column(
                children: [cards[0], const SizedBox(height: 12), cards[1]],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: cards[0]),
                const SizedBox(width: 12),
                Expanded(child: cards[1]),
              ],
            );
          },
        ),
        StreamBuilder<List<CommunityPlan>>(
          stream: community,
          builder: (context, snapshot) {
            // Never expose stale cards after a permission/network error.
            if (snapshot.hasError) return const SizedBox.shrink();
            final items = (snapshot.data ?? <CommunityPlan>[])
                .where((p) => p.visible)
                .take(3)
                .toList();
            if (items.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 28),
                Text(
                  'Gezginlerden ilham al',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                Text(
                  'Topluluktan gerçek rotalar.',
                  style: TextStyle(color: context.colors.muted),
                ),
                const SizedBox(height: 14),
                for (final plan in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _CommunityCard(
                      plan: plan,
                      onTap: () => onPublicPlan(plan.id),
                    ),
                  ),
                TextButton.icon(
                  onPressed: onCommunity,
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: const Text('Topluluğu keşfet'),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  void _suggestCity(BuildContext context) {
    final city = hubCities[Random().nextInt(hubCities.length)];
    final english = context.l10n.isEnglish;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.explore_outlined,
                color: context.colors.accent,
                size: 32,
              ),
              const SizedBox(height: 16),
              Text(
                context.tr(
                  '{city} nasıl olur?',
                  values: {'city': city.displayName(english)},
                ),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 10),
              Text(
                english
                    ? '${city.englishCaption}. Choose your dates and travel style to create a route tailored to you.'
                    : '${city.caption}. Tarihlerini ve seyahat tarzını seçerek sana özel bir rota hazırlayabilirsin.',
                style: TextStyle(color: context.colors.muted, height: 1.5),
              ),
              const SizedBox(height: 22),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  onCreate(
                    OnboardingData()
                      ..destination = city.destinationFor(english),
                  );
                },
                child: const Text('Bu şehri planla'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.onCreate});
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => _ForestCard(
    children: [
      const Icon(
        Icons.flight_takeoff_rounded,
        color: Color(0xFFE7BA8D),
        size: 30,
      ),
      const SizedBox(height: 20),
      Text(
        'İlk yolculuğun\nnereden başlasın?',
        style: Theme.of(context).textTheme.headlineSmall
            ?.copyWith(color: AppColors.surface, height: 1.25),
      ),
      const SizedBox(height: 12),
      const Text(
        'Şehrini seç. Zevklerine ve tempona göre günlük rotanı birlikte hazırlayalım.',
        style: TextStyle(color: Color(0xFFDCE5DC), height: 1.6),
      ),
      const SizedBox(height: 24),
      _LightButton(label: 'İlk planımı oluştur', onTap: onCreate),
    ],
  );
}

class _JourneyCard extends StatelessWidget {
  const _JourneyCard({
    required this.plan,
    required this.now,
    required this.onOpen,
  });
  final TravelPlanSummary plan;
  final DateTime now;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) {
    final active = isTravelingToday(plan, now);
    final start = plan.parsedStartDate;
    final daysLeft = start == null
        ? null
        : DateTime.utc(
            start.year,
            start.month,
            start.day,
          ).difference(DateTime.utc(now.year, now.month, now.day)).inDays;
    final dates = [
      hubDate(plan.startDate),
      hubDate(plan.endDate),
    ].where((s) => s.isNotEmpty).toSet().join(' – ');
    return _ForestCard(
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Icon(Icons.route_outlined, color: Color(0xFFE7BA8D)),
            Text(
              hubTripLabel(plan, now),
              style: const TextStyle(
                color: Color(0xFFDCE5DC),
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          plan.title,
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(color: AppColors.surface),
        ),
        if (plan.title != plan.destination) ...[
          const SizedBox(height: 6),
          Text(
            plan.destination,
            style: const TextStyle(color: Color(0xFFDCE5DC)),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          '${dates.isEmpty ? 'Tarih belirtilmedi' : dates}\n${plan.dayCount} gün · ${plan.activityCount} durak',
          style: const TextStyle(color: Color(0xFFDCE5DC), height: 1.7),
        ),
        if (!active && daysLeft != null && daysLeft > 0) ...[
          const SizedBox(height: 10),
          Text(
            'Yolculuğuna $daysLeft gün kaldı',
            style: const TextStyle(
              color: Color(0xFFE7BA8D),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        const SizedBox(height: 22),
        _LightButton(
          label: active ? 'Bugünkü planı aç' : 'Planı aç',
          onTap: onOpen,
        ),
      ],
    );
  }
}

class _ForestCard extends StatelessWidget {
  const _ForestCard({required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: AppColors.forest,
      borderRadius: BorderRadius.circular(28),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    ),
  );
}

class _LightButton extends StatelessWidget {
  const _LightButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => FilledButton(
    style: FilledButton.styleFrom(
      backgroundColor: context.colors.surface,
      foregroundColor: context.colors.forest,
    ),
    onPressed: onTap,
    child: Wrap(
      spacing: 12,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(label),
        const Icon(Icons.arrow_forward_rounded, size: 18),
      ],
    ),
  );
}

class _CityCard extends StatelessWidget {
  const _CityCard({required this.city, required this.onTap});
  final HubCity city;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(
    // Curated suggestions have explicit localized names. Saved/user-authored
    // destinations elsewhere remain verbatim.
    width: 190,
    child: Semantics(
      button: true,
      label: context.tr(
        '{city} için plan oluştur',
        values: {'city': city.destinationFor(context.l10n.isEnglish)},
      ),
      excludeSemantics: true,
      child: _SurfaceCard(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 130,
              width: double.infinity,
              child: Image.network(
                city.imageUrl,
                fit: BoxFit.cover,
                cacheWidth: 600,
                errorBuilder: (_, _, _) => ColoredBox(
                  color: AppColors.forest,
                  child: Center(
                    child: Icon(
                      Icons.location_city_rounded,
                      color: AppColors.surface,
                      size: 36,
                    ),
                  ),
                ),
                loadingBuilder: (_, child, progress) => progress == null
                    ? child
                    : ColoredBox(
                        color: context.colors.divider,
                        child: Center(
                          child: Icon(
                            Icons.landscape_outlined,
                            color: context.colors.muted,
                          ),
                        ),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    city.displayName(context.l10n.isEnglish),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    city.displayCountry(context.l10n.isEnglish),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.colors.muted, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    city.displayCaption(context.l10n.isEnglish),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: context.colors.forest,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => _SurfaceCard(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: context.colors.accent),
          const SizedBox(height: 14),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              color: context.colors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          Icon(
            Icons.arrow_forward_rounded,
            size: 18,
            color: context.colors.accent,
          ),
        ],
      ),
    ),
  );
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({required this.plan, required this.onTap});
  final CommunityPlan plan;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => _SurfaceCard(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Icon(Icons.map_outlined, color: context.colors.forest, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.destination,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 6),
                Text(
                  '${plan.summary.dayCount} gün · ${plan.author}',
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.chevron_right_rounded, color: context.colors.muted),
        ],
      ),
    ),
  );
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({required this.onTap, required this.child});
  final VoidCallback onTap;
  final Widget child;
  @override
  Widget build(BuildContext context) => Material(
    color: context.colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(22),
      side: BorderSide(color: context.colors.divider),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(onTap: onTap, child: child),
  );
}

class _PlanUnavailable extends StatelessWidget {
  const _PlanUnavailable({required this.onPlans, required this.onCreate});
  final VoidCallback onPlans, onCreate;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Planlar şu anda getirilemedi. Bağlantını kontrol edebilirsin.',
        style: TextStyle(color: context.colors.muted, height: 1.5),
      ),
      TextButton(onPressed: onPlans, child: const Text('Planlarıma git')),
      FilledButton(onPressed: onCreate, child: const Text('Yeni plan oluştur')),
    ],
  );
}
