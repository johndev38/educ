/**
 * Conjugaison du 1er groupe — présent de l'indicatif
 * =====================================================================
 * Règles du jeu :
 *   - 10 questions par session.
 *   - Chaque question présente : pronom + verbe infinitif → conjuguer.
 *   - 4 choix : la forme correcte + 3 distracteurs (dont toujours
 *     l'infinitif, piège fréquent chez les enfants).
 *   - Le tableau de rappel des terminaisons est toujours visible.
 *   - La colonne du pronom actif est mise en évidence dans le tableau.
 *   - Réussite : ≥ 70 % (7/10).
 *
 * Verbes du 1er groupe utilisés :
 *   Tous se terminent en -ER, sans changement orthographique.
 *   Radical = infinitif - "er".
 *   Terminaisons : je -e | tu -es | il/elle -e |
 *                  nous -ons | vous -ez | ils/elles -ent
 */

'use strict';

/* ════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  exerciseId:     'conjugaison_1er',
  totalQuestions: 10,
  passingRate:    0.7,
  delayNextMs:    950,
};

/* ════════════════════════════════════════════════════════════════════
   DONNÉES — VERBES (radical = infinitif sans "er")
   ════════════════════════════════════════════════════════════════════ */
const VERBES = [
  // --- vie quotidienne ---
  { inf: 'aimer',    rad: 'aim'    },
  { inf: 'parler',   rad: 'parl'   },
  { inf: 'jouer',    rad: 'jou'    },
  { inf: 'chanter',  rad: 'chant'  },
  { inf: 'danser',   rad: 'dans'   },
  { inf: 'écouter',  rad: 'écout'  },
  { inf: 'regarder', rad: 'regard' },
  { inf: 'trouver',  rad: 'trouv'  },
  { inf: 'donner',   rad: 'donn'   },
  { inf: 'laver',    rad: 'lav'    },
  { inf: 'marcher',  rad: 'march'  },
  { inf: 'habiter',  rad: 'habit'  },
  { inf: 'fermer',   rad: 'ferm'   },
  { inf: 'montrer',  rad: 'montr'  },
  // --- mouvements ---
  { inf: 'sauter',   rad: 'saut'   },
  { inf: 'monter',   rad: 'mont'   },
  { inf: 'tomber',   rad: 'tomb'   },
  { inf: 'arriver',  rad: 'arriv'  },
  { inf: 'entrer',   rad: 'entr'   },
  { inf: 'pousser',  rad: 'pouss'  },
  { inf: 'tirer',    rad: 'tir'    },
  { inf: 'voler',    rad: 'vol'    },
  // --- pensées & actions ---
  { inf: 'penser',   rad: 'pens'   },
  { inf: 'rêver',    rad: 'rêv'    },
  { inf: 'chercher', rad: 'cherch' },
  { inf: 'aider',    rad: 'aid'    },
  { inf: 'dessiner', rad: 'dessin' },
  { inf: 'porter',   rad: 'port'   },
  { inf: 'crier',    rad: 'cri'    },
  { inf: 'pleurer',  rad: 'pleur'  },
];

/* ════════════════════════════════════════════════════════════════════
   DONNÉES — PRONOMS avec terminaison et index dans le tableau
   L'index correspond à la colonne du tableau de rappel (0 = je, …, 5 = ils/elles).
   ════════════════════════════════════════════════════════════════════ */
const PRONOMS = [
  { label: 'je',      suffix: 'e',   colIndex: 0 },
  { label: 'tu',      suffix: 'es',  colIndex: 1 },
  { label: 'il',      suffix: 'e',   colIndex: 2 },
  { label: 'elle',    suffix: 'e',   colIndex: 2 },
  { label: 'nous',    suffix: 'ons', colIndex: 3 },
  { label: 'vous',    suffix: 'ez',  colIndex: 4 },
  { label: 'ils',     suffix: 'ent', colIndex: 5 },
  { label: 'elles',   suffix: 'ent', colIndex: 5 },
];

/* ════════════════════════════════════════════════════════════════════
   ÉTAT
   ════════════════════════════════════════════════════════════════════ */
const state = {
  currentIndex: 0,
  score:        0,
  startTime:    0,
  isLocked:     false,
  answers:      [],
  questions:    [],   // liste des 10 questions générées au départ
};

/* ════════════════════════════════════════════════════════════════════
   RÉFÉRENCES DOM
   ════════════════════════════════════════════════════════════════════ */
const dom = {
  progressFill:    document.getElementById('progress-fill'),
  progressLabel:   document.getElementById('progress-label'),
  questionSection: document.getElementById('question-section'),
  questionText:    document.getElementById('question-text'),
  ruleTable:       document.getElementById('rule-table'),
  answerSection:   document.getElementById('answer-section'),
  feedback:        document.getElementById('feedback'),
  resultScreen:    document.getElementById('result-screen'),
  resultEmoji:     document.getElementById('result-emoji'),
  resultTitle:     document.getElementById('result-title'),
  resultScore:     document.getElementById('result-score'),
  resultDetail:    document.getElementById('result-detail'),
  btnRestart:      document.getElementById('btn-restart'),
};

/* ════════════════════════════════════════════════════════════════════
   DÉMARRAGE / RÉINITIALISATION
   ════════════════════════════════════════════════════════════════════ */
function init() {
  state.currentIndex = 0;
  state.score        = 0;
  state.startTime    = Date.now();
  state.isLocked     = false;
  state.answers      = [];
  state.questions    = _buildQuestionList();

  dom.resultScreen.classList.remove('is-visible');
  dom.questionSection.style.display = '';

  showQuestion();
}

/* ════════════════════════════════════════════════════════════════════
   AFFICHAGE D'UNE QUESTION
   ════════════════════════════════════════════════════════════════════ */
function showQuestion() {
  if (state.currentIndex >= CONFIG.totalQuestions) {
    showResult();
    return;
  }

  state.isLocked = false;
  _clearFeedback();

  const q = state.questions[state.currentIndex];

  // --- Formule visuelle ---
  dom.questionText.innerHTML = `
    <span class="formula-pronoun">${q.pronoun.label}</span>
    <span class="formula-op">+</span>
    <span class="formula-verb">${q.verbe.inf}</span>
    <span class="formula-op">=</span>
    <span class="formula-blank" id="formula-blank">?</span>
  `;

  // --- Mise en évidence de la colonne dans le tableau ---
  _highlightRuleColumn(q.pronoun.colIndex);

  // --- Progression ---
  const pct = (state.currentIndex / CONFIG.totalQuestions) * 100;
  dom.progressFill.style.width    = `${pct}%`;
  dom.progressLabel.textContent   =
    `${state.currentIndex + 1} / ${CONFIG.totalQuestions}`;

  // --- Boutons de réponse ---
  _renderChoices(q.choices, q.correctForm);
}

/* ════════════════════════════════════════════════════════════════════
   GESTION DE LA RÉPONSE
   ════════════════════════════════════════════════════════════════════ */
function handleAnswer(chosen) {
  if (state.isLocked) return;
  state.isLocked = true;

  const q    = state.questions[state.currentIndex];
  const isOk = chosen === q.correctForm;

  // Enregistrement
  state.answers.push({
    question: `${q.pronoun.label} + ${q.verbe.inf}`,
    given:    chosen,
    correct:  q.correctForm,
    ok:       isOk,
  });

  // Révèle la case "?"
  const blankEl = document.getElementById('formula-blank');
  if (blankEl) {
    blankEl.textContent = q.correctForm;
    blankEl.classList.add(isOk ? 'revealed-correct' : 'revealed-wrong');
  }

  // Marque les boutons
  _markButtons(chosen, q.correctForm, isOk);

  if (isOk) {
    state.score++;
    _setFeedback('correct', _pickBravo());
  } else {
    _setFeedback('wrong',
      `❌ La bonne réponse est : <strong>${q.correctForm}</strong>`);
  }

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ════════════════════════════════════════════════════════════════════
   ÉCRAN DE RÉSULTAT + ENVOI FLUTTER
   ════════════════════════════════════════════════════════════════════ */
function showResult() {
  const durationMs  = Date.now() - state.startTime;
  const successRate = state.score / CONFIG.totalQuestions;
  const passed      = successRate >= CONFIG.passingRate;
  const pct         = Math.round(successRate * 100);

  dom.questionSection.style.display = 'none';
  dom.resultScreen.classList.add('is-visible');

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed
    ? 'Bravo, tu maîtrises le présent !'
    : 'Entraîne-toi encore !';
  dom.resultScore.textContent  = `${state.score} / ${CONFIG.totalQuestions}`;
  dom.resultDetail.textContent =
    `${pct} % de réussite · ${Math.round(durationMs / 1000)} s`;

  _sendToFlutter({
    type:        'exercise_result',
    exerciseId:  CONFIG.exerciseId,
    score:       state.score,
    total:       CONFIG.totalQuestions,
    successRate: successRate,
    durationMs:  durationMs,
    answers:     state.answers,
  });
}

/* ════════════════════════════════════════════════════════════════════
   ENVOI VERS FLUTTER
   ════════════════════════════════════════════════════════════════════ */
function _sendToFlutter(payload) {
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(JSON.stringify(payload));
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }
}

/* ════════════════════════════════════════════════════════════════════
   GÉNÉRATION DES QUESTIONS
   ════════════════════════════════════════════════════════════════════ */

/**
 * Génère une liste de CONFIG.totalQuestions questions en garantissant
 * qu'au moins un pronom de chaque type (je, tu, il/elle, nous, vous,
 * ils/elles) apparaît dans les 10 questions.
 */
function _buildQuestionList() {
  // Garantit la présence d'au moins un pronom de chaque groupe
  const pronoInsEssentiels = [
    PRONOMS[0], // je
    PRONOMS[1], // tu
    PRONOMS[2], // il   (colIndex 2)
    PRONOMS[3], // elle (colIndex 2)
    PRONOMS[4], // nous
    PRONOMS[5], // vous
    PRONOMS[6], // ils
    PRONOMS[7], // elles
  ];

  // On part de 8 questions obligatoires (un par pronom)
  // puis on complète avec 2 aléatoires
  const obligatoires = _shuffle([...pronoInsEssentiels])
    .slice(0, Math.min(CONFIG.totalQuestions, pronoInsEssentiels.length));

  const extras = [];
  for (let i = obligatoires.length; i < CONFIG.totalQuestions; i++) {
    extras.push(PRONOMS[_randInt(0, PRONOMS.length - 1)]);
  }

  const tousLesPronoms = _shuffle([...obligatoires, ...extras]);

  return tousLesPronoms.map(pronom => {
    const verbe      = VERBES[_randInt(0, VERBES.length - 1)];
    const correctForm = verbe.rad + pronom.suffix;
    const choices     = _buildChoices(verbe, pronom.suffix, correctForm);
    return { verbe, pronoun: pronom, correctForm, choices };
  });
}

/**
 * Construit un tableau de 4 réponses :
 *   - 1 correcte
 *   - toujours l'infinitif (piège pédagogique fréquent)
 *   - 2 formes conjuguées incorrectes (autre terminaison)
 */
function _buildChoices(verbe, correctSuffix, correctForm) {
  const TOUTES_SUFFIXES = ['e', 'es', 'ons', 'ez', 'ent'];

  // Formes conjuguées différentes de la forme correcte
  const formesWrong = TOUTES_SUFFIXES
    .filter(s => s !== correctSuffix)
    .map(s => verbe.rad + s)
    .filter((f, i, arr) => arr.indexOf(f) === i)  // déduplique
    .filter(f => f !== correctForm);               // élimine si coïncidence

  // On mélange les mauvaises formes conjuguées et on en prend 2
  const deuxWrong = _shuffle(formesWrong).slice(0, 2);

  // L'infinitif est TOUJOURS présent comme piège (sauf si = correct, impossible ici)
  const distracteurs = [verbe.inf, ...deuxWrong];

  return _shuffle([correctForm, ...distracteurs]);
}

/* ════════════════════════════════════════════════════════════════════
   RENDU DES BOUTONS DE RÉPONSE
   ════════════════════════════════════════════════════════════════════ */
function _renderChoices(choices, correctForm) {
  dom.answerSection.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'choices-grid';

  choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.type        = 'button';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(value));
    grid.appendChild(btn);
  });

  dom.answerSection.appendChild(grid);
}

function _markButtons(chosen, correct, isOk) {
  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === chosen && !isOk) {
      btn.classList.add('choice-btn--wrong');
    }
    if (btn.textContent === correct) {
      btn.classList.add('choice-btn--correct');
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   MISE EN ÉVIDENCE DE LA COLONNE ACTIVE DANS LE TABLEAU
   ════════════════════════════════════════════════════════════════════ */
/**
 * colIndex : 0=je · 1=tu · 2=il/elle · 3=nous · 4=vous · 5=ils/elles
 */
function _highlightRuleColumn(colIndex) {
  const headers = dom.ruleTable.querySelectorAll('thead th');
  const cells   = dom.ruleTable.querySelectorAll('tbody td');

  headers.forEach((th, i) => th.classList.toggle('active-col', i === colIndex));
  cells  .forEach((td, i) => td.classList.toggle('active-col', i === colIndex));
}

/* ════════════════════════════════════════════════════════════════════
   FEEDBACK
   ════════════════════════════════════════════════════════════════════ */
const _BRAVO = [
  '✅ Bravo !', '✅ Parfait !', '✅ Exact !',
  '✅ Super !', '✅ Génial !', '✅ Très bien !',
];

function _pickBravo() {
  return _BRAVO[_randInt(0, _BRAVO.length - 1)];
}

function _setFeedback(type, html) {
  dom.feedback.innerHTML  = html;
  dom.feedback.className  = `feedback feedback--${type}`;
}

function _clearFeedback() {
  dom.feedback.innerHTML = '';
  dom.feedback.className = 'feedback feedback--empty';
}

/* ════════════════════════════════════════════════════════════════════
   UTILITAIRES
   ════════════════════════════════════════════════════════════════════ */
function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = _randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ════════════════════════════════════════════════════════════════════
   ÉVÉNEMENTS & LANCEMENT
   ════════════════════════════════════════════════════════════════════ */
dom.btnRestart.addEventListener('click', init);

init();
