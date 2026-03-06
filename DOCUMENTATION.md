# EduKids — Documentation complète

> Application Flutter éducative pour enfants.  
> Les exercices sont des mini-modules HTML/CSS/JS embarqués ou téléchargés dynamiquement.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Démarrage rapide](#3-démarrage-rapide)
4. [Créer un nouvel exercice](#4-créer-un-nouvel-exercice)
5. [Le canal JavaScript → Flutter](#5-le-canal-javascript--flutter)
6. [Mettre des exercices en ligne (serveur)](#6-mettre-des-exercices-en-ligne-serveur)
7. [Synchronisation dynamique](#7-synchronisation-dynamique)
8. [Stockage local et hors-ligne](#8-stockage-local-et-hors-ligne)
9. [Référence des modèles Dart](#9-référence-des-modèles-dart)
10. [Référence des services Dart](#10-référence-des-services-dart)
11. [Compatibilité Android / iOS](#11-compatibilité-android--ios)
12. [FAQ](#12-faq)

---

## 1. Vue d'ensemble

EduKids est un **shell Flutter** qui charge et affiche des exercices scolaires écrits en HTML/CSS/JavaScript pur.

```
┌─────────────────────────────────────────┐
│              App Flutter                │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Catalogue│  │   WebView (exercice)  │ │
│  │  + scores│  │  index.html          │ │
│  │  locaux  │  │  style.css           │ │
│  └──────────┘  │  script.js           │ │
│                │        ↕             │ │
│                │  ExerciseChannel     │ │
│                └──────────────────────┘ │
└─────────────────────────────────────────┘
         ↕ (si réseau disponible)
   catalog.json  +  exercise.zip
       (serveur distant)
```

**Ce que Flutter gère :**
- Catalogue, navigation, thème, scores
- Téléchargement et mise à jour des exercices
- Affichage dans une WebView

**Ce que le HTML/JS gère :**
- Toute la logique pédagogique
- L'interface de l'exercice
- L'envoi du résultat final à Flutter

---

## 2. Architecture du projet

```
edukids_exercises/
│
├── lib/
│   ├── main.dart                          Point d'entrée
│   ├── app.dart                           Thème + MaterialApp
│   │
│   ├── features/
│   │   ├── home/
│   │   │   └── home_page.dart             Accueil + lancement de la sync
│   │   └── exercises/
│   │       ├── exercise_list_page.dart    Catalogue des exercices
│   │       └── exercise_player_page.dart  Lecteur WebView
│   │
│   └── shared/
│       ├── models/
│       │   ├── exercise_definition.dart   Définition d'un exercice
│       │   ├── exercise_result.dart       Résultat d'une session
│       │   ├── catalog_entry.dart         Entrée du catalogue distant
│       │   └── sync_report.dart           Rapport de synchronisation
│       │
│       └── services/
│           ├── exercise_catalog_service.dart  Fusion assets + local
│           ├── exercise_storage_service.dart  Fichiers locaux + zip
│           ├── download_service.dart          Requêtes HTTP
│           ├── catalog_sync_service.dart      Orchestration sync
│           └── progress_service.dart          Scores (SharedPreferences)
│
└── assets/
    ├── exercises/
    │   ├── manifest.json                  Catalogue des exercices embarqués
    │   ├── addition/                      Exercice 1 (embarqué)
    │   │   ├── index.html
    │   │   ├── style.css
    │   │   └── script.js
    │   ├── counting/                      Exercice 2 (embarqué)
    │   │   └── …
    │   └── _template/                     Template à copier
    │       ├── index.html
    │       ├── style.css
    │       ├── script.js
    │       └── manifest.json
    └── catalog_example.json               Exemple de catalogue serveur
```

---

## 3. Démarrage rapide

### Prérequis

| Outil | Version minimale |
|---|---|
| Flutter | 3.22+ |
| Dart | 3.0+ |
| Android SDK | API 21+ |
| iOS | 12.0+ |

### Installation

```bash
# Cloner / ouvrir le projet
cd e:/projets/devoir

# Installer les dépendances
flutter pub get

# Lancer sur un émulateur ou appareil connecté
flutter run
```

### Dépendances déclarées

| Package | Usage |
|---|---|
| `webview_flutter` | Affichage des exercices HTML/JS |
| `shared_preferences` | Stockage local des scores |
| `http` | Téléchargement du catalogue et des zips |
| `archive` | Décompression des zips (100 % Dart) |
| `path_provider` | Chemin vers le répertoire documents |
| `path` | Manipulation des chemins cross-platform |

---

## 4. Créer un nouvel exercice

### Étape 1 — Copier le template

```
assets/exercises/_template/   →   assets/exercises/mon_exercice/
```

Le dossier `_template/` contient quatre fichiers prêts à l'emploi.

### Étape 2 — Personnaliser les fichiers

Cherchez les blocs marqués `✏️ PERSONNALISER` dans chaque fichier.

#### `manifest.json`

```json
{
  "id":          "mon_exercice",
  "title":       "Mon exercice",
  "description": "Une phrase courte présentant l'exercice.",
  "category":    "Mathématiques",
  "difficulty":  "easy",
  "ageMin":      5,
  "ageMax":      9,
  "iconName":    "calculate",
  "colorHex":    "4A90D9"
}
```

| Champ | Valeurs acceptées |
|---|---|
| `difficulty` | `"easy"` · `"medium"` · `"hard"` |
| `iconName` | Nom d'une icône Material (`"calculate"`, `"menu_book"`, `"science"`…) |
| `colorHex` | Hexadécimal sans `#` (ex : `"E67E22"`) |

#### `script.js` — les deux seuls blocs à modifier

```js
// ✏️ 1. Configuration
const CONFIG = {
  exerciseId:     'mon_exercice',   // ← même valeur que manifest.json > id
  totalQuestions: 10,
  delayNextMs:    900,
  passingRate:    0.6,
};

// ✏️ 2. Questions
const QUESTIONS = [
  {
    question:      '2 + 3 = ?',
    correctAnswer: '5',
    choices:       ['3', '4', '5', '6'],
  },
  // … autant de questions que CONFIG.totalQuestions
];
```

### Étape 3 — Déclarer les fichiers dans `pubspec.yaml`

```yaml
flutter:
  assets:
    - assets/exercises/mon_exercice/index.html
    - assets/exercises/mon_exercice/style.css
    - assets/exercises/mon_exercice/script.js
```

### Étape 4 — Ajouter au catalogue embarqué

Dans `assets/exercises/manifest.json`, ajoutez un objet au tableau :

```json
[
  { "id": "addition", … },
  { "id": "counting", … },
  {
    "id":          "mon_exercice",
    "title":       "Mon exercice",
    "description": "Description.",
    "category":    "Mathématiques",
    "difficulty":  "easy",
    "ageMin":      5,
    "ageMax":      9,
    "iconName":    "calculate",
    "colorHex":    "4A90D9"
  }
]
```

### Résultat

L'exercice apparaît immédiatement dans la liste sans toucher au code Dart.

---

## 5. Le canal JavaScript → Flutter

À la fin de chaque exercice, le JavaScript envoie le résultat à Flutter
via un canal nommé **`ExerciseChannel`** :

```js
const payload = {
  type:        'exercise_result',   // ← obligatoire, valeur fixe
  exerciseId:  'mon_exercice',
  score:       7,
  total:       10,
  successRate: 0.7,                 // score / total (0.0 → 1.0)
  durationMs:  23400,               // durée en millisecondes
  answers: [                        // détail de chaque réponse
    { question: '2+3=?', given: '5', correct: '5', ok: true  },
    { question: '8-3=?', given: '4', correct: '5', ok: false },
  ],
};

ExerciseChannel.postMessage(JSON.stringify(payload));
```

> **Important :** `ExerciseChannel` n'existe que dans la WebView Flutter.  
> Pour tester dans un navigateur, le template ignore silencieusement son absence :
> ```js
> if (typeof ExerciseChannel !== 'undefined') {
>   ExerciseChannel.postMessage(JSON.stringify(payload));
> } else {
>   console.info('Hors Flutter – payload :', payload);
> }
> ```

### Ce que Flutter fait avec le payload

1. `ExercisePlayerPage` reçoit le message JSON.
2. Le désérialise en `ExerciseResult`.
3. Le sauvegarde via `ProgressService`.
4. Affiche l'overlay de résultat animé.

---

## 6. Mettre des exercices en ligne (serveur)

### Structure attendue côté serveur

```
https://mon-serveur.com/edukids/
  ├── catalog.json           ← liste de tous les exercices disponibles
  └── exercises/
      ├── addition.zip
      ├── counting.zip
      └── letters.zip
```

### Format de `catalog.json`

```json
[
  {
    "id":          "letters",
    "title":       "Reconnais les lettres",
    "version":     "1.0.0",
    "zipUrl":      "https://mon-serveur.com/edukids/exercises/letters.zip",
    "sizeBytes":   55000,

    "description": "Associe chaque image à la bonne lettre.",
    "category":    "Lecture",
    "difficulty":  "easy",
    "ageMin":      4,
    "ageMax":      7,
    "iconName":    "menu_book",
    "colorHex":    "27AE60"
  }
]
```

> Les champs `description`, `category`, `difficulty`, `ageMin`, `ageMax`,
> `iconName` et `colorHex` sont **optionnels** si le zip contient un
> `manifest.json` (recommandé).

### Structure d'un zip d'exercice

```
letters.zip
├── index.html      ← obligatoire
├── style.css
├── script.js
└── manifest.json   ← obligatoire (même format que ci-dessus, sans "version")
```

> Le zip peut avoir un dossier racine (ex : `letters/index.html`) :
> l'application le détecte et l'ignore automatiquement.

### Configurer l'URL dans l'application

Dans `lib/features/home/home_page.dart`, ligne 1 :

```dart
const String _catalogUrl = 'https://mon-serveur.com/edukids/catalog.json';
```

Remplacez par votre URL avant de déployer.

---

## 7. Synchronisation dynamique

### Déclenchement

La synchronisation se lance **automatiquement au démarrage** de l'application
(dans `HomePage.initState()`).

### Déroulement

```
App démarre
  │
  ├─ Réseau disponible ?
  │     Oui → fetchRemoteCatalog(catalogUrl)
  │             └─ Pour chaque entrée :
  │                  ├─ version locale == version distante ?
  │                  │     Oui  → upToDate (rien à faire)
  │                  │     Non  → downloadZip() → extractZip() → saveVersion()
  │                  └─ SyncReport retourné à l'UI
  │
  └─ Réseau indisponible → SyncReport.offline() (utilise le cache local)
```

### Bandeau d'état dans l'UI

| État | Affichage |
|---|---|
| En cours | Spinner + "Recherche de nouveaux exercices…" |
| Mise à jour disponible | "N exercice(s) mis à jour !" (vert) |
| Hors-ligne | "Hors-ligne — Dernière sync : …" (gris) |
| Erreur partielle | "N exercice(s) n'ont pas pu être mis à jour" (orange) |
| Déjà à jour | Aucun bandeau (silencieux) |

### Versioning

La version d'un exercice est une chaîne libre (ex : `"1.2.0"`, `"2024-03-01"`).  
La comparaison est une **égalité stricte de chaînes** — toute valeur différente
déclenche un téléchargement.

Pour forcer une mise à jour de tous les clients :  
→ Modifiez le champ `version` dans `catalog.json`.

---

## 8. Stockage local et hors-ligne

### Emplacement des fichiers

| Plateforme | Chemin |
|---|---|
| Android | `/data/data/<package>/files/edukids/exercises/` |
| iOS | `<sandbox>/Documents/edukids/exercises/` |

### Exercices embarqués (assets)

Les exercices déclarés dans `pubspec.yaml` sont copiés vers le stockage local
**à la première ouverture** de l'exercice, via `initBundledExercise()`.

Cela permet à la WebView de les charger avec `loadFile()` et de résoudre
les références CSS/JS relatives.

### Priorité de chargement

```
Exercice téléchargé (local)  >  Exercice embarqué (asset)
```

Si le serveur publie une version `"1.1.0"` d'un exercice embarqué en `"1.0.0"`,
le fichier téléchargé remplace silencieusement la copie locale de l'asset.

### Utilisation hors-ligne

Une fois téléchargés, les exercices sont **disponibles indéfiniment hors-ligne**.  
La synchronisation est ignorée si le réseau est absent — aucune donnée n'est perdue.

### Réinitialisation complète

```dart
// Efface tous les fichiers locaux ET les versions en cache
await ExerciseStorageService().deleteAll();

// Efface tous les scores
await ProgressService().clearAll();
```

Un bouton "Remettre les scores à zéro" est disponible sur l'écran d'accueil.

---

## 9. Référence des modèles Dart

### `ExerciseDefinition`

```dart
class ExerciseDefinition {
  final String id;            // identifiant unique
  final String title;
  final String description;
  final String category;
  final String difficulty;    // "easy" | "medium" | "hard"
  final int    ageMin;
  final int    ageMax;
  final String iconName;      // nom d'icône Material
  final String colorHex;      // hex sans #
  final ExerciseSource source; // .asset | .local
}
```

### `ExerciseResult`

```dart
class ExerciseResult {
  final String exerciseId;
  final int    score;
  final int    maxScore;
  final int    durationMs;
  final double successRate;       // 0.0 → 1.0
  final List<AnswerRecord> answers;
  final DateTime completedAt;

  double get percentage;          // successRate * 100
  bool   get isPassed;            // successRate >= 0.6
}
```

### `CatalogEntry`

```dart
class CatalogEntry {
  final String  id;
  final String  title;
  final String  version;
  final String  zipUrl;
  final int?    sizeBytes;
  // champs optionnels : description, category, difficulty…
}
```

### `SyncReport`

```dart
class SyncReport {
  final List<String>        updated;    // ids mis à jour
  final List<String>        upToDate;   // ids déjà à jour
  final Map<String,String>  errors;     // id → message d'erreur
  final DateTime            syncedAt;

  bool get isSuccess;
  bool get hasUpdates;
  bool get isCatalogUnreachable;
}
```

---

## 10. Référence des services Dart

### `ExerciseCatalogService` *(singleton)*

```dart
// Retourne tous les exercices (assets + locaux fusionnés)
Future<List<ExerciseDefinition>> getAll();

// Retourne un exercice par son id
Future<ExerciseDefinition> getById(String id);

// Filtre par catégorie
Future<List<ExerciseDefinition>> getByCategory(String category);

// Invalide le cache (appelé automatiquement après une sync)
void clearCache();
```

### `ProgressService` *(singleton)*

```dart
// Sauvegarde un résultat (garde les 20 derniers par exercice)
Future<void> saveResult(ExerciseResult result);

// Meilleur score en % (null si jamais joué)
Future<double?> getBestPercentage(String exerciseId);

// Nombre de sessions
Future<int> getSessionCount(String exerciseId);

// A déjà été joué ?
Future<bool> hasBeenPlayed(String exerciseId);

// A été réussi au moins une fois (≥ 60 %) ?
Future<bool> hasBeenPassed(String exerciseId);

// Efface un exercice
Future<void> clearResultsFor(String exerciseId);

// Efface tout
Future<void> clearAll();
```

### `CatalogSyncService` *(singleton)*

```dart
// Lance une synchronisation complète
// catalogUrl : URL du catalog.json sur le serveur
Future<SyncReport> sync(String catalogUrl);

// Date de la dernière synchronisation (null si jamais fait)
Future<DateTime?> getLastSyncTime();
```

### `ExerciseStorageService` *(singleton)*

```dart
// Répertoire racine des exercices téléchargés
Future<Directory> getBaseDir();

// Version locale d'un exercice (null si absent)
Future<String?> getLocalVersion(String id);

// Chemin absolu vers index.html (null si absent)
Future<String?> getIndexFilePath(String id);

// Copie un exercice embarqué vers le stockage local
Future<void> initBundledExercise(String id);

// Extrait un zip dans le répertoire de l'exercice
Future<void> extractZip(String id, Uint8List zipBytes);

// Supprime un exercice
Future<void> deleteExercise(String id);

// Supprime tout
Future<void> deleteAll();
```

### `DownloadService`

```dart
// Télécharge le catalog.json distant
Future<List<CatalogEntry>> fetchRemoteCatalog(String url);

// Télécharge un zip (avec callback de progression optionnel)
Future<Uint8List> downloadZip(
  String url, {
  void Function(int received, int? total)? onProgress,
});
```

---

## 11. Compatibilité Android / iOS

### Android

- Permission `INTERNET` déclarée dans `AndroidManifest.xml`.
- Les fichiers locaux sont chargés via `loadFile()` depuis le répertoire
  documents de l'application (`/data/data/<package>/files/`).
- Le WebView Android charge les ressources CSS/JS relatives correctement
  car la base URL est fixée sur le répertoire du fichier.
- Trafic HTTPS recommandé (HTTP bloqué par défaut sur Android 9+).  
  Pour activer HTTP en développement : ajouter
  `android:usesCleartextTraffic="true"` dans `<application>`.

### iOS

- Aucune configuration supplémentaire requise.
- `loadFile()` utilise `loadFileURL(_:allowingReadAccessTo:)` qui accorde
  l'accès à tout le répertoire de l'exercice.
- Le répertoire documents iOS est sauvegardé par iCloud (comportement normal).

---

## 12. FAQ

**Q : Puis-je ajouter des images dans un exercice ?**  
Incluez-les dans le zip et référencez-les avec un chemin relatif dans le HTML.  
Ex : `<img src="pomme.png">`. Ils seront extraits dans le même répertoire.

---

**Q : Puis-je utiliser des sous-répertoires dans le zip ?**  
Oui. Ex : `images/pomme.png` dans le zip → `images/pomme.png` dans le
répertoire local. Référencez-le de la même façon dans le HTML.

---

**Q : Comment tester un exercice sans Flutter ?**  
Ouvrez `index.html` directement dans un navigateur.  
Le canal `ExerciseChannel` sera absent, le script l'ignore et affiche
le résultat dans la console.

---

**Q : Comment forcer le re-téléchargement d'un exercice ?**  
Incrémentez la `version` dans `catalog.json` côté serveur.  
Toute valeur différente de la version locale déclenche un téléchargement.

---

**Q : Que se passe-t-il si le zip est corrompu ?**  
`ZipDecoder` lève une exception. Elle est capturée par `CatalogSyncService`
et enregistrée dans `SyncReport.errors[id]`. L'ancienne version de l'exercice
est conservée (les fichiers ne sont pas supprimés avant extraction réussie).

---

**Q : Comment changer le seuil de réussite ?**  
Dans le JavaScript de l'exercice, modifiez :
```js
const CONFIG = { passingRate: 0.8 }; // 80 %
```
Côté Flutter, le seuil global est dans `ExerciseResult.isPassed` :
```dart
bool get isPassed => successRate >= 0.6; // 60 %
```

---

**Q : L'application fonctionne-t-elle sans serveur ?**  
Oui. Les exercices embarqués (dans `assets/`) sont toujours disponibles.  
La synchronisation échoue silencieusement si le réseau est absent et
l'application reste entièrement fonctionnelle.

---

*EduKids — documentation générée le 6 mars 2026*
