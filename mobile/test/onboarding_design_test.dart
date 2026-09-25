import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/onboarding/presentation/onboarding_page.dart';
import 'package:travyon/features/onboarding/presentation/travel_date_sheet.dart';

import 'onboarding_test.dart' show answers, CreationFake, next;
import 'widget_test.dart' show FakeTravelPlansRepository;

void main() {
  for (final dark in [false, true]) {
    for (final locale in ['tr', 'en']) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets('four-step form fits $size / $locale / dark=$dark at 200%', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetViewInsets);
          final data = answers();
          final originalDates = (data.startDate, data.endDate);
          final repo = CreationFake();
          await tester.pumpWidget(
            MaterialApp(
              theme: dark ? AppTheme.dark : AppTheme.light,
              locale: Locale(locale),
              supportedLocales: const [Locale('tr'), Locale('en')],
              localizationsDelegates: const [
                AppLocalizations.delegate,
                ...GlobalMaterialLocalizations.delegates,
              ],
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: const TextScaler.linear(2)),
                child: child!,
              ),
              home: OnboardingPage(
                uid: 'layout-test',
                repository: repo,
                plansRepository: FakeTravelPlansRepository([]),
                initialData: data,
                applySavedDefaults: false,
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);

          if (size.height > size.width) {
            final destination = find.byKey(const ValueKey('destination'));
            await tester.scrollUntilVisible(
              destination,
              140,
              scrollable: find.byType(Scrollable).first,
            );
            await tester.pumpAndSettle();
            await tester.ensureVisible(destination);
            await tester.pumpAndSettle();
            await tester.tap(destination);
            tester.view.viewInsets = const FakeViewPadding(bottom: 260);
            await tester.pumpAndSettle();
            await tester.ensureVisible(destination);
            await tester.pumpAndSettle();
            expect(destination.hitTestable(), findsOneWidget);
            expect(tester.takeException(), isNull);
            FocusManager.instance.primaryFocus?.unfocus();
            tester.view.resetViewInsets();
            await tester.pumpAndSettle();
          }

          // The sheet remains cancellable with a small viewport and large text.
          await tester.scrollUntilVisible(
            find.byKey(const ValueKey('dates')),
            160,
            scrollable: find.byType(Scrollable).first,
          );
          await tester.pumpAndSettle();
          await tester.ensureVisible(find.byKey(const ValueKey('dates')));
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const ValueKey('dates')));
          await tester.pumpAndSettle();
          expect(find.byType(TravelDateSheet), findsOneWidget);
          expect(tester.takeException(), isNull);
          expect(
            find
                .text(locale == 'tr' ? 'Tarihleri seç' : 'Select dates')
                .hitTestable(),
            findsOneWidget,
          );
          await tester.tap(find.byKey(const ValueKey('calendar-close')));
          await tester.pumpAndSettle();
          expect((data.startDate, data.endDate), originalDates);

          for (var step = 0; step < 4; step++) {
            final list = find.byKey(ValueKey('step-$step'));
            expect(list, findsOneWidget);
            // Exercise the lazy lower sections as well as the first viewport.
            final scrollable = find
                .descendant(of: list, matching: find.byType(Scrollable))
                .first;
            final lastControl = [
              find.byKey(const ValueKey('currency-EUR')),
              find.byType(SwitchListTile),
              find.byKey(const ValueKey('meal-high')),
              find.byKey(const ValueKey('transport-car')),
            ][step];
            await tester.scrollUntilVisible(
              lastControl,
              140,
              scrollable: scrollable,
              maxScrolls: 100,
            );
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            expect(
              find.byKey(const ValueKey('onboarding-next')).hitTestable(),
              findsOneWidget,
            );
            if (step < 3) await next(tester);
          }
          expect(repo.generations, 0);
          expect(repo.ids, isEmpty);
          await next(tester); // A fake response; never contacts the service.
          expect(repo.generations, 1);
          expect(find.byKey(const ValueKey('preview')), findsOneWidget);
          expect(tester.takeException(), isNull);
          expect(
            find.byKey(const ValueKey('onboarding-next')).hitTestable(),
            findsOneWidget,
          );
          expect(repo.ids, isEmpty);
        });
      }
    }
  }
}
