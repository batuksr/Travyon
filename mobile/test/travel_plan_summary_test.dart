import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/features/plans/data/travel_plans_repository.dart';

void main() {
  test('parses the shared web plan document for the mobile hub', () {
    final summary = TravelPlanSummary.fromMap('plan-1', {
      'createdAt': 1789660800000,
      'customName': 'Endülüs Kaçamağı',
      'isFavorite': true,
      'onboardingData': {'startDate': '2026-09-18', 'endDate': '2026-09-20'},
      'plan': {
        'destination': 'Sevilla, İspanya',
        'currencySymbol': '€',
        'totalEstimatedCost': 190,
        'dailyPlans': [
          {
            'date': '2026-09-18',
            'activities': [{}, {}, {}],
          },
          {
            'date': '2026-09-19',
            'activities': [{}, {}],
          },
        ],
      },
    });

    expect(summary.id, 'plan-1');
    expect(summary.title, 'Endülüs Kaçamağı');
    expect(summary.destination, 'Sevilla, İspanya');
    expect(summary.dayCount, 2);
    expect(summary.activityCount, 5);
    expect(summary.estimatedCost, 190);
    expect(summary.startDate, '2026-09-18');
    expect(summary.isFavorite, isTrue);
  });
}
