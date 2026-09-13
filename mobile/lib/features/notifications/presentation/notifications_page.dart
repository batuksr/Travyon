import 'dart:async';

import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/app_unit_controller.dart';

import '../../../core/theme/app_theme.dart';
import '../../community/presentation/community_page.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../settings/data/settings_repository.dart';
import '../data/notification_repository.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({
    super.key,
    required this.uid,
    required this.plansRepository,
    required this.repository,
    required this.onOpen,
    required this.onSettings,
  });
  final String uid;
  final TravelPlansRepository plansRepository;
  final NotificationRepository repository;
  final ValueChanged<TravelPlanSummary> onOpen;
  final VoidCallback onSettings;
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
    _planSub?.cancel();
    _prefSub?.cancel();
    setState(() {
      _error = null;
      _storageError = null;
      _storageReady = false;
      _plans = null;
      _prefs = null;
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
      appBar: AppBar(
        title: const Text('Bildirimler'),
        actions: [
          IconButton(
            tooltip: context.tr('Bildirim ayarları'),
            onPressed: widget.onSettings,
            icon: const Icon(Icons.tune),
          ),
          IconButton(
            tooltip: context.tr('Bildirimleri yenile'),
            onPressed: _busy
                ? null
                : () {
                    _weatherKey = null;
                    _load();
                  },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _error != null
          ? CommunityStatus(message: _error!, onRetry: _load)
          : _plans == null || _prefs == null
          ? const CommunityLoading()
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Yolculuğun için küçük hatırlatmalar',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 10),
                const Text(
                  'Uygulama içi bildirimler · Telefonun kapalıyken push bildirimi gönderilmez. Kapatılan bildirimler yalnızca bu cihazda saklanır.',
                ),
                if (!_enabled)
                  CommunityPanel(
                    child: Column(
                      children: [
                        const Text('Plan bildirimlerin ayarlardan kapalı.'),
                        TextButton(
                          onPressed: widget.onSettings,
                          child: const Text('Tercihlerimi aç'),
                        ),
                      ],
                    ),
                  ),
                if (_storageError != null)
                  CommunityStatus(
                    message:
                        'Bildirimler gösteriliyor ancak kapatma tercihin yüklenemedi. $_storageError',
                  ),
                if (_weatherError != null)
                  CommunityStatus(
                    message: _weatherError!,
                    onRetry: () => _updateWeather(force: true),
                  ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton.icon(
                      onPressed: !_storageReady || _busy || visible.isEmpty
                          ? null
                          : () => _dismiss(visible.map((n) => n.id).toSet()),
                      icon: const Icon(Icons.done_all),
                      label: const Text('Tümünü kapat'),
                    ),
                    TextButton(
                      onPressed: _busy ? null : _restore,
                      child: const Text('Kapatılanları geri getir'),
                    ),
                  ],
                ),
                if (visible.isEmpty && _enabled)
                  const CommunityStatus(
                    message: 'Şimdilik yeni hatırlatma yok. Seyahat tarihin yaklaştığında burada görünecek.',
                  ),
                for (final n in visible)
                  CommunityPanel(
                    key: ValueKey(n.id),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 8, right: 10),
                              child: Icon(
                                n.level == 0
                                    ? Icons.priority_high
                                    : Icons.notifications_none,
                                color: n.level == 0
                                    ? AppColors.accent
                                    : AppColors.forest,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                n.title,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            IconButton(
                              tooltip: context.tr('Bildirimi kapat'),
                              onPressed: !_storageReady || _busy
                                  ? null
                                  : () => _dismiss({n.id}),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                        Text(n.body),
                        const SizedBox(height: 12),
                        TextButton.icon(
                          onPressed: () {
                            final plan = _plans!
                                .where((p) => p.id == n.planId)
                                .firstOrNull;
                            if (plan != null) widget.onOpen(plan);
                          },
                          icon: const Icon(Icons.route_outlined),
                          label: const Text('İlgili planı aç'),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}
