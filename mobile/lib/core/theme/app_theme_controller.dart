import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Appearance is a device preference, independent of sign-in or connectivity.
class AppThemeController extends ChangeNotifier {
  AppThemeController._(this._mode, this._write);

  static const preferenceKey = 'travyon-app-theme';
  final Future<void> Function(String)? _write;
  ThemeMode _mode;
  Future<void> _pendingWrite = Future<void>.value();
  ThemeMode get mode => _mode;
  String get label => switch (_mode) {
    ThemeMode.system => 'Sistem ayarı',
    ThemeMode.light => 'Açık',
    ThemeMode.dark => 'Karanlık',
  };

  static Future<AppThemeController> load({
    Future<String?> Function()? read,
    Future<void> Function(String)? write,
  }) async {
    late final preferences = SharedPreferencesAsync();
    String? saved;
    try {
      saved = await (read ?? () => preferences.getString(preferenceKey))();
    } catch (_) {
      // Unavailable local storage must not block opening the app.
    }
    final mode = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    return AppThemeController._(
      mode,
      write ?? (value) => preferences.setString(preferenceKey, value),
    );
  }

  factory AppThemeController.testing([ThemeMode mode = ThemeMode.system]) =>
      AppThemeController._(mode, null);

  Future<void> setMode(ThemeMode next) {
    if (next == _mode) return _pendingWrite;
    _mode = next;
    notifyListeners();
    // Serialize writes so quick taps cannot restore an older choice on restart.
    return _pendingWrite = _pendingWrite.then((_) async {
      try {
        await _write?.call(next.name);
      } catch (_) {
        // Keep the selected appearance usable if local storage fails.
      }
    });
  }
}

class AppThemeScope extends InheritedNotifier<AppThemeController> {
  const AppThemeScope({
    super.key,
    required AppThemeController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppThemeController? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppThemeScope>()?.notifier;

  static AppThemeController of(BuildContext context) {
    final controller = maybeOf(context);
    assert(controller != null, 'AppThemeScope is missing above this context.');
    return controller!;
  }
}
