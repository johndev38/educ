/**
 * Compléments à 10, 100 et 1000 — CE2
 * =====================================================================
 * Règles du jeu :
 *   - Questions sans fin jusqu'à la condition de victoire.
 *   - Chaque question dispose d'un timer de 5 secondes.
 *   - Timeout = mauvaise réponse, la série repart à 0.
 *   - Victoire : 15 bonnes réponses consécutives.
 *   - Limite de sécurité : 150 questions (évite une session infinie).
 *
 * Types de questions générées aléatoirement :
 *   - Complément à    10 : a ∈ [1..9],   réponse = 10 - a
 *   - Complément à   100 : a ∈ [1..99],  réponse = 100 - a  (multiples de 10 favorisés)
 *   - Complément à  1000 : a ∈ [1..999], réponse = 1000 - a (multiples de 100/10 favorisés)
 */

'use strict';

/* ════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  exerciseId:          'complements',
  streakTarget:        15,      // nombre de bonnes réponses consécutives pour gagner
  timerMs:             5000,    // durée du timer par question (ms)
  tickMs:              50,      // fréquence de mise à jour du timer (ms)
  delayAfterCorrect:   700,     // délai avant question suivante après bonne réponse
  delayAfterWrong:     1600,    // délai avant question suivante après erreur / timeout
  maxQuestions:        150,     // limite de sécurité (fin forcée)
};

/* ════════════════════════════════════════════════════════════════════
   ÉTAT
   ════════════════════════════════════════════════════════════════════ */
const state = {
  streak:         0,      // série en cours
  bestStreak:     0,      // meilleure série de la session
  correctTotal:   0,      // total de bonnes réponses
  questionsTotal: 0,      // total de questions tentées
  startTime:      0,
  isLocked:       false,  // bloque les clics pendant le feedback
  answers:        [],     // historique complet
  currentQ:       null,   // question en cours
  timerInterval:  null,   // référence setInterval
  timerRemaining: 0,      // ms restantes
  hasWon:         false,  // victoire atteinte ?
};

/* ════════════════════════════════════════════════════════════════════
   RÉFÉRENCES DOM
   ════════════════════════════════════════════════════════════════════ */
const dom = {
  streakValue:     document.getElementById('streak-value'),
  streakCounter:   document.getElementById('streak-counter'),
  timerBar:        document.getElementById('timer-bar'),
  timerLabel:      document.getElementById('timer-label'),
  questionSection: document.getElementById('question-section'),
  questionCard:    document.getElementById('question-card'),
  typeLabel:       document.getElementById('type-label'),
  questionText:    document.getElementById('question-text'),
  answerSection:   document.getElementById('answer-section'),
  feedback:        document.getElementById('feedback'),
  streakDots:      document.getElementById('streak-dots'),
  resultScreen:    document.getElementById('result-screen'),
  resultEmoji:     document.getElementById('result-emoji'),
  resultTitle:     document.getElementById('result-title'),
  resultStreak:    document.getElementById('result-streak'),
  resultScore:     document.getElementById('result-score'),
  resultDetail:    document.getElementById('result-detail'),
  btnRestart:      document.getElementById('btn-restart'),
};

/* ════════════════════════════════════════════════════════════════════
   DÉMARRAGE / RÉINITIALISATION
   ════════════════════════════════════════════════════════════════════ */
function init() {
  state.streak         = 0;
  state.bestStreak     = 0;
  state.correctTotal   = 0;
  state.questionsTotal = 0;
  state.startTime      = Date.now();
  state.isLocked       = false;
  state.answers        = [];
  state.currentQ       = null;
  state.hasWon         = false;

  dom.resultScreen.classList.remove('is-visible');
  dom.questionSection.style.display = '';

  _buildStreakDots();
  _updateStreakDisplay();
  showQuestion();
}

/* ════════════════════════════════════════════════════════════════════
   AFFICHAGE D'UNE QUESTION
   ════════════════════════════════════════════════════════════════════ */
function showQuestion() {
  // Limite de sécurité
  if (state.questionsTotal >= CONFIG.maxQuestions) {
    _endGame(false);
    return;
  }

  state.isLocked = false;
  _clearFeedback();

  // Génère une nouvelle question aléatoirement parmi les 3 types
  state.currentQ = _generateQuestion();

  // Affiche le libellé du type
  _renderTypeLabel(state.currentQ.type);

  // Affiche l'équation avec la case "?"
  dom.questionText.innerHTML = _buildEquationHTML(state.currentQ);

  // Affiche les 4 choix
  _renderChoices(state.currentQ.choices);

  // Lance le timer
  _startTimer();
}

/* ════════════════════════════════════════════════════════════════════
   GESTION DE LA RÉPONSE
   ════════════════════════════════════════════════════════════════════ */
function handleAnswer(givenStr) {
  if (state.isLocked) return;
  state.isLocked = true;
  _stopTimer();

  const q       = state.currentQ;
  const isOk    = givenStr === q.correctAnswer;

  // Enregistrement
  state.questionsTotal++;
  state.answers.push({
    question: q.questionStr,
    given:    givenStr,
    correct:  q.correctAnswer,
    ok:       isOk,
  });

  // Révèle la case "?"
  const blankEl = dom.questionText.querySelector('.eq-blank');
  if (blankEl) {
    blankEl.textContent = q.correctAnswer;
    blankEl.classList.add(isOk ? 'revealed-correct' : 'revealed-wrong');
  }

  // Marque les boutons
  _markButtons(givenStr, q.correctAnswer, isOk);

  if (isOk) {
    // ── Bonne réponse ──────────────────────────────────────────────
    state.correctTotal++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    _updateStreakDisplay(true);   // true = animation de rebond
    _updateStreakDots();
    _setFeedback('correct', _correctMessage());

    // Victoire ?
    if (state.streak >= CONFIG.streakTarget) {
      setTimeout(() => _endGame(true), CONFIG.delayAfterCorrect);
    } else {
      setTimeout(showQuestion, CONFIG.delayAfterCorrect);
    }

  } else {
    // ── Mauvaise réponse ───────────────────────────────────────────
    const wasStreak = state.streak;
    state.streak    = 0;

    _updateStreakDisplay();
    _updateStreakDots();
    _setFeedback('wrong', wasStreak > 0
      ? `❌ La réponse était ${q.correctAnswer} — série perdue !`
      : `❌ La réponse était ${q.correctAnswer}`
    );

    setTimeout(showQuestion, CONFIG.delayAfterWrong);
  }
}

/* ════════════════════════════════════════════════════════════════════
   TIMER
   ════════════════════════════════════════════════════════════════════ */
function _startTimer() {
  _stopTimer();
  state.timerRemaining = CONFIG.timerMs;
  _updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timerRemaining -= CONFIG.tickMs;
    _updateTimerDisplay();

    if (state.timerRemaining <= 0) {
      _stopTimer();
      _onTimeout();
    }
  }, CONFIG.tickMs);
}

function _stopTimer() {
  if (state.timerInterval !== null) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function _updateTimerDisplay() {
  const pct     = Math.max(0, state.timerRemaining / CONFIG.timerMs * 100);
  const seconds = Math.max(0, Math.ceil(state.timerRemaining / 1000));

  dom.timerBar.style.width    = `${pct}%`;
  dom.timerLabel.textContent  = seconds;

  // Couleur dynamique selon le temps restant
  dom.timerBar.className = 'timer-bar '
    + (pct > 50 ? 'timer-bar--ok'
     : pct > 20 ? 'timer-bar--warn'
     :            'timer-bar--danger');
}

/** Appelé quand le timer atteint 0 */
function _onTimeout() {
  if (state.isLocked) return;
  state.isLocked = true;

  const q = state.currentQ;
  state.questionsTotal++;
  state.answers.push({
    question: q.questionStr,
    given:    '(temps écoulé)',
    correct:  q.correctAnswer,
    ok:       false,
  });

  // Révèle la case
  const blankEl = dom.questionText.querySelector('.eq-blank');
  if (blankEl) {
    blankEl.textContent = q.correctAnswer;
    blankEl.classList.add('revealed-wrong');
  }

  // Marque la bonne réponse en vert
  _markButtonCorrect(q.correctAnswer);

  const wasStreak = state.streak;
  state.streak    = 0;
  _updateStreakDisplay();
  _updateStreakDots();

  _setFeedback('wrong', wasStreak > 0
    ? `⏰ Temps écoulé ! C'était ${q.correctAnswer} — série perdue !`
    : `⏰ Temps écoulé ! C'était ${q.correctAnswer}`
  );

  // Désactive les boutons
  dom.answerSection.querySelectorAll('.choice-btn')
    .forEach(b => (b.disabled = true));

  setTimeout(showQuestion, CONFIG.delayAfterWrong);
}

/* ════════════════════════════════════════════════════════════════════
   FIN DE PARTIE
   ════════════════════════════════════════════════════════════════════ */
function _endGame(won) {
  _stopTimer();
  state.hasWon = won;

  const durationMs  = Date.now() - state.startTime;
  const successRate = won ? 1.0
    : (state.questionsTotal > 0 ? state.correctTotal / state.questionsTotal : 0);
  const pct = Math.round(successRate * 100);

  // Affichage de l'écran résultat
  dom.questionSection.style.display = 'none';
  dom.resultScreen.classList.add('is-visible');

  if (won) {
    dom.resultEmoji.textContent  = '🏆';
    dom.resultTitle.textContent  = '15 de suite ! Bravo !';
    dom.resultStreak.textContent = `Meilleure série : ${state.bestStreak}`;
  } else {
    dom.resultEmoji.textContent  = state.bestStreak >= 10 ? '🌟' : '💪';
    dom.resultTitle.textContent  = state.bestStreak >= 10
      ? 'Presque ! Réessaie !'
      : 'Continue, tu y arrives !';
    dom.resultStreak.textContent = `Meilleure série : ${state.bestStreak} / 15`;
  }

  dom.resultScore.textContent  = `${state.correctTotal} / ${state.questionsTotal}`;
  dom.resultDetail.textContent =
    `${pct} % de réussite · ${Math.round(durationMs / 1000)} s`;

  // Envoi du résultat à Flutter
  _sendToFlutter({
    type:        'exercise_result',
    exerciseId:  CONFIG.exerciseId,
    score:       state.correctTotal,
    total:       state.questionsTotal,
    successRate: successRate,
    durationMs:  durationMs,
    answers:     state.answers,
  });
}

/* ════════════════════════════════════════════════════════════════════
   ENVOI VERS FLUTTER
   ════════════════════════════════════════════════════════════════════ */
function _sendToFlutter(payload) {
  const json = JSON.stringify(payload);
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(json);
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }
}

/* ════════════════════════════════════════════════════════════════════
   GÉNÉRATION DES QUESTIONS
   ════════════════════════════════════════════════════════════════════ */
function _generateQuestion() {
  // Distribution équitable parmi les 3 types
  const types = ['10', '100', '1000'];
  const type  = types[_randInt(0, 2)];

  let a, target;

  switch (type) {
    case '10':
      // a ∈ [1..9]
      a = _randInt(1, 9);
      target = 10;
      break;

    case '100':
      // CE2 : favorise les multiples de 10, mais inclut des cas généraux
      if (Math.random() < 0.55) {
        a = _randInt(1, 9) * 10;   // 10, 20, …, 90
      } else {
        a = _randInt(1, 99);
      }
      target = 100;
      break;

    case '1000':
    default:
      // CE2 : favorise les multiples de 100, puis de 10, puis généraux
      const r = Math.random();
      if      (r < 0.45) { a = _randInt(1, 9)  * 100; }  // 100, 200, …, 900
      else if (r < 0.80) { a = _randInt(1, 99) * 10;  }  // 10, 20, …, 990
      else               { a = _randInt(1, 999);       }
      target = 1000;
      break;
  }

  const correct = target - a;
  const choices = _buildChoices(correct, type);

  return {
    type,
    a,
    target,
    correctAnswer: String(correct),
    questionStr:   `${a} + … = ${target}`,
    choices,
  };
}

/**
 * Génère 3 distracteurs plausibles + la bonne réponse, mélangés.
 * Les distracteurs sont proches de la bonne réponse pour être pédagogiques.
 */
function _buildChoices(correct, type) {
  const offsets = {
    '10':  [ 1, -1,  2, -2,  3, -3],
    '100': [10, -10,  5, -5,  2, -2, 20, -20, 1, -1],
    '1000':[100,-100, 50,-50, 10,-10,200,-200,20,-20],
  };

  const pool       = _shuffle([...offsets[type]]);
  const distractors = [];

  for (const delta of pool) {
    if (distractors.length >= 3) break;
    const v = correct + delta;
    // Valide : positif, différent du correct, pas déjà dans la liste
    if (v > 0 && v !== correct && !distractors.includes(v)) {
      distractors.push(v);
    }
  }

  // Complète si pas assez de distracteurs (cas limites, ex : correct = 1)
  let safety = 0;
  while (distractors.length < 3 && safety < 100) {
    safety++;
    const sign  = Math.random() < 0.5 ? 1 : -1;
    const range = type === '10' ? 3 : type === '100' ? 15 : 150;
    const v     = correct + sign * _randInt(1, range);
    if (v > 0 && v !== correct && !distractors.includes(v)) {
      distractors.push(v);
    }
  }

  return _shuffle([correct, ...distractors]).map(String);
}

/* ════════════════════════════════════════════════════════════════════
   RENDU VISUEL
   ════════════════════════════════════════════════════════════════════ */

/** Construit le HTML de l'équation avec la case "?" */
function _buildEquationHTML(q) {
  const colorClass = `eq-target--${q.type}`;
  return `
    <span class="eq-num">${q.a}</span>
    <span class="eq-op">+</span>
    <span class="eq-blank">?</span>
    <span class="eq-op">=</span>
    <span class="eq-target ${colorClass}">${q.target}</span>
  `;
}

/** Met à jour le libellé et la couleur du type */
function _renderTypeLabel(type) {
  dom.typeLabel.textContent = `Complément à ${type}`;
  dom.typeLabel.className   = `type-label type--${type}`;
}

/** Injecte les 4 boutons de réponse */
function _renderChoices(choices) {
  dom.answerSection.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'choices-grid';

  choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = value;
    btn.type        = 'button';
    btn.addEventListener('click', () => handleAnswer(value));
    grid.appendChild(btn);
  });

  dom.answerSection.appendChild(grid);
}

/** Marque le bouton cliqué (correct ou wrong) et montre la bonne réponse */
function _markButtons(given, correct, isOk) {
  const btns = dom.answerSection.querySelectorAll('.choice-btn');
  btns.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === given && !isOk) {
      btn.classList.add('choice-btn--wrong');
    }
    if (btn.textContent === correct) {
      btn.classList.add('choice-btn--correct');
    }
  });
}

/** Marque uniquement la bonne réponse (cas timeout) */
function _markButtonCorrect(correct) {
  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    if (btn.textContent === correct) btn.classList.add('choice-btn--correct');
  });
}

/** Affiche ou masque le message de feedback */
function _setFeedback(type, message) {
  dom.feedback.textContent = message;
  dom.feedback.className   = `feedback feedback--${type}`;
}

function _clearFeedback() {
  dom.feedback.textContent = '';
  dom.feedback.className   = 'feedback feedback--empty';
}

/* ════════════════════════════════════════════════════════════════════
   COMPTEUR + PASTILLES DE SÉRIE
   ════════════════════════════════════════════════════════════════════ */

/** Crée les 15 pastilles dans le DOM */
function _buildStreakDots() {
  dom.streakDots.innerHTML = '';
  for (let i = 0; i < CONFIG.streakTarget; i++) {
    const dot = document.createElement('div');
    dot.className   = 'streak-dot';
    dot.setAttribute('aria-hidden', 'true');
    dom.streakDots.appendChild(dot);
  }
}

/** Met à jour l'affichage du compteur de série */
function _updateStreakDisplay(animate = false) {
  dom.streakValue.textContent = state.streak;
  if (animate) {
    dom.streakValue.classList.remove('bump');
    // Force reflow pour redéclencher l'animation CSS
    void dom.streakValue.offsetWidth;
    dom.streakValue.classList.add('bump');
  }
}

/** Met à jour les pastilles (cercles) en fonction de state.streak */
function _updateStreakDots() {
  const dots = dom.streakDots.querySelectorAll('.streak-dot');
  dots.forEach((dot, i) => {
    const shouldBeActive = i < state.streak;
    const wasActive      = dot.classList.contains('dot-active');

    if (shouldBeActive && !wasActive) {
      dot.classList.add('dot-active', 'dot-just-added');
      // Retire la classe d'animation après qu'elle soit terminée
      setTimeout(() => dot.classList.remove('dot-just-added'), 350);
    } else if (!shouldBeActive) {
      dot.classList.remove('dot-active', 'dot-just-added');
    }
  });
}

/* ════════════════════════════════════════════════════════════════════
   MESSAGES DE FÉLICITATIONS (variés)
   ════════════════════════════════════════════════════════════════════ */
const _bravo = [
  '✅ Exact !',  '✅ Bravo !',  '✅ Parfait !',
  '✅ Super !',  '✅ Génial !', '✅ Excellent !',
  '✅ Ouais !',  '✅ Top !',
];

function _correctMessage() {
  if (state.streak >= 10) return `🔥 ${state.streak} de suite ! Continue !`;
  if (state.streak >=  5) return `⚡ ${state.streak} en série ! Continue !`;
  return _bravo[_randInt(0, _bravo.length - 1)];
}

/* ════════════════════════════════════════════════════════════════════
   UTILITAIRES
   ════════════════════════════════════════════════════════════════════ */

/** Entier aléatoire entre min et max inclus */
function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Mélange un tableau (Fisher-Yates) — retourne le tableau modifié */
function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = _randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ════════════════════════════════════════════════════════════════════
   ÉVÉNEMENTS
   ════════════════════════════════════════════════════════════════════ */
dom.btnRestart.addEventListener('click', init);

/* ════════════════════════════════════════════════════════════════════
   LANCEMENT
   ════════════════════════════════════════════════════════════════════ */
init();
