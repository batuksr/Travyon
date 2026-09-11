import 'package:flutter_test/flutter_test.dart';
import 'package:travyon/app/travyon_app.dart';

void main() {
  testWidgets('shows the Travyon mobile bootstrap screen', (tester) async {
    await tester.pumpWidget(const TravyonApp());

    expect(find.text('Hayalindeki seyahat artık cebinde.'), findsOneWidget);
    expect(find.text('Firebase bağlantısı hazır'), findsOneWidget);
    expect(find.text('Mobil yolculuğa başla'), findsOneWidget);
  });

  testWidgets('shows a safe state when Firebase initialization fails', (
    tester,
  ) async {
    await tester.pumpWidget(
      TravyonApp(initializationError: StateError('test')),
    );

    expect(find.text('Firebase başlatılamadı'), findsOneWidget);
    expect(find.text('Bağlantı bekleniyor'), findsOneWidget);
  });
}
