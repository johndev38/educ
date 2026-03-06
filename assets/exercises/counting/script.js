/**
 * Exercice : Compter les objets
 *
 * Logique :
 *  - Affiche entre 1 et 9 emojis du même type
 *  - L'enfant doit sélectionner le bon chiffre parmi 4 choix
 *  - Envoie le résultat final à Flutter via ExerciseChannel
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const EXERCISE_ID     = 'counting';
const TOTAL_QUESTIONS = 8;
const DELAY_NEXT_MS   = 1000;

/** Pool d'emojis utilisés comme objets à compter */
const EMOJI_POOL = ['⭐', '🍎', '🌸', '🐸', '🎈', '🦋', '🍭', '🐢', '🌙', '🍪'];

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------
let currentQuestion = 0;
let score           = 0;
let startTime       = Date.now();
let answerLocked    = false;

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const promptEl        = document.getElementById('prompt');
const objectsDisplay  = document.getElementById('objects-display');
const answersGrid     = document.getElementById('answers-grid');
const feedbackEl      = document.getElementById('feedback');
const progressBar     = document.getElementById('progress-bar');
const progressLabel   = document.getElementById('progress-label');
const questionSection = document.getElementById('question-section');
const resultScreen    = document.getElementById('result-screen');
const resultEmoji     = document.getElementById('result-emoji');
const resultTitle     = document.getElementById('result-title');
const resultScore     = document.getElementById('result-score');
const resultDetail    = document.getElementById('result-detail');
const restartBtn      = document.getElementById('restart-btn');

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickEmoji() {
  return EMOJI_POOL[randInt(0, EMOJI_POOL.length - 1)];
}

// ---------------------------------------------------------------------------
// Génération d'une question
// ---------------------------------------------------------------------------

function generateQuestion() {
  const count   = randInt(1, 9);
  const emoji   = pickEmoji();

  // 3 distracteurs uniques entre 1 et 9, différents du bon chiffre
  const distractors = new Set();
  while (distractors.size < 3) {
    const d = randInt(1, 9);
    if (d !== count) distractors.add(d);
  }

  const choices = shuffle([count, ...distractors]);

  return { count, emoji, choices };
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

function showQuestion() {
  if (currentQuestion >= TOTAL_QUESTIONS) {
    showResult();
    return;
  }

  answerLocked = false;
  feedbackEl.textContent = '';

  const q = generateQuestion();

  promptEl.textContent = 'Combien y a-t-il d\'objets ?';

  // Affiche les emojis avec délai progressif pour l'animation
  objectsDisplay.innerHTML = '';
  for (let i = 0; i < q.count; i++) {
    const span = document.createElement('span');
    span.className = 'item-emoji';
    span.textContent = q.emoji;
    span.style.animationDelay = `${i * 60}ms`;
    objectsDisplay.appendChild(span);
  }

  // Boutons de réponse
  answersGrid.innerHTML = '';
  q.choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'answer-btn';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(btn, value, q.count));
    answersGrid.appendChild(btn);
  });

  // Progression
  const pct = (currentQuestion / TOTAL_QUESTIONS) * 100;
  progressBar.style.width   = `${pct}%`;
  progressLabel.textContent = `Question ${currentQuestion + 1} / ${TOTAL_QUESTIONS}`;
}

// ---------------------------------------------------------------------------
// Gestion de la réponse
// ---------------------------------------------------------------------------

function handleAnswer(button, chosen, correct) {
  if (answerLocked) return;
  answerLocked = true;

  const allBtns = answersGrid.querySelectorAll('.answer-btn');
  allBtns.forEach(b => (b.disabled = true));

  if (chosen === correct) {
    button.classList.add('correct');
    feedbackEl.textContent = '✅ Bravo !';
    score++;
  } else {
    button.classList.add('wrong');
    feedbackEl.textContent = `❌ Il y avait ${correct} objet${correct > 1 ? 's' : ''} !`;
    allBtns.forEach(b => {
      if (Number(b.textContent) === correct) b.classList.add('correct');
    });
  }

  currentQuestion++;
  setTimeout(showQuestion, DELAY_NEXT_MS);
}

// ---------------------------------------------------------------------------
// Résultat + envoi Flutter
// ---------------------------------------------------------------------------

function showResult() {
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);
  const percentage      = Math.round((score / TOTAL_QUESTIONS) * 100);

  questionSection.style.display = 'none';
  resultScreen.classList.add('visible');

  resultEmoji.textContent  = percentage >= 60 ? '🌟' : '🤔';
  resultTitle.textContent  = percentage >= 60 ? 'Super compter !' : 'On s\'entraîne encore ?';
  resultScore.textContent  = `${score} / ${TOTAL_QUESTIONS}`;
  resultDetail.textContent = `${percentage} % – durée : ${durationSeconds}s`;

  const payload = JSON.stringify({
    exerciseId:      EXERCISE_ID,
    score:           score,
    maxScore:        TOTAL_QUESTIONS,
    durationSeconds: durationSeconds
  });

  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(payload);
  } else {
    console.info('[ExerciseChannel] Hors Flutter – résultat :', payload);
  }
}

// ---------------------------------------------------------------------------
// Redémarrage
// ---------------------------------------------------------------------------

function restart() {
  currentQuestion = 0;
  score           = 0;
  startTime       = Date.now();
  answerLocked    = false;

  resultScreen.classList.remove('visible');
  questionSection.style.display = '';
  showQuestion();
}

restartBtn.addEventListener('click', restart);

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
showQuestion();
