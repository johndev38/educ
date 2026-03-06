// Test de smoke : vérifie que l'application démarre sans erreur.

import 'package:flutter_test/flutter_test.dart';
import 'package:edukids_exercises/app.dart';

void main() {
  testWidgets('L\'application démarre sans erreur', (WidgetTester tester) async {
    await tester.pumpWidget(const EduKidsApp());
    expect(find.text('EduKids'), findsOneWidget);
  });
}
