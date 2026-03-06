// Service de gestion de la progression de l'enfant.
// Stocke et lit les résultats d'exercices via SharedPreferences.
//
// Clés utilisées dans SharedPreferences :
//   - "results_<exerciseId>" → liste JSON des ExerciseResult pour cet exercice

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/exercise_result.dart';

class ProgressService {
  static final ProgressService _instance = ProgressService._internal();
  factory ProgressService() => _instance;
  ProgressService._internal();

  static const String _keyPrefix = 'results_';

  // ---------------------------------------------------------------------------
  // Écriture
  // ---------------------------------------------------------------------------

  /// Sauvegarde un résultat d'exercice.
  /// Les anciens résultats sont conservés ; seuls les 20 derniers sont gardés
  /// pour éviter une croissance illimitée du stockage.
  Future<void> saveResult(ExerciseResult result) async {
    final prefs = await SharedPreferences.getInstance();
    final key = '$_keyPrefix${result.exerciseId}';

    final existing = _loadRawList(prefs, key);
    existing.add(result.toJson());

    // Garde uniquement les 20 dernières sessions par exercice.
    final trimmed = existing.length > 20
        ? existing.sublist(existing.length - 20)
        : existing;

    await prefs.setString(key, json.encode(trimmed));
  }

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  /// Retourne tous les résultats enregistrés pour un exercice donné.
  Future<List<ExerciseResult>> getResultsFor(String exerciseId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = _loadRawList(prefs, '$_keyPrefix$exerciseId');
    return raw
        .map((e) => ExerciseResult.fromStoredJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Retourne le meilleur score (en %) pour un exercice.
  /// Retourne null si l'exercice n'a jamais été fait.
  Future<double?> getBestPercentage(String exerciseId) async {
    final results = await getResultsFor(exerciseId);
    if (results.isEmpty) return null;
    return results
        .map((r) => r.percentage)
        .reduce((a, b) => a > b ? a : b);
  }

  /// Retourne le nombre total de sessions complétées pour un exercice.
  Future<int> getSessionCount(String exerciseId) async {
    final results = await getResultsFor(exerciseId);
    return results.length;
  }

  /// Retourne vrai si l'exercice a déjà été complété au moins une fois.
  Future<bool> hasBeenPlayed(String exerciseId) async {
    final results = await getResultsFor(exerciseId);
    return results.isNotEmpty;
  }

  /// Retourne vrai si l'exercice a été réussi (score ≥ 60 %) au moins une fois.
  Future<bool> hasBeenPassed(String exerciseId) async {
    final results = await getResultsFor(exerciseId);
    return results.any((r) => r.isPassed);
  }

  // ---------------------------------------------------------------------------
  // Suppression
  // ---------------------------------------------------------------------------

  /// Efface tous les résultats d'un exercice spécifique.
  Future<void> clearResultsFor(String exerciseId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_keyPrefix$exerciseId');
  }

  /// Efface TOUTE la progression (réinitialisation complète).
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_keyPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilitaires privés
  // ---------------------------------------------------------------------------

  List<dynamic> _loadRawList(SharedPreferences prefs, String key) {
    final raw = prefs.getString(key);
    if (raw == null) return [];
    return json.decode(raw) as List<dynamic>;
  }
}
