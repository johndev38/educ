// Modèle de données décrivant un exercice.
// Peut provenir de deux sources :
//   - ExerciseSource.asset   : lu depuis assets/exercises/manifest.json (embarqué)
//   - ExerciseSource.local   : lu depuis le système de fichiers local
//                              (exercice téléchargé depuis le serveur)

/// Indique si l'exercice provient des assets Flutter ou d'un téléchargement.
enum ExerciseSource { asset, local }

class ExerciseDefinition {
  /// Identifiant unique (ex: "addition").
  final String id;

  final String title;
  final String description;
  final String category;

  /// "easy" | "medium" | "hard"
  final String difficulty;

  final int ageMin;
  final int ageMax;

  /// Nom d'icône Material (ex : "calculate").
  final String iconName;

  /// Couleur hexadécimale sans # (ex : "4A90D9").
  final String colorHex;

  /// Origine de la définition.
  /// - [ExerciseSource.asset]  → chargé depuis les assets Flutter
  /// - [ExerciseSource.local]  → chargé depuis le stockage local (téléchargé)
  final ExerciseSource source;

  const ExerciseDefinition({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.difficulty,
    required this.ageMin,
    required this.ageMax,
    required this.iconName,
    required this.colorHex,
    this.source = ExerciseSource.asset,
  });

  /// Désérialise depuis JSON.
  /// [source] est passé par l'appelant selon le contexte de chargement.
  factory ExerciseDefinition.fromJson(
    Map<String, dynamic> json, {
    ExerciseSource source = ExerciseSource.asset,
  }) {
    return ExerciseDefinition(
      id:          json['id']          as String,
      title:       json['title']       as String,
      description: json['description'] as String,
      category:    json['category']    as String,
      difficulty:  json['difficulty']  as String,
      ageMin:      json['ageMin']      as int,
      ageMax:      json['ageMax']      as int,
      iconName:    json['iconName']    as String,
      colorHex:    json['colorHex']    as String,
      source:      source,
    );
  }

  // ---------------------------------------------------------------------------
  // Chemins
  // ---------------------------------------------------------------------------

  /// Chemin de l'asset embarqué (uniquement valide pour source == asset).
  String get assetPath => 'assets/exercises/$id/index.html';

  /// Indique si l'exercice provient d'un téléchargement.
  bool get isLocal => source == ExerciseSource.local;

  // ---------------------------------------------------------------------------
  // Accesseurs d'affichage
  // ---------------------------------------------------------------------------

  String get difficultyLabel {
    switch (difficulty) {
      case 'easy':   return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard':   return 'Difficile';
      default:       return difficulty;
    }
  }

  int get colorValue => int.parse('FF$colorHex', radix: 16);
}
