import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppUnitController extends ChangeNotifier {
  AppUnitController._({
    required this._distanceKm,
    required this._tempCelsius,
    this._preferences,
  });

  static const _distanceKey = 'travyon-distance-km';
  static const _temperatureKey = 'travyon-temp-celsius';

  final SharedPreferencesAsync? _preferences;
  bool _distanceKm;
  bool _tempCelsius;

  bool get distanceKm => _distanceKm;
  bool get tempCelsius => _tempCelsius;

  static Future<AppUnitController> load() async {
    final preferences = SharedPreferencesAsync();
    bool? distanceKm;
    bool? tempCelsius;
    try {
      distanceKm = await preferences.getBool(_distanceKey);
      tempCelsius = await preferences.getBool(_temperatureKey);
    } catch (_) {
      // Platform storage is a convenience; account settings remain canonical.
    }
    return AppUnitController._(
      distanceKm: distanceKm ?? true,
      tempCelsius: tempCelsius ?? true,
      preferences: preferences,
    );
  }

  factory AppUnitController.testing({
    bool distanceKm = true,
    bool tempCelsius = true,
  }) => AppUnitController._(distanceKm: distanceKm, tempCelsius: tempCelsius);

  Future<void> setUnits({
    required bool distanceKm,
    required bool tempCelsius,
    bool persist = true,
  }) async {
    final changed = _distanceKm != distanceKm || _tempCelsius != tempCelsius;
    _distanceKm = distanceKm;
    _tempCelsius = tempCelsius;
    if (changed) notifyListeners();

    if (!persist || _preferences == null) return;
    try {
      await Future.wait([
        _preferences.setBool(_distanceKey, distanceKm),
        _preferences.setBool(_temperatureKey, tempCelsius),
      ]);
    } catch (_) {
      // Keep the live account value even if device persistence is unavailable.
    }
  }

  Future<void> applyAccountSettings(Map<String, dynamic>? data) => setUnits(
    distanceKm: data?['distanceKm'] != false,
    tempCelsius: data?['tempCelsius'] != false,
  );
}

class AppUnitScope extends InheritedNotifier<AppUnitController> {
  const AppUnitScope({
    super.key,
    required AppUnitController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppUnitController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppUnitScope>();
    assert(scope != null, 'AppUnitScope is missing above this context.');
    return scope!.notifier!;
  }

  static AppUnitController? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppUnitScope>()?.notifier;
}

extension AppUnitContext on BuildContext {
  AppUnitController get units => AppUnitScope.of(this);
}
