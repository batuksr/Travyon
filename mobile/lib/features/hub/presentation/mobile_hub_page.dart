import 'dart:async';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/firebase/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/navigation/travyon_deep_links.dart';
import '../../assistant/presentation/assistant_launcher.dart';
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
import '../../onboarding/data/onboarding_data.dart';
import '../data/hub_content.dart';
import 'hub_home.dart';
import 'hub_navigation_bar.dart';
import 'hub_actions_menu.dart';

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
            label: context.tr('Bildirimler'),
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
      setState(() {}); // Refresh date-sensitive journey labels after resuming.
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
        onOpenDestination: (plan, destination) => _open(
          plan,
          initialTab: switch (destination) {
            NoticeDestination.checklist => PlanDetailTab.checklist,
            NoticeDestination.budget => PlanDetailTab.budget,
            _ => PlanDetailTab.itinerary,
          },
        ),
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
  late var _inspiration = _watchInspiration();

  Stream<List<CommunityPlan>> _watchInspiration() => Stream.multi((events) {
    // The lazy home list can dispose and recreate this section while scrolling.
    // Give each listener its own cancellable subscription, and surface setup
    // failures as optional feed errors rather than breaking the home screen.
    try {
      final subscription = _community.feed().listen(
        events.add,
        onError: events.addError,
        onDone: events.close,
      );
      events.onCancel = subscription.cancel;
    } catch (error, stack) {
      events.addError(error, stack);
      events.close();
    }
  });

  void _create([OnboardingData? initialData]) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => OnboardingPage(
        uid: widget.session.uid,
        plansRepository: widget.plansRepository,
        repository: FirebasePlanCreationRepository(),
        initialData: initialData,
        applySavedDefaults: true,
      ),
    ),
  );

  void _open(
    TravelPlanSummary plan, {
    PlanDetailTab initialTab = PlanDetailTab.itinerary,
  }) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => PlanDetailPage(
        uid: widget.session.uid,
        planId: plan.id,
        repository: widget.plansRepository,
        initialTab: initialTab,
        initialDayIndex: isTravelingToday(plan, DateTime.now())
            ? plan.days.indexWhere((day) => day.date == dateKey(DateTime.now()))
            : 0,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final parts = widget.session.displayName.trim().split(' ');
    final firstName = parts.isEmpty ? '' : parts.first;
    final name = firstName.isEmpty ? 'Gezgin' : firstName;

    return Scaffold(
      appBar: _selected == 0
          ? AppBar(
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              toolbarHeight:
                  (MediaQuery.textScalerOf(context).scale(26) * 1.25 + 36)
                      .clamp(72.0, double.infinity),
              titleSpacing: 20,
              centerTitle: false,
              title: Text(
                'Nereye gidiyoruz?',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              actions: [
                HubActionsMenu(
                  children: [
                    AssistantLauncher(uid: widget.session.uid),
                    IconButton(
                      tooltip: context.tr('Bildirimler'),
                      icon: const Icon(
                        Icons.notifications_none_rounded,
                        size: 22,
                      ),
                      onPressed: _notifications,
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => SettingsPage(
                            uid: widget.session.uid,
                            repository: FirebaseSettingsRepository(
                              widget.session.uid,
                            ),
                            onSignOut: widget.repository.signOut,
                          ),
                        ),
                      ),
                      icon: CircleAvatar(
                        radius: 16,
                        backgroundColor: context.colors.orangeTint,
                        child: Text(
                          name.characters.first.toUpperCase(),
                          style: TextStyle(
                            color: context.colors.text,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      tooltip: context.tr('Ayarlar'),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
              ],
            )
          : null,
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
                  return HubHome(
                    showHeading: false,
                    plans: snapshot,
                    community: _inspiration,
                    onCreate: _create,
                    onOpen: _open,
                    onPlans: () => setState(() => _selected = 1),
                    onCommunity: () => setState(() => _selected = 3),
                    onPublicPlan: _openPublicPlan,
                  );
                },
              ),
      ),
      bottomNavigationBar: HubNavigationBar(
        selectedTab: _selected,
        onCreate: _create,
        onSelect: (index) => setState(() {
          if (index == 0 && _selected != 0) {
            _inspiration = _watchInspiration();
          }
          _selected = index;
        }),
      ),
    );
  }
}
