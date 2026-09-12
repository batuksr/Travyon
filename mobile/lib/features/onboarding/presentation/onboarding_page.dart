import 'dart:async';
import 'dart:math';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/data/travel_plans_repository.dart';
import '../../plans/presentation/plan_detail_page.dart';
import '../data/onboarding_data.dart';
import '../data/onboarding_cities.dart';
import '../data/plan_creation_repository.dart';
import '../data/accommodation_repository.dart';
import 'accommodation_field.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.uid,
    required this.plansRepository,
    required this.repository,
    this.initialData,
  });
  final String uid;
  final TravelPlansRepository plansRepository;
  final PlanCreationRepository repository;
  final OnboardingData? initialData;
  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  late final data = widget.initialData ?? OnboardingData();
  late final _accommodationRepository = FirebaseAccommodationRepository();
  late final _budgetController = TextEditingController(
    text: data.budget.toStringAsFixed(0),
  );
  final _scroll = ScrollController();
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
  static const icons = [
    Icons.place_outlined,
    Icons.favorite_border,
    Icons.restaurant_outlined,
    Icons.bed_outlined,
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialData == null) _defaults();
  }

  Future<void> _defaults() async {
    try {
      final defaults = await widget.repository.defaults(widget.uid);
      if (!mounted || _edited) return;
      setState(() {
        data.applyDefaults(defaults);
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
    _top();
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
    final selected = await showDateRangePicker(
      context: context,
      firstDate: today,
      lastDate: DateTime(today.year + 3, 12, 31),
      initialDateRange: start != null && end != null && !start.isBefore(today)
          ? DateTimeRange(start: start, end: end)
          : DateTimeRange(
              start: today,
              end: today.add(const Duration(days: 1)),
            ),
      helpText: 'Seyahat tarihleri',
      saveText: 'Tarihleri seç',
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          datePickerTheme: DatePickerTheme.of(context).copyWith(
            rangePickerHeaderHeadlineStyle: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        child: child!,
      ),
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
      helpText: arrival ? 'Varış saati' : 'Ayrılış saati',
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
          tooltip: 'Geri',
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
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                      child: Column(
                        children: [
                          Row(
                            children: List.generate(
                              4,
                              (i) => Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 3,
                                  ),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: i <= _step
                                          ? AppColors.accent
                                          : AppColors.divider,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            spacing: 16,
                            runSpacing: 4,
                            children: [
                              Text(
                                'Adım ${_step + 1} / 4',
                                style: const TextStyle(color: AppColors.muted),
                              ),
                              Text(
                                labels[_step],
                                style: const TextStyle(
                                  color: AppColors.forest,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: MediaQuery.disableAnimationsOf(context)
                          ? Duration.zero
                          : const Duration(milliseconds: 200),
                      child: ListView(
                        key: ValueKey(
                          _plan != null ? 'preview' : 'step-$_step',
                        ),
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
                            Align(
                              alignment: Alignment.centerLeft,
                              child: CircleAvatar(
                                backgroundColor: AppColors.forest,
                                child: Icon(
                                  icons[_step],
                                  color: AppColors.surface,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
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
                  ),
                ],
              ),
      ),
      bottomNavigationBar: _generating
          ? null
          : SafeArea(
              top: false,
              child: Padding(
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
    padding: const EdgeInsets.only(top: 12, bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
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
  }) => LayoutBuilder(
    builder: (context, bounds) {
      final columns =
          bounds.maxWidth >= 340 &&
              MediaQuery.textScalerOf(context).scale(1) < 1.4
          ? 2
          : 1;
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: options.entries.map((entry) {
          final active = selected.contains(entry.key);
          return SizedBox(
            width: (bounds.maxWidth - (columns - 1) * 10) / columns,
            child: Semantics(
              selected: active,
              child: Material(
                color: active ? const Color(0xFFE5ECDC) : AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                child: InkWell(
                  key: ValueKey('$field-${entry.key}'),
                  borderRadius: BorderRadius.circular(18),
                  onTap: () => select(entry.key),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 66),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: active ? AppColors.forest : AppColors.divider,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.value,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (hints[entry.key] != null)
                                Text(
                                  hints[entry.key]!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.muted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (active) ...[
                          const SizedBox(width: 8),
                          ranked
                              ? Text(
                                  '${selected.indexOf(entry.key) + 1}',
                                  style: const TextStyle(
                                    color: AppColors.forest,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : const Icon(
                                  Icons.check_circle,
                                  color: AppColors.forest,
                                  size: 20,
                                ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      );
    },
  );

  List<Widget> _basics() => [
    _section('Destinasyon'),
    Autocomplete<String>(
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
        decoration: const InputDecoration(
          hintText: 'Örn. Roma, İtalya',
          prefixIcon: Icon(Icons.search),
          counterText: '',
        ),
        onChanged: (value) => _change(() {
          data.destination = value;
          data.accommodationLat = null;
          data.accommodationLng = null;
        }),
      ),
    ),
    _section('Seyahat Tarihleri'),
    OutlinedButton.icon(
      key: const ValueKey('dates'),
      onPressed: _dates,
      icon: const Icon(Icons.date_range),
      label: Text(
        data.startDate.isEmpty
            ? 'Gidiş ve dönüş tarihlerini seç'
            : '${data.startDate} → ${data.endDate}',
        textAlign: TextAlign.center,
      ),
    ),
    Wrap(
      spacing: 12,
      children: [
        TextButton(
          onPressed: () => _time(true),
          child: Text('Varış  ${data.arrivalTime}'),
        ),
        TextButton(
          onPressed: () => _time(false),
          child: Text('Ayrılış  ${data.departureTime}'),
        ),
      ],
    ),
    _section('Kişi Sayısı'),
    Row(
      children: [
        IconButton(
          tooltip: 'Kişi azalt',
          onPressed: data.peopleCount > 1
              ? () => _change(() => data.peopleCount--)
              : null,
          icon: const Icon(Icons.remove_circle_outline),
        ),
        Text(
          '${data.peopleCount} kişi',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        IconButton(
          tooltip: 'Kişi artır',
          onPressed: data.peopleCount < 15
              ? () => _change(() => data.peopleCount++)
              : null,
          icon: const Icon(Icons.add_circle_outline),
        ),
      ],
    ),
    _section('Toplam Bütçe', hint: 'Tüm kişiler ve seyahatin tamamı için.'),
    TextFormField(
      key: const ValueKey('budget'),
      controller: _budgetController,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        labelText: 'Bütçe',
        prefixText: '${currencies[data.currencyCode]} ',
      ),
      onChanged: (value) => _change(
        () => data.budget = double.tryParse(value.replaceAll(',', '.')) ?? 0,
      ),
    ),
    const SizedBox(height: 12),
    _choices(
      'currency',
      {for (final c in currencies.entries) c.key: '${c.key} · ${c.value}'},
      [data.currencyCode],
      (value) => _change(() => data.currencyCode = value),
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
      contentPadding: EdgeInsets.zero,
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
    const Icon(Icons.check_circle_outline, size: 48, color: AppColors.forest),
    const SizedBox(height: 16),
    Text('Planın hazır', style: Theme.of(context).textTheme.headlineMedium),
    const SizedBox(height: 8),
    Text(data.destination, style: Theme.of(context).textTheme.titleLarge),
    Text(
      '${data.dayCount} gün · ${data.peopleCount} kişi · ${currencies[data.currencyCode]}${planNumber(_plan!['totalEstimatedCost']).toStringAsFixed(0)} tahmini',
    ),
    const SizedBox(height: 16),
    Text(_plan!['overallSummary'] as String? ?? ''),
    if (planNumber(_plan!['totalEstimatedCost']) > data.budget)
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'Tahmini maliyet ayırdığın bütçeyi aşıyor. Kaydetmeden önce tercihlerini gözden geçirebilirsin.',
          style: TextStyle(color: AppColors.accent),
        ),
      ),
    const SizedBox(height: 20),
    for (final raw in planList(_plan!['dailyPlans']))
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${planMap(raw)['dayNumber']}. Gün · ${planMap(raw)['date']}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(planMap(raw)['daySummary'] as String? ?? ''),
              Text(
                '${planList(planMap(raw)['activities']).length} durak',
                style: const TextStyle(color: AppColors.muted),
              ),
            ],
          ),
        ),
      ),
    const SizedBox(height: 16),
    const Text(
      'Kaydettiğinde planın bu hesaptaki web ve mobil planlarına eklenecek. Fiyatlar tahminidir; güncel saat ve rezervasyonları kontrol et.',
      style: TextStyle(color: AppColors.muted),
    ),
  ];
}
