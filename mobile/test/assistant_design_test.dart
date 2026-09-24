import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';
import 'package:travyon/core/firebase/auth_repository.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/assistant/data/assistant_controller.dart';
import 'package:travyon/features/assistant/presentation/assistant_launcher.dart';
import 'package:travyon/features/assistant/presentation/travel_assistant_page.dart';
import 'package:travyon/features/plans/presentation/plan_detail_page.dart';

import 'assistant_test.dart' show AssistantFake, assistantPlan;
import 'community_route_design_test.dart' show host, viewport;
import 'plan_detail_test.dart' show DetailFake;
import 'widget_test.dart' show FakeAuthRepository, FakeTravelPlansRepository;

void main() {
  test('assistant source UI and error literals have English translations', () {
    const english = AppLocalizations(Locale('en'));
    for (final file in Directory(
      'lib/features/assistant',
    ).listSync(recursive: true).whereType<File>()) {
      for (final line in file.readAsLinesSync()) {
        // Source strings with Turkish letters, excluding comments and imports.
        if (line.trimLeft().startsWith('//')) continue;
        for (final match in RegExp(
          r'''"([^"\n]*)"|'([^'\n]*)' '''.trim(),
        ).allMatches(line)) {
          final key = match.group(1) ?? match.group(2)!;
          if (!RegExp('[çğıİöşüÇĞÖŞÜ]').hasMatch(key)) continue;
          expect(english.text(key), isNot(key), reason: '${file.path}: $key');
        }
      }
    }
  });

  for (final language in ['tr', 'en']) {
    for (final dark in [false, true]) {
      testWidgets(
        'assistant fits narrow $language dark=$dark at 200% with keyboard',
        (tester) async {
          viewport(tester, const Size(320, 740));
          final repository = AssistantFake();
          final chat = TravelAssistantController(repository);
          addTearDown(chat.dispose);
          addTearDown(repository.dispose);
          await tester.pumpWidget(
            host(
              TravelAssistantPage(
                controller: chat,
                plan: dark ? assistantPlan() : null,
              ),
              language: language,
              dark: dark,
              scale: 2,
            ),
          );
          await tester.pumpAndSettle();
          expect(repository.calls, isEmpty);
          expect(find.byType(CircleAvatar), findsNothing);
          expect(find.textContaining('Google Gemini'), findsNothing);
          expect(find.text('Seyahat asistanı'), findsNothing);
          expect(find.text('Travel assistant'), findsNothing);
          expect(
            find.byTooltip(language == 'en' ? 'Clear chat' : 'Sohbeti temizle'),
            findsNothing,
          );
          expect(
            find.descendant(
              of: find.byKey(const ValueKey('assistant-suggestions')),
              matching: find.byType(OutlinedButton),
            ),
            findsNWidgets(3),
          );
          expect(find.byIcon(Icons.north_east_rounded), findsNothing);
          await tester.tap(
            find.byTooltip(
              language == 'en' ? 'About the assistant' : 'Asistan hakkında',
            ),
          );
          await tester.pumpAndSettle();
          const english = AppLocalizations(Locale('en'));
          final disclosure = dark
              ? 'Mesajların ve planının özeti, yanıt için Google Gemini ile paylaşılır.'
              : 'Mesajların, yanıt için Google Gemini ile paylaşılır.';
          expect(
            find.text(language == 'en' ? english.text(disclosure) : disclosure),
            findsOneWidget,
          );
          expect(repository.calls, isEmpty);
          expect(tester.takeException(), isNull);
          await tester.binding.handlePopRoute();
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          final input = find.byKey(const ValueKey('assistant-input'));
          await tester.enterText(input, 'A question');
          tester.view.viewInsets = const FakeViewPadding(bottom: 280);
          addTearDown(tester.view.resetViewInsets);
          await tester.pump();
          expect(tester.getBottomRight(input).dy, lessThanOrEqualTo(460));
          await tester.tap(find.byKey(const ValueKey('assistant-send')));
          await tester.pumpAndSettle();
          expect(repository.calls, isEmpty);
          tester.view.resetViewInsets();
          await tester.pumpAndSettle();
          final consent = find.text(
            language == 'en' ? 'Accept and send' : 'Kabul et ve gönder',
          );
          await tester.ensureVisible(consent);
          await tester.tap(consent);
          await tester.pump();
          expect(repository.calls.single.language, language);
          expect(repository.calls.single.context == null, !dark);
          expect(find.byKey(const ValueKey('assistant-welcome')), findsNothing);
          expect(
            tester
                .widget<IconButton>(
                  find.byKey(const ValueKey('assistant-send')),
                )
                .onPressed,
            isNull,
          );
          repository.streams.last.add('Partial');
          await tester.pump();
          await tester.pump();
          expect(find.text('Partial'), findsOneWidget);
          repository.streams.last.add('Complete answer');
          repository.streams.last.close();
          await tester.pumpAndSettle();
          expect(find.text('Partial'), findsNothing);
          expect(find.text('Complete answer'), findsOneWidget);
          for (final chip in tester.widgetList<ActionChip>(
            find.byType(ActionChip),
          )) {
            final label = (chip.label as Text).data!;
            final chipFinder = find.widgetWithText(ActionChip, label);
            final richText = tester.widget<RichText>(
              find
                  .descendant(of: chipFinder, matching: find.byType(RichText))
                  .first,
            );
            final foreground = richText.text.style?.color;
            expect(
              foreground,
              isNotNull,
              reason: 'Follow-up "$label" needs a resolved text color',
            );
            final colors = tester.element(chipFinder).colors;
            final background = chip.backgroundColor ?? colors.surface;
            final luminances = [
              foreground!.computeLuminance(),
              background.computeLuminance(),
            ]..sort();
            final contrast =
                (luminances.last + 0.05) / (luminances.first + 0.05);
            expect(
              contrast,
              greaterThanOrEqualTo(4.5),
              reason: 'Follow-up "$label" must be readable in dark=$dark',
            );
          }
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('landscape composer stays visible with large text and keyboard', (
    tester,
  ) async {
    viewport(tester, const Size(640, 360));
    final repository = AssistantFake();
    final chat = TravelAssistantController(repository);
    addTearDown(chat.dispose);
    addTearDown(repository.dispose);
    await tester.pumpWidget(
      host(TravelAssistantPage(controller: chat), language: 'en', scale: 2),
    );
    await tester.enterText(find.byType(TextField), 'Question');
    tester.view.viewInsets = const FakeViewPadding(bottom: 160);
    addTearDown(tester.view.resetViewInsets);
    await tester.pump();
    expect(
      tester.getBottomRight(find.byType(TextField)).dy,
      lessThanOrEqualTo(200),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'suggestion uses displayed language, error retries and clear requires confirmation',
    (tester) async {
      viewport(tester, const Size(390, 844));
      final repository = AssistantFake();
      final chat = TravelAssistantController(repository);
      addTearDown(chat.dispose);
      addTearDown(repository.dispose);
      await tester.pumpWidget(
        host(
          TravelAssistantPage(controller: chat, plan: assistantPlan()),
          language: 'en',
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('My days'));
      await tester.pumpAndSettle();
      expect(repository.calls, isEmpty);
      await tester.tap(find.text('Accept and send'));
      await tester.pump();
      expect(repository.calls.single.question, 'Which of my days is busiest?');
      repository.streams.last.addError(Exception('PRIVATE'));
      await tester.pumpAndSettle();
      expect(find.textContaining('PRIVATE'), findsNothing);
      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(repository.calls.length, 2);
      expect(chat.messages.length, 2);
      repository.streams.last.add('Completed');
      repository.streams.last.close();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Clear chat'));
      await tester.pumpAndSettle();
      expect(chat.messages.length, 2);
      await tester.tap(find.text('Clear chat').last);
      await tester.pumpAndSettle();
      expect(chat.messages, isEmpty);
      expect(find.text('Let’s talk about your trip.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'launcher retains chat on close and resets it for a different account',
    (tester) async {
      final repository = AssistantFake();
      addTearDown(repository.dispose);
      Widget launcher(String uid) => host(
        Scaffold(
          body: AssistantLauncher(uid: uid, repository: repository),
        ),
      );
      await tester.pumpWidget(launcher('one'));
      await tester.tap(find.byTooltip('Asistana sor'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Özel mesaj');
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('assistant-send')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Kabul et ve gönder'));
      await tester.pump();
      repository.streams.last.add('Özel yanıt');
      repository.streams.last.close();
      await tester.pumpAndSettle();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Asistana sor'));
      await tester.pumpAndSettle();
      expect(find.text('Özel yanıt'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tester.pumpWidget(launcher('two'));
      await tester.tap(find.byTooltip('Asistana sor'));
      await tester.pumpAndSettle();
      expect(find.text('Özel yanıt'), findsNothing);
      expect(repository.calls.length, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('account change closes an open chat and cancels its response', (
    tester,
  ) async {
    final repository = AssistantFake();
    addTearDown(repository.dispose);
    Widget launcher(String uid) => host(
      Scaffold(
        body: AssistantLauncher(uid: uid, repository: repository),
      ),
    );
    await tester.pumpWidget(launcher('one'));
    await tester.tap(find.byTooltip('Asistana sor'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Old conversation');
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('assistant-send')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Kabul et ve gönder'));
    await tester.pump();
    final old = repository.streams.single;
    expect(old.hasListener, isTrue);
    await tester.pumpWidget(launcher('two'));
    await tester.pumpAndSettle();
    expect(find.byType(TravelAssistantPage), findsNothing);
    expect(old.hasListener, isFalse);
    old.add('Late private reply');
    await tester.tap(find.byTooltip('Asistana sor'));
    await tester.pumpAndSettle();
    expect(find.text('Late private reply'), findsNothing);
    expect(
      tester
          .widget<TravelAssistantPage>(find.byType(TravelAssistantPage))
          .controller
          .messages,
      isEmpty,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('home opens general assistant without triggering a request', (
    tester,
  ) async {
    viewport(tester, const Size(320, 740));
    await tester.pumpWidget(
      TravyonApp(
        authRepository: FakeAuthRepository(
          session: const AuthSession(
            uid: 'test-user',
            email: 'traveler@example.com',
            displayName: 'Traveler',
            emailVerified: true,
          ),
        ),
        travelPlansRepository: FakeTravelPlansRepository(const []),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(FloatingActionButton), findsNothing);
    expect(find.text('Travyon AI'), findsNothing);
    final assistant = find.byTooltip('Asistana sor');
    final notifications = find.byTooltip('Bildirimler');
    expect(
      find.ancestor(of: assistant, matching: find.byType(AppBar)),
      findsOneWidget,
    );
    expect(tester.getCenter(assistant).dy, tester.getCenter(notifications).dy);
    expect(
      tester.getCenter(assistant).dx,
      lessThan(tester.getCenter(notifications).dx),
    );
    expect(tester.getSize(assistant).width, lessThanOrEqualTo(48));
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('Asistana sor'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TravelAssistantPage>(find.byType(TravelAssistantPage)).plan,
      isNull,
    );
    expect(find.text('Nereye gidelim?'), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Planlar'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Asistana sor'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'plan entry uses that itinerary and preserves selected day on return',
    (tester) async {
      viewport(tester, const Size(360, 800));
      await tester.pumpWidget(
        host(
          PlanDetailPage(
            uid: 'test',
            planId: 'p1',
            repository: DetailFake(),
            initialDayIndex: 1,
          ),
        ),
      );
      await tester.pumpAndSettle();
      final launcher = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.auto_awesome_rounded),
      );
      expect(launcher.style?.backgroundColor?.resolve({}), isNull);
      await tester.tap(find.byTooltip('Asistana sor'));
      await tester.pumpAndSettle();
      final page = tester.widget<TravelAssistantPage>(
        find.byType(TravelAssistantPage),
      );
      expect(page.plan!.id, 'p1');
      expect(page.controller.messages, isEmpty);
      expect(find.text('Roma, İtalya'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(
        tester.widgetList<ChoiceChip>(find.byType(ChoiceChip)).last.selected,
        isTrue,
      );
      await tester.tap(find.text('Rota'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Asistana sor'), findsNothing);
      await tester.tap(find.text('Günlük plan'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Asistana sor'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
