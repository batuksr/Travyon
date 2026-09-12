import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

abstract final class TravyonDeepLinks {
  static final _openedPlans = StreamController<String>.broadcast();
  static StreamSubscription<Uri>? _subscription;
  static String? pendingPlanId;
  static String? _lastUri;

  static Stream<String> get openedPlans => _openedPlans.stream;

  static Future<void> initialize() async {
    if (_subscription != null || kIsWeb) return;
    final links = AppLinks();
    final initial = await links.getInitialLink();
    if (initial != null) _consume(initial);
    _subscription = links.uriLinkStream.listen(
      _consume,
      onError: (_) {
        /* An invalid operating-system intent is ignored. */
      },
    );
  }

  static String? parsePlanId(Uri uri) {
    final isWebLink =
        uri.scheme == 'https' &&
        uri.host == 'travyon-5fb01.web.app' &&
        uri.pathSegments.length == 2 &&
        uri.pathSegments.first == 'plan';
    final isCustomLink =
        uri.scheme == 'travyon' &&
        ((uri.host == 'plan' && uri.pathSegments.length == 1) ||
            (uri.host.isEmpty &&
                uri.pathSegments.length == 2 &&
                uri.pathSegments.first == 'plan'));
    if (!isWebLink && !isCustomLink) return null;
    final id = isWebLink
        ? uri.pathSegments[1]
        : uri.host == 'plan'
        ? uri.pathSegments.first
        : uri.pathSegments[1];
    return RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(id) ? id : null;
  }

  static void _consume(Uri uri) {
    if (_lastUri == uri.toString()) return;
    _lastUri = uri.toString();
    final id = parsePlanId(uri);
    if (id == null) return;
    pendingPlanId = id;
    _openedPlans.add(id);
  }

  static String? takePendingPlan() {
    final id = pendingPlanId;
    pendingPlanId = null;
    return id;
  }
}
