// Rapport retourné par CatalogSyncService après une synchronisation.
// Permet à l'UI de savoir combien d'exercices ont été mis à jour,
// lesquels étaient déjà à jour, et lesquels ont échoué.

class SyncReport {
  /// Identifiants des exercices téléchargés / mis à jour lors de cette session.
  final List<String> updated;

  /// Identifiants des exercices déjà à la bonne version (aucun téléchargement).
  final List<String> upToDate;

  /// Exercices en erreur : id → message d'erreur.
  final Map<String, String> errors;

  /// Horodatage de fin de synchronisation.
  final DateTime syncedAt;

  const SyncReport({
    required this.updated,
    required this.upToDate,
    required this.errors,
    required this.syncedAt,
  });

  /// La synchronisation s'est terminée sans aucune erreur.
  bool get isSuccess => errors.isEmpty;

  /// Au moins un exercice a été mis à jour.
  bool get hasUpdates => updated.isNotEmpty;

  /// Au moins une erreur s'est produite.
  bool get hasErrors => errors.isNotEmpty;

  /// Nombre total d'entrées du catalogue traitées.
  int get totalProcessed => updated.length + upToDate.length + errors.length;

  /// Le catalogue distant était inaccessible (cas hors-ligne).
  /// Identifiable par la présence de l'erreur spéciale "catalog".
  bool get isCatalogUnreachable =>
      errors.containsKey('catalog') && totalProcessed == 0;

  /// Rapport vide produit quand le serveur est inaccessible.
  factory SyncReport.offline() => SyncReport(
        updated:   const [],
        upToDate:  const [],
        errors:    const {'catalog': 'Serveur inaccessible'},
        syncedAt:  DateTime.now(),
      );

  @override
  String toString() =>
      'SyncReport(updated: ${updated.length}, '
      'upToDate: ${upToDate.length}, '
      'errors: ${errors.length})';
}
