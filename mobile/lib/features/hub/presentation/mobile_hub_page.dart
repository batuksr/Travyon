import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/navigation/travyon_deep_links.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../plans/presentation/plan_detail_page.dart';
import '../../onboarding/data/plan_creation_repository.dart';
import '../../onboarding/presentation/onboarding_page.dart';
import '../../wallet/data/wallet_repository.dart';
import '../../wallet/presentation/wallet_page.dart';
import '../../community/data/community_repository.dart';
import '../../community/presentation/community_page.dart';
import '../../community/presentation/community_plan_page.dart';
import '../../settings/data/settings_repository.dart';
import '../../settings/presentation/settings_page.dart';
import '../../settings/data/settings_fields.dart';
import '../../plans/data/plan_management_repository.dart';
import '../../plans/presentation/saved_plans_page.dart';
import '../../notifications/data/notification_repository.dart';
import '../../notifications/presentation/notifications_page.dart';
import '../../notifications/data/firebase_mobile_push.dart';

class MobileHubPage extends StatefulWidget {
  const MobileHubPage({
    super.key,
    required this.session,
    required this.repository,
    required this.plansRepository,
  });

  final AuthSession session;
  final AuthRepository repository;
  final TravelPlansRepository plansRepository;

  @override
  State<MobileHubPage> createState() => _MobileHubPageState();
}

class _MobileHubPageState extends State<MobileHubPage>
    with WidgetsBindingObserver {
  StreamSubscription<void>? _pushOpen, _pushForeground;
  StreamSubscription<String>? _deepLinkOpen;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _pushOpen = FirebaseMobilePush.opened.stream.listen((_) => _consumePush());
    _pushForeground = FirebaseMobilePush.foreground.stream.listen((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Yeni bir Travyon bildirimin var.'),
          action: SnackBarAction(
            label: 'Bildirimler',
            onPressed: _notifications,
          ),
        ),
      );
    });
    FirebaseMobilePush.controller?.refresh(widget.session.uid);
    _deepLinkOpen = TravyonDeepLinks.openedPlans.listen(_openPublicPlan);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _consumePush();
      final planId = TravyonDeepLinks.takePendingPlan();
      if (planId != null) _openPublicPlan(planId);
    });
  }

  void _consumePush() {
    if (!mounted || !FirebaseMobilePush.pendingOpen) return;
    FirebaseMobilePush.pendingOpen = false;
    _notifications();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      FirebaseMobilePush.controller?.refresh(widget.session.uid);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pushOpen?.cancel();
    _pushForeground?.cancel();
    _deepLinkOpen?.cancel();
    super.dispose();
  }

  void _notifications() => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => NotificationsPage(
        uid: widget.session.uid,
        plansRepository: widget.plansRepository,
        repository: FirebaseNotificationRepository(),
        onOpen: _open,
        onSettings: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => SettingsEditor(
              section: settingsSections.firstWhere(
                (s) => s.id == 'notifications',
              ),
              repository: FirebaseSettingsRepository(widget.session.uid),
            ),
          ),
        ),
      ),
    ),
  );

  void _openPublicPlan(String planId) {
    if (!mounted) return;
    if (TravyonDeepLinks.pendingPlanId == planId) {
      TravyonDeepLinks.takePendingPlan();
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CommunityPlanPage(
          uid: widget.session.uid,
          id: planId,
          repository: _community,
        ),
      ),
    );
  }

  int _selected = 0;
  late final _plans = widget.plansRepository.watchPlans(widget.session.uid);
  late final _wallet = FirebaseWalletRepository();
  late final _community = FirebaseCommunityRepository();
  late final _management = FirebasePlanManagementRepository();

  void _create() => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => OnboardingPage(
        uid: widget.session.uid,
        plansRepository: widget.plansRepository,
        repository: FirebasePlanCreationRepository(),
      ),
    ),
  );

  void _open(TravelPlanSummary plan) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => PlanDetailPage(
        uid: widget.session.uid,
        planId: plan.id,
        repository: widget.plansRepository,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final parts = widget.session.displayName.trim().split(' ');
    final firstName = parts.isEmpty ? '' : parts.first;
    final name = firstName.isEmpty ? 'Gezgin' : firstName;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        title: const _Wordmark(),
        actions: [
          IconButton(
            tooltip: 'Bildirimler',
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: _notifications,
          ),
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => SettingsPage(
                  uid: widget.session.uid,
                  repository: FirebaseSettingsRepository(widget.session.uid),
                  onSignOut: widget.repository.signOut,
                ),
              ),
            ),
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Ayarlar',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: _selected == 1
            ? SavedPlansPage(
                uid: widget.session.uid,
                repository: widget.plansRepository,
                management: _management,
                onOpen: _open,
                onCreate: _create,
              )
            : _selected == 3
            ? CommunityPage(
                uid: widget.session.uid,
                repository: _community,
                plansRepository: widget.plansRepository,
              )
            : _selected == 2
            ? WalletPage(
                uid: widget.session.uid,
                repository: _wallet,
                plansRepository: widget.plansRepository,
              )
            : StreamBuilder<List<TravelPlanSummary>>(
                stream: _plans,
                builder: (context, snapshot) {
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                    children: [
                      Text(
                        _selected == 0 ? 'Merhaba, $name!' : 'Yolculukların',
                        style: Theme.of(context).textTheme.headlineLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _selected == 0
                            ? 'Bir sonraki keşfin seni bekliyor.'
                            : 'Bir plan seç, gününü keşfet.',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 26),
                      FilledButton.icon(
                        onPressed: _create,
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Yeni plan oluştur'),
                      ),
                      const SizedBox(height: 20),
                      if (snapshot.connectionState == ConnectionState.waiting)
                        const _LoadingPanel()
                      else if (snapshot.hasError)
                        const _ErrorPanel()
                      else if ((snapshot.data ?? const []).isEmpty)
                        const _EmptyPanel()
                      else
                        _PlansContent(
                          plans: snapshot.data!,
                          onOpen: _open,
                          overview: _selected == 0,
                        ),
                    ],
                  );
                },
              ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selected,
        onDestinationSelected: (index) => setState(() => _selected = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Hub'),
          NavigationDestination(
            icon: Icon(Icons.route_outlined),
            label: 'Planlar',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            label: 'Cüzdan',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            label: 'Topluluk',
          ),
        ],
      ),
    );
  }
}

class _PlansContent extends StatelessWidget {
  const _PlansContent({
    required this.plans,
    required this.onOpen,
    required this.overview,
  });

  final List<TravelPlanSummary> plans;
  final ValueChanged<TravelPlanSummary> onOpen;
  final bool overview;

  @override
  Widget build(BuildContext context) {
    final featured = _featuredPlan(plans);
    final cityCount = plans.map((plan) => plan.destination).toSet().length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (overview) ...[
          _FeaturedPlan(plan: featured, onTap: () => onOpen(featured)),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  value: plans.length.toString(),
                  label: 'Kayıtlı plan',
                  icon: Icons.bookmark_outline_rounded,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  value: cityCount.toString(),
                  label: 'Farklı şehir',
                  icon: Icons.public_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 30),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Planların', style: Theme.of(context).textTheme.titleLarge),
            Text(
              '${plans.length} plan',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ...plans.map(
          (plan) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _PlanCard(plan: plan, onTap: () => onOpen(plan)),
          ),
        ),
      ],
    );
  }

  TravelPlanSummary _featuredPlan(List<TravelPlanSummary> source) {
    final today = DateUtils.dateOnly(DateTime.now());
    final upcoming =
        source.where((plan) {
            final date = plan.parsedStartDate;
            return date != null && !DateUtils.dateOnly(date).isBefore(today);
          }).toList()
          ..sort((a, b) => a.parsedStartDate!.compareTo(b.parsedStartDate!));
    return upcoming.isEmpty ? source.first : upcoming.first;
  }
}

class _FeaturedPlan extends StatelessWidget {
  const _FeaturedPlan({required this.plan, required this.onTap});

  final TravelPlanSummary plan;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.forest,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.flight_takeoff_rounded, color: AppColors.accent),
              SizedBox(width: 9),
              Text(
                'YAKLAŞAN YOLCULUK',
                style: TextStyle(
                  color: Color(0xFFDCE5DC),
                  fontSize: 11,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Text(
            plan.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppColors.surface,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (plan.title != plan.destination) ...[
            const SizedBox(height: 5),
            Text(
              plan.destination,
              style: const TextStyle(color: Color(0xFFDCE5DC)),
            ),
          ],
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _DarkBadge(
                icon: Icons.calendar_today_outlined,
                text: _dateRange(plan),
              ),
              _DarkBadge(
                icon: Icons.route_outlined,
                text: '${plan.dayCount} gün',
              ),
              _DarkBadge(icon: Icons.payments_outlined, text: _cost(plan)),
            ],
          ),
          const SizedBox(height: 22),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.surface,
              foregroundColor: AppColors.forest,
            ),
            onPressed: onTap,
            icon: const Icon(Icons.arrow_forward_rounded),
            label: const Text('Yolculuğuna devam et'),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.onTap});

  final TravelPlanSummary plan;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.forest.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(Icons.map_outlined, color: AppColors.forest),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            plan.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        if (plan.isFavorite)
                          const Icon(
                            Icons.favorite_rounded,
                            size: 18,
                            color: AppColors.accent,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      plan.destination,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${plan.dayCount} gün  ·  ${plan.activityCount} durak',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.accent, size: 22),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DarkBadge extends StatelessWidget {
  const _DarkBadge({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.surface),
          const SizedBox(width: 6),
          Text(
            text,
            style: const TextStyle(
              color: AppColors.surface,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 44),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(26),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.09),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.flight_takeoff_rounded,
              color: AppColors.accent,
              size: 30,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Henüz kayıtlı planın yok',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Yeni plan oluştur ile şehrini ve seyahat tercihlerini seç. Kaydettiğin planlar webde ve telefonda birlikte görünsün.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _LoadingPanel extends StatelessWidget {
  const _LoadingPanel();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 220,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.accent),
            SizedBox(height: 16),
            Text(
              'Planların getiriliyor',
              style: TextStyle(color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Column(
        children: [
          Icon(Icons.cloud_off_outlined, color: AppColors.accent, size: 34),
          SizedBox(height: 14),
          Text(
            'Planlar şu anda getirilemedi',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 6),
          Text(
            'İnternet bağlantını kontrol edip tekrar dene.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return const Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'trav',
            style: TextStyle(color: AppColors.text),
          ),
          TextSpan(
            text: 'yon',
            style: TextStyle(color: AppColors.accent),
          ),
        ],
      ),
      style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900),
    );
  }
}

String _cost(TravelPlanSummary plan) {
  final value = plan.estimatedCost;
  final amount = value == value.roundToDouble()
      ? value.toInt().toString()
      : value.toStringAsFixed(2);
  return '${plan.currencySymbol}$amount';
}

String _dateRange(TravelPlanSummary plan) {
  final start = _shortDate(plan.startDate);
  final end = _shortDate(plan.endDate);
  if (start.isEmpty && end.isEmpty) return 'Tarih belirtilmedi';
  if (end.isEmpty || start == end) return start;
  return '$start – $end';
}

String _shortDate(String raw) {
  final date = DateTime.tryParse(raw);
  if (date == null) return '';
  const months = [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ];
  return '${date.day} ${months[date.month - 1]}';
}
