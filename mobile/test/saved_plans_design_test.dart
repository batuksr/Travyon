import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/core/localization/app_localizations.dart';
import 'package:travyon/core/theme/app_theme.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';
import 'package:travyon/features/plans/presentation/saved_plans_page.dart';
import 'package:travyon/features/plans/presentation/saved_plan_card.dart';

import 'plans_notifications_test.dart' show FakeManagement, fixture;
import 'widget_test.dart' show FakeTravelPlansRepository;

void main() {
  Future<void> mount(
    WidgetTester tester,
    List<TravelPlanSummary> plans, {
    double scale = 1,
    VoidCallback? onCreate,
    ValueChanged<TravelPlanSummary>? onOpen,
    FakeManagement? manager,
    Locale locale = const Locale('tr'),
  }) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        locale: locale,
        supportedLocales: const [Locale('tr'), Locale('en')],
        localizationsDelegates: const [
          AppLocalizations.delegate,
          ...GlobalMaterialLocalizations.delegates,
        ],
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: Scaffold(
          body: SavedPlansPage(
            uid: 'me',
            repository: FakeTravelPlansRepository(plans),
            management: manager ?? FakeManagement(),
            onCreate: onCreate ?? () {},
            onOpen: onOpen ?? (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      180,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'empty library has one useful create action without idle filters',
    (tester) async {
      var created = false;
      await mount(tester, [], onCreate: () => created = true);
      expect(find.text('İlk rotana yer aç'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      expect(find.byType(ChoiceChip), findsNothing);
      await tester.tap(find.text('İlk planımı oluştur'));
      expect(created, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('empty library is fully localized in English', (tester) async {
    await mount(tester, [], locale: const Locale('en'));
    expect(find.text('My plans'), findsOneWidget);
    expect(find.text('Continue your next journey from here.'), findsOneWidget);
    expect(find.text('Start your first route'), findsOneWidget);
    expect(
      find.text('Choose a city to explore and let’s create your first route.'),
      findsOneWidget,
    );
    expect(find.text('Create my first plan'), findsOneWidget);
    expect(find.textContaining('İlk rotana'), findsNothing);
  });

  testWidgets('search, empty results and reset retain saved plans', (
    tester,
  ) async {
    await mount(tester, [fixture(), fixture(id: 'paris', city: 'Paris')]);
    await tester.enterText(find.byType(TextField), 'paris');
    await tester.pumpAndSettle();
    await reveal(tester, find.text('Paris'));
    expect(find.text('Roma'), findsNothing);
    await tester.enterText(find.byType(TextField), 'unknown');
    await tester.pumpAndSettle();
    expect(find.text('Eşleşen plan bulunamadı'), findsOneWidget);
    await reveal(tester, find.text('Tüm planları göster'));
    await tester.tap(find.text('Tüm planları göster'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
    expect(find.text('2 plan'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('filters have readable labels and favorite empty state resets', (
    tester,
  ) async {
    await mount(tester, [fixture()]);
    for (final label in ['Tümü', 'Favoriler']) {
      final text = tester.renderObject<RenderParagraph>(find.text(label));
      expect(
        text.text.style!.color,
        label == 'Tümü' ? Colors.white : AppColors.text,
      );
    }
    await tester.tap(find.text('Favoriler'));
    await tester.pumpAndSettle();
    expect(find.text('Favorilerin burada toplanır'), findsOneWidget);
    expect(
      tester
          .renderObject<RenderParagraph>(find.text('Favoriler'))
          .text
          .style!
          .color,
      Colors.white,
    );
    await reveal(tester, find.text('Tüm planları göster'));
    await tester.tap(find.text('Tüm planları göster'));
    await tester.pumpAndSettle();
    expect(find.byType(SavedPlanCard), findsOneWidget);
  });

  testWidgets('long title and double text size keep plan actions usable', (
    tester,
  ) async {
    final plan = fixture(
      city: 'Roma ve çevresinde uzun bir kültür ve tarih yolculuğu',
    );
    final manager = FakeManagement();
    TravelPlanSummary? opened;
    await mount(
      tester,
      [plan],
      scale: 2,
      manager: manager,
      onOpen: (p) => opened = p,
    );
    await reveal(tester, find.byTooltip('Favorilere ekle'));
    await tester.tap(find.byTooltip('Favorilere ekle'));
    await tester.pumpAndSettle();
    expect(manager.favoriteValue, isTrue);
    await reveal(tester, find.text('Planı aç'));
    await tester.tap(find.text('Planı aç'));
    expect(opened, plan);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty state supports double text size', (tester) async {
    await mount(tester, [], scale: 2);
    await reveal(tester, find.text('İlk planımı oluştur'));
    expect(find.text('İlk planımı oluştur').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('card dates and status reflect real travel dates', () {
    expect(savedPlanDate('2026-09-13'), '13 Eyl 2026');
    expect(savedPlanDate(''), isEmpty);
    final p = fixture(date: '2026-09-13');
    expect(savedPlanStatus(p, DateTime(2026, 9, 12)), 'Yaklaşan yolculuk');
    expect(
      savedPlanStatus(p, DateTime(2026, 9, 13, 23)),
      'Yolculuk devam ediyor',
    );
    expect(savedPlanStatus(p, DateTime(2026, 9, 14)), 'Geçmiş yolculuk');
  });
}
