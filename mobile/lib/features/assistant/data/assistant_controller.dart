import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../plans/data/travel_plans_repository.dart';
import 'assistant_repository.dart';

class AssistantMessage {
  const AssistantMessage({
    required this.id,
    required this.text,
    this.isUser = false,
    this.pending = false,
    this.error,
  });
  final int id;
  final String text;
  final bool isUser, pending;
  final String? error;
}

/// One in-memory conversation per launcher/account/plan. No persisted chat.
class TravelAssistantController extends ChangeNotifier {
  TravelAssistantController(this.repository);
  final TravelAssistantRepository repository;
  final _messages = <AssistantMessage>[];
  StreamSubscription<String>? _subscription;
  Timer? _deadline;
  bool _busy = false, _disposed = false;
  int _generation = 0, _nextId = 0;
  List<AssistantMessage> get messages => List.unmodifiable(_messages);
  bool get busy => _busy;

  bool send(String text, {required String language, TravelPlanSummary? plan}) {
    final question = text.trim();
    if (_disposed ||
        busy ||
        question.isEmpty ||
        question.length > assistantQuestionLimit) {
      return false;
    }
    final history = _history();
    _messages.add(
      AssistantMessage(id: _nextId++, text: question, isUser: true),
    );
    _messages.add(AssistantMessage(id: _nextId++, text: '', pending: true));
    if (_messages.length > 60) _messages.removeRange(0, _messages.length - 60);
    _start(question, language, assistantContext(plan, history));
    return true;
  }

  void retry({required String language, TravelPlanSummary? plan}) {
    if (_disposed ||
        busy ||
        _messages.length < 2 ||
        _messages.last.error == null) {
      return;
    }
    final question = _messages[_messages.length - 2].text;
    _messages[_messages.length - 1] = AssistantMessage(
      id: _messages.last.id,
      text: '',
      pending: true,
    );
    _start(question, language, assistantContext(plan, _history()));
  }

  List<({String question, String answer})> _history() => [
    for (var i = 0; i + 1 < _messages.length; i += 2)
      if (!_messages[i + 1].pending && _messages[i + 1].error == null)
        (question: _messages[i].text, answer: _messages[i + 1].text),
  ];

  void _start(String question, String language, String? context) {
    final generation = ++_generation;
    _busy = true;
    notifyListeners();
    void finish([Object? error]) {
      if (_disposed || generation != _generation || !busy) return;
      _busy = false;
      _deadline?.cancel();
      _subscription?.cancel();
      _subscription = null;
      final last = _messages.last;
      _messages[_messages.length - 1] = AssistantMessage(
        id: last.id,
        text: last.text,
        error: error != null
            ? assistantError(error)
            : last.text.trim().isEmpty
            ? 'Yanıt alınamadı. Sorunu tekrar gönderebilirsin.'
            : null,
      );
      notifyListeners();
    }

    _deadline = Timer(
      const Duration(seconds: 105),
      () => finish(TimeoutException('assistant')),
    );
    try {
      _subscription = repository
          .reply(question: question, language: language, context: context)
          .listen(
            (text) {
              if (_disposed || generation != _generation || !busy) return;
              _messages[_messages.length - 1] = AssistantMessage(
                id: _messages.last.id,
                text: assistantClip(text, 20000),
                pending: true,
              );
              notifyListeners();
            },
            onError: (Object error) => finish(error),
            onDone: () => finish(),
            cancelOnError: true,
          );
    } catch (error) {
      finish(error);
    }
  }

  void clear() {
    if (_disposed) return;
    _reset();
    notifyListeners();
  }

  void _reset() {
    _generation++;
    _deadline?.cancel();
    _subscription?.cancel();
    _subscription = null;
    _busy = false;
    _messages.clear();
  }

  @override
  void dispose() {
    _reset();
    _disposed = true;
    super.dispose();
  }
}
