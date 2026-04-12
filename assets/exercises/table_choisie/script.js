'use strict';

/* ================================================================
   CONFIGURATION
   ================================================================ */
const CONFIG = {
  exerciseId:     'table_choisie',
  totalQuestions: 10,
  delayNextMs:    900,
  passingRate:    0.6,
  tableMin:       2,
  tableMax:       12,
};

/* ================================================================
   ÉTAT
   ================================================================ */
const state = {
  table:        null,
  questions:    [],
  currentIndex: 0,
  score:        0,
  startTime:    0,
  isLocked:     false,
  answers:      [],
};

/* ================================================================
   RÉFÉRENCES DOM
   ================================================================ */
const dom = {
  tableScreen:     document.getElementById('table-screen'),
  tableGrid:       document.getElementById('table-grid'),

  progressWrap:    document.getElementById('progress-wrap'),
  progressFill:    document.getElementById('progress-fill'),
  progressLabel:   document.getElementById('progress-label'),

  questionSection: document.getElementById('question-section'),
  tableBadge:      document.getElementById('table-badge'),
  questionText:    document.getElementById('question-text'),
  answerSection:   document.getElementById('answer-section'),
  feedback:        document.getElementById('feedback'),

  resultScreen:    document.getElementById('result-screen'),
  resultEmoji:     document.getElementById('result-emoji'),
  resultTitle:     document.getElementById('result-title'),
  resultScore:     document.getElementById('result-score'),
  resultDetail:    document.getElementById('result-detail'),
  btnRestart:      document.getElementById('btn-restart'),
  btnTables:       document.getElementById('btn-tables'),
};

/* ================================================================
   GÉNÉRATION DES BOUTONS DE TABLE
   ================================================================ */
for (let t = CONFIG.tableMin; t <= CONFIG.tableMax; t++) {
  const btn = document.createElement('button');
  btn.className   = 'table-btn';
  btn.textContent = `× ${t}`;
  btn.dataset.table = t;
  btn.addEventListener('click', () => startGame(t));
  dom.tableGrid.appendChild(btn);
}

dom.btnTables.addEventListener('click', showTableScreen);
dom.btnRestart.addEventListener('click', () => startGame(state.table));

/* ================================================================
   DÉMARRAGE DU JEU
   ================================================================ */
function startGame(table) {
  state.table        = table;
  state.questions    = generateQuestions(table);
  state.currentIndex = 0;
  state.score        = 0;
  state.startTime    = Date.now();
  state.isLocked     = false;
  state.answers      = [];

  dom.tableScreen.style.display     = 'none';
  dom.resultScreen.classList.remove('is-visible');
  dom.progressWrap.style.display    = '';
  dom.questionSection.style.display = '';
  dom.tableBadge.textContent        = `Table de ${table}`;

  showQuestion();
}

function showTableScreen() {
  dom.resultScreen.classList.remove('is-visible');
  dom.questionSection.style.display = 'none';
  dom.progressWrap.style.display    = 'none';
  dom.tableScreen.style.display     = '';
}

/* ================================================================
   GÉNÉRATION DES QUESTIONS
   ================================================================ */
function generateQuestions(table) {
  const pool = [];
  for (let i = 1; i <= 10; i++) {
    pool.push(i);
  }
  _shuffle(pool);

  return pool.slice(0, CONFIG.totalQuestions).map(b => {
    const correct = table * b;
    return {
      question:      `${table} × ${b}`,
      correctAnswer: String(correct),
      choices:       _generateChoices(correct, table),
    };
  });
}

/** Génère 4 choix plausibles (dont la bonne réponse), mélangés. */
function _generateChoices(correct, table) {
  const set = new Set([correct]);

  const candidates = [
    correct - table,
    correct + table,
    correct - 1, correct + 1,
    correct - 2, correct + 2,
    correct - table * 2,
    correct + table * 2,
    correct - 5, correct + 5,
  ].filter(v => v > 0 && v !== correct);

  _shuffle(candidates);
  for (const c of candidates) {
    if (set.size === 4) break;
    set.add(c);
  }

  while (set.size < 4) {
    const v = correct + _randInt(-10, 10);
    if (v > 0 && !set.has(v)) set.add(v);
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
  const durationMs  = Date.now() - state.startTime;
  const successRate = state.score / CONFIG.totalQuestions;
  const passed      = successRate >= CONFIG.passingRate;
  const successPct  = Math.round(successRate * 100);

  dom.questionSection.style.display = 'none';
  dom.progressWrap.style.display    = 'none';
  dom.resultScreen.classList.add('is-visible');

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed ? 'Excellent travail !' : 'Continue, tu y arrives !';
  dom.resultScore.textContent  = `${state.score} / ${CONFIG.totalQuestions}`;
  dom.resultDetail.textContent =
    `${successPct} % · Table de ${state.table} · ${Math.round(durationMs / 1000)} s`;

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
