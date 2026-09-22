import 'dart:async';
import 'dart:convert';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/assistant/data/assistant_controller.dart';
import 'package:travyon/features/assistant/data/assistant_repository.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';

class AssistantFake implements TravelAssistantRepository {
  final calls = <({String question, String language, String? context})>[];
  final streams = <StreamController<String>>[];

  @override
  Stream<String> reply({
    required String question,
    required String language,
    String? context,
  }) {
    calls.add((question: question, language: language, context: context));
    final stream = StreamController<String>();
    streams.add(stream);
    return stream.stream;
  }

  Future<void> answer(String text) async {
    streams.last.add(text);
    await streams.last.close();
  }

  void dispose() {
    for (final stream in streams) {
      if (!stream.isClosed) unawaited(stream.close());
    }
  }
}

TravelPlanSummary assistantPlan({
  int days = 2,
  int stops = 2,
  String name = 'Kolezyum',
}) => TravelPlanSummary.fromMap('private-plan-id', {
  'wallet': 'PRIVATE',
  'onboardingData': {'email': 'PRIVATE', 'passport': 'PRIVATE'},
  'plan': {
    'destination': 'Roma, İtalya',
    'totalEstimatedCost': 199,
    'currencySymbol': '€',
    'reservationCode': 'PRIVATE',
    'dailyPlans': [
      for (var i = 0; i < days; i++)
        {
          'date': '2026-10-${i + 1}',
          'activities': [
            for (var j = 0; j < stops; j++)
              {
                'placeName': '$name $j',
                'period': 'Sabah',
                'note': 'PRIVATE',
                'actualCost': 987654,
                'description': 'PRIVATE',
              },
          ],
        },
    ],
  },
});

void main() {
  test(
    'context whitelists itinerary and omits private account and wallet fields',
    () {
      expect(assistantContext(null, []), isNull);
      final context = assistantContext(assistantPlan(), [
        (question: 'First question', answer: 'First answer'),
      ])!;
      for (final value in [
        'Roma',
        '199',
        'Kolezyum',
        'Day 1',
        'Day 2',
        'First question',
        'First answer',
      ]) {
        expect(context, contains(value));
      }
      for (final value in [
        'PRIVATE',
        'private-plan-id',
        '987654',
        'note',
        'passport',
      ]) {
        expect(context, isNot(contains(value)));
      }
    },
  );

  test('long itineraries and recent conversation fit callable limit with valid Unicode', () {
    final context = assistantContext(
      assistantPlan(days: 31, stops: 15, name: List.filled(100, '🧳').join()),
      [
        for (var i = 0; i < 30; i++)
          (
            question: 'Question $i ${List.filled(800, '🧳').join()}',
            answer: List.filled(1200, '🧳').join(),
          ),
      ],
    )!;
    expect(context.length, lessThanOrEqualTo(8000));
    expect(context, contains('The itinerary was shortened'));
    expect(context, contains('Question 29'));
    expect(context, isNot(contains('Question 0 ')));
    expect(utf8.decode(utf8.encode(context)), context);
    expect(assistantClip('x🧳hello', 2), 'x…');
  });

  late AssistantFake repository;
  late TravelAssistantController chat;
  setUp(() {
    repository = AssistantFake();
    chat = TravelAssistantController(repository);
  });
  tearDown(() {
    chat.dispose();
    repository.dispose();
  });

  test(
    'explicit sends only, validates input, and prevents duplicate requests',
    () async {
      expect(repository.calls, isEmpty);
      expect(chat.send('  ', language: 'tr'), isFalse);
      expect(chat.send(List.filled(2001, 'a').join(), language: 'tr'), isFalse);
      expect(chat.send('  Where?  ', language: 'en'), isTrue);
      expect(chat.send('duplicate', language: 'en'), isFalse);
      expect(repository.calls.single, (
        question: 'Where?',
        language: 'en',
        context: null,
      ));
      expect(chat.messages.length, 2);
      await repository.answer('Rome');
      expect(chat.busy, isFalse);
      expect(chat.messages.last.error, isNull);
    },
  );

  test(
    'accumulated stream replaces text including shorter model fallback',
    () async {
      chat.send('Where?', language: 'en');
      repository.streams.last.add('A long incomplete response');
      await Future<void>.delayed(Duration.zero);
      expect(chat.messages.last.text, 'A long incomplete response');
      expect(chat.busy, isTrue);
      repository.streams.last.add('Rome');
      await Future<void>.delayed(Duration.zero);
      expect(chat.messages.last.text, 'Rome');
      await repository.answer('Rome and Paris');
      expect(chat.messages.last.text, 'Rome and Paris');
      expect(chat.messages.last.pending, isFalse);
    },
  );

  test('followups send completed history and selected itinerary', () async {
    chat.send('First question', language: 'tr', plan: assistantPlan());
    await repository.answer('First answer');
    chat.send('More?', language: 'en', plan: assistantPlan());
    expect(repository.calls.last.context, contains('First question'));
    expect(repository.calls.last.context, contains('First answer'));
    expect(repository.calls.last.context, contains('Kolezyum'));
    expect(repository.calls.last.context, isNot(contains('More?')));
    expect(repository.calls.last.language, 'en');
  });

  test(
    'failure is sanitized and retry retains exactly one user turn',
    () async {
      chat.send('Retry me', language: 'en');
      repository.streams.last.add('Partial answer');
      repository.streams.last.addError(
        FirebaseFunctionsException(
          code: 'unavailable',
          message: 'PRIVATE INTERNAL ERROR',
        ),
      );
      await Future<void>.delayed(Duration.zero);
      expect(chat.busy, isFalse);
      expect(
        chat.messages.last.error,
        'Asistana ulaşılamadı. Bağlantını kontrol edip tekrar dene.',
      );
      chat.retry(language: 'en');
      expect(chat.messages.length, 2);
      expect(repository.calls.last.question, 'Retry me');
      expect(repository.calls.last.context, isNull);
      await repository.answer('Completed');
      expect(chat.messages.last.error, isNull);
    },
  );

  test(
    'empty final reply is retryable, failed turns never enter context',
    () async {
      chat.send('Failed question', language: 'tr');
      await repository.answer('');
      expect(chat.messages.last.error, isNotNull);
      chat.send('New question', language: 'tr');
      expect(repository.calls.last.context, isNull);
    },
  );

  test('clearing cancels old stream and resets conversation context', () async {
    chat.send('Old account', language: 'tr', plan: assistantPlan());
    final old = repository.streams.last;
    chat.clear();
    expect(old.hasListener, isFalse);
    expect(chat.busy, isFalse);
    expect(chat.messages, isEmpty);
    chat.send('New conversation', language: 'en');
    old.add('Stale response');
    await repository.answer('Fresh response');
    expect(chat.messages.length, 2);
    expect(chat.messages.last.text, 'Fresh response');
    expect(repository.calls.last.context, isNull);
  });

  testWidgets('absolute deadline stops stalled streams and allows retry', (
    tester,
  ) async {
    chat.send('Timeout?', language: 'tr');
    await tester.pump(const Duration(seconds: 106));
    expect(chat.busy, isFalse);
    expect(repository.streams.last.hasListener, isFalse);
    expect(chat.messages.last.error, 'Yanıt gecikti. Tekrar deneyebilirsin.');
    chat.retry(language: 'tr');
    expect(chat.busy, isTrue);
    chat.clear();
  });

  test(
    'conversation storage is bounded and preserves complete pairs',
    () async {
      for (var i = 0; i < 35; i++) {
        chat.send('Question $i', language: 'en');
        await repository.answer('Answer $i');
      }
      expect(chat.messages.length, 60);
      expect(chat.messages.first.text, 'Question 5');
      expect(chat.messages.last.text, 'Answer 34');
    },
  );
}
