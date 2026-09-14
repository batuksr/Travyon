import 'dart:convert';
import 'dart:io';

import 'plan_detail.dart';
import 'travel_plans_repository.dart';

DateTime? weatherDate(String value) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return null;
  final date = DateTime.tryParse(value);
  return date != null && weatherDateString(date) == value ? date : null;
}

String weatherDateString(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

class PlanWeatherDay {
  const PlanWeatherDay({
    required this.date,
    required this.code,
    required this.maximum,
    required this.minimum,
    this.rainMm,
    this.rainChance,
    this.windKmh,
  });
  final String date;
  final int? code;
  final double maximum, minimum;
  final double? rainMm, rainChance, windKmh;
}

class PlanWeatherReport {
  const PlanWeatherReport({
    required this.days,
    required this.latitude,
    required this.longitude,
    required this.today,
  });
  final List<PlanWeatherDay> days;
  final double latitude, longitude;
  final DateTime today;
  DateTime get lastForecastDate => today.add(const Duration(days: 15));
  Uri get windyUri => Uri.https(
    'www.windy.com',
    '/${latitude.toStringAsFixed(4)}/${longitude.toStringAsFixed(4)}/11',
  );
}

enum PlanWeatherFailure { dates, tooFar, location, unavailable }

class PlanWeatherException implements Exception {
  const PlanWeatherException(this.reason);
  final PlanWeatherFailure reason;
}

abstract interface class PlanWeatherRepository {
  Future<PlanWeatherReport> fetch(TravelPlanSummary plan);
}

/// Uses the same Open-Meteo daily fields as the web weather drawer.
/// Coordinates come from the saved trip, never from the device's location.
class OpenMeteoPlanWeatherRepository implements PlanWeatherRepository {
  OpenMeteoPlanWeatherRepository({
    Future<Map<String, dynamic>> Function(Uri)? getJson,
    DateTime Function()? now,
  }) : _getJson = getJson ?? _readJson,
       _now = now ?? DateTime.now;

  final Future<Map<String, dynamic>> Function(Uri) _getJson;
  final DateTime Function() _now;
  final _cache =
      <String, ({DateTime expires, Future<PlanWeatherReport> value})>{};

  @override
  Future<PlanWeatherReport> fetch(TravelPlanSummary plan) async {
    final now = _now();
    final key = jsonEncode([
      weatherDateString(now),
      plan.destination,
      for (final day in plan.days)
        [
          day.date,
          for (final stop in day.stops)
            if (stop.location != null) [stop.location!.lat, stop.location!.lng],
        ],
    ]);
    final cached = _cache[key];
    if (cached != null && now.isBefore(cached.expires)) return cached.value;
    if (_cache.length >= 8) _cache.remove(_cache.keys.first);
    final request = _fetch(plan, DateTime(now.year, now.month, now.day));
    _cache[key] = (
      expires: now.add(const Duration(minutes: 20)),
      value: request,
    );
    try {
      return await request;
    } catch (_) {
      if (identical(_cache[key]?.value, request)) _cache.remove(key);
      rethrow;
    }
  }

  Future<PlanWeatherReport> _fetch(
    TravelPlanSummary plan,
    DateTime today,
  ) async {
    final dates = plan.days.map((day) => day.date).toSet().toList()..sort();
    if (dates.isEmpty ||
        dates.length > 31 ||
        dates.any((date) => weatherDate(date) == null)) {
      throw const PlanWeatherException(PlanWeatherFailure.dates);
    }
    final first = weatherDate(dates.first)!;
    final last = weatherDate(dates.last)!;
    if (first.year < 1940 || last.difference(first).inDays > 31) {
      throw const PlanWeatherException(PlanWeatherFailure.dates);
    }
    final lastForecast = today.add(const Duration(days: 15));
    if (first.isAfter(lastForecast)) {
      throw const PlanWeatherException(PlanWeatherFailure.tooFar);
    }
    final locations = plan.days
        .expand((day) => day.stops)
        .map((stop) => stop.location)
        .whereType<({double lat, double lng})>();
    var point = locations.firstOrNull;
    if (point == null) {
      final response = await _getJson(
        Uri.https('geocoding-api.open-meteo.com', '/v1/search', {
          'name': plan.destination.split(',').first.trim(),
          'count': '1',
          'format': 'json',
        }),
      );
      final place = planMap(planList(response['results']).firstOrNull);
      point = PlanStop({
        'coordinates': {'lat': place['latitude'], 'lng': place['longitude']},
      }, 0).location;
    }
    if (point == null) {
      throw const PlanWeatherException(PlanWeatherFailure.location);
    }
    final coordinates = point;
    final forecastStart = today.subtract(const Duration(days: 92));
    final rows = <PlanWeatherDay>[];
    // Split old and recent dates rather than sending a mixed range to archive.
    for (final archive in [true, false]) {
      final group = dates.where((raw) {
        final date = weatherDate(raw)!;
        return !date.isAfter(lastForecast) &&
            date.isBefore(forecastStart) == archive;
      }).toList();
      if (group.isEmpty) continue;
      final response = await _getJson(
        Uri.https(
          archive ? 'archive-api.open-meteo.com' : 'api.open-meteo.com',
          archive ? '/v1/archive' : '/v1/forecast',
          {
            'latitude': coordinates.lat.toStringAsFixed(4),
            'longitude': coordinates.lng.toStringAsFixed(4),
            'start_date': group.first,
            'end_date': group.last,
            'daily': [
              'weather_code',
              'temperature_2m_max',
              'temperature_2m_min',
              'precipitation_sum',
              'wind_speed_10m_max',
              if (!archive) 'precipitation_probability_max',
            ].join(','),
            'timezone': 'auto',
            'temperature_unit': 'celsius',
            'wind_speed_unit': 'kmh',
            'precipitation_unit': 'mm',
          },
        ),
      );
      rows.addAll(
        parsePlanWeather(response).where((row) => group.contains(row.date)),
      );
    }
    if (rows.isEmpty) {
      throw const PlanWeatherException(PlanWeatherFailure.unavailable);
    }
    rows.sort((a, b) => a.date.compareTo(b.date));
    return PlanWeatherReport(
      days: rows,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      today: today,
    );
  }

  static Future<Map<String, dynamic>> _readJson(Uri uri) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      return await (() async {
        final request = await client.getUrl(uri);
        final response = await request.close();
        if (response.statusCode != 200) {
          throw const PlanWeatherException(PlanWeatherFailure.unavailable);
        }
        final bytes = <int>[];
        await for (final chunk in response) {
          bytes.addAll(chunk);
          if (bytes.length > 1024 * 1024) {
            throw const FormatException('Weather response too large');
          }
        }
        return planMap(jsonDecode(utf8.decode(bytes)));
      })().timeout(const Duration(seconds: 15));
    } finally {
      client.close(force: true);
    }
  }
}

List<PlanWeatherDay> parsePlanWeather(Map<String, dynamic> response) {
  final daily = planMap(response['daily']);
  final dates = planList(daily['time']);
  double? value(String field, int i) {
    final list = planList(daily[field]);
    final item = i < list.length ? list[i] : null;
    return item is num && item.isFinite ? item.toDouble() : null;
  }

  final result = <PlanWeatherDay>[];
  for (var i = 0; i < dates.length; i++) {
    final date = dates[i];
    final maximum = value('temperature_2m_max', i);
    final minimum = value('temperature_2m_min', i);
    // Missing readings are unavailable, never invented as 0°C or clear skies.
    if (date is! String ||
        weatherDate(date) == null ||
        maximum == null ||
        minimum == null ||
        minimum > maximum) {
      continue;
    }
    final chance = value('precipitation_probability_max', i);
    final rain = value('precipitation_sum', i);
    final wind = value('wind_speed_10m_max', i);
    final code = value('weather_code', i);
    result.add(
      PlanWeatherDay(
        date: date,
        maximum: maximum,
        minimum: minimum,
        code: code != null && code == code.roundToDouble()
            ? code.toInt()
            : null,
        rainChance: chance != null && chance >= 0 && chance <= 100
            ? chance
            : null,
        rainMm: rain != null && rain >= 0 ? rain : null,
        windKmh: wind != null && wind >= 0 ? wind : null,
      ),
    );
  }
  return result;
}
