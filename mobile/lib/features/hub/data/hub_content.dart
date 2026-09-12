import '../../onboarding/data/onboarding_data.dart';
import '../../plans/data/travel_plans_repository.dart';

class HubCity {
  const HubCity(this.name, this.country, this.caption, this.photo);
  final String name, country, caption, photo;
  String get destination => '$name, $country';
  String get imageUrl =>
      'https://images.unsplash.com/$photo?auto=format&fit=crop&w=600&q=80';
}

// The same destination photos used in web/src/data/cityGuideVisuals.ts.
const hubCities = [
  HubCity('Roma', 'İtalya', 'Tarihin izinde', 'photo-1552832230-c0197dd311b5'),
  HubCity(
    'İstanbul',
    'Türkiye',
    'İki kıta, bir yolculuk',
    'photo-1524231757912-21f4fe3a7200',
  ),
  HubCity(
    'Paris',
    'Fransa',
    'Sokak sokak keşfet',
    'photo-1502602898657-3e91760cbb34',
  ),
  HubCity(
    'Barselona',
    'İspanya',
    'Şehrin renklerini izle',
    'photo-1583422409516-2895a77efded',
  ),
];

OnboardingData weekendDraft(DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  final offset = (DateTime.saturday - today.weekday + 7) % 7;
  // Saturday means this weekend; Sunday means the next full weekend.
  final saturday = DateTime(today.year, today.month, today.day + offset);
  final sunday = DateTime(saturday.year, saturday.month, saturday.day + 1);
  return OnboardingData()
    ..startDate = dateKey(saturday)
    ..endDate = dateKey(sunday)
    ..travelType = 'sehir_kacamagi';
}

bool isTravelingToday(TravelPlanSummary plan, DateTime now) {
  final start = DateTime.tryParse(plan.startDate);
  final end = DateTime.tryParse(plan.endDate);
  if (start == null || end == null) return false;
  final today = DateTime(now.year, now.month, now.day);
  return !today.isBefore(DateTime(start.year, start.month, start.day)) &&
      !today.isAfter(DateTime(end.year, end.month, end.day));
}

TravelPlanSummary? featuredHubPlan(
  List<TravelPlanSummary> plans,
  DateTime now,
) {
  if (plans.isEmpty) return null;
  final active = plans.where((plan) => isTravelingToday(plan, now)).toList()
    ..sort((a, b) => a.startDate.compareTo(b.startDate));
  if (active.isNotEmpty) return active.first;
  final today = DateTime(now.year, now.month, now.day);
  final upcoming = plans.where((plan) {
    final start = plan.parsedStartDate;
    return start != null && !start.isBefore(today);
  }).toList()..sort((a, b) => a.startDate.compareTo(b.startDate));
  return upcoming.isEmpty ? plans.first : upcoming.first;
}

String hubTripLabel(TravelPlanSummary plan, DateTime now) {
  if (isTravelingToday(plan, now)) return 'BUGÜNKÜ ROTAN';
  final start = plan.parsedStartDate;
  final today = DateTime(now.year, now.month, now.day);
  return start != null && !start.isBefore(today)
      ? 'YAKLAŞAN YOLCULUK'
      : 'YOLCULUK DEFTERİN';
}

String hubDate(String raw) {
  final date = DateTime.tryParse(raw);
  if (date == null) return '';
  const months = [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ];
  return '${date.day} ${months[date.month - 1]}';
}
