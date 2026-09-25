import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/preferences/app_unit_controller.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/notifications/data/notification_repository.dart';
import 'package:travyon/features/notifications/presentation/notifications_page.dart';
import 'package:travyon/features/notifications/presentation/travel_notice_card.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';
import 'package:travyon/features/plans/presentation/plan_weather_sheet.dart';

import 'plans_notifications_test.dart' show fixture, FakeNotifications;
import 'widget_test.dart' show FakeTravelPlansRepository;
import 'plan_weather_test.dart' as weather_fixture;
import 'travel_checklist_test.dart' show ChecklistFake;

void main() {
  test(
    'ticket search matches web provider and encodes place and city as data',
    () {
      const place = 'Müze & ?q=other#test';
      final uri = ticketSearchUri(place, 'Roma, İtalya');
      expect(uri.scheme, 'https');
      expect(uri.host, 'www.getyourguide.com');
      expect(uri.path, '/s/');
      expect(uri.queryParameters['q'], '$place, Roma, İtalya');
      expect(uri.queryParameters['locale_autoredirect_optout'], '1');
      expect(uri.fragment, isEmpty);
      final notices = buildTravelNotices([fixture(spent: 85)], DateTime.now());
      expect(
        notices.firstWhere((n) => n.kind == TravelNoticeKind.trip).destination,
        NoticeDestination.checklist,
      );
      expect(
        notices
            .firstWhere((n) => n.kind == TravelNoticeKind.budget)
            .destination,
        NoticeDestination.budget,
      );
      final ticket = notices.firstWhere(
        (n) => n.kind == TravelNoticeKind.ticket,
      );
      expect(ticket.actionUri?.queryParameters['q'], 'Kolezyum, Roma');
    },
  );

  for (final english in [false, true]) {
    testWidgets('notification actions work at narrow large text ($english)', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = FakeNotifications();
      addTearDown(repository.changes.close);
      final units = AppUnitController.testing(tempCelsius: false);
      addTearDown(units.dispose);
      final forecast = weather_fixture.WeatherFake();
      NoticeDestination? destination;
      String? planId;
      Uri? launched;
      var failLaunch = true;
      await tester.pumpWidget(
        AppUnitScope(
          controller: units,
          child: MaterialApp(
            theme: english ? AppTheme.dark : AppTheme.light,
            locale: Locale(english ? 'en' : 'tr'),
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
            home: NotificationsPage(
              uid: 'user',
              repository: repository,
              plansRepository: FakeTravelPlansRepository([fixture(spent: 85)]),
              weatherRepository: forecast,
              onOpen: (plan) => planId = plan.id,
              onOpenDestination: (plan, target) {
                planId = plan.id;
                destination = target;
              },
              onSettings: () {},
              onOpenExternal: (uri) async {
                launched = uri;
                return !failLaunch;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.tune), findsNothing);
      expect(find.byIcon(Icons.refresh), findsNothing);
      expect(find.text('Yolculuğun güncel kalsın'), findsNothing);
      expect(find.text('Stay on top of your trip'), findsNothing);
      expect(
        find.text(
          english
              ? 'Your tickets, preparations and travel updates.'
              : 'Biletlerin, hazırlıkların ve seyahatinden son bilgiler.',
        ),
        findsOneWidget,
      );
      final list = find
          .descendant(
            of: find.byType(ListView).first,
            matching: find.byType(Scrollable),
          )
          .first;
      Future<void> tapLabel(String label) async {
        final target = find.text(label);
        await tester.scrollUntilVisible(
          target,
          160,
          scrollable: list,
          maxScrolls: 80,
        );
        await tester.ensureVisible(target);
        await tester.pumpAndSettle();
        await tester.tap(target);
        await tester.pumpAndSettle();
      }

      await tapLabel(english ? 'Travel checklist' : 'Hazırlık listesi');
      expect(destination, NoticeDestination.checklist);
      expect(planId, 'rome');
      await tapLabel(english ? 'Review budget' : 'Bütçeyi incele');
      expect(destination, NoticeDestination.budget);
      await tapLabel(english ? 'Find tickets' : 'Bilet al');
      expect(launched?.host, 'www.getyourguide.com');
      expect(launched?.queryParameters['q'], 'Kolezyum, Roma');
      expect(
        find.text(
          english
              ? 'Could not open the link. Try again.'
              : 'Bağlantı açılamadı. Tekrar dene.',
        ),
        findsOneWidget,
      );
      expect(repository.hidden, isEmpty);
      failLaunch = false;
      await tester.pump(const Duration(seconds: 5));
      await tapLabel(english ? 'Find tickets' : 'Bilet al');
      expect(forecast.calls, 0);
      // Open weather without pumpAndSettle while the response is pending.
      final weatherButton = find.text(
        english ? 'View weather' : 'Hava durumunu gör',
      );
      await tester.scrollUntilVisible(
        weatherButton,
        180,
        scrollable: list,
        maxScrolls: 80,
      );
      await tester.ensureVisible(weatherButton);
      await tester.pumpAndSettle();
      await tester.tap(weatherButton);
      await tester.pump();
      forecast.pending.complete(weather_fixture.report());
      await tester.pumpAndSettle();
      expect(find.byType(PlanWeatherSheet), findsOneWidget);
      expect(forecast.calls, 1);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byType(PlanWeatherSheet), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'external link is opened only once while waiting, without dismissing the card',
    (tester) async {
      final repository = FakeNotifications();
      addTearDown(repository.changes.close);
      final pending = Completer<bool>();
      var calls = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: NotificationsPage(
            uid: 'user',
            repository: repository,
            plansRepository: FakeTravelPlansRepository([fixture()]),
            onOpen: (_) {},
            onSettings: () {},
            onOpenExternal: (_) {
              calls++;
              return pending.future;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Bilet al'), 180);
      await tester.ensureVisible(find.text('Bilet al'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bilet al'));
      await tester.pump();
      final card = tester
          .widgetList<TravelNoticeCard>(find.byType(TravelNoticeCard))
          .firstWhere((card) => card.notice.kind == TravelNoticeKind.ticket);
      expect(card.opening, isTrue);
      expect(card.onAction, isNull);
      expect(calls, 1);
      pending.complete(true);
      await tester.pumpAndSettle();
      expect(repository.hidden, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  for (final tab in [PlanDetailTab.checklist, PlanDetailTab.budget]) {
    testWidgets('plan can open directly in $tab', (tester) async {
      final checklist = ChecklistFake();
      addTearDown(checklist.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: PlanDetailPage(
            uid: 'user',
            planId: 'rome',
            repository: FakeTravelPlansRepository([fixture(spent: 85)]),
            initialTab: tab,
            checklistRepository: checklist,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        tab.index,
      );
      expect(
        find.text(
          tab == PlanDetailTab.checklist ? 'Seyahat listesi' : 'Gerçek harcama',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }
}
