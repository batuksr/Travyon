import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/core/widgets/app_dialog.dart';
import 'package:travyon/features/settings/presentation/settings_page.dart';

import 'settings_test.dart' show FakeSettings;

Widget host(Widget child, {String language = 'tr', double textScale = 1}) =>
    MaterialApp(
      theme: AppTheme.light,
      locale: Locale(language),
      supportedLocales: const [Locale('tr'), Locale('en')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: child,
    );

Widget launcher(Future<void> Function(BuildContext) open) => Scaffold(
  body: Builder(
    builder: (context) => TextButton(
      key: const ValueKey('open-dialog'),
      onPressed: () => open(context),
      child: const Text('Open'),
    ),
  ),
);

void main() {
  testWidgets('only explicit confirmation approves an action', (tester) async {
    final results = <bool>[];
    await tester.pumpWidget(
      host(
        launcher((context) async {
          results.add(
            await showAppConfirmation(
              context,
              title: 'Çıkış yapılsın mı?',
              message: 'Kayıtlı planların hesabında kalır.',
              confirmLabel: 'Çıkış yap',
              icon: Icons.logout_rounded,
            ),
          );
        }),
      ),
    );

    Future<void> open() async {
      await tester.tap(find.byKey(const ValueKey('open-dialog')));
      await tester.pumpAndSettle();
      expect(find.byType(AppDialog), findsOneWidget);
    }

    await open();
    expect(find.byIcon(Icons.logout_rounded), findsOneWidget);
    expect(find.text('Onayla'), findsNothing);
    final cancel = tester.getRect(find.byKey(const ValueKey('dialog-cancel')));
    final confirm = tester.getRect(
      find.byKey(const ValueKey('dialog-confirm')),
    );
    expect(cancel.top, confirm.top);
    expect(cancel.right, lessThan(confirm.left));
    await tester.tap(find.byKey(const ValueKey('dialog-cancel')));
    await tester.pumpAndSettle();
    await open();
    await tester.tap(find.byKey(const ValueKey('dialog-close')));
    await tester.pumpAndSettle();
    await open();
    await tester.tapAt(const Offset(2, 2));
    await tester.pumpAndSettle();
    await open();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    await open();
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(results, [false, false, false, false, false]);
    await open();
    await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
    await tester.pumpAndSettle();
    expect(results.last, isTrue);
    expect(results.length, 6);
  });

  for (final language in ['tr', 'en']) {
    for (final size in [const Size(320, 640), const Size(640, 360)]) {
      testWidgets('long confirmation scrolls at $size, large text, $language', (
        tester,
      ) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        bool? confirmed;
        await tester.pumpWidget(
          host(
            launcher((context) async {
              confirmed = await showAppConfirmation(
                context,
                title: 'Hesabın kalıcı olarak silinsin mi?',
                message: 'Web ve mobil hesabın, özel planların, cüzdanın ve paylaşımların silinir. Bu işlem geri alınamaz. Aktif abonelik varsa sunucu silmeyi engeller.',
                confirmLabel: 'Hesabımı sil',
                icon: Icons.person_remove_outlined,
                tone: AppDialogTone.destructive,
              );
            }),
            language: language,
            textScale: 2,
          ),
        );
        await tester.tap(find.byKey(const ValueKey('open-dialog')));
        await tester.pumpAndSettle();
        final dialog = tester.widget<AppDialog>(find.byType(AppDialog));
        expect(dialog.tone, AppDialogTone.destructive);
        expect(
          find.text(language == 'en' ? 'Cancel' : 'Vazgeç'),
          findsOneWidget,
        );
        final cancelFinder = find.byKey(const ValueKey('dialog-cancel'));
        await tester.ensureVisible(cancelFinder);
        await tester.pumpAndSettle();
        final confirmRect = tester.getRect(
          find.byKey(const ValueKey('dialog-confirm')),
        );
        final cancelRect = tester.getRect(cancelFinder);
        expect(confirmRect.bottom, lessThan(cancelRect.top));
        expect(tester.takeException(), isNull);
        await tester.tap(cancelFinder);
        await tester.pumpAndSettle();
        expect(confirmed, isFalse);
      });
    }
  }

  testWidgets('information dialog has one localized action', (tester) async {
    await tester.pumpWidget(
      host(
        launcher(
          (context) => showAppInformation(
            context,
            title: 'Bildirimler hakkında',
            message: 'Kayıtlı planların hesabında kalır.',
          ),
        ),
        language: 'en',
      ),
    );
    await tester.tap(find.byKey(const ValueKey('open-dialog')));
    await tester.pumpAndSettle();
    expect(find.text('About notifications'), findsOneWidget);
    expect(find.byKey(const ValueKey('dialog-cancel')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
    await tester.pumpAndSettle();
    expect(find.byType(AppDialog), findsNothing);
  });

  testWidgets('sign out keeps the session until confirmed', (tester) async {
    var signOuts = 0;
    await tester.pumpWidget(
      host(
        SettingsPage(
          uid: 'user',
          repository: FakeSettings(),
          onSignOut: () async {
            signOuts++;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Çıkış yap'), 400);
    await tester.ensureVisible(find.text('Çıkış yap'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Çıkış yap'));
    await tester.pumpAndSettle();
    expect(signOuts, 0);
    await tester.tap(find.byKey(const ValueKey('dialog-cancel')));
    await tester.pumpAndSettle();
    expect(signOuts, 0);
    await tester.tap(find.text('Çıkış yap'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('dialog-confirm')));
    await tester.pumpAndSettle();
    expect(signOuts, 1);
    expect(tester.takeException(), isNull);
  });
}
