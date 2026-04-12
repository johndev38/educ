'use strict';

/* ================================================================
   CONFIGURATION
   ================================================================ */
const CONFIG = {
  exerciseId:     'multiplications',
  totalQuestions: 10,
  timerSeconds:   5,
  delayNextMs:    900,
  passingRate:    0.6,
};

/* ================================================================
   NIVEAUX — définit les intervalles de facteurs
   ================================================================ */
const LEVELS = {
  easy:   { label: 'Débutant',       minFactor: 2, maxFactor: 5,  otherMax: 10 },
  medium: { label: 'Intermédiaire',  minFactor: 2, maxFactor: 10, otherMax: 10 },
  hard:   { label: 'Difficile',      minFactor: 6, maxFactor: 12, otherMax: 12 },
};

/* ================================================================
   ÉTAT
   ================================================================ */
const state = {
  level:        null,
  questions:    [],
  currentIndex: 0,
  score:        0,
  startTime:    0,
  isLocked:     false,
  answers:      [],
  timerInterval: null,
  timerRemaining: 0,
};

/* ================================================================
   RÉFÉRENCES DOM
   ================================================================ */
const dom = {
  levelScreen:     document.getElementById('level-screen'),
  levelBtns:       document.querySelectorAll('.level-btn'),

  progressWrap:    document.getElementById('progress-wrap'),
  progressFill:    document.getElementById('progress-fill'),
  progressLabel:   document.getElementById('progress-label'),

  questionSection: document.getElementById('question-section'),
  timerBar:        document.getElementById('timer-bar'),
  timerLabel:      document.getElementById('timer-label'),
  questionText:    document.getElementById('question-text'),
  answerSection:   document.getElementById('answer-section'),
  feedback:        document.getElementById('feedback'),

  resultScreen:    document.getElementById('result-screen'),
  resultEmoji:     document.getElementById('result-emoji'),
  resultTitle:     document.getElementById('result-title'),
  resultScore:     document.getElementById('result-score'),
  resultDetail:    document.getElementById('result-detail'),
  btnRestart:      document.getElementById('btn-restart'),
  btnLevels:       document.getElementById('btn-levels'),
};

/* ================================================================
   SÉLECTION DU NIVEAU
   ================================================================ */
dom.levelBtns.forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.level));
});

dom.btnLevels.addEventListener('click', showLevelScreen);
dom.btnRestart.addEventListener('click', () => startGame(state.level));

/* ================================================================
   DÉMARRAGE DU JEU
   ================================================================ */
function startGame(level) {
  state.level        = level;
  state.questions    = generateQuestions(level);
  state.currentIndex = 0;
  state.score        = 0;
  state.startTime    = Date.now();
  state.isLocked     = false;
  state.answers      = [];

  dom.levelScreen.style.display    = 'none';
  dom.resultScreen.classList.remove('is-visible');
  dom.progressWrap.style.display   = '';
  dom.questionSection.style.display = '';

  showQuestion();
}

function showLevelScreen() {
  _stopTimer();
  dom.resultScreen.classList.remove('is-visible');
  dom.questionSection.style.display = 'none';
  dom.progressWrap.style.display    = 'none';
  dom.levelScreen.style.display     = '';
}

/* ================================================================
   GÉNÉRATION DES QUESTIONS
   ================================================================ */
function generateQuestions(level) {
  const { minFactor, maxFactor, otherMax } = LEVELS[level];
  const questions = [];

  for (let i = 0; i < CONFIG.totalQuestions; i++) {
    const a = _randInt(minFactor, maxFactor);
    const b = _randInt(2, otherMax);
    const correct = a * b;

    questions.push({
      question:      `${a} × ${b}`,
      correctAnswer: String(correct),
      choices:       _generateChoices(correct),
    });
  }

  return questions;
}

/** Génère 4 choix plausibles (dont la bonne réponse), mélangés. */
function _generateChoices(correct) {
  const set = new Set([correct]);

  const candidates = [
    correct - 1, correct + 1,
    correct - 2, correct + 2,
    correct - correct % 10,        // arrondi à la dizaine inf.
    correct + (10 - correct % 10), // arrondi à la dizaine sup.
    correct - 5, correct + 5,
    correct - 3, correct + 3,
  ].filter(v => v > 0 && v !== correct);

  // Mélange les candidats et prend les 3 premiers distincts
  _shuffle(candidates);
  for (const c of candidates) {
    if (set.size === 4) break;
    set.add(c);
  }

  // Complète si nécessaire avec des valeurs aléatoires
  while (set.size < 4) {
    const v = correct + _randInt(-10, 10);
    if (v > 0) set.add(v);
  }

  return _shuffle([...set].slice(0, 4).map(String));
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

  const q = state.questions[state.currentIndex];

  dom.questionText.textContent = `${q.question} = ?`;

  const pct = (state.currentIndex / CONFIG.totalQuestions) * 100;
  dom.progressFill.style.width  = `${pct}%`;
  dom.progressLabel.textContent =
    `${state.currentIndex + 1} / ${CONFIG.totalQuestions}`;

  _renderChoices(q.choices);
  _startTimer();
}

/* ================================================================
   TIMER
   ================================================================ */
function _startTimer() {
  _stopTimer();
  state.timerRemaining = CONFIG.timerSeconds;
  _updateTimerUI(CONFIG.timerSeconds);

  state.timerInterval = setInterval(() => {
    state.timerRemaining--;
    _updateTimerUI(state.timerRemaining);

    if (state.timerRemaining <= 0) {
      _stopTimer();
      if (!state.isLocked) {
        // Temps écoulé → réponse manquée
        _onTimeout();
      }
    }
  }, 1000);
}

function _stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function _updateTimerUI(remaining) {
  const pct = (remaining / CONFIG.timerSeconds) * 100;
  dom.timerBar.style.width = `${Math.max(0, pct)}%`;
  dom.timerLabel.textContent = Math.max(0, remaining);

  dom.timerBar.className = 'timer-bar' +
    (remaining <= 2 ? ' timer-bar--danger' : remaining <= 3 ? ' timer-bar--warning' : '');
}

function _onTimeout() {
  state.isLocked = true;
  const q = state.questions[state.currentIndex];

  state.answers.push({
    question: q.question,
    given:    null,
    correct:  q.correctAnswer,
    ok:       false,
  });

  _setFeedback('wrong', `⏱️ Temps écoulé ! Réponse : ${q.correctAnswer}`);
  _markChoiceButton(q.correctAnswer, 'correct');
  _disableAnswerSection();

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ================================================================
   RÉPONSES
   ================================================================ */
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
}

function handleAnswer(givenAnswer) {
  if (state.isLocked) return;
  state.isLocked = true;
  _stopTimer();

  const q    = state.questions[state.currentIndex];
  const isOk = String(givenAnswer).trim() === String(q.correctAnswer).trim();

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
    _setFeedback('wrong', `❌ Réponse : ${q.correctAnswer}`);
    _markChoiceButton(givenAnswer, 'wrong');
    _markChoiceButton(q.correctAnswer, 'correct');
  }

  _disableAnswerSection();

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ================================================================
   ÉCRAN DE RÉSULTAT
   ================================================================ */
function showResult() {
  _stopTimer();
  const durationMs  = Date.now() - state.startTime;
  const successRate = state.score / CONFIG.totalQuestions;
  const passed      = successRate >= CONFIG.passingRate;
  const successPct  = Math.round(successRate * 100);
  const levelLabel  = LEVELS[state.level].label;

  dom.questionSection.style.display = 'none';
  dom.progressWrap.style.display    = 'none';
  dom.resultScreen.classList.add('is-visible');

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed ? 'Excellent travail !' : 'Continue, tu y arrives !';
  dom.resultScore.textContent  = `${state.score} / ${CONFIG.totalQuestions}`;
  dom.resultDetail.textContent =
    `${successPct} % · Niveau ${levelLabel} · ${Math.round(durationMs / 1000)} s`;

  const payload = {
    type:        'exercise_result',
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
   ================================================================ */
function _sendToFlutter(payload) {
  const json = JSON.stringify(payload);
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(json);
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }
}

/* ================================================================
   UTILITAIRES
   ================================================================ */
function _setFeedback(type, message) {
  dom.feedback.textContent = message;
  dom.feedback.className   = `feedback feedback--${type}`;
}

function _clearFeedback() {
  dom.feedback.textContent = '';
  dom.feedback.className   = 'feedback feedback--empty';
}

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

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
