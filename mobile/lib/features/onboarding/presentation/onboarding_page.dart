import 'dart:async';
import 'dart:math';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/localized_text.dart';
import '../../../core/localization/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../plans/presentation/plan_detail_page.dart';
import '../data/onboarding_data.dart';
import '../data/onboarding_cities.dart';
import '../data/plan_creation_repository.dart';
import '../data/accommodation_repository.dart';
import 'accommodation_field.dart';
import 'onboarding_widgets.dart';
import 'travel_date_sheet.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.uid,
    required this.plansRepository,
    required this.repository,
    this.initialData,
    this.applySavedDefaults = false,
  });
  final String uid;
  final TravelPlansRepository plansRepository;
  final PlanCreationRepository repository;
  final OnboardingData? initialData;
  final bool applySavedDefaults;
  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  late final data = widget.initialData ?? OnboardingData();
  late final _accommodationRepository = FirebaseAccommodationRepository();
  late final _budgetController = TextEditingController(
    text: data.budget.toStringAsFixed(0),
  );
  final _scroll = ScrollController(keepScrollOffset: false);
  final _draftId =
      'mobile_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 32).toRadixString(16)}';
  int _step = 0, _elapsed = 0;
  bool _edited = false, _generating = false, _saving = false;
  String? _error;
  Map<String, dynamic>? _plan;
  Timer? _timer;
  bool get _busy => _generating || _saving;
  static const titles = [
    'Nereye gidiyorsun?',
    'Tercihlerini söyle',
    'Yemek tarzın nasıl?',
    'Nerede kalmak istersin?',
  ];
  static const subtitles = [
    'Destinasyon ve tarihleri belirle.',
    'Seyahat tarzını ve ilgi alanlarını seç.',
    'Damak zevkine göre öneriler oluşturalım.',
    'Konaklama ve ulaşım tercihlerini belirt.',
  ];
  static const labels = ['Destinasyon', 'Tercihler', 'Yemek', 'Konaklama'];

  @override
  void initState() {
    super.initState();
    if (widget.initialData == null || widget.applySavedDefaults) _defaults();
  }

  Future<void> _defaults() async {
    try {
      final defaults = await widget.repository.defaults(widget.uid);
      if (!mounted || _edited) return;
      setState(() {
        // A new trip starts at zero; the traveler enters this trip's budget.
        data.applyDefaults(defaults, includeBudget: false);
        _budgetController.text = data.budget.toStringAsFixed(0);
      });
    } catch (_) {
      /* Optional preferences never block onboarding. */
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scroll.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _change(VoidCallback action) {
    setState(() {
      _edited = true;
      _error = null;
      action();
    });
  }

  void _top() {
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _go(int step) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _step = step;
      _error = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _top();
    });
  }

  void _next() {
    final error = data.validate(_step);
    if (error != null) {
      setState(() => _error = error);
      _top();
      return;
    }
    if (_step < 3) {
      _go(_step + 1);
    } else {
      _generate();
    }
  }

  Future<void> _back() async {
    if (_busy) return;
    if (_plan != null) {
      setState(() {
        _plan = null;
        _error = null;
      });
      return;
    }
    if (_step > 0) {
      _go(_step - 1);
      return;
    }
    if (_edited) {
      final leave = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Planlamadan çıkılsın mı?'),
          content: const Text('Bu formdaki seçimlerin kaybolacak.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Devam et'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Çık'),
            ),
          ],
        ),
      );
      if (leave != true || !mounted) return;
    }
    if (mounted) Navigator.pop(context);
  }

  String _friendly(Object e) {
    if (e is StateError) return e.message.toString();
    if (e is FormatException) return e.message;
    if (e is FirebaseFunctionsException) {
      if (e.code == 'resource-exhausted') {
        return 'Plan oluşturma sınırına ulaşıldı. Biraz sonra tekrar dene.';
      }
      if (e.code == 'unauthenticated') {
        return 'Oturumun sona ermiş. Yeniden giriş yap.';
      }
      if (e.code == 'not-found') {
        return 'Plan servisi hazır değil. Yerel Functions terminalini yeniden başlatıp tekrar dene.';
      }
      if (e.code == 'failed-precondition') {
        return 'Plan servisi yapılandırması eksik. Functions terminalindeki Gemini ve Maps ayarlarını kontrol et.';
      }
      if (e.code == 'deadline-exceeded') {
        return 'Planın hazırlanması uzun sürdü. Tercihlerin korundu; tekrar deneyebilirsin.';
      }
    }
    return _plan == null
        ? 'Plan oluşturulamadı. Bağlantını kontrol et; seçimlerin korunuyor.'
        : 'Plan kaydedilemedi. Tekrar deneyebilirsin; planın yeniden oluşturulmayacak.';
  }

  Future<void> _generate() async {
    if (_busy) return;
    for (int i = 0; i < 4; i++) {
      final error = data.validate(i);
      if (error != null) {
        _go(i);
        setState(() => _error = error);
        return;
      }
    }
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _generating = true;
      _error = null;
      _elapsed = 0;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed++);
    });
    try {
      data.outputLanguage = context.l10n.isEnglish ? 'en' : 'tr';
      final plan = await widget.repository.generate(data);
      if (mounted) {
        setState(() => _plan = plan);
        _top();
      }
    } catch (e) {
      if (mounted) setState(() => _error = _friendly(e));
    } finally {
      _timer?.cancel();
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _save() async {
    if (_busy || _plan == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.repository.save(widget.uid, _draftId, _plan!, data.toJson());
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => PlanDetailPage(
            uid: widget.uid,
            planId: _draftId,
            repository: widget.plansRepository,
          ),
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _error = _friendly(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _dates() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final start = DateTime.tryParse(data.startDate),
        end = DateTime.tryParse(data.endDate);
    final selected = await showModalBottomSheet<DateTimeRange>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .9,
      ),
      builder: (_) => TravelDateSheet(today: today, start: start, end: end),
    );
    if (selected != null && mounted) {
      _change(() {
        data.startDate = dateKey(selected.start);
        data.endDate = dateKey(selected.end);
      });
    }
  }

  Future<void> _time(bool arrival) async {
    final parts = (arrival ? data.arrivalTime : data.departureTime).split(':');
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: int.parse(parts[0]),
        minute: int.parse(parts[1]),
      ),
      helpText: context.tr(arrival ? 'Varış saati' : 'Ayrılış saati'),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (selected != null && mounted) {
      _change(() {
        final value =
            '${selected.hour.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')}';
        if (arrival) {
          data.arrivalTime = value;
        } else {
          data.departureTime = value;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) _back();
    },
    child: Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: context.tr('Geri'),
          onPressed: _busy ? null : _back,
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('Yeni yolculuğun'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _generating
            ? _loading()
            : Column(
                children: [
                  if (_plan == null)
                    OnboardingProgress(step: _step, labels: labels),
                  Expanded(
                    child: ListView(
                      key: ValueKey(_plan != null ? 'preview' : 'step-$_step'),
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      children: [
                        if (_error != null)
                          Container(
                            key: const ValueKey('form-error'),
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFE9E3),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Semantics(
                              liveRegion: true,
                              child: Text(
                                _error!,
                                style: const TextStyle(
                                  color: Color(0xFF9B3020),
                                ),
                              ),
                            ),
                          ),
                        if (_plan != null)
                          ..._preview()
                        else ...[
                          Text(
                            titles[_step],
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            subtitles[_step],
                            style: const TextStyle(color: AppColors.muted),
                          ),
                          const SizedBox(height: 24),
                          ...switch (_step) {
                            0 => _basics(),
                            1 => _preferences(),
                            2 => _food(),
                            _ => _stay(),
                          },
                        ],
                      ],
                    ),
                  ),
                ],
              ),
      ),
      bottomNavigationBar: _generating
          ? null
          : SafeArea(
              top: false,
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.divider)),
                ),
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
                child: FilledButton.icon(
                  key: const ValueKey('onboarding-next'),
                  onPressed: _busy
                      ? null
                      : _plan != null
                      ? _save
                      : _next,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          _plan != null
                              ? Icons.bookmark_add_outlined
                              : Icons.arrow_forward,
                        ),
                  label: Text(
                    _saving
                        ? 'Kaydediliyor…'
                        : _plan != null
                        ? 'Kaydet ve rotayı aç'
                        : _step == 3
                        ? 'Planı Oluştur'
                        : 'İleri',
                  ),
                ),
              ),
            ),
    ),
  );

  Widget _loading() => Center(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 28),
          Text(
            'Planın hazırlanıyor',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            '${data.destination} için tercihlerine uygun günlük rotan hazırlanıyor.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Text(
            'Geçen süre: $_elapsed sn',
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bu işlem birkaç dakika sürebilir. Lütfen ekranı açık tut.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );

  Widget _section(String title, {String? hint}) => Padding(
    padding: const EdgeInsets.only(top: 22, bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (hint != null)
          Padding(
            padding: const EdgeInsets.only(top: 5),
            child: Text(
              hint,
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          ),
      ],
    ),
  );
  Widget _choices(
    String field,
    Map<String, String> options,
    List<String> selected,
    ValueChanged<String> select, {
    Map<String, String> hints = const {},
    bool ranked = false,
  }) => OnboardingChoices(
    field: field,
    options: options,
    selected: selected,
    onSelect: select,
    hints: hints,
    ranked: ranked,
  );

  List<Widget> _basics() => [
    OnboardingSection(
      title: 'Nereyi keşfedelim?',
      hint: 'Bir şehir yaz veya önerilerden seç.',
      icon: Icons.place_outlined,
      child: Autocomplete<String>(
        initialValue: TextEditingValue(text: data.destination),
        optionsBuilder: (value) {
          final query = value.text.toLowerCase().trim();
          return query.isEmpty
              ? const Iterable<String>.empty()
              : onboardingCities
                    .where((c) => c.toLowerCase().contains(query))
                    .take(8);
        },
        onSelected: (value) => _change(() {
          data.destination = value;
          data.accommodationLat = null;
          data.accommodationLng = null;
        }),
        fieldViewBuilder: (context, controller, focus, submit) => TextField(
          key: const ValueKey('destination'),
          controller: controller,
          focusNode: focus,
          maxLength: 200,
          decoration: InputDecoration(
            hintText: context.tr('Örn. Roma, İtalya'),
            prefixIcon: const Icon(Icons.search),
            counterText: '',
          ),
          onChanged: (value) => _change(() {
            data.destination = value;
            data.accommodationLat = null;
            data.accommodationLng = null;
          }),
        ),
      ),
    ),
    OnboardingSection(
      title: 'Seyahat Tarihleri',
      hint: 'Kaç günlük bir keşfe çıkıyorsun?',
      icon: Icons.calendar_month_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            label: context.tr('Gidiş ve dönüş tarihlerini seç'),
            child: InkWell(
              key: const ValueKey('dates'),
              onTap: _dates,
              borderRadius: BorderRadius.circular(16),
              child: OnboardingPair(
                first: OnboardingValueTile(
                  title: 'Gidiş',
                  value: travelDateLabel(data.startDate),
                  icon: Icons.flight_takeoff_rounded,
                ),
                second: OnboardingValueTile(
                  title: 'Dönüş',
                  value: travelDateLabel(data.endDate),
                  icon: Icons.flight_land_rounded,
                ),
              ),
            ),
          ),
          if (data.dayCount > 0)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                '${data.dayCount} gün · ${data.dayCount - 1} gece',
                style: const TextStyle(
                  color: AppColors.forest,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(height: 14),
          OnboardingPair(
            first: OnboardingValueTile(
              title: 'Varış saati',
              value: data.arrivalTime,
              icon: Icons.schedule_rounded,
              onTap: () => _time(true),
            ),
            second: OnboardingValueTile(
              title: 'Ayrılış saati',
              value: data.departureTime,
              icon: Icons.schedule_rounded,
              onTap: () => _time(false),
            ),
          ),
        ],
      ),
    ),
    OnboardingSection(
      title: 'Kaç kişi gidiyorsunuz?',
      icon: Icons.people_outline_rounded,
      child: Row(
        children: [
          IconButton(
            tooltip: context.tr('Kişi azalt'),
            onPressed: data.peopleCount > 1
                ? () => _change(() => data.peopleCount--)
                : null,
            icon: const Icon(Icons.remove_circle_outline),
          ),
          Expanded(
            child: Text(
              '${data.peopleCount} kişi',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            tooltip: context.tr('Kişi artır'),
            onPressed: data.peopleCount < 15
                ? () => _change(() => data.peopleCount++)
                : null,
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
    ),
    OnboardingSection(
      title: 'Toplam Bütçe',
      hint: 'Tüm kişiler ve seyahatin tamamı için.',
      icon: Icons.account_balance_wallet_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            key: const ValueKey('budget'),
            controller: _budgetController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: context.tr('Bütçe'),
              prefixText: '${currencies[data.currencyCode]} ',
            ),
            onChanged: (value) => _change(
              () => data.budget =
                  double.tryParse(value.replaceAll(',', '.')) ?? 0,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final currency in currencies.entries)
                ChoiceChip(
                  key: ValueKey('currency-${currency.key}'),
                  label: Text('${currency.key} · ${currency.value}'),
                  labelStyle: TextStyle(
                    color: data.currencyCode == currency.key
                        ? const Color(0xFF8C491A)
                        : AppColors.text,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  backgroundColor: AppColors.surface,
                  side: BorderSide(
                    color: data.currencyCode == currency.key
                        ? AppColors.accent
                        : AppColors.divider,
                  ),
                  selected: data.currencyCode == currency.key,
                  onSelected: (_) =>
                      _change(() => data.currencyCode = currency.key),
                  selectedColor: const Color(0xFFFFE4D1),
                  showCheckmark: false,
                ),
            ],
          ),
          if (data.dayCount > 0 && data.budget.isFinite && data.budget > 0)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                context.tr(
                  'Kişi başı günlük yaklaşık {amount}',
                  values: {
                    'amount':
                        '${currencies[data.currencyCode]}${(data.budget / data.dayCount / data.peopleCount).toStringAsFixed(0)}',
                  },
                ),
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  height: 1.5,
                ),
              ),
            ),
        ],
      ),
    ),
  ];
  List<Widget> _preferences() => [
    _section('Seyahat Türü'),
    _choices('travelType', travelTypes, [
      data.travelType,
    ], (v) => _change(() => data.travelType = v)),
    _section(
      'İlgi Alanları',
      hint: 'En fazla 3 tane. Seçim sırası önceliği belirler.',
    ),
    _choices(
      'interest',
      interests,
      data.purposes,
      (v) => _change(() {
        if (!data.toggleInterest(v)) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('En fazla 3 ilgi alanı seçebilirsin.'),
            ),
          );
        }
      }),
      ranked: true,
      hints: const {
        'culture': 'Müzeler, tarihi mekanlar',
        'relax': 'Spa, sahil, yavaş tempo',
        'nightlife': 'Bar, kulüp, canlı müzik',
        'nature': 'Trekking, doğa yürüyüşü',
      },
    ),
    _section('Günlük Tempo', hint: 'Aktivite yoğunluğunu seç.'),
    _choices(
      'pace',
      paces,
      [data.pace],
      (v) => _change(() => data.pace = v),
      hints: const {
        'rahat': 'Az yürüyüş · 3–4 km/gün',
        'normal': 'Standart tempo · 6–8 km/gün',
        'aktif': 'Her şeyi gör · 10–15 km/gün',
        'esnek': 'AI karar versin · Değişken',
      },
    ),
    const SizedBox(height: 18),
    SwitchListTile.adaptive(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.divider),
      ),
      tileColor: AppColors.surface,
      secondary: const OnboardingEmoji('🌅'),
      title: const Text('Erken kalkmayı severim'),
      subtitle: const Text('Sabah erken aktivite planlanabilir'),
      value: data.earlyBird,
      onChanged: (v) => _change(() => data.earlyBird = v),
    ),
  ];
  List<Widget> _food() => [
    _section('Beslenme Tercihleri'),
    _choices(
      'diet',
      diets,
      data.dietaryRestrictions,
      (v) => _change(() => data.toggleDiet(v)),
    ),
    _section('Yemek Felsefesi', hint: 'AI sana hangi mekanları önersin?'),
    _choices(
      'food',
      foodStyles,
      [data.foodPhilosophy],
      (v) => _change(() => data.foodPhilosophy = v),
      hints: const {
        'iconic': 'Şehrin ünlü mekanları',
        'hidden_gems': 'Yerel favoriler, saklı köşeler',
        'fine_dining': 'Kaliteli restoran deneyimi',
        'street_food': 'Tezgah lezzetleri, pazar',
        'mixed': 'Her gün farklı deneyim',
      },
    ),
    _section('Öğün Başı Bütçe'),
    _choices(
      'meal',
      mealBudgets,
      [data.mealBudget],
      (v) => _change(() => data.mealBudget = v),
      hints: const {
        'low': 'Uygun fiyatlı',
        'medium': 'Dengeli',
        'high': 'Kalite öncelikli',
      },
    ),
  ];
  List<Widget> _stay() => [
    _section('Rezervasyon Durumu'),
    _choices(
      'reservation',
      const {'yes': 'Rezervasyonum var', 'no': 'Henüz seçmedim'},
      [if (data.hasReservation != null) data.hasReservation! ? 'yes' : 'no'],
      (v) => _change(() => data.setReservation(v == 'yes')),
      hints: const {
        'yes': 'Konaklama yerim belli',
        'no': 'Konaklama tarzımı söyleyeceğim',
      },
    ),
    if (data.hasReservation == true) ...[
      _section(
        'Konaklama Yeri',
        hint: 'En az 3 karakter yaz, önerilerden konaklama yerini seç. İstersen açık adresi kendin de yazabilirsin.',
      ),
      AccommodationField(
        value: data.accommodationAddress,
        destination: data.destination,
        repository: _accommodationRepository,
        confirmed:
            data.accommodationLat != null && data.accommodationLng != null,
        onChanged: (v) => _change(() {
          data.accommodationAddress = v;
          data.accommodationLat = null;
          data.accommodationLng = null;
        }),
        onSelected: (selection) => _change(() {
          data.accommodationAddress = selection.address;
          data.accommodationLat = selection.lat;
          data.accommodationLng = selection.lng;
        }),
      ),
    ],
    if (data.hasReservation == false) ...[
      _section('Konaklama Tercihi'),
      _choices(
        'stay',
        stays,
        [data.accommodation],
        (v) => _change(() => data.accommodation = v),
        hints: const {
          'hotel': 'Konforlu, tam servis',
          'airbnb': 'Yerel deneyim',
          'hostel': 'Sosyal, ekonomik',
          'resort': 'Her şey dahil',
        },
      ),
    ],
    _section('Şehir İçi Ulaşım'),
    _choices(
      'transport',
      transports,
      [data.transport],
      (v) => _change(() => data.transport = v),
      hints: const {
        'public': 'Metro, otobüs',
        'walk': 'Yürüme mesafesi',
        'taxi': 'Kapıdan kapıya',
        'car': 'Kiralık veya kendi',
      },
    ),
    const SizedBox(height: 20),
    const Text(
      'Plan oluşturulduktan sonra gözden geçirip kaydedebilirsin.',
      style: TextStyle(color: AppColors.muted),
    ),
  ];
  List<Widget> _preview() => [
    Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.forest,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const OnboardingEmoji('🎉', size: 34),
          const SizedBox(height: 14),
          Text(
            'Planın hazır',
            style: Theme.of(context).textTheme.headlineMedium
                ?.copyWith(color: AppColors.surface),
          ),
          const SizedBox(height: 10),
          Text(
            data.destination,
            style: const TextStyle(
              color: AppColors.surface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '${data.dayCount} gün · ${data.peopleCount} kişi',
            style: const TextStyle(color: Color(0xFFDCE5DC)),
          ),
          const SizedBox(height: 6),
          Text(
            '${currencies[data.currencyCode]}${planNumber(_plan!['totalEstimatedCost']).toStringAsFixed(0)} tahmini toplam',
            style: const TextStyle(
              color: Color(0xFFE7BA8D),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    ),
    const SizedBox(height: 18),
    Text(
      _plan!['overallSummary'] as String? ?? '',
      style: const TextStyle(height: 1.6),
    ),
    if (planNumber(_plan!['totalEstimatedCost']) > data.budget)
      Container(
        margin: const EdgeInsets.only(top: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF0E5),
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Text(
          'Tahmini maliyet ayırdığın bütçeyi aşıyor. Kaydetmeden önce tercihlerini gözden geçirebilirsin.',
          style: TextStyle(color: Color(0xFF8C491A), height: 1.5),
        ),
      ),
    _section(
      'Gün gün yolculuğun',
      hint: 'Durakları görmek için bir güne dokun.',
    ),
    for (final raw in planList(_plan!['dailyPlans'])) _previewDay(planMap(raw)),
    const SizedBox(height: 16),
    const Text(
      'Kaydettiğinde planın bu hesaptaki web ve mobil planlarına eklenecek. Fiyatlar tahminidir; güncel saat ve rezervasyonları kontrol et.',
      style: TextStyle(color: AppColors.muted, fontSize: 12, height: 1.6),
    ),
  ];

  Widget _previewDay(Map<String, dynamic> day) {
    final stops = planList(day['activities']);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.divider),
      ),
      child: ExpansionTile(
        key: ValueKey('preview-day-${day['dayNumber']}'),
        tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        shape: const Border(),
        collapsedShape: const Border(),
        title: Text(
          '${day['dayNumber']}. Gün · ${travelDateLabel(day['date'] as String? ?? '')}',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            '${stops.length} durak',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ),
        children: [
          if ((day['daySummary'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Text(
                day['daySummary'] as String,
                style: const TextStyle(color: AppColors.muted, height: 1.5),
              ),
            ),
          for (var i = 0; i < stops.length; i++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 9),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFFFFF0E5),
                    ),
                    child: Text(
                      '${i + 1}',
                      textScaler: TextScaler.noScaling,
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          planMap(stops[i])['period'] as String? ?? '',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          planMap(stops[i])['placeName'] as String? ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
