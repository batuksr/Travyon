import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_weather_repository.dart';
import '../data/travel_plans_repository.dart';
import 'plan_information_sheet.dart';

const _conditions = <int, String>{
  0: 'Açık hava',
  1: 'Az bulutlu',
  2: 'Parçalı bulutlu',
  3: 'Kapalı hava',
  45: 'Sisli hava',
  48: 'Yoğun sis',
  51: 'Hafif çiseleme',
  53: 'Çiseleme',
  55: 'Yoğun çiseleme',
  56: 'Dondurucu çiseleme',
  57: 'Dondurucu çiseleme',
  61: 'Hafif yağmur',
  63: 'Yağmur',
  65: 'Şiddetli yağmur',
  66: 'Dondurucu yağmur',
  67: 'Dondurucu yağmur',
  71: 'Hafif kar',
  73: 'Kar',
  75: 'Yoğun kar',
  77: 'Kar taneleri',
  80: 'Sağanak',
  81: 'Kuvvetli sağanak',
  82: 'Şiddetli sağanak',
  85: 'Kar sağanağı',
  86: 'Yoğun kar sağanağı',
  95: 'Gök gürültülü fırtına',
  96: 'Dolu fırtınası',
  99: 'Şiddetli dolu fırtınası',
};

IconData _weatherIcon(int? code) => switch (code ?? -1) {
  0 => Icons.wb_sunny_outlined,
  1 || 2 => Icons.wb_twilight_rounded,
  3 => Icons.cloud_outlined,
  45 || 48 => Icons.foggy,
  71 || 73 || 75 || 77 || 85 || 86 => Icons.ac_unit_rounded,
  95 || 96 || 99 => Icons.thunderstorm_outlined,
  >= 51 && <= 82 => Icons.grain_rounded,
  _ => Icons.thermostat_outlined,
};

List<(IconData, String)> planPackingTips(List<PlanWeatherDay> days) => [
  if (days.any((day) => day.maximum > 28))
    (Icons.wb_sunny_outlined, 'Güneş kremi ve güneş gözlüğü'),
  if (days.any((day) => (day.rainMm ?? 0) > 3 || (day.rainChance ?? 0) > 50))
    (Icons.umbrella_outlined, 'Şemsiye veya yağmurluk'),
  if (days.any((day) => day.minimum < 12))
    (Icons.checkroom_outlined, 'Katmanlı giysiler ve sıcak tutan bir mont'),
  if (days.any((day) => {71, 73, 75, 77, 85, 86}.contains(day.code)))
    (Icons.snowshoeing_rounded, 'Su geçirmez bot'),
  if (days.any((day) => (day.windKmh ?? 0) > 30))
    (Icons.air_rounded, 'Rüzgârlık ve atkı'),
  if (days.any((day) => {95, 96, 99}.contains(day.code)))
    (
      Icons.thunderstorm_outlined,
      'Fırtınalı günlerde kapalı mekânları tercih et',
    ),
];

class PlanWeatherSheet extends StatefulWidget {
  const PlanWeatherSheet({
    super.key,
    required this.plan,
    required this.repository,
    this.onOpen,
  });
  final TravelPlanSummary plan;
  final PlanWeatherRepository repository;
  final Future<bool> Function(Uri)? onOpen;

  @override
  State<PlanWeatherSheet> createState() => _PlanWeatherSheetState();
}

class _PlanWeatherSheetState extends State<PlanWeatherSheet> {
  late Future<PlanWeatherReport> _request = widget.repository.fetch(
    widget.plan,
  );

  Future<void> _open(Uri uri) async {
    try {
      final opened =
          await (widget.onOpen?.call(uri) ??
              launchUrl(uri, mode: LaunchMode.externalApplication));
      if (!opened) throw StateError('Link unavailable');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('Bağlantı açılamadı. Tekrar dene.')),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => PlanInformationSheet(
    title: context.tr('Hava durumu'),
    destination: widget.plan.destination,
    child: FutureBuilder<PlanWeatherReport>(
      future: _request,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 20),
                  Text(
                    context.tr('Hava durumu yükleniyor…'),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }
        if (snapshot.hasError || !snapshot.hasData) {
          final reason = snapshot.error is PlanWeatherException
              ? (snapshot.error as PlanWeatherException).reason
              : PlanWeatherFailure.unavailable;
          final message = switch (reason) {
            PlanWeatherFailure.dates =>
              'Bu planın seyahat tarihleri eksik veya geçersiz.',
            PlanWeatherFailure.tooFar => 'Hava tahmini henüz hazır değil. Seyahatine 16 gün kala tekrar kontrol et.',
            PlanWeatherFailure.location =>
              'Bu destinasyon için hava durumu konumu bulunamadı.',
            PlanWeatherFailure.unavailable =>
              'Hava bilgisi alınamadı. Bağlantını kontrol edip tekrar dene.',
          };
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Icon(
                Icons.cloud_off_outlined,
                size: 36,
                color: AppColors.forest,
              ),
              const SizedBox(height: 16),
              Text(
                context.tr(message),
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.6, color: AppColors.muted),
              ),
              if (reason != PlanWeatherFailure.dates &&
                  reason != PlanWeatherFailure.tooFar)
                TextButton.icon(
                  onPressed: () => setState(() {
                    _request = widget.repository.fetch(widget.plan);
                  }),
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(context.tr('Tekrar dene')),
                ),
            ],
          );
        }
        final report = snapshot.data!;
        final tips = planPackingTips(report.days);
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            for (final day in widget.plan.days) ...[
              _WeatherDayCard(
                number: day.index + 1,
                date: day.date,
                weather: report.days
                    .where((weather) => weather.date == day.date)
                    .firstOrNull,
                report: report,
              ),
              const SizedBox(height: 12),
            ],
            if (tips.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                context.tr('Bavul önerileri'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.forest,
                ),
              ),
              const SizedBox(height: 12),
              for (final tip in tips)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(tip.$1, size: 20, color: AppColors.forest),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.tr(tip.$2),
                          style: const TextStyle(fontSize: 13, height: 1.5),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _open(report.windyUri),
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: Text(context.tr('Windy haritasında aç')),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Tahminler değişebilir. Geçmiş tarihler için geçmiş hava verileri gösterilir.',
              ),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 11,
                height: 1.5,
                color: AppColors.muted,
              ),
            ),
            TextButton(
              key: const ValueKey('weather-attribution'),
              onPressed: () => _open(Uri.https('open-meteo.com', '/')),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF6A625A),
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                textStyle: const TextStyle(
                  fontFamily: AppTypography.body,
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  decoration: TextDecoration.underline,
                ),
              ),
              child: Text(context.tr('Hava verisi: Open-Meteo')),
            ),
          ],
        );
      },
    ),
  );
}

class _WeatherDayCard extends StatelessWidget {
  const _WeatherDayCard({
    required this.number,
    required this.date,
    required this.weather,
    required this.report,
  });
  final int number;
  final String date;
  final PlanWeatherDay? weather;
  final PlanWeatherReport report;

  @override
  Widget build(BuildContext context) {
    final formatter = UnitFormatter.of(context);
    final dateValue = weatherDate(date);
    final w = weather;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('{number}. Gün', values: {'number': number}),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      dateValue == null
                          ? date
                          : MaterialLocalizations.of(context)
                                .formatMediumDate(dateValue),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (w != null) ...[
                const SizedBox(width: 10),
                Icon(_weatherIcon(w.code), size: 34, color: AppColors.accent),
              ],
            ],
          ),
          const SizedBox(height: 12),
          if (w == null)
            Text(
              context.tr(
                dateValue != null && dateValue.isAfter(report.lastForecastDate)
                    ? 'Bu tarih için tahmin henüz hazır değil.'
                    : 'Bu gün için hava verisi bulunmuyor.',
              ),
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.muted,
              ),
            )
          else ...[
            Text(
              context.tr(_conditions[w.code] ?? 'Hava koşulu bilinmiyor'),
              style: const TextStyle(color: AppColors.forest, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  formatter.temperature(w.maximum),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                Text(
                  '/ ${formatter.temperature(w.minimum)}',
                  style: const TextStyle(fontSize: 19, color: AppColors.muted),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _Metric(
                  icon: Icons.water_drop_outlined,
                  text: w.rainChance != null
                      ? context.tr(
                          'Yağış olasılığı: %{value}',
                          values: {
                            'value': formatter.number(
                              w.rainChance!,
                              fractionDigits: 0,
                            ),
                          },
                        )
                      : w.rainMm != null
                      ? context.tr(
                          'Yağış: {value} mm',
                          values: {'value': formatter.number(w.rainMm!)},
                        )
                      : context.tr('Yağış verisi yok'),
                ),
                _Metric(
                  icon: Icons.air_rounded,
                  text: w.windKmh == null
                      ? context.tr('Rüzgâr verisi yok')
                      : context.tr(
                          'Rüzgâr: {speed}',
                          values: {'speed': formatter.speed(w.windKmh!)},
                        ),
                ),
              ],
            ),
            if (dateValue != null && dateValue.isBefore(report.today)) ...[
              const SizedBox(height: 10),
              Text(
                context.tr('Geçmiş hava verisi'),
                style: const TextStyle(fontSize: 11, color: AppColors.muted),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 15, color: AppColors.forest),
      const SizedBox(width: 5),
      Flexible(
        child: Text(
          text,
          style: const TextStyle(fontSize: 12, color: AppColors.muted),
        ),
      ),
    ],
  );
}
