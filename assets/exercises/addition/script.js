/**
 * Exercice : Additions simples
 *
 * Logique :
 *  - Génère TOTAL_QUESTIONS questions de type  a + b = ?  avec a,b ∈ [1..10]
 *  - Propose 4 réponses (1 correcte + 3 distracteurs uniques)
 *  - Enregistre le score et la durée
 *  - Envoie le résultat à Flutter via ExerciseChannel.postMessage(json)
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const EXERCISE_ID     = 'addition';
const TOTAL_QUESTIONS = 10;
const DELAY_NEXT_MS   = 900;   // Délai avant la question suivante (ms)

// ---------------------------------------------------------------------------
// État de la session
// ---------------------------------------------------------------------------
let currentQuestion  = 0;
let score            = 0;
let startTime        = Date.now();
let answerLocked     = false;  // Évite les clics multiples pendant l'animation

// ---------------------------------------------------------------------------
// Éléments DOM
// ---------------------------------------------------------------------------
const questionText    = document.getElementById('question-text');
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

/** Entier aléatoire entre min et max inclus */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Mélange un tableau (Fisher-Yates) */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ---------------------------------------------------------------------------
// Génération d'une question
// ---------------------------------------------------------------------------

function generateQuestion() {
  const a = randInt(1, 10);
  const b = randInt(1, 10);
  const correct = a + b;

  // Génère 3 distracteurs uniques, différents de la bonne réponse
  const distractors = new Set();
  while (distractors.size < 3) {
    let d = correct + randInt(-5, 5);
    if (d !== correct && d > 0) distractors.add(d);
  }

  const choices = shuffle([correct, ...distractors]);

  return { a, b, correct, choices };
}

// ---------------------------------------------------------------------------
// Affichage d'une question
// ---------------------------------------------------------------------------

function showQuestion() {
  if (currentQuestion >= TOTAL_QUESTIONS) {
    showResult();
    return;
  }

  answerLocked = false;
  feedbackEl.textContent = '';

  const q = generateQuestion();

  // Affiche la question
  questionText.textContent = `${q.a}  +  ${q.b}  =  ?`;

  // Vide et reconstruit la grille de réponses
  answersGrid.innerHTML = '';
  q.choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'answer-btn';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(btn, value, q.correct));
    answersGrid.appendChild(btn);
  });

  // Met à jour la progression
  const pct = (currentQuestion / TOTAL_QUESTIONS) * 100;
  progressBar.style.width   = `${pct}%`;
  progressLabel.textContent = `Question ${currentQuestion + 1} / ${TOTAL_QUESTIONS}`;
}

// ---------------------------------------------------------------------------
// Gestion d'une réponse
// ---------------------------------------------------------------------------

function handleAnswer(button, chosen, correct) {
  if (answerLocked) return;
  answerLocked = true;

  // Désactive tous les boutons
  const allBtns = answersGrid.querySelectorAll('.answer-btn');
  allBtns.forEach(b => (b.disabled = true));

  if (chosen === correct) {
    button.classList.add('correct');
    feedbackEl.textContent = '✅ Bravo !';
    score++;
  } else {
    button.classList.add('wrong');
    feedbackEl.textContent = `❌ La bonne réponse était ${correct}`;
    // Montre aussi la bonne réponse en vert
    allBtns.forEach(b => {
      if (Number(b.textContent) === correct) b.classList.add('correct');
    });
  }

  currentQuestion++;
  setTimeout(showQuestion, DELAY_NEXT_MS);
}

// ---------------------------------------------------------------------------
// Écran de résultat + envoi à Flutter
// ---------------------------------------------------------------------------

function showResult() {
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);
  const percentage = Math.round((score / TOTAL_QUESTIONS) * 100);

  // Affiche l'écran de résultat local
  questionSection.style.display = 'none';
  resultScreen.classList.add('visible');

  resultEmoji.textContent  = percentage >= 60 ? '🎉' : '💪';
  resultTitle.textContent  = percentage >= 60 ? 'Excellent travail !' : 'Continue, tu y arrives !';
  resultScore.textContent  = `${score} / ${TOTAL_QUESTIONS}`;
  resultDetail.textContent = `${percentage} % – durée : ${durationSeconds}s`;

  // -----------------------------------------------------------------------
  // Envoi du résultat à Flutter via ExerciseChannel
  // Le canal est injecté par Flutter (webview_flutter).
  // En cas d'absence (test dans navigateur), on ignore silencieusement.
  // -----------------------------------------------------------------------
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
