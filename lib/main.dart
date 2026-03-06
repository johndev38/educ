// Point d'entrée de l'application.
// Initialise les services nécessaires avant de lancer le widget racine.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';

void main() async {
  // Garantit que les bindings Flutter sont prêts avant tout appel asynchrone.
  WidgetsFlutterBinding.ensureInitialized();

  // Verrouille l'orientation en portrait pour les petits écrans (téléphones).
  // Sur tablette, le mode paysage sera géré via MediaQuery dans les pages.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(const EduKidsApp());
}
