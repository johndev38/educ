// Gestion du système de fichiers local pour les exercices.
//
// Responsabilités :
//   - Gérer le répertoire racine des exercices téléchargés.
//   - Lire / écrire la version locale de chaque exercice.
//   - Extraire un fichier zip dans le répertoire d'un exercice.
//   - Copier les exercices embarqués (assets) vers le stockage local
//     afin que tous les exercices puissent être chargés via loadFile().
//
// Structure sur le disque :
//   <documentsDir>/edukids/exercises/
//     addition/
//       index.html
//       style.css
//       script.js
//       manifest.json
//     counting/
//       ...

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ExerciseStorageService {
  static final ExerciseStorageService _instance =
      ExerciseStorageService._internal();
  factory ExerciseStorageService() => _instance;
  ExerciseStorageService._internal();

  static const String _versionKeyPrefix = 'ex_version_';
  static const String _subPath = 'edukids/exercises';

  /// Cache en mémoire du répertoire racine.
  Directory? _baseDir;

  // ---------------------------------------------------------------------------
  // Répertoires
  // ---------------------------------------------------------------------------

  /// Répertoire racine de tous les exercices téléchargés.
  /// Créé automatiquement s'il n'existe pas.
  Future<Directory> getBaseDir() async {
    if (_baseDir != null) return _baseDir!;
    final appDir = await getApplicationDocumentsDirectory();
    _baseDir = Directory(p.join(appDir.path, _subPath));
    await _baseDir!.create(recursive: true);
    return _baseDir!;
  }

  /// Répertoire dédié à un exercice. Créé automatiquement si nécessaire.
  Future<Directory> getExerciseDir(String id) async {
    final base = await getBaseDir();
    final dir = Directory(p.join(base.path, id));
    await dir.create(recursive: true);
    return dir;
  }

  // ---------------------------------------------------------------------------
  // Versioning
  // ---------------------------------------------------------------------------

  /// Retourne la version locale de l'exercice, ou null si jamais téléchargé.
  Future<String?> getLocalVersion(String id) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_versionKeyPrefix$id');
  }

  /// Enregistre la version locale après un téléchargement réussi.
  Future<void> saveLocalVersion(String id, String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_versionKeyPrefix$id', version);
  }

  // ---------------------------------------------------------------------------
  // Accès aux fichiers
  // ---------------------------------------------------------------------------

  /// Retourne le fichier index.html de l'exercice s'il existe, sinon null.
  Future<File?> getIndexFile(String id) async {
    final dir = await getExerciseDir(id);
    final file = File(p.join(dir.path, 'index.html'));
    return await file.exists() ? file : null;
  }

  /// Retourne le chemin absolu vers index.html, ou null si introuvable.
  Future<String?> getIndexFilePath(String id) async {
    final file = await getIndexFile(id);
    return file?.path;
  }

  /// Retourne true si index.html est présent dans le stockage local.
  Future<bool> isExerciseAvailable(String id) async {
    final file = await getIndexFile(id);
    return file != null;
  }

  // ---------------------------------------------------------------------------
  // Initialisation des exercices embarqués (assets → stockage local)
  // ---------------------------------------------------------------------------

  /// Copie les fichiers d'un exercice embarqué depuis les assets Flutter
  /// vers le stockage local, afin de pouvoir l'afficher via loadFile().
  ///
  /// N'écrase PAS si index.html existe déjà (une version téléchargée
  /// serait plus récente et doit être préservée).
  ///
  /// [assetFiles] : liste des noms de fichiers à copier
  /// (par défaut : index.html, style.css, script.js).
  Future<void> initBundledExercise(
    String id, {
    List<String> assetFiles = const ['index.html', 'style.css', 'script.js'],
  }) async {
    final dir = await getExerciseDir(id);
    final indexFile = File(p.join(dir.path, 'index.html'));

    // Déjà initialisé (depuis les assets ou depuis un téléchargement).
    if (await indexFile.exists()) return;

    for (final filename in assetFiles) {
      final assetPath = 'assets/exercises/$id/$filename';
      try {
        final data = await rootBundle.load(assetPath);
        final file = File(p.join(dir.path, filename));
        await file.writeAsBytes(data.buffer.asUint8List());
      } catch (_) {
        // Le fichier n'existe pas dans les assets (ex : images optionnelles).
        // On continue silencieusement.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Extraction d'un zip
  // ---------------------------------------------------------------------------

  /// Extrait le contenu d'un fichier zip dans le répertoire de l'exercice.
  ///
  /// Protection contre le path traversal :
  ///   - Seule la partie "nom de fichier" (basename) est conservée.
  ///   - Les entrées de répertoire sont ignorées.
  ///   - Les noms commençant par '.' sont ignorés.
  ///
  /// Si le zip contient un sous-répertoire unique à la racine (ex :
  /// "addition/index.html"), son contenu est extrait directement dans
  /// le répertoire cible (comportement transparent pour l'appelant).
  Future<void> extractZip(String id, Uint8List zipBytes) async {
    final dir = await getExerciseDir(id);

    final archive = ZipDecoder().decodeBytes(zipBytes);

    // Détecte un éventuel préfixe de dossier unique dans le zip
    // (ex : toutes les entrées commencent par "addition/").
    final String? stripPrefix = _detectStripPrefix(archive);

    for (final entry in archive) {
      if (!entry.isFile) continue;

      // Supprime le préfixe racine si présent.
      String entryName = entry.name;
      if (stripPrefix != null && entryName.startsWith(stripPrefix)) {
        entryName = entryName.substring(stripPrefix.length);
      }

      // Sécurité : on ne garde que le basename pour les fichiers plats.
      // Pour les sous-répertoires (ex : images/), on reconstruit le chemin
      // normalisé tout en vérifiant qu'il reste dans le répertoire cible.
      final normalizedName = p.normalize(entryName);
      if (normalizedName.isEmpty ||
          normalizedName.startsWith('.') ||
          p.isAbsolute(normalizedName)) {
        continue;
      }

      final targetPath = p.join(dir.path, normalizedName);

      // Vérifie que le chemin reste bien dans le répertoire de l'exercice.
      if (!p.isWithin(dir.path, targetPath)) continue;

      final outputFile = File(targetPath);
      await outputFile.create(recursive: true);
      await outputFile.writeAsBytes(entry.content as List<int>);
    }
  }

  /// Garantit la présence du manifest.json dans le répertoire de l'exercice.
  /// Si le zip n'en contenait pas un, écrit un manifest minimal
  /// généré depuis [fallbackData].
  Future<void> ensureManifest(
    String id,
    Map<String, dynamic> fallbackData,
  ) async {
    final dir = await getExerciseDir(id);
    final manifestFile = File(p.join(dir.path, 'manifest.json'));
    if (await manifestFile.exists()) return;
    await manifestFile.writeAsString(jsonEncode(fallbackData));
  }

  // ---------------------------------------------------------------------------
  // Suppression
  // ---------------------------------------------------------------------------

  /// Supprime tous les fichiers locaux d'un exercice et sa version en cache.
  Future<void> deleteExercise(String id) async {
    final dir = await getExerciseDir(id);
    if (await dir.exists()) await dir.delete(recursive: true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_versionKeyPrefix$id');
  }

  /// Supprime TOUS les exercices téléchargés (réinitialisation complète).
  Future<void> deleteAll() async {
    final base = await getBaseDir();
    if (await base.exists()) await base.delete(recursive: true);
    _baseDir = null;

    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys()
        .where((k) => k.startsWith(_versionKeyPrefix))
        .toList();
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilitaire privé
  // ---------------------------------------------------------------------------

  /// Détecte un préfixe commun à toutes les entrées du zip
  /// (ex : zip créé avec "addition/" comme dossier racine).
  /// Retourne null si les fichiers sont directement à la racine.
  String? _detectStripPrefix(Archive archive) {
    final fileEntries = archive.where((e) => e.isFile).toList();
    if (fileEntries.isEmpty) return null;

    final firstParts = fileEntries.first.name.split('/');
    if (firstParts.length < 2) return null;

    final candidate = '${firstParts.first}/';
    final allMatch = fileEntries.every((e) => e.name.startsWith(candidate));

    return allMatch ? candidate : null;
  }
}
