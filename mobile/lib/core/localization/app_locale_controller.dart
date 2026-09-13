import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const supportedAppLocales = <Locale>[Locale('tr'), Locale('en')];

String languageSettingFor(Locale locale) =>
    locale.languageCode == 'en' ? 'English' : 'Türkçe';

Locale localeForLanguageSetting(Object? value) {
  final normalized = value?.toString().trim().toLowerCase();
  return normalized == 'english' || normalized == 'en'
      ? const Locale('en')
      : const Locale('tr');
}

class AppLocaleController extends ChangeNotifier {
  AppLocaleController._(this._locale, [this._preferences]);

  static const _preferenceKey = 'travyon-app-language';
  final SharedPreferencesAsync? _preferences;
  Locale _locale;

  Locale get locale => _locale;

  static Future<AppLocaleController> load() async {
    final preferences = SharedPreferencesAsync();
    String? saved;
    try {
      saved = await preferences.getString(_preferenceKey);
    } catch (_) {
      // A missing platform channel must not prevent app startup or widget tests.
    }
    return AppLocaleController._(localeForLanguageSetting(saved), preferences);
  }

  factory AppLocaleController.testing([Locale locale = const Locale('tr')]) =>
      AppLocaleController._(locale);

  Future<void> setLanguage(Object? value, {bool persist = true}) async {
    final next = localeForLanguageSetting(value);
    if (_locale != next) {
      _locale = next;
      notifyListeners();
    }
    if (persist && _preferences != null) {
      try {
        await _preferences.setString(_preferenceKey, languageSettingFor(next));
      } catch (_) {
        // Firestore remains the account source of truth if local persistence
        // is temporarily unavailable.
      }
    }
  }
}

class AppLocaleScope extends InheritedNotifier<AppLocaleController> {
  const AppLocaleScope({
    super.key,
    required AppLocaleController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppLocaleController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppLocaleScope>();
    assert(scope != null, 'AppLocaleScope is missing above this context.');
    return scope!.notifier!;
  }
}
