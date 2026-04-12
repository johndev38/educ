'use strict'

const CONFIG = {
  exerciseId: 'conjugaison_2eme_groupe',
  streakTarget: 10,
  timerMs: 7000,
  tickMs: 50,
  delayAfterCorrect: 700,
  delayAfterWrong: 1600,
  maxQuestions: 100
};

const VERBES = [
  "finir",
  "choisir",
  "grandir",
  "réussir",
  "remplir",
  "rougir",
  "punir",
  "applaudir"
];

const PRONOMS = ["je", "tu", "il", "nous", "vous", "ils"];

const TERMINAISONS = {
  je: "is",
  tu: "is",
  il: "it",
  nous: "issons",
  vous: "issez",
  ils: "issent"
};

const state = {
  streak: 0,
  correctTotal: 0,
  questionsTotal: 0,
  currentQ: null,
  isLocked: false
};

const dom = {
  question: document.getElementById("question-text"),
  answers: document.getElementById("answer-section"),
  feedback: document.getElementById("feedback"),
  streak: document.getElementById("streak-value")
};

function init() {
  state.streak = 0;
  state.correctTotal = 0;
  state.questionsTotal = 0;
  state.isLocked = false;
  nextQuestion();
}

function nextQuestion() {

  const verbe = randomItem(VERBES);
  const pronom = randomItem(PRONOMS);

  const radical = verbe.slice(0, -2);
  const correct = radical + TERMINAISONS[pronom];

  const choices = buildChoices(correct);

  state.currentQ = {
    verbe,
    pronom,
    correct,
    choices
  };

  renderQuestion();
}

function renderQuestion() {

  dom.question.innerHTML =
    `<b>${state.currentQ.pronom}</b> ${state.currentQ.verbe} → ?`;

  dom.answers.innerHTML = "";

  state.currentQ.choices.forEach(choice => {

    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;

    btn.onclick = () => answer(choice);

    dom.answers.appendChild(btn);
  });

  dom.feedback.textContent = "";
}

function answer(value) {

  if (state.isLocked) return;
  state.isLocked = true;

  const correct = state.currentQ.correct;

  if (value === correct) {

    state.correctTotal++;
    state.streak++;
    dom.feedback.textContent = "✅ Correct !";

  } else {

    state.streak = 0;
    dom.feedback.textContent = "❌ " + correct;
  }

  dom.streak.textContent = state.streak;

  setTimeout(() => {
    state.isLocked = false;
    nextQuestion();
  }, 1200);
}

function buildChoices(correct) {

  const set = new Set();
  set.add(correct);

  while (set.size < 4) {

    const fake =
      correct.slice(0, -1) +
      randomItem(["s", "t", "ent", "ez", "ons"]);

    set.add(fake);
  }

  return shuffle([...set]);
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {

  for (let i = arr.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

init();