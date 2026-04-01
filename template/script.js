/**
 * ================================================================
 * TEMPLATE – Logique d'exercice EduKids
 * ================================================================
 *
 * COMMENT UTILISER CE TEMPLATE :
 *  1. Copie ce dossier (_template/) sous un nouveau nom
 *     (ex : assets/exercises/mon_exercice/).
 *  2. Cherche tous les blocs marqués  ✏️ PERSONNALISER  et adapte-les.
 *  3. Déclare les 3 fichiers dans pubspec.yaml (assets:).
 *  4. Ajoute l'entrée dans assets/exercises/manifest.json.
 *
 * FLUX :
 *   init() → showQuestion() → [n fois] handleAnswer() → showResult()
 *
 * CANAL FLUTTER :
 *   ExerciseChannel.postMessage(JSON.stringify(payload))
 *   payload.type = "exercise_result"
 * ================================================================
 */

'use strict';

/* ----------------------------------------------------------------
   ✏️ PERSONNALISER — Configuration de l'exercice
   ---------------------------------------------------------------- */
const CONFIG = {
  exerciseId:     'mon_exercice',   // doit correspondre à l'id du manifest
  totalQuestions: 5,                // nombre de questions
  delayNextMs:    900,              // ms avant d'afficher la question suivante
  passingRate:    0.6,              // seuil de réussite (60 %)
};

/* ----------------------------------------------------------------
   ✏️ PERSONNALISER — Données des questions
   ----------------------------------------------------------------
   Chaque objet doit avoir au minimum :
     { question, correctAnswer }
   Les autres champs (choices, hint…) dépendent du mode de réponse.
   ---------------------------------------------------------------- */
const QUESTIONS = [
  {
    question:      '2 + 3 = ?',
    correctAnswer: '5',
    choices:       ['3', '4', '5', '6'],
    hint:          'Compte sur tes doigts !',
  },
  {
    question:      '7 − 4 = ?',
    correctAnswer: '3',
    choices:       ['2', '3', '4', '5'],
    hint:          null,
  },
  {
    question:      '1 + 1 = ?',
    correctAnswer: '2',
    choices:       ['1', '2', '3', '4'],
    hint:          null,
  },
  {
    question:      '5 + 5 = ?',
    correctAnswer: '10',
    choices:       ['8', '9', '10', '11'],
    hint:          null,
  },
  {
    question:      '4 + 2 = ?',
    correctAnswer: '6',
    choices:       ['5', '6', '7', '8'],
    hint:          null,
  },
];

/* ================================================================
   ÉTAT — ne pas modifier la structure, seulement les valeurs init.
   ================================================================ */
const state = {
  currentIndex:  0,
  score:         0,
  startTime:     0,
  isLocked:      false,   // bloque les clics pendant l'animation/délai
  answers:       [],      // historique : [{ question, given, correct, ok }]
};

/* ================================================================
   RÉFÉRENCES DOM — correspondent aux id/classes du HTML
   ================================================================ */
const dom = {
  /* En-tête */
  progressFill:   document.getElementById('progress-fill'),
  progressLabel:  document.getElementById('progress-label'),

  /* Section question */
  questionSection: document.getElementById('question-section'),
  questionText:    document.getElementById('question-text'),

  /* Section réponse — le template utilise le mode "choix multiple" par défaut.
     Si tu utilises le mode "champ texte", remplace les méthodes _renderChoices
     et _readAnswer ci-dessous. */
  answerSection:  document.getElementById('answer-section'),

  /* Feedback */
  feedback:       document.getElementById('feedback'),

  /* Bouton valider (visible en mode "champ texte") */
  btnValidate:    document.getElementById('btn-validate'),

  /* Écran résultat */
  resultScreen:   document.getElementById('result-screen'),
  resultEmoji:    document.getElementById('result-emoji'),
  resultTitle:    document.getElementById('result-title'),
  resultScore:    document.getElementById('result-score'),
  resultDetail:   document.getElementById('result-detail'),
  btnRestart:     document.getElementById('btn-restart'),
};

/* ================================================================
   DÉMARRAGE
   ================================================================ */
function init() {
  state.currentIndex = 0;
  state.score        = 0;
  state.startTime    = Date.now();
  state.isLocked     = false;
  state.answers      = [];

  dom.resultScreen.classList.remove('is-visible');
  dom.questionSection.style.display = '';

  showQuestion();
}

/* ================================================================
   AFFICHAGE D'UNE QUESTION
   ================================================================ */
function showQuestion() {
  if (state.currentIndex >= CONFIG.totalQuestions) {
    showResult();
    return;
  }

  state.isLocked = false;
  _clearFeedback();

  const q = QUESTIONS[state.currentIndex];

  /* — Question — */
  dom.questionText.textContent = q.question;

  /* — Progression — */
  const pct = (state.currentIndex / CONFIG.totalQuestions) * 100;
  dom.progressFill.style.width    = `${pct}%`;
  dom.progressLabel.textContent   =
    `${state.currentIndex + 1} / ${CONFIG.totalQuestions}`;

  /* — Zone de réponse — */
  _renderChoices(q.choices);
}

/* ================================================================
   RENDU DES RÉPONSES
   ================================================================
   ✏️ PERSONNALISER : remplace _renderChoices() par un champ texte
   ou n'importe quelle autre interface si besoin.
   ================================================================ */

/** Mode choix multiple : crée les boutons à partir de q.choices */
function _renderChoices(choices) {
  dom.answerSection.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'choices-grid';

  choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(value));
    grid.appendChild(btn);
  });

  dom.answerSection.appendChild(grid);

  /* Cache le bouton "Valider" (inutile en mode choix multiple) */
  if (dom.btnValidate) dom.btnValidate.style.display = 'none';
}

/**
 * ✏️ PERSONNALISER (OPTIONNEL) — Mode champ texte
 *
 * Décommente et adapte ce bloc si ton exercice nécessite
 * une réponse saisie manuellement plutôt que des boutons.
 *
function _renderTextInput(placeholder) {
  dom.answerSection.innerHTML = `
    <div class="answer-input-wrap">
      <input
        id="answer-input"
        class="answer-input"
        type="text"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        placeholder="${placeholder || 'Ta réponse…'}"
      />
    </div>
  `;
  const input = document.getElementById('answer-input');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAnswer(input.value.trim());
  });
  if (dom.btnValidate) {
    dom.btnValidate.style.display = '';
    dom.btnValidate.onclick = () => handleAnswer(input.value.trim());
  }
  input.focus();
}
*/

/* ================================================================
   TRAITEMENT DE LA RÉPONSE
   ================================================================ */
function handleAnswer(givenAnswer) {
  if (state.isLocked) return;
  state.isLocked = true;

  const q       = QUESTIONS[state.currentIndex];
  const isOk    = String(givenAnswer).trim() === String(q.correctAnswer).trim();

  /* Enregistre dans l'historique */
  state.answers.push({
    question: q.question,
    given:    givenAnswer,
    correct:  q.correctAnswer,
    ok:       isOk,
  });

  if (isOk) {
    state.score++;
    _setFeedback('correct', '✅ Bravo !');
    _markChoiceButton(givenAnswer, 'correct');
  } else {
    _setFeedback('wrong', `❌ La bonne réponse était : ${q.correctAnswer}`);
    _markChoiceButton(givenAnswer, 'wrong');
    _markChoiceButton(q.correctAnswer, 'correct');
  }

  /* Désactive tous les boutons / champs */
  _disableAnswerSection();

  /* Passe à la question suivante après le délai */
  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ================================================================
   ÉCRAN DE RÉSULTAT + ENVOI VERS FLUTTER
   ================================================================ */
function showResult() {
  const durationMs   = Date.now() - state.startTime;
  const successRate  = state.score / CONFIG.totalQuestions;
  const passed       = successRate >= CONFIG.passingRate;
  const successPct   = Math.round(successRate * 100);

  /* Affichage local */
  dom.questionSection.style.display = 'none';
  dom.resultScreen.classList.add('is-visible');

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed ? 'Excellent travail !' : 'Continue, tu y arrives !';
  dom.resultScore.textContent  = `${state.score} / ${CONFIG.totalQuestions}`;
  dom.resultDetail.textContent =
    `${successPct} % de réussite · ${Math.round(durationMs / 1000)} s`;

  /* -----------------------------------------------------------
     ✏️ PERSONNALISER — Payload envoyé à Flutter
     Ajoute ici n'importe quel champ métier supplémentaire.
     ----------------------------------------------------------- */
  const payload = {
    type:        'exercise_result',  // type fixe attendu par Flutter
    exerciseId:  CONFIG.exerciseId,
    score:       state.score,
    total:       CONFIG.totalQuestions,
    successRate: successRate,
    durationMs:  durationMs,
    answers:     state.answers,
  };

  _sendToFlutter(payload);
}

/* ================================================================
   ENVOI VERS FLUTTER
   ================================================================
   Ne jamais modifier cette fonction — le canal est fourni par
   webview_flutter.  En dehors de Flutter (test navigateur), on
   affiche simplement le payload dans la console.
   ================================================================ */
function _sendToFlutter(payload) {
  const json = JSON.stringify(payload);

  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(json);
  } else {
    /* Permet de tester l'exercice dans un navigateur classique */
    console.info('[ExerciseChannel] Hors Flutter – payload :', payload);
  }
}

/* ================================================================
   REDÉMARRAGE
   ================================================================ */
dom.btnRestart.addEventListener('click', init);

/* ================================================================
   UTILITAIRES PRIVÉS
   ================================================================ */

function _setFeedback(type, message) {
  dom.feedback.textContent  = message;
  dom.feedback.className    = `feedback feedback--${type}`;
}

function _clearFeedback() {
  dom.feedback.textContent = '';
  dom.feedback.className   = 'feedback feedback--empty';
}

/** Ajoute la classe correcte/erreur sur un bouton choix dont le texte = value */
function _markChoiceButton(value, type) {
  const grid = dom.answerSection.querySelector('.choices-grid');
  if (!grid) return;
  grid.querySelectorAll('.choice-btn').forEach(btn => {
    if (btn.textContent === String(value)) {
      btn.classList.add(`choice-btn--${type}`);
    }
  });
}

function _disableAnswerSection() {
  dom.answerSection
    .querySelectorAll('button, input')
    .forEach(el => (el.disabled = true));
}

/* ================================================================
   LANCEMENT
   ================================================================ */
init();
