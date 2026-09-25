import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/community/data/community_repository.dart';
import 'package:travyon/features/community/presentation/community_page.dart';

import 'community_route_design_test.dart' show host, viewport;
import 'community_test.dart' show FakeCommunity, publicPlan;
import 'widget_test.dart' show FakeTravelPlansRepository;

class FeedPreviewRepository extends FakeCommunity {
  FeedPreviewRepository(this.plans);
  final List<CommunityPlan> plans;
  @override
  Stream<List<CommunityPlan>> feed() => Stream.value(plans);
}

void main() {
  testWidgets('card keeps dark labels and separate profile and route actions', (
    tester,
  ) async {
    viewport(tester, const Size(390, 844));
    var opened = 0, profiles = 0;
    await tester.pumpWidget(
      host(
        Scaffold(
          body: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: CommunityPlanCard(
                plan: publicPlan(),
                onOpen: () => opened++,
                onProfile: () => profiles++,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      tester.renderObject<RenderParagraph>(find.text('Roma')).text.style!.color,
      AppColors.text,
    );
    expect(find.text('4.5 · 2 değerlendirme'), findsOneWidget);
    // A failed cover request leaves a neutral placeholder, not a broken image.
    expect(find.byIcon(Icons.landscape_outlined), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('community-profile-plan1')));
    expect(profiles, 1);
    expect(opened, 0);
    await tester.tap(find.byKey(const ValueKey('community-open-plan1')));
    expect(opened, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('private author and unknown city never invent public data', (
    tester,
  ) async {
    var profiles = 0;
    final plan = CommunityPlan('private', {
      ...publicPlan().data,
      'profilePublic': false,
      'userDisplayName': 'PRIVATE',
      'destination': 'Bilinmeyen bir şehir',
      'ratingCount': 0,
    });
    await tester.pumpWidget(
      host(
        Scaffold(
          body: CommunityPlanCard(
            plan: plan,
            onOpen: () {},
            onProfile: () => profiles++,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('PRIVATE'), findsNothing);
    expect(find.text('Gezgin'), findsOneWidget);
    expect(find.text('Henüz değerlendirme yok'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    expect(
      tester
          .widget<TextButton>(
            find.byKey(const ValueKey('community-profile-private')),
          )
          .onPressed,
      isNull,
    );
    expect(profiles, 0);
    expect(tester.takeException(), isNull);
  });

  for (final size in [const Size(320, 740), const Size(640, 360)]) {
    testWidgets('dark English feed remains usable at 200% on $size', (
      tester,
    ) async {
      viewport(tester, size);
      final repo = FakeCommunity();
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          Scaffold(
            body: CommunityPage(
              uid: 'me',
              repository: repo,
              plansRepository: FakeTravelPlansRepository([]),
            ),
          ),
          language: 'en',
          dark: true,
          scale: 2,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final scroll = find.byType(Scrollable).first;
      await tester.scrollUntilVisible(
        find.text('Explore route'),
        180,
        scrollable: scroll,
      );
      await tester.pumpAndSettle();
      expect(find.text('Explore route').hitTestable(), findsOneWidget);
      expect(find.text('4.5 · 2 reviews'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('My shares'),
        -180,
        scrollable: scroll,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('My shares'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Your story starts here'),
        180,
        scrollable: scroll,
      );
      expect(find.text('Your story starts here'), findsOneWidget);
      expect(repo.shares, 0);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'top routes preserve rating order and exclude own and unrated plans',
    (tester) async {
      final repo = FeedPreviewRepository([
        CommunityPlan('lower', {
          ...publicPlan().data,
          'destination': 'Alt rota',
          'avgRating': 3,
        }),
        CommunityPlan('own', {
          ...publicPlan('me').data,
          'destination': 'Kendi rotam',
        }),
        CommunityPlan('unrated', {
          ...publicPlan().data,
          'destination': 'Puansız rota',
          'ratingCount': 0,
        }),
        CommunityPlan('higher', {
          ...publicPlan().data,
          'destination': 'Üst rota',
          'avgRating': 5,
        }),
      ]);
      addTearDown(repo.events.close);
      await tester.pumpWidget(
        host(
          Scaffold(
            body: CommunityPage(
              uid: 'me',
              repository: repo,
              plansRepository: FakeTravelPlansRepository([]),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('community-filter-2')));
      await tester.pumpAndSettle();
      final cards = tester.widgetList<CommunityPlanCard>(
        find.byType(CommunityPlanCard),
      );
      expect(cards.map((card) => card.plan.id), ['higher', 'lower']);
      expect(
        tester
            .renderObject<RenderParagraph>(find.text('En beğenilen'))
            .text
            .style!
            .color,
        AppColors.text,
      );
      expect(repo.rated, 0);
      expect(tester.takeException(), isNull);
    },
  );
}
