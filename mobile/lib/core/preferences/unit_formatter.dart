import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../localization/app_localizations.dart';
import 'app_unit_controller.dart';

const kilometersToMiles = 0.6213711922;

class UnitFormatter {
  const UnitFormatter({
    required this.distanceKm,
    required this.tempCelsius,
    required this.english,
  });

  factory UnitFormatter.of(BuildContext context) => UnitFormatter(
    distanceKm: AppUnitScope.maybeOf(context)?.distanceKm ?? true,
    tempCelsius: AppUnitScope.maybeOf(context)?.tempCelsius ?? true,
    english: context.l10n.isEnglish,
  );

  final bool distanceKm;
  final bool tempCelsius;
  final bool english;

  String number(double value, {int fractionDigits = 1}) {
    var result = value.toStringAsFixed(fractionDigits);
    if (fractionDigits > 0) {
      result = result.replaceFirst(RegExp(r'\.0+$'), '');
    }
    return english ? result : result.replaceAll('.', ',');
  }

  String distance(double kilometers, {int fractionDigits = 1}) {
    final value = distanceKm ? kilometers : kilometers * kilometersToMiles;
    return '${number(value, fractionDigits: fractionDigits)} ${distanceKm ? 'km' : 'mi'}';
  }

  String distanceRange(
    double minimumKm,
    double maximumKm, {
    bool perDay = false,
  }) {
    final minimum = distanceKm ? minimumKm : minimumKm * kilometersToMiles;
    final maximum = distanceKm ? maximumKm : maximumKm * kilometersToMiles;
    final unit = distanceKm ? 'km' : 'mi';
    final suffix = perDay ? (english ? '/day' : '/gün') : '';
    return '${number(minimum)}–${number(maximum)} $unit$suffix';
  }

  String temperature(double celsius) {
    final value = tempCelsius ? celsius : celsius * 9 / 5 + 32;
    return '${number(value, fractionDigits: 0)}°${tempCelsius ? 'C' : 'F'}';
  }

  String speed(double kilometersPerHour) {
    final value = distanceKm
        ? kilometersPerHour
        : kilometersPerHour * kilometersToMiles;
    return '${number(value, fractionDigits: 0)} ${distanceKm ? (english ? 'km/h' : 'km/sa') : 'mph'}';
  }
}

double distanceBetweenKm(
  ({double lat, double lng}) first,
  ({double lat, double lng}) second,
) {
  const earthRadiusKm = 6371.0088;
  double radians(double degrees) => degrees * math.pi / 180;
  final lat1 = radians(first.lat);
  final lat2 = radians(second.lat);
  final latitudeDelta = radians(second.lat - first.lat);
  final longitudeDelta = radians(second.lng - first.lng);
  final a =
      math.sin(latitudeDelta / 2) * math.sin(latitudeDelta / 2) +
      math.cos(lat1) *
          math.cos(lat2) *
          math.sin(longitudeDelta / 2) *
          math.sin(longitudeDelta / 2);
  return earthRadiusKm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

double routeDistanceKm(Iterable<({double lat, double lng})?> locations) {
  var total = 0.0;
  ({double lat, double lng})? previous;
  for (final point in locations) {
    if (point == null) {
      previous = null;
      continue;
    }
    if (previous != null) total += distanceBetweenKm(previous, point);
    previous = point;
  }
  return total;
}
