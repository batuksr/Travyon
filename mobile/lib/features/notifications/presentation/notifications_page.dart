import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/preferences/app_unit_controller.dart';
import '../../../core/preferences/unit_formatter.dart';

import '../../../core/theme/app_theme.dart';
import '../../community/presentation/community_page.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../settings/data/settings_repository.dart';
import '../data/notification_repository.dart';
import '../../plans/data/plan_weather_repository.dart';
import '../../plans/presentation/plan_information_sheet.dart';
import '../../plans/presentation/plan_weather_sheet.dart';
import 'travel_notice_card.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({
    super.key,
    required this.uid,
    required this.plansRepository,
    required this.repository,
    required this.onOpen,
    required this.onSettings,
    this.onOpenDestination,
    this.onOpenExternal,
    this.weatherRepository,
  });
  final String uid;
  final TravelPlansRepository plansRepository;
  final NotificationRepository repository;
  final ValueChanged<TravelPlanSummary> onOpen;
  final VoidCallback onSettings;
  final void Function(TravelPlanSummary, NoticeDestination)? onOpenDestination;
  final Future<bool> Function(Uri)? onOpenExternal;
  final PlanWeatherRepository? weatherRepository;
  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage>
    with WidgetsBindingObserver {
  StreamSubscription<List<TravelPlanSummary>>? _planSub;
  StreamSubscription<Map<String, dynamic>>? _prefSub;
  Timer? _clock;
  List<TravelPlanSummary>? _plans;
  Map<String, dynamic>? _prefs;
  Set<String> _dismissed = {};
  String? _error, _storageError, _weatherError, _weatherKey;
  TripWeather? _weather;
  TravelPlanSummary? _weatherPlan;
  DateTime? _fetchedAt;
  bool _busy = false, _storageReady = false;
  String? _opening;
  late final _forecast =
      widget.weatherRepository ?? OpenMeteoPlanWeatherRepository();
  int _epoch = 0, _weatherRequest = 0;
  bool get _enabled => _prefs?['appPlanNotif'] != false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) {
        setState(() {});
        _updateWeather();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      setState(() {});
      _updateWeather();
    }
  }

  void _load() {
    final epoch = ++_epoch;
    ++_weatherRequest;
    _weatherKey = null;
    _fetchedAt = null;
    _planSub?.cancel();
    _prefSub?.cancel();
    setState(() {
      _error = null;
      _storageError = null;
      _storageReady = false;
      _plans = null;
      _prefs = null;
      _weather = null;
      _weatherPlan = null;
      _weatherError = null;
      _dismissed = {};
    });
    void fail(Object e) {
      if (mounted && epoch == _epoch) setState(() => _error = settingsError(e));
    }

    _planSub = widget.plansRepository.watchPlans(widget.uid).listen((plans) {
      if (!mounted || epoch != _epoch) return;
      setState(() => _plans = plans);
      _updateWeather();
    }, onError: fail);
    _prefSub = widget.repository.preferences(widget.uid).listen((prefs) {
      if (!mounted || epoch != _epoch) return;
      setState(() => _prefs = prefs);
      _updateWeather();
    }, onError: fail);
    widget.repository
        .dismissed(widget.uid)
        .then((ids) {
          if (mounted && epoch == _epoch) {
            setState(() {
              _dismissed = ids;
              _storageReady = true;
            });
          }
        })
        .catchError((Object e) {
          if (mounted && epoch == _epoch) {
            setState(() => _storageError = settingsError(e));
          }
        });
  }

  Future<void> _external(Uri uri, String id) async {
    if (_opening != null) return;
    // Links are app-built HTTPS URLs; never launch a URI supplied by plan text.
    if (uri.scheme != 'https' ||
        !{'www.getyourguide.com', 'open-meteo.com'}.contains(uri.host) ||
        uri.userInfo.isNotEmpty ||
        uri.port != 443) {
      return;
    }
    setState(() => _opening = id);
    try {
      final opened =
          await (widget.onOpenExternal?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (!opened) throw StateError('External link unavailable');
    } catch (_) {
      if (mounted) {
        communityNotice(
          context,
          context.tr('Bağlantı açılamadı. Tekrar dene.'),
        );
      }
    } finally {
      if (mounted) setState(() => _opening = null);
    }
  }

  void _action(TravelNotice notice, TravelPlanSummary plan) {
    if (notice.actionUri != null) {
      _external(notice.actionUri!, notice.id);
    } else if (notice.destination == NoticeDestination.weather) {
      showPlanInformation(
        context,
        PlanWeatherSheet(plan: plan, repository: _forecast),
      );
    } else if (widget.onOpenDestination != null) {
      widget.onOpenDestination!(plan, notice.destination);
    } else {
      widget.onOpen(plan);
    }
  }

  void _about() => showAppInformation(
    context,
    title: 'Bildirimler hakkında',
    message: 'Buradaki hatırlatmalar seyahat planlarından oluşturulur. Telefon bildirimleri ayarlardan ayrıca yönetilir. Kapatma tercihleri yalnızca bu cihazda saklanır.',
    icon: Icons.notifications_none_rounded,
  );

  void _updateWeather({bool force = false}) {
    if (_plans == null || _prefs == null) return;
    final target = _enabled ? weatherTrip(_plans!, DateTime.now()) : null;
    final point = target?.days
        .expand((d) => d.stops)
        .where((s) => s.location != null)
        .firstOrNull
        ?.location;
    final key = target == null
        ? null
        : '${target.id}:${point?.lat}:${point?.lng}';
    if (!force &&
        key == _weatherKey &&
        _fetchedAt != null &&
        DateTime.now().difference(_fetchedAt!) < const Duration(minutes: 30)) {
      _weatherPlan = target;
      return;
    }
    _weatherKey = key;
    _weatherPlan = target;
    _fetchedAt = DateTime.now();
    final request = ++_weatherRequest;
    setState(() {
      _weather = null;
      _weatherError = null;
    });
    if (target == null) return;
    widget.repository
        .weather(target)
        .then((weather) {
          if (!mounted || request != _weatherRequest) return;
          if (DateTime.now().toUtc().difference(weather.observedAt).abs() >
              const Duration(hours: 3)) {
            throw StateError('Güncel olmayan hava verisi');
          }
          setState(() => _weather = weather);
        })
        .catchError((Object e) {
          if (mounted && request == _weatherRequest) {
            setState(
              () => _weatherError = 'Güncel hava bilgisi alınamadı. Diğer hatırlatmaların kullanılabilir.',
            );
          }
        });
  }

  Future<void> _dismiss(Set<String> ids) async {
    if (_busy || !_storageReady) return;
    setState(() => _busy = true);
    try {
      await widget.repository.dismiss(widget.uid, ids);
      if (mounted) setState(() => _dismissed.addAll(ids));
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    if (_busy) return;
    if (!await confirmCommunity(
      context,
      'Bildirimleri geri getir?',
      'Bu cihazda kapattığın bildirimler yeniden gösterilecek.',
      confirmLabel: 'Geri getir',
      icon: Icons.restore_rounded,
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => _busy = true);
    try {
      await widget.repository.restore(widget.uid);
      if (mounted) {
        setState(() {
          _dismissed = {};
          _storageReady = true;
          _storageError = null;
        });
      }
    } catch (e) {
      if (mounted) communityNotice(context, settingsError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _planSub?.cancel();
    _prefSub?.cancel();
    _clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final all = buildTravelNotices(
      _plans ?? [],
      DateTime.now(),
      enabled: _enabled,
      formatter: UnitFormatter.of(context),
    );
    if (_enabled && _weather != null && _weatherPlan != null) {
      all.add(
        _weather!.notice(
          _weatherPlan!,
          celsiusUnit:
              AppUnitScope.maybeOf(context)?.tempCelsius ??
              (_prefs?['tempCelsius'] != false),
        ),
      );
    }
    all.sort((a, b) => a.level.compareTo(b.level));
    final visible = all.where((n) => !_dismissed.contains(n.id)).toList();
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Bildirimler'))),
      body: _error != null
          ? CommunityStatus(message: _error!, onRetry: _load)
          : _plans == null || _prefs == null
          ? const CommunityLoading()
          : SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  Text(
                    context.tr(
                      'Biletlerin, hazırlıkların ve seyahatinden son bilgiler.',
                    ),
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.6,
                      color: context.colors.muted,
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (!_enabled)
                    _NoticeBanner(
                      message: context.tr(
                        'Plan bildirimlerin ayarlardan kapalı.',
                      ),
                      onTap: widget.onSettings,
                      action: context.tr('Tercihlerimi aç'),
                    ),
                  if (_storageError != null)
                    _NoticeBanner(
                      message: context.tr(
                        'Bildirimler gösteriliyor ancak kapatma tercihin yüklenemedi. {error}',
                        values: {'error': context.tr(_storageError!)},
                      ),
                      onTap: _load,
                      action: context.tr('Tekrar dene'),
                    ),
                  if (_weatherError != null)
                    _NoticeBanner(
                      message: context.tr(_weatherError!),
                      onTap: () => _updateWeather(force: true),
                      action: context.tr('Tekrar dene'),
                    ),
                  if (visible.isNotEmpty) ...[
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          context.tr(
                            '{count} hatırlatma',
                            values: {'count': visible.length},
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: context.colors.forest,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: !_storageReady || _busy
                              ? null
                              : () =>
                                    _dismiss(visible.map((n) => n.id).toSet()),
                          icon: const Icon(Icons.done_all_rounded, size: 17),
                          label: Text(context.tr('Tümünü kapat')),
                          style: TextButton.styleFrom(
                            textStyle: const TextStyle(
                              fontFamily: AppTypography.body,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (visible.isEmpty && _enabled)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 22,
                        vertical: 32,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.surface,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: context.colors.divider),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.notifications_active_outlined,
                            size: 32,
                            color: context.colors.forest,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            context.tr('Her şey yolunda'),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            context.tr(
                              'Şimdilik yeni hatırlatma yok. Seyahat tarihin yaklaştığında burada görünecek.',
                            ),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.6,
                              color: context.colors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  for (final notice in visible)
                    Builder(
                      builder: (_) {
                        final plan = _plans!
                            .where((plan) => plan.id == notice.planId)
                            .firstOrNull;
                        return TravelNoticeCard(
                          key: ValueKey(notice.id),
                          notice: notice,
                          opening: _opening == notice.id,
                          onAction: plan == null || _opening != null
                              ? null
                              : () => _action(notice, plan),
                          onPlan:
                              plan != null &&
                                  (notice.destination !=
                                          NoticeDestination.plan ||
                                      notice.actionUri != null)
                              ? () => widget.onOpen(plan)
                              : null,
                          onDismiss: !_storageReady || _busy
                              ? null
                              : () => _dismiss({notice.id}),
                          onSource: notice.sourceUri == null || _opening != null
                              ? null
                              : () => _external(notice.sourceUri!, notice.id),
                        );
                      },
                    ),
                  if (_dismissed.isNotEmpty || _storageError != null)
                    TextButton.icon(
                      onPressed: _busy ? null : _restore,
                      icon: const Icon(Icons.restore_rounded, size: 18),
                      label: Text(context.tr('Kapatılanları geri getir')),
                      style: TextButton.styleFrom(
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.body,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  TextButton.icon(
                    onPressed: _about,
                    icon: const Icon(Icons.info_outline_rounded, size: 15),
                    label: Text(context.tr('Bildirimler hakkında')),
                    style: TextButton.styleFrom(
                      foregroundColor: context.colors.muted,
                      textStyle: const TextStyle(
                        fontFamily: AppTypography.body,
                        fontSize: 11,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({
    required this.message,
    required this.onTap,
    required this.action,
  });
  final String message, action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
    decoration: BoxDecoration(
      color: context.colors.tone(const Color(0xFFF7EDD5)),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.info_outline_rounded,
              size: 18,
              color: context.colors.forest,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: context.colors.text,
                ),
              ),
            ),
          ],
        ),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            textStyle: const TextStyle(
              fontFamily: AppTypography.body,
              fontSize: 12,
            ),
          ),
          child: Text(action),
        ),
      ],
    ),
  );
}
