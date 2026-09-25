import 'dart:math';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';
import '../../community/data/community_repository.dart';
import '../../onboarding/data/onboarding_data.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../data/hub_content.dart';
import 'hub_destination_sheet.dart';

/// Presentation-only home: navigation and Firebase ownership stay in the shell.
class HubHome extends StatelessWidget {
  const HubHome({
    super.key,
    required this.plans,
    required this.community,
    required this.onCreate,
    required this.onOpen,
    required this.onPlans,
    required this.onCommunity,
    required this.onPublicPlan,
    this.now,
    this.showHeading = true,
  });
  final AsyncSnapshot<List<TravelPlanSummary>> plans;
  final Stream<List<CommunityPlan>> community;
  final ValueChanged<OnboardingData?> onCreate;
  final ValueChanged<TravelPlanSummary> onOpen;
  final VoidCallback onPlans, onCommunity;
  final ValueChanged<String> onPublicPlan;
  final DateTime? now;
  final bool showHeading;

  @override
  Widget build(BuildContext context) {
    final today = now ?? DateTime.now();
    final featured = featuredHubPlan(plans.data ?? [], today);
    final weekend = weekendDraft(today);
    return ListView(
      key: const PageStorageKey('hub-home'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        if (showHeading) ...[
          Text(
            'Nereye gidiyoruz?',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 16),
        ],
        _DestinationSearch(onTap: () => _search(context)),
        const SizedBox(height: 24),
        if (plans.hasError)
          _PlanUnavailable(onPlans: onPlans, onCreate: () => onCreate(null))
        else if (plans.connectionState == ConnectionState.waiting &&
            !plans.hasData)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 36),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (featured == null)
          _WelcomeCard(onCreate: () => onCreate(null))
        else ...[
          _SectionHeading(
            title: 'Senin planın',
            action: 'Tüm planların (${plans.data!.length})',
            onTap: onPlans,
          ),
          const SizedBox(height: 10),
          _JourneyCard(
            plan: featured,
            now: today,
            onOpen: () => onOpen(featured),
          ),
        ],
        const SizedBox(height: 24),
        const _SectionHeading(title: 'Popüler duraklar'),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final cardWidth = (constraints.maxWidth - 12) / 2;
            final scale = MediaQuery.textScalerOf(context);
            return SizedBox(
              height: 148 + scale.scale(16) * 1.4 + scale.scale(12) * 1.5 + 30,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: hubCities.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final city = hubCities[index];
                  return _CityCard(
                    city: city,
                    width: cardWidth.clamp(148, 240),
                    onTap: () => onCreate(
                      OnboardingData()
                        ..destination = city.destinationFor(
                          context.l10n.isEnglish,
                        ),
                    ),
                  );
                },
              ),
            );
          },
        ),
        const SizedBox(height: 24),
        const _SectionHeading(title: 'Kategoriler'),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final entries = [
              (Icons.beach_access_outlined, 'Deniz & Güneş', 'relax', ''),
              (Icons.landscape_outlined, 'Doğa', 'nature', ''),
              (Icons.museum_outlined, 'Kültür & Tarih', 'culture', ''),
              (
                Icons.location_city_outlined,
                'Şehir Kaçamağı',
                'culture',
                'sehir_kacamagi',
              ),
            ];
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final entry in entries)
                  SizedBox(
                    width: (constraints.maxWidth - 12) / 2,
                    child: _CategoryCard(
                      icon: entry.$1,
                      label: entry.$2,
                      onTap: () => onCreate(
                        OnboardingData()
                          ..purposes.add(entry.$3)
                          ..travelType = entry.$4,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        const _SectionHeading(title: 'Küçük bir kaçamak?'),
        const SizedBox(height: 12),
        _SurfaceCard(
          onTap: () => onCreate(weekend),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            leading: const Icon(Icons.calendar_month_outlined),
            title: const Text('Bu hafta sonu kaç'),
            subtitle: Text(
              '${hubDate(weekend.startDate)} – ${hubDate(weekend.endDate)}',
            ),
            trailing: const Icon(Icons.chevron_right_rounded),
          ),
        ),
        const SizedBox(height: 10),
        _SurfaceCard(
          onTap: () => _suggestCity(context),
          child: const ListTile(
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Icon(Icons.explore_outlined),
            title: Text('Bana şehir öner'),
            subtitle: Text('Sürpriz bir yer keşfet'),
            trailing: Icon(Icons.chevron_right_rounded),
          ),
        ),
        StreamBuilder<List<CommunityPlan>>(
          stream: community,
          builder: (context, snapshot) {
            if (snapshot.hasError) return const SizedBox.shrink();
            final items = (snapshot.data ?? <CommunityPlan>[])
                .where((p) => p.visible)
                .take(3)
                .toList();
            if (items.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),
                const _SectionHeading(title: 'Gezginlerden ilham al'),
                const SizedBox(height: 12),
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

  Future<void> _search(BuildContext context) async {
    final city = await showHubDestinationPicker(context);
    if (city != null && context.mounted) {
      onCreate(OnboardingData()..destination = city);
    }
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
  Widget build(BuildContext context) => TravyonSurface(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'İlk yolculuğun\nnereden başlasın?',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 10),
        Text(
          'Şehrini seç. Zevklerine ve tempona göre günlük rotanı birlikte hazırlayalım.',
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 13,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: onCreate,
          child: const Text('İlk planımı oluştur'),
        ),
      ],
    ),
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
    final known = hubCities
        .where(
          (city) =>
              plan.destination == city.destination ||
              plan.destination == city.destinationFor(true),
        )
        .firstOrNull;
    final dates = [
      hubDate(plan.startDate),
      hubDate(plan.endDate),
    ].where((s) => s.isNotEmpty).toSet().join(' – ');
    final active = isTravelingToday(plan, now);
    final upcoming = (plan.parsedStartDate ?? DateTime(1970)).isAfter(
      DateTime(now.year, now.month, now.day),
    );
    return TravyonSurface(
      key: const ValueKey('hub-featured-plan'),
      semanticLabel: context.tr(active ? 'Bugünkü planı aç' : 'Planı aç'),
      onTap: onOpen,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: 68,
              height: 76,
              child: known == null
                  ? _TripPlaceholder(colors: context.colors)
                  : Image.network(
                      known.imageUrl,
                      fit: BoxFit.cover,
                      cacheWidth: 240,
                      errorBuilder: (_, _, _) =>
                          _TripPlaceholder(colors: context.colors),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: context.colors.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        active
                            ? 'Aktif seyahat'
                            : upcoming
                            ? 'Yaklaşan yolculuk'
                            : 'Son yolculuğun',
                        style: TextStyle(
                          color: context.colors.muted,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  plan.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (plan.title != plan.destination) ...[
                  const SizedBox(height: 3),
                  Text(
                    plan.destination,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.colors.muted, fontSize: 11),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  dates.isEmpty ? 'Tarih belirtilmedi' : dates,
                  style: TextStyle(color: context.colors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Icon(
            Icons.chevron_right_rounded,
            color: context.colors.muted,
            size: 20,
          ),
        ],
      ),
    );
  }
}

class _TripPlaceholder extends StatelessWidget {
  const _TripPlaceholder({required this.colors});
  final AppPalette colors;
  @override
  Widget build(BuildContext context) => ColoredBox(
    color: colors.orangeTint,
    child: Icon(Icons.route_rounded, color: colors.text, size: 28),
  );
}

class _DestinationSearch extends StatelessWidget {
  const _DestinationSearch({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => TravyonSurface(
    key: const ValueKey('hub-destination-search'),
    onTap: onTap,
    borderRadius: 100,
    semanticLabel: context.tr('Şehir veya bölge ara...'),
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    child: Row(
      children: [
        Icon(Icons.search_rounded, size: 22, color: context.colors.muted),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            'Şehir veya bölge ara...',
            style: TextStyle(color: context.colors.muted, fontSize: 13),
          ),
        ),
        const SizedBox(width: 8),
        Icon(Icons.north_east_rounded, size: 18, color: context.colors.text),
      ],
    ),
  );
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(title, style: Theme.of(context).textTheme.titleMedium),
      ),
      if (action != null)
        Flexible(
          child: Align(
            alignment: Alignment.centerRight,
            heightFactor: 1,
            child: TextButton(
              onPressed: onTap,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.only(left: 8),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              child: Text(action!, textAlign: TextAlign.end),
            ),
          ),
        ),
    ],
  );
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => TravyonSurface(
    onTap: onTap,
    borderRadius: 20,
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
    child: Column(
      children: [
        Icon(icon, color: context.colors.text, size: 28),
        const SizedBox(height: 12),
        Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: context.colors.text,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    ),
  );
}

class _CityCard extends StatelessWidget {
  const _CityCard({required this.city, required this.onTap, this.width = 180});
  final double width;
  final HubCity city;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(
    // Curated suggestions have explicit localized names. Saved/user-authored
    // destinations elsewhere remain verbatim.
    width: width,
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
            Expanded(
              child: SizedBox(
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
                ],
              ),
            ),
          ],
        ),
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
          const TravyonIconBadge(icon: Icons.map_outlined),
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
  Widget build(BuildContext context) =>
      TravyonSurface(onTap: onTap, borderRadius: 22, child: child);
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
