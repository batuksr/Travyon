import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/core/widgets/travyon_ui.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/community/presentation/community_plan_page.dart';
import 'package:travyon/features/community/presentation/traveler_page.dart';
import 'package:travyon/features/community/presentation/traveler_profile_widgets.dart';

import 'community_test.dart' show FakeCommunity, publicPlan;
import 'community_route_design_test.dart' show host, viewport;

TravelerProfile testProfile({
  bool public = true,
  bool exists = true,
  String name = 'Ada Deniz',
}) => TravelerProfile('other', {
  'exists': exists,
  'isPublic': public,
  'displayName': name,
  'email': 'PRIVATE',
  'address': 'PRIVATE',
});

class TravelerRepository extends FakeCommunity {
  TravelerProfile person = testProfile();
  final followEvents = StreamController<Set<String>>.broadcast();
  final planEvents = StreamController<List<CommunityPlan>>.broadcast();
  Set<String> currentFollowing = {};
  List<CommunityPlan> currentPlans = [publicPlan()];
  bool failProfile = false,
      failPlans = false,
      failFollowing = false,
      failFollow = false;
  int profileLoads = 0, planLoads = 0, followingLoads = 0;
  final mutations = <(String, String, bool)>[];
  Completer<void>? pendingFollow;
  @override
  Future<TravelerProfile> profile(String uid) async {
    profileLoads++;
    if (failProfile) throw StateError('offline');
    return person;
  }

  @override
  Stream<List<CommunityPlan>> sharedBy(String uid, {bool own = false}) async* {
    planLoads++;
    if (failPlans) throw StateError('offline');
    yield currentPlans;
    yield* planEvents.stream;
  }

  @override
  Stream<Set<String>> following(String uid) async* {
    followingLoads++;
    if (failFollowing) throw StateError('offline');
    yield currentFollowing;
    yield* followEvents.stream;
  }

  @override
  Future<void> follow(String uid, String target, bool value) async {
    mutations.add((uid, target, value));
    await pendingFollow?.future;
    if (failFollow) throw StateError('offline');
    currentFollowing = {...currentFollowing};
    value ? currentFollowing.add(target) : currentFollowing.remove(target);
    followEvents.add(currentFollowing);
  }

  Future<void> close() async {
    await events.close();
    await followEvents.close();
    await planEvents.close();
  }
}

Finder scroll() => find
    .descendant(
      of: find.byKey(const PageStorageKey('traveler-other')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> reveal(
  WidgetTester tester,
  Finder target, {
  bool up = false,
}) async {
  await tester.scrollUntilVisible(
    target,
    up ? -200 : 200,
    scrollable: scroll(),
    maxScrolls: 80,
  );
  await tester.pumpAndSettle();
}

Widget page(
  TravelerRepository repo, {
  String uid = 'me',
  String target = 'other',
}) => TravelerPage(uid: uid, target: target, repository: repo);

void main() {
  for (final dark in [false, true]) {
    testWidgets('neutral profile and following states dark=$dark', (
      tester,
    ) async {
      viewport(tester, const Size(390, 844));
      final repo = TravelerRepository()..currentFollowing = {'other'};
      addTearDown(repo.close);
      await tester.pumpWidget(host(page(repo), dark: dark));
      await tester.pumpAndSettle();
      final colors = tester.element(find.byType(TravelerPage)).colors;
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('traveler-name')))
            .style!
            .color,
        colors.text,
      );
      expect(
        tester.widget(find.byKey(const ValueKey('traveler-statistics'))),
        isA<TravyonSurface>(),
      );
      final follow = tester.widget<FilledButton>(
        find.byKey(const ValueKey('traveler-follow')),
      );
      expect(follow.style!.backgroundColor!.resolve({}), colors.surface);
      expect(follow.style!.foregroundColor!.resolve({}), colors.text);
      expect(follow.style!.shape!.resolve({}), isA<StadiumBorder>());
      await reveal(tester, find.text('Rotayı keşfet'));
      expect(
        tester.widget<Text>(find.text('Rotayı keşfet')).style!.color,
        colors.text,
      );
      repo.followEvents.addError(StateError('offline'));
      await tester.pumpAndSettle();
      await reveal(tester, find.text('Takip durumu alınamadı.'), up: true);
      expect(
        tester.widget<Text>(find.text('Takip durumu alınamadı.')).style!.color,
        colors.muted,
      );
      final retry = tester.widget<TextButton>(
        find.byKey(const ValueKey('traveler-follow-retry')),
      );
      expect(retry.style!.foregroundColor!.resolve({}), colors.text);
      expect(repo.mutations, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  test(
    'stats count public routes, planned days and unique normalized cities',
    () {
      final plans = [
        CommunityPlan('1', {
          ...publicPlan().data,
          'destination': 'Paris, Fransa',
        }),
        CommunityPlan('2', {
          ...publicPlan().data,
          'destination': ' paris , France',
        }),
        CommunityPlan('3', {
          ...publicPlan().data,
          'destination': 'Roma, İtalya',
        }),
      ];
      final stats = TravelerStats(plans);
      expect(stats.routes, 3);
      expect(stats.days, 3);
      expect(stats.cities, ['Paris', 'Roma']);
      expect(TravelerStats([]).cities, isEmpty);
      expect(travelerInitials('  Ada  Deniz '), 'AD');
      expect(travelerInitials('👩🏽‍🚀 Explorer'), '👩🏽‍🚀E');
      expect(travelerInitials('  '), 'T');
    },
  );

  test(
    'public photo uses HTTPS only and private identities never expose a photo',
    () {
      for (final url in [
        'http://example.com/a.jpg',
        'file:///secret',
        'https://',
        'javascript:alert(1)',
        'https://name:password@example.com/a.jpg',
      ]) {
        expect(
          TravelerProfile('other', {
            ...testProfile().data,
            'photoURL': url,
          }).photoUrl,
          isNull,
        );
      }
      expect(
        TravelerProfile('other', {
          ...testProfile().data,
          'photoURL': 'https://example.com/a.jpg',
        }).photoUrl,
        'https://example.com/a.jpg',
      );
      expect(
        TravelerProfile('other', {
          ...testProfile(public: false).data,
          'photoURL': 'https://example.com/a.jpg',
        }).photoUrl,
        isNull,
      );
      expect(testProfile(name: ' ').name, 'Gezgin');
      expect(testProfile(public: false, name: 'PRIVATE').name, 'Gizli profil');
    },
  );

  for (final language in ['tr', 'en']) {
    for (final dark in [false, true]) {
      for (final size in [const Size(320, 740), const Size(640, 360)]) {
        testWidgets(
          'profile $language dark=$dark $size at 200% fits and opens routes',
          (tester) async {
            viewport(tester, size);
            final repo = TravelerRepository()
              ..person = testProfile(name: 'Ada Deniz Çok Uzun Bir Gezgin Adı');
            addTearDown(repo.close);
            await tester.pumpWidget(
              host(page(repo), language: language, dark: dark, scale: 2),
            );
            await tester.pumpAndSettle();
            expect(find.byType(TravelerProfileCard), findsOneWidget);
            await reveal(tester, find.byKey(const ValueKey('traveler-name')));
            expect(
              find.text('Ada Deniz Çok Uzun Bir Gezgin Adı'),
              findsOneWidget,
            );
            await reveal(
              tester,
              find.text(language == 'en' ? 'Planned days' : 'Planlanan gün'),
            );
            expect(
              find.text(language == 'en' ? 'Shared routes' : 'Paylaşılan rota'),
              findsWidgets,
            );
            expect(tester.takeException(), isNull);
            await reveal(
              tester,
              find.byKey(const ValueKey('traveler-route-plan1')),
            );
            expect(find.byType(TravelerRouteCard), findsOneWidget);
            expect(
              find.text(
                language == 'en' ? '4.5 · 2 reviews' : '4,5 · 2 değerlendirme',
              ),
              findsOneWidget,
            );
            expect(find.textContaining('PRIVATE'), findsNothing);
            expect(repo.mutations, isEmpty);
            await tester.tap(
              find.byKey(const ValueKey('traveler-route-plan1')),
            );
            await tester.pumpAndSettle();
            expect(find.byType(CommunityPlanPage), findsOneWidget);
            expect(tester.takeException(), isNull);
            await tester.tap(find.byType(BackButton));
            await tester.pumpAndSettle();
            expect(repo.profileLoads, 1);
            expect(repo.planLoads, 1);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'follow waits for completion, blocks double tap and unfollow needs confirmation',
    (tester) async {
      viewport(tester, const Size(390, 850));
      final repo = TravelerRepository()..pendingFollow = Completer<void>();
      addTearDown(repo.close);
      await tester.pumpWidget(host(page(repo)));
      await tester.pumpAndSettle();
      final button = find.byKey(const ValueKey('traveler-follow'));
      await reveal(tester, button);
      await tester.tap(button);
      await tester.pump();
      expect(repo.mutations, [('me', 'other', true)]);
      expect(tester.widget<FilledButton>(button).onPressed, isNull);
      repo.pendingFollow!.complete();
      await tester.pumpAndSettle();
      expect(find.text('Takip ediliyor'), findsOneWidget);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(find.text('Takipten çık?'), findsOneWidget);
      await tester.tap(find.text('Vazgeç'));
      await tester.pumpAndSettle();
      expect(repo.mutations.length, 1);
      await tester.tap(button);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Takipten çık'));
      await tester.pumpAndSettle();
      expect(repo.mutations.last, ('me', 'other', false));
      expect(find.text('Takip et'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('follow failure keeps canonical state and can be retried', (
    tester,
  ) async {
    final repo = TravelerRepository()..failFollow = true;
    addTearDown(repo.close);
    await tester.pumpWidget(host(page(repo), language: 'en'));
    await tester.pumpAndSettle();
    final button = find.byKey(const ValueKey('traveler-follow'));
    await reveal(tester, button);
    await tester.tap(button);
    await tester.pumpAndSettle();
    expect(find.text('Follow'), findsOneWidget);
    expect(
      find.textContaining('Could not complete the action.'),
      findsOneWidget,
    );
    repo.failFollow = false;
    await tester.tap(button);
    await tester.pumpAndSettle();
    expect(find.text('Following'), findsOneWidget);
    expect(repo.mutations.length, 2);
  });

  testWidgets(
    'profile, following and route errors each retry without showing false zero stats',
    (tester) async {
      final repo = TravelerRepository()..failProfile = true;
      addTearDown(repo.close);
      await tester.pumpWidget(host(page(repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('Could not load profile'), findsOneWidget);
      expect(repo.planLoads, 0);
      repo.failProfile = false;
      repo.failFollowing = repo.failPlans = true;
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.byType(TravelerProfileCard), findsOneWidget);
      expect(
        tester
            .widget<TravelerProfileCard>(find.byType(TravelerProfileCard))
            .stats,
        isNull,
      );
      await reveal(tester, find.byKey(const ValueKey('traveler-follow-retry')));
      repo.failFollowing = false;
      await tester.tap(find.byKey(const ValueKey('traveler-follow-retry')));
      await tester.pumpAndSettle();
      expect(repo.followingLoads, 2);
      await reveal(tester, find.text('Could not load routes'));
      repo.failPlans = false;
      await tester.ensureVisible(find.text('Try again'));
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(repo.planLoads, 2);
      await reveal(tester, find.byType(TravelerProfileCard), up: true);
      expect(
        tester
            .widget<TravelerProfileCard>(find.byType(TravelerProfileCard))
            .stats!
            .routes,
        1,
      );
    },
  );

  testWidgets(
    'private/missing profiles reveal no identity or routes; existing follow can be removed',
    (tester) async {
      final repo = TravelerRepository()
        ..person = testProfile(public: false, name: 'PRIVATE');
      addTearDown(repo.close);
      repo.currentFollowing = {'other'};
      await tester.pumpWidget(host(page(repo), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('This profile is private'), findsOneWidget);
      expect(find.textContaining('PRIVATE'), findsNothing);
      expect(find.byType(TravelerProfileCard), findsNothing);
      expect(find.byType(Image), findsNothing);
      expect(repo.planLoads, 0);
      await tester.tap(find.byKey(const ValueKey('traveler-follow')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Unfollow'));
      await tester.pumpAndSettle();
      expect(repo.mutations, [('me', 'other', false)]);
      expect(find.byKey(const ValueKey('traveler-follow')), findsNothing);
      final missing = TravelerRepository()
        ..person = testProfile(exists: false, name: 'PRIVATE');
      addTearDown(missing.close);
      await tester.pumpWidget(host(page(missing), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.text('Traveler not found'), findsOneWidget);
      expect(missing.planLoads, 0);
      expect(find.textContaining('PRIVATE'), findsNothing);
    },
  );

  testWidgets(
    'own empty profile has no follow; live shares update stats and city stamps',
    (tester) async {
      final repo = TravelerRepository()..currentPlans = [];
      addTearDown(repo.close);
      await tester.pumpWidget(host(page(repo, uid: 'other'), language: 'en'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('traveler-follow')), findsNothing);
      await reveal(tester, find.text('No shared routes yet'));
      final plans = [
        for (var i = 0; i < 5; i++)
          CommunityPlan('plan$i', {
            ...publicPlan().data,
            'destination': 'City $i, Country',
          }),
      ];
      repo.planEvents.add(plans);
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byKey(const ValueKey('traveler-all-cities')),
        up: true,
      );
      expect(find.text('City 4'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('traveler-all-cities')));
      await tester.pumpAndSettle();
      expect(find.text('City 4'), findsOneWidget);
      expect(
        tester
            .widget<TravelerProfileCard>(find.byType(TravelerProfileCard))
            .stats!
            .routes,
        5,
      );
      expect(repo.mutations, isEmpty);
    },
  );

  testWidgets('broken public avatar falls back to initials', (tester) async {
    final repo = TravelerRepository()
      ..person = TravelerProfile('other', {
        ...testProfile().data,
        'photoURL': 'https://example.invalid/avatar.png',
      });
    addTearDown(repo.close);
    await tester.pumpWidget(host(page(repo)));
    await tester.pumpAndSettle();
    expect(find.text('AD'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
