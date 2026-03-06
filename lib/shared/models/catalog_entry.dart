// Entrée du catalogue distant.
// Correspond à un objet dans le catalog.json hébergé sur le serveur.
//
// Exemple de catalog.json (voir assets/catalog_example.json) :
//   [
//     {
//       "id": "addition",
//       "title": "Additions simples",
//       "version": "1.2.0",
//       "zipUrl": "https://mon-serveur.com/exercises/addition.zip",
//       "sizeBytes": 45000,
//       "description": "Additionne deux nombres !",
//       "category": "Mathématiques",
//       "difficulty": "easy",
//       "ageMin": 5,
//       "ageMax": 8,
//       "iconName": "calculate",
//       "colorHex": "4A90D9"
//     }
//   ]

class CatalogEntry {
  /// Identifiant unique — doit correspondre au dossier de l'exercice.
  final String id;

  /// Titre affiché dans l'interface.
  final String title;

  /// Numéro de version sémantique (ex : "1.2.0").
  /// Comparé à la version locale pour décider d'un téléchargement.
  final String version;

  /// URL du fichier .zip contenant tous les fichiers de l'exercice.
  /// Le zip doit impérativement contenir un manifest.json à sa racine.
  final String zipUrl;

  /// Taille en octets (optionnelle, utilisée pour la barre de progression).
  final int? sizeBytes;

  // ---- Champs d'affichage (optionnels si manifest.json est dans le zip) ----

  final String? description;
  final String? category;

  /// "easy" | "medium" | "hard"
  final String? difficulty;

  final int? ageMin;
  final int? ageMax;

  /// Nom d'icône Material (ex : "calculate").
  final String? iconName;

  /// Couleur hexadécimale sans # (ex : "4A90D9").
  final String? colorHex;

  const CatalogEntry({
    required this.id,
    required this.title,
    required this.version,
    required this.zipUrl,
    this.sizeBytes,
    this.description,
    this.category,
    this.difficulty,
    this.ageMin,
    this.ageMax,
    this.iconName,
    this.colorHex,
  });

  factory CatalogEntry.fromJson(Map<String, dynamic> json) {
    return CatalogEntry(
      id:          json['id']      as String,
      title:       json['title']   as String,
      version:     json['version'] as String,
      zipUrl:      json['zipUrl']  as String,
      sizeBytes:   json['sizeBytes']   as int?,
      description: json['description'] as String?,
      category:    json['category']    as String?,
      difficulty:  json['difficulty']  as String?,
      ageMin:      json['ageMin']      as int?,
      ageMax:      json['ageMax']      as int?,
      iconName:    json['iconName']    as String?,
      colorHex:    json['colorHex']    as String?,
    );
  }

  /// Génère un manifest.json minimal si le zip n'en contenait pas un.
  Map<String, dynamic> toManifestJson() => {
        'id':          id,
        'title':       title,
        'description': description ?? '',
        'category':    category    ?? 'Général',
        'difficulty':  difficulty  ?? 'easy',
        'ageMin':      ageMin      ?? 5,
        'ageMax':      ageMax      ?? 10,
        'iconName':    iconName    ?? 'school',
        'colorHex':    colorHex    ?? '4A90D9',
      };
}
