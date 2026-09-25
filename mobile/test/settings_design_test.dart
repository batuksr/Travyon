import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/settings/presentation/account_profile_page.dart';
import 'package:travyon/features/settings/presentation/settings_design.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'community_route_design_test.dart' show host, viewport;
import 'settings_test.dart' show FakeSettings;

class LoadingSettings extends FakeSettings {
  int loads = 0;
  bool unavailable = false;
  @override
  Future<Map<String, dynamic>> load() async {
    loads++;
    if (unavailable) throw StateError('offline');
    return super.load();
  }
}

void main() {
  testWidgets(
    'profile initials handle blank names and photo action respects busy state',
    (tester) async {
      var photos = 0;
      Widget header({String name = '', String? url, bool busy = false}) => host(
        Scaffold(
          body: SettingsProfileHeader(
            name: name,
            email: '',
            photoUrl: url,
            busy: busy,
            onPhoto: () => photos++,
          ),
        ),
        language: 'en',
      );
      await tester.pumpWidget(header());
      await tester.pumpAndSettle();
      expect(find.text('Traveler'), findsOneWidget);
      expect(find.text('T'), findsOneWidget);
      await tester.tap(find.byTooltip('Change photo'));
      expect(photos, 1);
      await tester.pumpWidget(
        header(
          name: 'Ada Yılmaz',
          url: 'https://example.invalid/photo.jpg',
          busy: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('AY'), findsOneWidget);
      expect(
        tester
            .widget<IconButton>(
              find.byKey(const ValueKey('settings-change-photo')),
            )
            .onPressed,
        isNull,
      );
      expect(photos, 1);
      expect(tester.takeException(), isNull);
    },
  );

  for (final dark in [false, true]) {
    testWidgets('profile and menu fit 320px at 200%, dark=$dark', (
      tester,
    ) async {
      viewport(tester, const Size(320, 740));
      final repo = FakeSettings()
        ..values.addAll({
          'displayName': 'Ada Çok Uzun Bir Gezgin Soyadı',
          'email': 'uzun.bir.gezgin.adresi@example.com',
        });
      await tester.pumpWidget(
        host(
          SettingsPage(uid: 'me', repository: repo, onSignOut: () async {}),
          scale: 2,
          dark: dark,
          language: dark ? 'en' : 'tr',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(dark ? 'Profile' : 'Profil'), findsOneWidget);
      expect(
        tester
            .renderObject<RenderParagraph>(
              find.text(repo.values['displayName'] as String),
            )
            .text
            .style!
            .color,
        dark ? AppPalette.dark.text : AppColors.text,
      );
      expect(tester.takeException(), isNull);
      final scroll = find.byType(Scrollable).first;
      for (final label in [
        dark ? 'Profile information' : 'Profil bilgileri',
        dark ? 'Theme' : 'Tema',
      ]) {
        await tester.scrollUntilVisible(
          find.text(label),
          260,
          scrollable: scroll,
        );
        await tester.pumpAndSettle();
        expect(find.text(label).hitTestable(), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('settings-sign-out')),
        500,
        scrollable: scroll,
        maxScrolls: 60,
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('settings-sign-out')).hitTestable(),
        findsOneWidget,
      );
      expect(repo.lastSave, isNull);
      expect(repo.deletes, 0);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'profile menu opens existing editor and reloads without writing data',
    (tester) async {
      final repo = LoadingSettings();
      await tester.pumpWidget(
        host(SettingsPage(uid: 'me', repository: repo, onSignOut: () async {})),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Profil bilgileri'));
      await tester.pumpAndSettle();
      expect(find.byType(AccountProfilePage), findsOneWidget);
      await tester.tap(find.byTooltip('Geri'));
      await tester.pumpAndSettle();
      expect(find.byType(SettingsProfileHeader), findsOneWidget);
      expect(repo.loads, greaterThan(1));
      expect(repo.lastSave, isNull);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('load errors retain retry and recover the profile', (
    tester,
  ) async {
    final repo = LoadingSettings()..unavailable = true;
    await tester.pumpWidget(
      host(SettingsPage(uid: 'me', repository: repo, onSignOut: () async {})),
    );
    await tester.pumpAndSettle();
    expect(find.byType(SettingsProfileHeader), findsNothing);
    repo.unavailable = false;
    await tester.tap(find.text('Tekrar dene'));
    await tester.pumpAndSettle();
    expect(find.text('Batu'), findsOneWidget);
    expect(repo.loads, 2);
    expect(tester.takeException(), isNull);
  });
}
