/* ════════════════════════════════════════════════════════════
   EXERCISE : Additions — 3 niveaux de difficulté
   ════════════════════════════════════════════════════════════ */

const LEVELS = {
  easy: {
    label:    'Facile',
    aMin: 1,  aMax: 10,
    bMin: 1,  bMax: 10,
    timer:    10,
    total:    10,
    color:    '#27AE60',
    colorLt:  'rgba(39, 174, 96, .12)',
  },
  medium: {
    label:    'Moyen',
    aMin: 5,  aMax: 49,
    bMin: 5,  bMax: 50,
    timer:    8,
    total:    12,
    color:    '#E67E22',
    colorLt:  'rgba(230, 126, 34, .12)',
  },
  hard: {
    label:    'Difficile',
    aMin: 50, aMax: 499,
    bMin: 50, bMax: 500,
    timer:    6,
    total:    15,
    color:    '#C0392B',
    colorLt:  'rgba(192, 57, 43, .12)',
  },
};

const CONFIG = {
  exerciseId:  'additions',
  passingRate: 0.6,   // 60 % pour réussir
  feedbackMs:  1100,  // durée d'affichage du feedback
};

/* ── État ─────────────────────────────────────────────────── */
const state = {
  levelKey:    null,
  level:       null,
  score:       0,
  current:     0,
  questions:   [],
  answers:     [],
  timerId:     null,
  animFrameId: null,
};

/* ── Références DOM ───────────────────────────────────────── */
const dom = {
  levelScreen:   document.getElementById('level-screen'),
  gameScreen:    document.getElementById('game-screen'),
  resultScreen:  document.getElementById('result-screen'),
  progressFill:  document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
  timerFill:     document.getElementById('timer-fill'),
  questionText:  document.getElementById('question-text'),
  answerSection: document.getElementById('answer-section'),
  feedback:      document.getElementById('feedback'),
  levelBadge:    document.getElementById('level-badge'),
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
  const lv = LEVELS[levelKey];
  state.levelKey  = levelKey;
  state.level     = lv;
  state.score     = 0;
  state.current   = 0;
  state.answers   = [];
  state.questions = _generateQuestions(lv);

  /* Couleurs dynamiques CSS */
  document.documentElement.style.setProperty('--level-color',    lv.color);
  document.documentElement.style.setProperty('--level-color-lt', lv.colorLt);

  dom.levelBadge.textContent   = lv.label;
  dom.levelScreen.hidden       = true;
  dom.resultScreen.hidden      = true;
  dom.gameScreen.hidden        = false;
  dom.gameScreen.removeAttribute('hidden');

  showQuestion();
}

/* ════════════════════════════════════════════════════════════
   GÉNÉRATION DES QUESTIONS
   ════════════════════════════════════════════════════════════ */
function _generateQuestions(lv) {
  const list = [];
  for (let i = 0; i < lv.total; i++) {
    const a       = _randInt(lv.aMin, lv.aMax);
    const b       = _randInt(lv.bMin, lv.bMax);
    const correct = a + b;
    const choices = _buildChoices(a, b, correct, lv);
    list.push({ a, b, correct, choices });
  }
  return list;
}

function _buildChoices(a, b, correct, lv) {
  const set = new Set([correct]);

  /* Piège classique : a − b (enfant qui soustrait au lieu d'additionner) */
  const trap = Math.abs(a - b);
  if (trap !== correct && trap >= 0) { set.add(trap); }

  /* Variants proches */
  const offsets = _shuffle([1, 2, 3, 5, 10, 11, 20]);
  for (const off of offsets) {
    if (set.size >= 4) { break; }
    const v1 = correct + off;
    const v2 = correct - off;
    if (v2 >= 1 && !set.has(v2)) { set.add(v2); }
    if (set.size < 4 && !set.has(v1)) { set.add(v1); }
  }

  /* S'assurer d'avoir 4 choix */
  let pad = 1;
  while (set.size < 4) { set.add(correct + pad * 3); pad++; }

  return _shuffle([...set].slice(0, 4));
}

/* ════════════════════════════════════════════════════════════
   AFFICHAGE DE LA QUESTION
   ════════════════════════════════════════════════════════════ */
function showQuestion() {
  if (state.current >= state.level.total) {
    showResult();
    return;
  }

  const q  = state.questions[state.current];
  const lv = state.level;

  /* Progression */
  const pct = (state.current / lv.total) * 100;
  dom.progressFill.style.width  = pct + '%';
  dom.progressFill.setAttribute('aria-valuenow', pct);
  dom.progressLabel.textContent = `${state.current + 1} / ${lv.total}`;

  /* Formule */
  dom.questionText.innerHTML = `
    <span class="formula-num">${q.a}</span>
    <span class="formula-op">+</span>
    <span class="formula-num">${q.b}</span>
    <span class="formula-eq">=</span>
    <span class="formula-blank" id="formula-blank">?</span>
  `;

  /* Choix de réponse */
  dom.answerSection.innerHTML = q.choices.map(v => `
    <button class="choice-btn" type="button" onclick="handleAnswer(${v})">${v}</button>
  `).join('');

  /* Feedback */
  dom.feedback.textContent  = '';
  dom.feedback.className    = 'feedback feedback--empty';

  /* Timer */
  _startTimer(lv.timer);
}

/* ════════════════════════════════════════════════════════════
   GESTION DU TIMER
   ════════════════════════════════════════════════════════════ */
function _startTimer(seconds) {
  _clearTimer();
  const bar   = dom.timerFill;
  bar.style.transition = 'none';
  bar.style.width      = '100%';
  bar.classList.remove('danger');

  let start   = null;
  const ms    = seconds * 1000;

  function step(timestamp) {
    if (!start) { start = timestamp; }
    const elapsed = timestamp - start;
    const ratio   = Math.max(0, 1 - elapsed / ms);
    bar.style.width = (ratio * 100) + '%';
    if (ratio < 0.30) { bar.classList.add('danger'); }
    if (elapsed >= ms) { _onTimeout(); return; }
    state.animFrameId = requestAnimationFrame(step);
  }

  state.animFrameId = requestAnimationFrame(step);
}

function _clearTimer() {
  if (state.animFrameId) { cancelAnimationFrame(state.animFrameId); state.animFrameId = null; }
  if (state.timerId)     { clearTimeout(state.timerId);             state.timerId     = null; }
}

function _onTimeout() {
  _clearTimer();
  const q = state.questions[state.current];
  _disableChoices();
  _revealBlank(false);
  _showFeedback('⏱ Trop lent ! La réponse était ' + q.correct, false);
  state.answers.push({ correct: false, timedOut: true });
  state.timerId = setTimeout(_nextQuestion, CONFIG.feedbackMs + 200);
}

/* ════════════════════════════════════════════════════════════
   RÉPONSE UTILISATEUR
   ════════════════════════════════════════════════════════════ */
function handleAnswer(choice) {
  _clearTimer();
  const q        = state.questions[state.current];
  const isRight  = choice === q.correct;
  if (isRight) { state.score++; }

  _disableChoices();
  _colorChoices(choice, q.correct);
  _revealBlank(isRight, q.correct);
  _showFeedback(
    isRight ? '✅ Bravo !' : `❌ La bonne réponse était ${q.correct}`,
    isRight,
  );

  state.answers.push({ choice, correct: isRight });
  state.timerId = setTimeout(_nextQuestion, CONFIG.feedbackMs);
}

function _nextQuestion() {
  state.current++;
  showQuestion();
}

/* ════════════════════════════════════════════════════════════
   HELPERS UI
   ════════════════════════════════════════════════════════════ */
function _disableChoices() {
  dom.answerSection.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });
}

function _colorChoices(chosen, correct) {
  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    const val = Number(btn.textContent.trim());
    if (val === correct)             { btn.classList.add('choice-btn--correct'); }
    else if (val === chosen)         { btn.classList.add('choice-btn--wrong');   }
  });
}

function _revealBlank(correct, correctValue) {
  const blank = document.getElementById('formula-blank');
  if (!blank) { return; }
  const q = state.questions[state.current];
  blank.textContent = correct ? q.correct : (correctValue !== undefined ? correctValue : q.correct);
  blank.classList.add(correct ? 'revealed-correct' : 'revealed-wrong');
}

function _showFeedback(msg, ok) {
  dom.feedback.textContent = msg;
  dom.feedback.className   = 'feedback ' + (ok ? 'feedback--correct' : 'feedback--wrong');
}

/* ════════════════════════════════════════════════════════════
   RÉSULTAT FINAL
   ════════════════════════════════════════════════════════════ */
function showResult() {
  _clearTimer();
  const lv    = state.level;
  const total = lv.total;
  const score = state.score;
  const pct   = score / total;
  const passed = pct >= CONFIG.passingRate;

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed ? 'Excellent !' : 'Continue à t\'entraîner !';
  dom.resultScore.textContent  = `${score} / ${total}`;
  dom.resultLevel.textContent  = `Niveau : ${lv.label}`;
  dom.resultDetail.textContent = passed
    ? 'Tu maîtrises les additions !'
    : `Tu as réussi ${score} calcul${score > 1 ? 's' : ''} sur ${total}.`;

  /* Synchronisation couleur */
  document.documentElement.style.setProperty('--level-color', lv.color);

  dom.gameScreen.hidden   = true;
  dom.resultScreen.hidden = false;
  dom.resultScreen.removeAttribute('hidden');

  /* Communication Flutter */
  const payload = {
    exerciseId: CONFIG.exerciseId,
    score,
    total,
    passed,
    level: state.levelKey,
  };
  try {
    // eslint-disable-next-line no-undef
    ExerciseChannel.postMessage(JSON.stringify(payload));
  } catch (_) { /* en dehors de Flutter */ }
}

/* ════════════════════════════════════════════════════════════
   BOUTONS DE LA PAGE RÉSULTAT
   ════════════════════════════════════════════════════════════ */
dom.btnReplay.addEventListener('click', () => {
  startGame(state.levelKey);
});

dom.btnChange.addEventListener('click', () => {
  _clearTimer();
  /* Réinitialise la couleur CSS pour la page de sélection */
  document.documentElement.style.setProperty('--level-color', '#27AE60');
  document.documentElement.style.setProperty('--level-color-lt', 'rgba(39, 174, 96, .12)');
  dom.resultScreen.hidden = true;
  dom.gameScreen.hidden   = true;
  dom.levelScreen.hidden  = false;
});

/* ════════════════════════════════════════════════════════════
   UTILITAIRES
   ════════════════════════════════════════════════════════════ */
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
