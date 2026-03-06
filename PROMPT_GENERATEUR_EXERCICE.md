# Prompt — Générateur d'exercice EduKids

Ce document contient un prompt prêt à l'emploi à coller dans n'importe quelle IA
(ChatGPT, Claude, Gemini, Mistral, Copilot…) pour générer automatiquement un
exercice complet au bon format.

---

## Comment l'utiliser

1. Copiez le bloc **"PROMPT COMPLET"** ci-dessous (section 2).
2. Collez-le dans votre IA préférée.
3. Répondez à ses questions ou remplissez les variables entre `< >`.
4. Récupérez les 4 fichiers générés et placez-les dans
   `assets/exercises/<id>/`.
5. Déclarez les fichiers dans `pubspec.yaml` et dans `manifest.json`.

---

## PROMPT COMPLET

> Copiez tout le texte ci-dessous jusqu'à la ligne `--- FIN DU PROMPT ---`.

---

```
Tu es un expert en développement d'exercices éducatifs pour enfants.
Tu vas générer un exercice complet pour l'application Flutter "EduKids".

═══════════════════════════════════════════════════════════════
CONTEXTE DE L'APPLICATION
═══════════════════════════════════════════════════════════════

EduKids est une application Flutter pour enfants (4–12 ans).
Chaque exercice est un module autonome composé de 4 fichiers :
  - index.html
  - style.css
  - script.js
  - manifest.json

Flutter affiche index.html dans une WebView.
À la fin de l'exercice, JavaScript envoie le résultat à Flutter
via un canal nommé ExerciseChannel.

═══════════════════════════════════════════════════════════════
EXERCICE À GÉNÉRER
═══════════════════════════════════════════════════════════════

Voici les paramètres de l'exercice que tu dois créer :

  ID              : <identifiant_snake_case>        ex : tables_multiplication
  TITRE           : <titre affiché à l'enfant>      ex : Tables de multiplication
  DESCRIPTION     : <une phrase courte>             ex : Trouve le bon résultat !
  CATÉGORIE       : <catégorie>                     ex : Mathématiques
  DIFFICULTÉ      : <easy | medium | hard>
  ÂGE MIN         : <nombre>
  ÂGE MAX         : <nombre>
  ICÔNE           : <nom icône Material>            ex : calculate
  COULEUR HEX     : <couleur sans #>               ex : 9B59B6
  NB QUESTIONS    : <nombre>                        ex : 10
  SEUIL RÉUSSITE  : <pourcentage>                  ex : 60
  TYPE RÉPONSE    : <choix_multiple | champ_texte>
  THÈME VISUEL    : <description libre du style>   ex : fond violet, étoiles
  CONTENU         : <décris ce que l'exercice doit tester>
                    ex : Tables de 2, 3 et 5, questions du type "3 × 4 = ?"

═══════════════════════════════════════════════════════════════
CONTRAINTES IMPÉRATIVES
═══════════════════════════════════════════════════════════════

CONTRAINTES TECHNIQUES
  ✅ Aucun CDN, aucune librairie externe, aucun import réseau
  ✅ Tout doit fonctionner hors-ligne (pas de fetch, pas d'API)
  ✅ JavaScript pur (ES6+, pas de TypeScript, pas de framework)
  ✅ CSS pur (pas de Tailwind, pas de Bootstrap)
  ✅ Les 3 fichiers sont séparés : index.html / style.css / script.js
  ✅ Aucune balise <style> ni <script> inline dans le HTML
  ✅ script.js chargé en bas de <body>, sans defer ni async
  ✅ Le HTML commence par <!DOCTYPE html> et contient lang="fr"
  ✅ viewport avec user-scalable=no (évite le zoom involontaire enfant)
  ✅ 'use strict'; en première ligne de script.js

CONTRAINTES PÉDAGOGIQUES
  ✅ Interface simple, lisible, avec de grandes zones cliquables
  ✅ Feedback immédiat après chaque réponse (couleur + texte)
  ✅ La bonne réponse est toujours mise en évidence en cas d'erreur
  ✅ Progression visible (barre ou compteur de questions)
  ✅ Écran de résultat final avec score et message encourageant
  ✅ Bouton "Rejouer" sur l'écran de résultat

CONTRAINTES DE STYLE
  ✅ Variables CSS dans :root pour toutes les couleurs et tailles
  ✅ Responsive : fonctionne sur mobile ET tablette (breakpoint 600px)
  ✅ Polices grandes (minimum 1rem, idéalement 1.2–2rem pour les enfants)
  ✅ Boutons avec min-height 56px et border-radius généreux (≥ 12px)
  ✅ Animations CSS légères sur correct/incorrect (bounce, shake)
  ✅ max-width 640px centré pour tablette

═══════════════════════════════════════════════════════════════
CONTRAT JAVASCRIPT → FLUTTER (OBLIGATOIRE)
═══════════════════════════════════════════════════════════════

À la fin de l'exercice, tu DOIS envoyer exactement ce JSON via
ExerciseChannel.postMessage(). Ne modifie jamais la structure.

  const payload = {
    type:        'exercise_result',   // ← valeur fixe, ne pas changer
    exerciseId:  CONFIG.exerciseId,   // ← id de l'exercice
    score:       <entier>,            // nombre de bonnes réponses
    total:       <entier>,            // nombre total de questions
    successRate: <float 0.0→1.0>,    // score / total
    durationMs:  <entier>,            // Date.now() - startTime
    answers: [                        // une entrée par question jouée
      {
        question: <string>,           // texte de la question
        given:    <string>,           // réponse donnée par l'enfant
        correct:  <string>,           // bonne réponse
        ok:       <boolean>,          // true si correct
      }
    ]
  };

  // Protection navigateur (test hors Flutter)
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(JSON.stringify(payload));
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }

═══════════════════════════════════════════════════════════════
STRUCTURE HTML ATTENDUE
═══════════════════════════════════════════════════════════════

Le HTML doit contenir impérativement ces IDs (script.js les utilise) :

  #progress-fill       → div remplie en % via style.width
  #progress-label      → texte "N / TOTAL"
  #question-section    → section principale (masquée à la fin)
  #question-text       → texte/contenu de la question
  #answer-section      → zone injectée par JS (boutons ou input)
  #btn-validate        → bouton "Valider" (visible si champ texte)
  #feedback            → zone de retour correct/incorrect
  #result-screen       → écran final (class "is-visible" pour afficher)
  #result-emoji        → emoji du résultat (🎉 ou 💪)
  #result-title        → titre du résultat
  #result-score        → "score / total"
  #result-detail       → pourcentage + durée
  #btn-restart         → bouton "Rejouer"

Classes CSS attendues (définies dans style.css) :

  En mode choix multiple, script.js injecte :
    <div class="choices-grid">
      <button class="choice-btn">…</button>
    </div>

  États des boutons ajoutés par JS :
    .choice-btn--correct   → réponse correcte (vert)
    .choice-btn--wrong     → réponse incorrecte (rouge)

  Feedback :
    .feedback--correct     → texte vert
    .feedback--wrong       → texte rouge
    .feedback--empty       → opacity 0

  Écran résultat :
    .result-screen          → display: none par défaut
    .result-screen.is-visible → display: flex

═══════════════════════════════════════════════════════════════
STRUCTURE script.js ATTENDUE
═══════════════════════════════════════════════════════════════

Le script doit suivre cette architecture (ordre des blocs) :

  1. 'use strict';
  2. CONFIG   → objet de configuration (exerciseId, totalQuestions, etc.)
  3. QUESTIONS → tableau de questions
  4. state    → objet d'état (currentIndex, score, startTime, isLocked, answers)
  5. dom      → références aux éléments du DOM (document.getElementById)
  6. init()   → réinitialise state, relance showQuestion()
  7. showQuestion() → affiche la question courante, met à jour la barre
  8. _renderChoices() OU _renderTextInput() → construit la zone réponse
  9. handleAnswer(value) → vérifie, marque, enregistre, planifie la suivante
  10. showResult()  → affiche l'écran final ET envoie le payload Flutter
  11. _sendToFlutter(payload) → PostMessage avec protection navigateur
  12. Fonctions utilitaires privées (_setFeedback, _markChoiceButton, etc.)
  13. Événement DOMContentLoaded ou appel direct à init()

═══════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE ATTENDU
═══════════════════════════════════════════════════════════════

Génère exactement 4 blocs de code, dans cet ordre, avec ces titres :

  ### manifest.json
  ```json
  … contenu complet …
  ```

  ### index.html
  ```html
  … contenu complet …
  ```

  ### style.css
  ```css
  … contenu complet …
  ```

  ### script.js
  ```javascript
  … contenu complet …
  ```

Règles de réponse :
  - Code complet dans chaque bloc, pas de "…", pas de pseudo-code
  - Aucun commentaire en dehors du code (pas de texte entre les blocs)
  - Commentaires dans le code autorisés et encouragés
  - Noms de variables et commentaires en français
  - Aucun mot "TODO" ni placeholder vide

═══════════════════════════════════════════════════════════════
EXEMPLE DE MANIFEST.JSON VALIDE
═══════════════════════════════════════════════════════════════

{
  "id":          "tables_multiplication",
  "title":       "Tables de multiplication",
  "description": "Trouve le bon résultat de la multiplication !",
  "category":    "Mathématiques",
  "difficulty":  "medium",
  "ageMin":      7,
  "ageMax":      10,
  "iconName":    "calculate",
  "colorHex":    "9B59B6"
}

Les seules valeurs acceptées pour "difficulty" : "easy", "medium", "hard"
Les seules valeurs acceptées pour "iconName" :
  "calculate", "format_list_numbered", "menu_book", "color_lens",
  "music_note", "science", "star", "school", "emoji_objects", "public"

═══════════════════════════════════════════════════════════════
CHECKLIST AVANT DE GÉNÉRER
═══════════════════════════════════════════════════════════════

Avant de produire le code, vérifie mentalement :

  [ ] L'id dans manifest.json = CONFIG.exerciseId dans script.js
  [ ] Le nombre de questions dans QUESTIONS = CONFIG.totalQuestions
  [ ] payload.type === 'exercise_result' (exactement)
  [ ] payload contient : type, exerciseId, score, total, successRate,
      durationMs, answers
  [ ] Chaque answer contient : question, given, correct, ok
  [ ] Aucun CDN dans le HTML
  [ ] Les IDs obligatoires sont tous présents dans le HTML
  [ ] Les classes CSS attendues sont toutes définies dans style.css
  [ ] Le breakpoint tablette (600px) est présent dans le CSS
  [ ] 'use strict'; est en première ligne de script.js

═══════════════════════════════════════════════════════════════
GO — GÉNÈRE L'EXERCICE MAINTENANT
═══════════════════════════════════════════════════════════════
```

--- FIN DU PROMPT ---

---

## Variables de substitution — aide-mémoire

| Variable | Exemples de valeurs |
|---|---|
| `<identifiant_snake_case>` | `additions_simples`, `tables_3`, `lettres_alphabet`, `couleurs_anglais` |
| `<titre>` | `Tables de 3`, `Lettres majuscules`, `Les couleurs en anglais` |
| `<catégorie>` | `Mathématiques`, `Lecture`, `Langues`, `Sciences`, `Logique` |
| `<difficulté>` | `easy` / `medium` / `hard` |
| `<iconName>` | `calculate` `format_list_numbered` `menu_book` `color_lens` `music_note` `science` `star` `school` `emoji_objects` `public` |
| `<couleur hex>` | `4A90D9` (bleu) · `E67E22` (orange) · `27AE60` (vert) · `9B59B6` (violet) · `E74C3C` (rouge) · `F39C12` (jaune) |
| `<type réponse>` | `choix_multiple` (4 boutons) · `champ_texte` (input + bouton Valider) |

---

## Exemples de demandes prêtes à l'emploi

Remplacez les variables et collez dans votre IA :

### Exercice 1 — Tables de 3

```
[Collez le prompt complet]

ID              : tables_de_3
TITRE           : Tables de 3
DESCRIPTION     : Trouve le résultat de la multiplication par 3 !
CATÉGORIE       : Mathématiques
DIFFICULTÉ      : medium
ÂGE MIN         : 7
ÂGE MAX         : 10
ICÔNE           : calculate
COULEUR HEX     : 9B59B6
NB QUESTIONS    : 10
SEUIL RÉUSSITE  : 60
TYPE RÉPONSE    : choix_multiple
THÈME VISUEL    : fond violet doux, étoiles animées au bon résultat
CONTENU         : Questions du type "3 × 4 = ?" avec des valeurs de 1 à 10.
                  4 choix par question dont 3 distracteurs proches.
```

### Exercice 2 — Syllabes

```
[Collez le prompt complet]

ID              : syllabes
TITRE           : Compte les syllabes
DESCRIPTION     : Combien de syllabes dans ce mot ?
CATÉGORIE       : Lecture
DIFFICULTÉ      : easy
ÂGE MIN         : 5
ÂGE MAX         : 8
ICÔNE           : menu_book
COULEUR HEX     : 27AE60
NB QUESTIONS    : 8
SEUIL RÉUSSITE  : 60
TYPE RÉPONSE    : choix_multiple
THÈME VISUEL    : fond vert clair, émojis livre et lettres
CONTENU         : Affiche un mot simple (CHAT, MAISON, PAPILLON…).
                  L'enfant choisit le bon nombre de syllabes (1 à 4).
                  Inclure un bouton "Écouter" fictif (non fonctionnel) stylisé.
```

### Exercice 3 — Heure

```
[Collez le prompt complet]

ID              : lire_heure
TITRE           : Lire l'heure
DESCRIPTION     : Quelle heure est-il ?
CATÉGORIE       : Mathématiques
DIFFICULTÉ      : medium
ÂGE MIN         : 7
ÂGE MAX         : 11
ICÔNE           : school
COULEUR HEX     : E67E22
NB QUESTIONS    : 8
SEUIL RÉUSSITE  : 60
TYPE RÉPONSE    : choix_multiple
THÈME VISUEL    : fond crème chaud, horloge analogique dessinée en CSS/SVG pur
CONTENU         : Affiche une horloge analogique avec des aiguilles en CSS
                  montrant une heure ronde ou demie (ex : 3h00, 7h30).
                  L'enfant choisit parmi 4 heures au format "HH h MM".
                  Heures entre 1h00 et 12h30 par demi-heures.
```

---

## Après la génération — intégration dans l'app

Une fois les 4 fichiers générés par l'IA :

```
1. Créer le dossier
   assets/exercises/<id>/

2. Y placer les 4 fichiers
   index.html  style.css  script.js  manifest.json

3. Déclarer dans pubspec.yaml
   flutter:
     assets:
       - assets/exercises/<id>/index.html
       - assets/exercises/<id>/style.css
       - assets/exercises/<id>/script.js

4. Ajouter dans assets/exercises/manifest.json
   (copier le contenu du manifest.json généré dans le tableau JSON)

5. Vérifier dans un navigateur
   Ouvrir index.html directement — le résultat s'affiche dans la console

6. Tester dans Flutter
   flutter run
```

---

## Vérification rapide après génération

Avant d'intégrer, vérifiez ces points dans le code généré :

| ✅ | À vérifier |
|---|---|
| ☐ | `manifest.json` — `"id"` identique à `CONFIG.exerciseId` dans `script.js` |
| ☐ | `script.js` — `payload.type === 'exercise_result'` |
| ☐ | `script.js` — `payload` contient `type, exerciseId, score, total, successRate, durationMs, answers` |
| ☐ | `script.js` — `answers[]` contient `question, given, correct, ok` |
| ☐ | `index.html` — pas de `<script src="…cdn…">` ni `<link href="…cdn…">` |
| ☐ | `index.html` — tous les IDs obligatoires présents (`#progress-fill`, `#question-section`, etc.) |
| ☐ | `style.css` — classes `.choice-btn--correct` et `.choice-btn--wrong` définies |
| ☐ | `style.css` — breakpoint `@media (min-width: 600px)` présent |
| ☐ | `script.js` — `'use strict';` en première ligne |
| ☐ | `script.js` — protection `if (typeof ExerciseChannel !== 'undefined')` présente |

---

*EduKids — Prompt générateur d'exercices — 6 mars 2026*
