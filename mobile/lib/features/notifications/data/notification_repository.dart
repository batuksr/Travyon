import 'dart:convert';
import 'dart:io';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../plans/data/plan_detail.dart';
import '../../plans/data/travel_plans_repository.dart';

class TravelNotice {
  const TravelNotice({
    required this.id,
    required this.title,
    required this.body,
    required this.planId,
    this.level = 2,
  });
  final String id, title, body, planId;

  /// 0: important, 1: reminder, 2: information.
  final int level;
}

DateTime calendarDay(DateTime value) =>
    DateTime.utc(value.year, value.month, value.day);
int? daysUntilTrip(TravelPlanSummary plan, DateTime now) {
  final date = plan.parsedStartDate;
  return date == null
      ? null
      : calendarDay(date).difference(calendarDay(now)).inDays;
}

const _bookingWords = [
  'kolezyum',
  'colosseum',
  'müze',
  'museum',
  'tiyatro',
  'opera',
  'konser',
  'concert',
  'safari',
  'tekne',
  'boat',
  'stadyum',
  'stadium',
  'louvre',
  'vatikan',
  'vaticano',
  'sagrada',
  'alhambra',
  'acropolis',
  'akropol',
  'burj',
  'uffizi',
  'topkapı',
  'dolmabahçe',
  'ayasofya',
  'hagia sophia',
  'palace',
  'sarayı',
  'tower',
  'kule',
  'katedral',
  'cathedral',
  'anne frank',
  'rijksmuseum',
  'guggenheim',
  'moma',
  'british museum',
  'national gallery',
];

List<TravelNotice> buildTravelNotices(
  List<TravelPlanSummary> plans,
  DateTime now, {
  bool enabled = true,
}) {
  if (!enabled) return [];
  final notices = <TravelNotice>[];
  for (final p in plans) {
    final days = daysUntilTrip(p, now);
    // Use calendar dates, not elapsed hours, so today's journey is included.
    if (days != null && days >= 0 && days <= 7) {
      final kind = days == 0
          ? 'today'
          : days == 1
          ? 'tomorrow'
          : days <= 3
          ? 'soon'
          : 'week';
      notices.add(
        TravelNotice(
          id: '${p.id}:${p.startDate}:$kind',
          planId: p.id,
          level: days <= 1
              ? 0
              : days <= 3
              ? 1
              : 2,
          title: days == 0
              ? 'Bugün yola çıkıyorsun!'
              : days == 1
              ? 'Yarın yola çıkıyorsun!'
              : '${p.destination} seyahatin $days gün sonra',
          body:
              '${p.destination} yolculuğun için biletlerini, belgelerini ve rezervasyonlarını kontrol et.',
        ),
      );
    }
    final stops = p.days.expand((d) => d.stops).toList();
    if (days != null && days >= 0 && days <= 14) {
      final bookable = stops
          .where(
            (s) => _bookingWords.any((w) => s.name.toLowerCase().contains(w)),
          )
          .firstOrNull;
      if (bookable != null) {
        notices.add(
          TravelNotice(
            id: '${p.id}:${p.startDate}:ticket:${bookable.name}',
            title: 'Rezervasyon gerekebilir',
            body:
                '${bookable.name} için resmi ziyaret ve bilet koşullarını kontrol et. Bu, mekan adına göre bir hatırlatmadır; rezervasyon zorunluluğu doğrulanmış değildir.',
            planId: p.id,
            level: 1,
          ),
        );
      }
    }
    final spent = stops.fold<double>(
      0,
      (sum, s) => sum + (s.actual ?? 0).clamp(0, double.infinity),
    );
    final budget = p.estimatedCost > 0 ? p.estimatedCost : p.allocatedBudget;
    if (spent > 0 && budget > 0) {
      final percent = (spent / budget * 100).round();
      if (percent >= 20) {
        final tier = percent >= 80
            ? 'high'
            : percent >= 50
            ? 'mid'
            : 'low';
        notices.add(
          TravelNotice(
            id: '${p.id}:budget:$tier',
            title: 'Harcama takibi · %$percent',
            body:
                '${p.destination}: ${p.currencySymbol}${spent.toStringAsFixed(0)} harcama / ${p.currencySymbol}${budget.toStringAsFixed(0)} ${p.estimatedCost > 0 ? 'tahmini plan maliyeti' : 'ayrılan bütçe'}.',
            planId: p.id,
            level: percent >= 80
                ? 0
                : percent >= 50
                ? 1
                : 2,
          ),
        );
      }
    }
  }
  notices.sort((a, b) {
    final level = a.level.compareTo(b.level);
    return level == 0 ? a.id.compareTo(b.id) : level;
  });
  return notices;
}

TravelPlanSummary? weatherTrip(List<TravelPlanSummary> plans, DateTime now) {
  final eligible = plans.where((p) {
    final start = daysUntilTrip(p, now);
    final end = DateTime.tryParse(p.endDate) ?? p.parsedStartDate;
    return start != null &&
        start <= 7 &&
        end != null &&
        !calendarDay(end).isBefore(calendarDay(now)) &&
        p.days.expand((d) => d.stops).any((s) => s.location != null);
  }).toList()..sort((a, b) => a.startDate.compareTo(b.startDate));
  return eligible.firstOrNull;
}

class TripWeather {
  const TripWeather(this.celsius, this.code, this.observedAt);
  final double celsius;
  final int code;
  final DateTime observedAt;
  factory TripWeather.fromMap(Map<String, dynamic> json) {
    final data = planMap(json['current']);
    final temperature = data['temperature_2m'];
    final code = data['weather_code'];
    final time = data['time'];
    if (temperature is! num ||
        !temperature.isFinite ||
        code is! num ||
        !code.isFinite ||
        time is! num ||
        !time.isFinite) {
      throw const FormatException('Weather response missing current values');
    }
    return TripWeather(
      temperature.toDouble(),
      code.toInt(),
      DateTime.fromMillisecondsSinceEpoch(time.toInt() * 1000, isUtc: true),
    );
  }
  TravelNotice notice(TravelPlanSummary plan, {bool celsiusUnit = true}) {
    final temp = celsiusUnit
        ? '${celsius.round()}°C'
        : '${(celsius * 9 / 5 + 32).round()}°F';
    final condition = switch (code) {
      95 || 96 || 99 => 'Gök gürültülü hava',
      71 || 73 || 75 || 77 || 85 || 86 => 'Kar yağışı',
      51 ||
      53 ||
      55 ||
      56 ||
      57 ||
      61 ||
      63 ||
      65 ||
      66 ||
      67 ||
      80 ||
      81 ||
      82 => 'Yağışlı hava',
      45 || 48 => 'Sisli hava',
      0 => 'Açık hava',
      _ => 'Güncel hava',
    };
    final severe = [95, 96, 99].contains(code) || celsius <= 2;
    final caution = code >= 51 || celsius < 10 || celsius >= 35;
    return TravelNotice(
      id: '${plan.id}:weather:${observedAt.toIso8601String().substring(0, 10)}:$condition',
      planId: plan.id,
      title: '$condition · $temp',
      level: severe
          ? 0
          : caution
          ? 1
          : 2,
      body:
          '${plan.destination} yakınındaki rota noktasının güncel hava bilgisi. Gelecekteki seyahat gününün tahmini değildir. Kaynak: Open-Meteo · ${observedAt.toLocal().toString().substring(0, 16)}',
    );
  }
}

abstract interface class NotificationRepository {
  Stream<Map<String, dynamic>> preferences(String uid);
  Future<Set<String>> dismissed(String uid);
  Future<void> dismiss(String uid, Set<String> ids);
  Future<void> restore(String uid);
  Future<TripWeather> weather(TravelPlanSummary plan);
}

class FirebaseNotificationRepository implements NotificationRepository {
  final _local = SharedPreferencesAsync();
  String _key(String uid) => 'travyon-dismissed-notifs-$uid';
  @override
  Stream<Map<String, dynamic>> preferences(String uid) => FirebaseServices
      .firestore
      .collection('users')
      .doc(uid)
      .snapshots()
      .map((s) => s.data() ?? {});
  @override
  Future<Set<String>> dismissed(String uid) async {
    final saved = await _local.getString(_key(uid));
    if (saved == null) return {};
    final json = jsonDecode(saved);
    if (json is! List || json.any((v) => v is! String)) {
      throw const FormatException('Bildirim tercihleri okunamadı.');
    }
    return json.cast<String>().toSet();
  }

  @override
  Future<void> dismiss(String uid, Set<String> ids) async {
    final all = {...await dismissed(uid), ...ids}.toList();
    await _local.setString(
      _key(uid),
      jsonEncode(all.skip(all.length > 2000 ? all.length - 2000 : 0).toList()),
    );
  }

  @override
  Future<void> restore(String uid) => _local.remove(_key(uid));
  @override
  Future<TripWeather> weather(TravelPlanSummary plan) async {
    final location = plan.days
        .expand((d) => d.stops)
        .map((s) => s.location)
        .whereType<({double lat, double lng})>()
        .first;
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final uri = Uri.https('api.open-meteo.com', '/v1/forecast', {
        'latitude': location.lat.toStringAsFixed(3),
        'longitude': location.lng.toStringAsFixed(3),
        'current': 'temperature_2m,weather_code',
        'timeformat': 'unixtime',
      });
      final request = await client
          .getUrl(uri)
          .timeout(const Duration(seconds: 10));
      final response = await request.close().timeout(
        const Duration(seconds: 10),
      );
      if (response.statusCode != 200) {
        throw const HttpException('Hava bilgisi alınamadı.');
      }
      final body = await response
          .transform(utf8.decoder)
          .join()
          .timeout(const Duration(seconds: 10));
      return TripWeather.fromMap(planMap(jsonDecode(body)));
    } finally {
      client.close(force: true);
    }
  }
}
