'use strict';

/* ════════════════════════════════════════════════════════════
   CONFIGURATION DES NIVEAUX
   ════════════════════════════════════════════════════════════ */
const LEVELS = {
  easy: {
    label:    '🟢 Facile',
    color:    '#27AE60',
    colorLt:  'rgba(39,174,96,.12)',
    bgPage:   '#F0FFF4',
    minA:     3,    // valeur minimale du plus grand nombre
    maxA:     20,
    timerMs:  10000,
    totalQ:   10,
  },
  medium: {
    label:    '🟡 Moyen',
    color:    '#E67E22',
    colorLt:  'rgba(230,126,34,.12)',
    bgPage:   '#FFF8F0',
    minA:     11,
    maxA:     99,
    timerMs:  8000,
    totalQ:   10,
  },
  hard: {
    label:    '🔴 Difficile',
    color:    '#C0392B',
    colorLt:  'rgba(192,57,43,.12)',
    bgPage:   '#FFF5F5',
    minA:     101,
    maxA:     999,
    timerMs:  6000,
    totalQ:   10,
  },
};

const CONFIG = {
  exerciseId:  'soustraction',
  passingRate: 0.7,
  delayNextMs: 1050,
};

/* ════════════════════════════════════════════════════════════
   ÉTAT
   ════════════════════════════════════════════════════════════ */
const state = {
  level:        null,
  currentIndex: 0,
  score:        0,
  startTime:    0,
  isLocked:     false,
  timerTimeout: null,
  dangerTimeout:null,
  questions:    [],
  answers:      [],
};

/* ════════════════════════════════════════════════════════════
   RÉFÉRENCES DOM
   ════════════════════════════════════════════════════════════ */
const dom = {
  levelScreen:   document.getElementById('level-screen'),
  gameScreen:    document.getElementById('game-screen'),
  resultScreen:  document.getElementById('result-screen'),
  levelBadge:    document.getElementById('level-badge'),
  progressFill:  document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
  timerFill:     document.getElementById('timer-fill'),
  questionText:  document.getElementById('question-text'),
  answerSection: document.getElementById('answer-section'),
  feedback:      document.getElementById('feedback'),
  resultEmoji:   document.getElementById('result-emoji'),
  resultTitle:   document.getElementById('result-title'),
  resultScore:   document.getElementById('result-score'),
  resultLevel:   document.getElementById('result-level'),
  resultDetail:  document.getElementById('result-detail'),
  btnReplay:     document.getElementById('btn-replay'),
  btnChange:     document.getElementById('btn-change-level'),
};

/* ════════════════════════════════════════════════════════════
   DÉMARRAGE DU JEU
   ════════════════════════════════════════════════════════════ */
function startGame(levelKey) {
  const lvl = LEVELS[levelKey];

  state.level        = levelKey;
  state.currentIndex = 0;
  state.score        = 0;
  state.startTime    = Date.now();
  state.isLocked     = false;
  state.answers      = [];
  state.questions    = _generateQuestions(levelKey);

  // Applique la couleur du niveau sur toute l'interface
  const root = document.documentElement.style;
  root.setProperty('--level-color',    lvl.color);
  root.setProperty('--level-color-lt', lvl.colorLt);
  document.body.style.background = lvl.bgPage;

  dom.levelBadge.textContent = lvl.label;

  // Bascule vers l'écran de jeu
  dom.levelScreen.hidden  = true;
  dom.resultScreen.hidden = true;
  dom.gameScreen.hidden   = false;

  showQuestion();
}

/* ════════════════════════════════════════════════════════════
   GÉNÉRATION DES QUESTIONS
   a − b = ? avec b < a (résultat toujours ≥ 1)
   ════════════════════════════════════════════════════════════ */
function _generateQuestions(levelKey) {
  const { minA, maxA, totalQ } = LEVELS[levelKey];
  const questions = [];

  for (let i = 0; i < totalQ; i++) {
    const a       = _randInt(minA, maxA);
    const b       = _randInt(1, a - 1);   // garantit un résultat ≥ 1
    const correct = a - b;
    questions.push({ a, b, correct, choices: _buildChoices(a, b, correct, levelKey) });
  }
  return questions;
}

/* ════════════════════════════════════════════════════════════
   CONSTRUCTION DES CHOIX (distracteurs pédagogiques)

   - Piège principal : a + b (l'enfant a additionné au lieu de soustraire)
   - Variantes proches : correct ± petit offset aléatoire
   - Fallback garanti pour toujours avoir 4 choix distincts
   ════════════════════════════════════════════════════════════ */
function _buildChoices(a, b, correct, levelKey) {
  const maxOff = levelKey === 'easy' ? 5 : levelKey === 'medium' ? 15 : 50;
  const set    = new Set([correct]);

  // Piège courant : addition au lieu de soustraction
  const sumTrap = a + b;
  if (sumTrap !== correct) set.add(sumTrap);

  // Variantes proches
  let attempts = 0;
  while (set.size < 4 && attempts < 100) {
    attempts++;
    const offset = _randInt(1, maxOff);
    const sign   = Math.random() < 0.5 ? 1 : -1;
    const cand   = correct + sign * offset;
    if (cand >= 0 && cand !== correct) set.add(cand);
  }

  // Fallback ultime
  for (let i = 1; set.size < 4; i++) {
    set.add(correct + i);
    if (set.size < 4 && correct - i >= 0) set.add(correct - i);
  }

  return _shuffle([...set].slice(0, 4));
}

/* ════════════════════════════════════════════════════════════
   AFFICHAGE D'UNE QUESTION
   ════════════════════════════════════════════════════════════ */
function showQuestion() {
  const lvl = LEVELS[state.level];

  if (state.currentIndex >= lvl.totalQ) {
    showResult();
    return;
  }

  state.isLocked = false;
  _clearFeedback();

  const q = state.questions[state.currentIndex];

  // Progression
  const pct = (state.currentIndex / lvl.totalQ) * 100;
  dom.progressFill.style.width  = `${pct}%`;
  dom.progressLabel.textContent = `${state.currentIndex + 1} / ${lvl.totalQ}`;

  // Formule :  A  −  B  =  ?
  dom.questionText.innerHTML = `
    <span class="formula-num">${q.a}</span>
    <span class="formula-op">−</span>
    <span class="formula-num">${q.b}</span>
    <span class="formula-eq">=</span>
    <span class="formula-blank" id="formula-blank">?</span>
  `;

  // Boutons de réponse
  dom.answerSection.innerHTML = '';
  q.choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.type        = 'button';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(value));
    dom.answerSection.appendChild(btn);
  });

  // Lance le chronomètre
  _startTimer(lvl.timerMs);
}

/* ════════════════════════════════════════════════════════════
   CHRONOMÈTRE
   La barre rétrécit via une transition CSS pilotée par JS.
   Elle passe au rouge (classe .danger) à 30% du temps restant.
   ════════════════════════════════════════════════════════════ */
function _startTimer(durationMs) {
  _clearTimer();

  // Reset sans transition
  dom.timerFill.style.transition = 'none';
  dom.timerFill.classList.remove('danger');
  dom.timerFill.style.width = '100%';

  // Force le reflow pour que le reset soit appliqué avant l'animation
  dom.timerFill.getBoundingClientRect();

  // Lance l'animation de rétrécissement
  dom.timerFill.style.transition = `width ${durationMs}ms linear`;
  dom.timerFill.style.width      = '0%';

  // Passage en rouge à 70% du temps écoulé
  state.dangerTimeout = setTimeout(
    () => dom.timerFill.classList.add('danger'),
    durationMs * 0.7,
  );

  // Expiration
  state.timerTimeout = setTimeout(_onTimeout, durationMs);
}

function _clearTimer() {
  clearTimeout(state.timerTimeout);
  clearTimeout(state.dangerTimeout);
  state.timerTimeout  = null;
  state.dangerTimeout = null;
  dom.timerFill.style.transition = 'none';
  dom.timerFill.classList.remove('danger');
  dom.timerFill.style.width = '100%';
}

/* ════════════════════════════════════════════════════════════
   EXPIRATION DU CHRONO
   ════════════════════════════════════════════════════════════ */
function _onTimeout() {
  if (state.isLocked) return;
  state.isLocked = true;

  const q = state.questions[state.currentIndex];

  state.answers.push({
    question: `${q.a} − ${q.b}`,
    given:    'timeout',
    correct:  q.correct,
    ok:       false,
  });

  // Révèle la bonne réponse
  const blankEl = document.getElementById('formula-blank');
  if (blankEl) {
    blankEl.textContent = q.correct;
    blankEl.classList.add('revealed-wrong');
  }

  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (Number(btn.textContent.trim()) === q.correct) {
      btn.classList.add('choice-btn--correct');
    }
  });

  _setFeedback('wrong',
    `⏱ Temps écoulé ! La réponse était <strong>${q.correct}</strong>`);

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs + 400);
}

/* ════════════════════════════════════════════════════════════
   GESTION DE LA RÉPONSE
   ════════════════════════════════════════════════════════════ */
function handleAnswer(chosen) {
  if (state.isLocked) return;
  state.isLocked = true;
  _clearTimer();

  const q    = state.questions[state.currentIndex];
  const isOk = chosen === q.correct;

  state.answers.push({
    question: `${q.a} − ${q.b}`,
    given:    chosen,
    correct:  q.correct,
    ok:       isOk,
  });

  // Révèle la case "?"
  const blankEl = document.getElementById('formula-blank');
  if (blankEl) {
    blankEl.textContent = q.correct;
    blankEl.classList.add(isOk ? 'revealed-correct' : 'revealed-wrong');
  }

  // Colorie les boutons
  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    const val = Number(btn.textContent.trim());
    btn.disabled = true;
    if (val === chosen && !isOk) btn.classList.add('choice-btn--wrong');
    if (val === q.correct)       btn.classList.add('choice-btn--correct');
  });

  if (isOk) {
    state.score++;
    _setFeedback('correct', _pickBravo());
  } else {
    _setFeedback('wrong',
      `❌ La bonne réponse était <strong>${q.correct}</strong>`);
  }

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ════════════════════════════════════════════════════════════
   RÉSULTAT + ENVOI FLUTTER
   ════════════════════════════════════════════════════════════ */
function showResult() {
  _clearTimer();

  const lvl         = LEVELS[state.level];
  const durationMs  = Date.now() - state.startTime;
  const successRate = state.score / lvl.totalQ;
  const passed      = successRate >= CONFIG.passingRate;
  const pct         = Math.round(successRate * 100);

  dom.gameScreen.hidden   = true;
  dom.resultScreen.hidden = false;

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed
    ? 'Excellent travail !'
    : 'Entraîne-toi encore !';
  dom.resultScore.textContent  = `${state.score} / ${lvl.totalQ}`;
  dom.resultLevel.textContent  = lvl.label;
  dom.resultDetail.textContent =
    `${pct} % de réussite · ${Math.round(durationMs / 1000)} s`;

  _sendToFlutter({
    type:        'exercise_result',
    exerciseId:  CONFIG.exerciseId,
    level:       state.level,
    score:       state.score,
    total:       lvl.totalQ,
    successRate,
    durationMs,
    answers:     state.answers,
  });
}

/* ════════════════════════════════════════════════════════════
   ENVOI VERS FLUTTER
   ════════════════════════════════════════════════════════════ */
function _sendToFlutter(payload) {
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(JSON.stringify(payload));
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }
}

/* ════════════════════════════════════════════════════════════
   ACTIONS DES BOUTONS DE RÉSULTAT
   ════════════════════════════════════════════════════════════ */
dom.btnReplay.addEventListener('click', () => startGame(state.level));

dom.btnChange.addEventListener('click', () => {
  _clearTimer();
  dom.resultScreen.hidden = true;
  dom.levelScreen.hidden  = false;
  // Réinitialise les couleurs au défaut CSS
  document.documentElement.style.removeProperty('--level-color');
  document.documentElement.style.removeProperty('--level-color-lt');
  document.body.style.background = '';
});

/* ════════════════════════════════════════════════════════════
   FEEDBACK
   ════════════════════════════════════════════════════════════ */
const _BRAVO = [
  '✅ Bravo !', '✅ Parfait !', '✅ Exact !',
  '✅ Super !', '✅ Génial !', '✅ Très bien !',
];
function _pickBravo() { return _BRAVO[_randInt(0, _BRAVO.length - 1)]; }

function _setFeedback(type, html) {
  dom.feedback.innerHTML = html;
  dom.feedback.className = `feedback feedback--${type}`;
}
function _clearFeedback() {
  dom.feedback.innerHTML = '';
  dom.feedback.className = 'feedback feedback--empty';
}

/* ════════════════════════════════════════════════════════════
   UTILITAIRES
   ════════════════════════════════════════════════════════════ */
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
