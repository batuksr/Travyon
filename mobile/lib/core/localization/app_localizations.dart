import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'app_translations.dart';

class AppLocalizations {
  const AppLocalizations(this.locale);

  final Locale locale;

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations) ??
      const AppLocalizations(Locale('tr'));

  bool get isEnglish => locale.languageCode == 'en';

  String text(String turkish, {Map<String, Object?> values = const {}}) {
    var result = isEnglish
        ? englishTranslations[turkish] ??
              translateDynamicEnglish(turkish, (value) => text(value))
        : turkish;
    for (final entry in values.entries) {
      result = result.replaceAll('{${entry.key}}', '${entry.value ?? ''}');
    }
    return result;
  }

  String plural(
    int count, {
    required String turkishOne,
    required String turkishOther,
    required String englishOne,
    required String englishOther,
  }) => text(
    isEnglish
        ? (count == 1 ? englishOne : englishOther)
        : (count == 1 ? turkishOne : turkishOther),
    values: {'count': count},
  );

  static const delegate = _AppLocalizationsDelegate();
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) =>
      const {'tr', 'en'}.contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) =>
      SynchronousFuture(AppLocalizations(locale));

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

extension AppLocalizationsContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String turkish, {Map<String, Object?> values = const {}}) =>
      l10n.text(turkish, values: values);
}
