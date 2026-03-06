// Orchestrateur de la synchronisation des exercices.
//
// Flux d'exécution de sync() :
//   1. Télécharge le catalog.json depuis l'URL distante.
//   2. Pour chaque entrée du catalogue :
//        a. Compare la version distante avec la version locale.
//        b. Si identiques → upToDate, on passe à la suivante.
//        c. Sinon → télécharge le zip, extrait, vérifie manifest.json,
//           puis enregistre la nouvelle version.
//   3. Invalide le cache de ExerciseCatalogService.
//   4. Retourne un SyncReport détaillant le résultat.
//
// En cas d'absence de réseau : retourne SyncReport.offline() immédiatement
// sans lever d'exception — l'application reste utilisable hors-ligne.

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/catalog_entry.dart';
import '../models/sync_report.dart';
import 'download_service.dart';
import 'exercise_catalog_service.dart';
import 'exercise_storage_service.dart';

// Clé SharedPreferences pour l'horodatage de la dernière sync.
const _kLastSyncMs = 'last_catalog_sync_ms';

class CatalogSyncService {
  static final CatalogSyncService _instance = CatalogSyncService._internal();
  factory CatalogSyncService() => _instance;
  CatalogSyncService._internal();

  final _download = DownloadService();
  final _storage  = ExerciseStorageService();

  // ---------------------------------------------------------------------------
  // Point d'entrée principal
  // ---------------------------------------------------------------------------

  /// Synchronise les exercices avec le catalogue distant.
  ///
  /// [catalogUrl] : URL complète du fichier catalog.json sur le serveur.
  ///
  /// - Si le serveur est inaccessible, retourne [SyncReport.offline()].
  /// - Les erreurs par exercice sont enregistrées dans [SyncReport.errors]
  ///   sans interrompre la synchronisation des autres exercices.
  Future<SyncReport> sync(String catalogUrl) async {
    // ---- 1. Téléchargement du catalogue ----
    List<CatalogEntry> entries;
    try {
      entries = await _download.fetchRemoteCatalog(catalogUrl);
    } on DownloadException catch (e) {
      debugPrint('[CatalogSync] Catalogue inaccessible : $e');
      return SyncReport.offline();
    } catch (e) {
      debugPrint('[CatalogSync] Erreur inattendue (catalogue) : $e');
      return SyncReport(
        updated:  const [],
        upToDate: const [],
        errors:   {'catalog': e.toString()},
        syncedAt: DateTime.now(),
      );
    }

    // ---- 2. Traitement de chaque entrée ----
    final updated  = <String>[];
    final upToDate = <String>[];
    final errors   = <String, String>{};

    for (final entry in entries) {
      try {
        final didUpdate = await _syncEntry(entry);
        if (didUpdate) {
          updated.add(entry.id);
        } else {
          upToDate.add(entry.id);
        }
      } catch (e) {
        debugPrint('[CatalogSync] Erreur pour ${entry.id} : $e');
        errors[entry.id] = e.toString();
      }
    }

    // ---- 3. Sauvegarde de l'horodatage ----
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kLastSyncMs, DateTime.now().millisecondsSinceEpoch);

    // ---- 4. Invalidation du cache catalogue ----
    ExerciseCatalogService().clearCache();

    final report = SyncReport(
      updated:  updated,
      upToDate: upToDate,
      errors:   errors,
      syncedAt: DateTime.now(),
    );

    debugPrint('[CatalogSync] Terminé : $report');
    return report;
  }

  // ---------------------------------------------------------------------------
  // Synchronisation d'un seul exercice
  // ---------------------------------------------------------------------------

  /// Télécharge et extrait l'exercice [entry] si sa version a changé.
  /// Retourne true si une mise à jour a été effectuée, false sinon.
  Future<bool> _syncEntry(CatalogEntry entry) async {
    final localVersion = await _storage.getLocalVersion(entry.id);

    // Déjà à jour.
    if (localVersion == entry.version) return false;

    debugPrint(
      '[CatalogSync] Mise à jour de ${entry.id} : '
      '${localVersion ?? "jamais téléchargé"} → ${entry.version}',
    );

    // ---- Téléchargement du zip ----
    final zipBytes = await _download.downloadZip(
      entry.zipUrl,
      onProgress: (received, total) {
        if (total != null) {
          final pct = (received / total * 100).toStringAsFixed(0);
          debugPrint('[CatalogSync] ${entry.id} : $pct %');
        }
      },
    );

    // ---- Extraction ----
    await _storage.extractZip(entry.id, zipBytes);

    // ---- Garantit la présence d'un manifest.json ----
    await _storage.ensureManifest(entry.id, entry.toManifestJson());

    // ---- Enregistrement de la nouvelle version ----
    await _storage.saveLocalVersion(entry.id, entry.version);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Informations sur la synchronisation
  // ---------------------------------------------------------------------------

  /// Retourne la date/heure de la dernière synchronisation réussie,
  /// ou null si aucune synchronisation n'a encore eu lieu.
  Future<DateTime?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    final ms = prefs.getInt(_kLastSyncMs);
    return ms != null ? DateTime.fromMillisecondsSinceEpoch(ms) : null;
  }

  /// Indique si une synchronisation a déjà eu lieu.
  Future<bool> hasSyncedAtLeastOnce() async {
    return await getLastSyncTime() != null;
  }
}
