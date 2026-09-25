import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/features/bootstrap/presentation/mobile_bootstrap_page.dart';
import 'package:travyon/features/bootstrap/presentation/welcome_backdrop.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';
import 'package:travyon/features/settings/presentation/account_profile_page.dart';

import 'widget_test.dart' show FakeAuthRepository;
import 'settings_test.dart' show FakeSettings, host;

class PendingSettings extends FakeSettings {
  final result = Completer<Map<String, dynamic>>();

  @override
  Future<Map<String, dynamic>> load() => result.future;
}

class PendingAuth extends FakeAuthRepository {
  PendingAuth() : super(session: null);
  final sessions = StreamController<AuthSession?>();

  @override
  Stream<AuthSession?> watchSession() => sessions.stream;
}

void main() {
  for (final accountForm in [false, true]) {
    testWidgets('profile loading uses spinner, accountForm=$accountForm', (
      tester,
    ) async {
      final repository = PendingSettings();
      await tester.pumpWidget(
        host(
          accountForm
              ? AccountProfilePage(repository: repository)
              : SettingsPage(
                  uid: 'test',
                  repository: repository,
                  onSignOut: () async {},
                ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(WelcomePlaneMark), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      repository.result.complete(repository.values);
      await tester.pumpAndSettle();
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('waiting session shows spinner and exits without delaying auth', (
    tester,
  ) async {
    final repository = PendingAuth();
    addTearDown(repository.sessions.close);
    await tester.pumpWidget(TravyonApp(authRepository: repository));
    expect(find.byType(WelcomePlaneMark), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 900));
    repository.sessions.add(null);
    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byType(MobileBootstrapPage), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
