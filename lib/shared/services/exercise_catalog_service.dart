// Service de chargement du catalogue d'exercices.
//
// Sources fusionnées :
//   1. Assets Flutter (assets/exercises/manifest.json) — exercices embarqués.
//   2. Stockage local (dossiers dans <documentsDir>/edukids/exercises/) —
//      exercices téléchargés depuis le serveur.
//
// Règle de fusion :
//   Si un même id existe dans les deux sources, la version locale
//   (téléchargée) prend la priorité — elle est potentiellement plus récente.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path/path.dart' as p;

import '../models/exercise_definition.dart';
import 'exercise_storage_service.dart';

class ExerciseCatalogService {
  static final ExerciseCatalogService _instance =
      ExerciseCatalogService._internal();
  factory ExerciseCatalogService() => _instance;
  ExerciseCatalogService._internal();

  static const String _assetManifestPath = 'assets/exercises/manifest.json';

  List<ExerciseDefinition>? _cache;

  // ---------------------------------------------------------------------------
  // API publique
  // ---------------------------------------------------------------------------

  /// Retourne la liste fusionnée de tous les exercices disponibles.
  /// Le résultat est mis en cache en mémoire jusqu'à [clearCache()].
  Future<List<ExerciseDefinition>> getAll() async {
    if (_cache != null) return _cache!;

    final asset = await _loadFromAssets();
    final local = await _loadFromLocalStorage();

    // Merge : local écrase asset si même id.
    final merged = <String, ExerciseDefinition>{};
    for (final e in asset) { merged[e.id] = e; }
    for (final e in local) { merged[e.id] = e; }

    _cache = merged.values.toList()
      ..sort((a, b) => a.title.compareTo(b.title));

    return _cache!;
  }

  /// Retourne un exercice par son identifiant.
  Future<ExerciseDefinition> getById(String id) async {
    final all = await getAll();
    return all.firstWhere(
      (e) => e.id == id,
      orElse: () => throw ArgumentError('Exercice introuvable : $id'),
    );
  }

  /// Retourne les exercices d'une catégorie.
  Future<List<ExerciseDefinition>> getByCategory(String category) async {
    final all = await getAll();
    return all.where((e) => e.category == category).toList();
  }

  /// Invalide le cache en mémoire.
  /// À appeler après une synchronisation (CatalogSyncService).
  void clearCache() => _cache = null;

  // ---------------------------------------------------------------------------
  // Chargement depuis les assets
  // ---------------------------------------------------------------------------

  Future<List<ExerciseDefinition>> _loadFromAssets() async {
    try {
      final rawJson = await rootBundle.loadString(_assetManifestPath);
      final list = json.decode(rawJson) as List<dynamic>;
      return list
          .map((item) => ExerciseDefinition.fromJson(
                item as Map<String, dynamic>,
                source: ExerciseSource.asset,
              ))
          .toList();
    } catch (e) {
      debugPrint('[ExerciseCatalog] Erreur de lecture du manifest asset : $e');
      return const [];
    }
  }

  // ---------------------------------------------------------------------------
  // Chargement depuis le stockage local
  // ---------------------------------------------------------------------------

  /// Scanne le répertoire local et lit le manifest.json de chaque exercice.
  Future<List<ExerciseDefinition>> _loadFromLocalStorage() async {
    final storage = ExerciseStorageService();
    final baseDir = await storage.getBaseDir();
    final result  = <ExerciseDefinition>[];

    if (!await baseDir.exists()) return result;

    await for (final entity in baseDir.list()) {
      if (entity is! Directory) continue;

      final manifestFile = File(p.join(entity.path, 'manifest.json'));
      if (!await manifestFile.exists()) continue;

      // Vérifie aussi qu'index.html est présent (exercice complet).
      final indexFile = File(p.join(entity.path, 'index.html'));
      if (!await indexFile.exists()) continue;

      try {
        final content  = await manifestFile.readAsString();
        final jsonData = json.decode(content) as Map<String, dynamic>;
        result.add(ExerciseDefinition.fromJson(
          jsonData,
          source: ExerciseSource.local,
        ));
      } catch (e) {
        debugPrint(
          '[ExerciseCatalog] Manifest invalide dans ${entity.path} : $e',
        );
      }
    }

    return result;
  }
}
