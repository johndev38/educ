// Racine de l'application Flutter.
// Définit le thème global (couleurs, typographie) et le routeur de navigation.

import 'package:flutter/material.dart';

import 'features/home/home_page.dart';

class EduKidsApp extends StatelessWidget {
  const EduKidsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduKids',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      home: const HomePage(),
    );
  }

  ThemeData _buildTheme() {
    const primaryColor = Color(0xFF4A90D9); // bleu ciel
    const secondaryColor = Color(0xFFFFC107); // jaune soleil
    const backgroundColor = Color(0xFFF5F7FA);

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        secondary: secondaryColor,
        surface: backgroundColor,
      ),
      scaffoldBackgroundColor: backgroundColor,

      // Typographie lisible pour les enfants
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: Color(0xFF2C3E50),
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: Color(0xFF2C3E50),
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Color(0xFF2C3E50),
        ),
        bodyLarge: TextStyle(fontSize: 18, color: Color(0xFF34495E)),
        bodyMedium: TextStyle(fontSize: 16, color: Color(0xFF34495E)),
      ),

      // Boutons grands et bien lisibles
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      cardTheme: CardTheme(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),

      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        titleTextStyle: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}
