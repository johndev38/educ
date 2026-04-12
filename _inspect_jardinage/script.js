'use strict';

const CONFIG = {
  exerciseId: 'jardinage_decouverte',
  totalQuestions: 6,
  delayNextMs: 1400,
  passingRate: 0.6
};

const QUESTIONS = [
  {
    question: 'De quoi une plante a-t-elle besoin pour bien pousser ?',
    choices: ['De soleil et d\'eau', 'De chocolat', 'De jouets', 'De peinture'],
    correct: 'De soleil et d\'eau'
  },
  {
    question: 'Dans quoi plante-t-on souvent une graine ?',
    choices: ['Dans la terre', 'Dans le sable magique', 'Dans une chaussure', 'Dans un verre vide'],
    correct: 'Dans la terre'
  },
  {
    question: 'Quel outil aide à arroser les plantes ?',
    choices: ['Un arrosoir', 'Un coussin', 'Une brosse à dents', 'Un ballon'],
    correct: 'Un arrosoir'
  },
  {
    question: 'Que devient une graine quand elle commence à pousser ?',
    choices: ['Une jeune plante', 'Un caillou', 'Une cuillère', 'Un nuage'],
    correct: 'Une jeune plante'
  },
  {
    question: 'Pourquoi faut-il arroser les fleurs ?',
    choices: ['Pour les aider à vivre', 'Pour les rendre bruyantes', 'Pour les cacher', 'Pour les transformer en bois'],
    correct: 'Pour les aider à vivre'
  },
  {
    question: 'Quel endroit est idéal pour faire pousser des légumes ?',
    choices: ['Le potager', 'Le garage', 'La salle de bain', 'Le placard'],
    correct: 'Le potager'
  }
];

const state = {
  currentIndex: 0,
  score: 0,
  startTime: 0,
  isLocked: false,
  answers: []
};

const dom = {
  progressFill: document.getElementById('progress-fill'),
  progressLabel: document.getElementById('progress-label'),
  questionSection: document.getElementById('question-section'),
  questionText: document.getElementById('question-text'),
  answerSection: document.getElementById('answer-section'),
  btnValidate: document.getElementById('btn-validate'),
  feedback: document.getElementById('feedback'),
  resultScreen: document.getElementById('result-screen'),
  resultEmoji: document.getElementById('result-emoji'),
  resultTitle: document.getElementById('result-title'),
  resultScore: document.getElementById('result-score'),
  resultDetail: document.getElementById('result-detail'),
  btnRestart: document.getElementById('btn-restart')
};

function init() {
  state.currentIndex = 0;
  state.score = 0;
  state.startTime = Date.now();
  state.isLocked = false;
  state.answers = [];

  dom.questionSection.hidden = false;
  dom.resultScreen.classList.remove('is-visible');
  _clearFeedback();
  showQuestion();
}

function showQuestion() {
  const question = QUESTIONS[state.currentIndex];
  const progression = ((state.currentIndex) / CONFIG.totalQuestions) * 100;

  dom.progressFill.style.width = progression + '%';
  dom.progressLabel.textContent = (state.currentIndex + 1) + ' / ' + CONFIG.totalQuestions;
  dom.questionText.textContent = question.question;
  dom.btnValidate.hidden = true;
  _clearFeedback();
  _renderChoices(question);
}

function _renderChoices(question) {
  const grille = document.createElement('div');
  grille.className = 'choices-grid';

  question.choices.forEach(function(choice) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'choice-btn';
    bouton.textContent = choice;
    bouton.addEventListener('click', function() {
      handleAnswer(choice);
    });
    grille.appendChild(bouton);
  });

  dom.answerSection.innerHTML = '';
  dom.answerSection.appendChild(grille);
}

function handleAnswer(value) {
  if (state.isLocked) {
    return;
  }

  state.isLocked = true;
  const question = QUESTIONS[state.currentIndex];
  const isCorrect = value === question.correct;

  if (isCorrect) {
    state.score += 1;
    _setFeedback('Bravo, c\'est la bonne réponse !', true);
  } else {
    _setFeedback('Oups, la bonne réponse était : ' + question.correct, false);
  }

  state.answers.push({
    question: question.question,
    given: String(value),
    correct: String(question.correct),
    ok: isCorrect
  });

  _markChoiceButton(value, question.correct);
  _disableAnswerSection();

  window.setTimeout(function() {
    state.currentIndex += 1;
    state.isLocked = false;

    if (state.currentIndex >= CONFIG.totalQuestions) {
      showResult();
    } else {
      showQuestion();
    }
  }, CONFIG.delayNextMs);
}

function showResult() {
  const durationMs = Date.now() - state.startTime;
  const successRate = state.score / CONFIG.totalQuestions;
  const successPercent = Math.round(successRate * 100);
  const isSuccess = successRate >= CONFIG.passingRate;

  dom.questionSection.hidden = true;
  dom.progressFill.style.width = '100%';
  dom.progressLabel.textContent = CONFIG.totalQuestions + ' / ' + CONFIG.totalQuestions;
  dom.resultScreen.classList.add('is-visible');
  dom.resultEmoji.textContent = isSuccess ? '🎉' : '💪';
  dom.resultTitle.textContent = isSuccess ? 'Bravo, petit jardinier !' : 'Continue, tu progresses !';
  dom.resultScore.textContent = state.score + ' / ' + CONFIG.totalQuestions;
  dom.resultDetail.textContent = successPercent + '% de réussite • ' + _formatDuration(durationMs);

  const payload = {
    type: 'exercise_result',
    exerciseId: CONFIG.exerciseId,
    score: state.score,
    total: CONFIG.totalQuestions,
    successRate: successRate,
    durationMs: durationMs,
    answers: state.answers.map(function(answer) {
      return {
        question: answer.question,
        given: answer.given,
        correct: answer.correct,
        ok: answer.ok
      };
    })
  };

  _sendToFlutter(payload);
}

function _sendToFlutter(payload) {
  if (typeof ExerciseChannel !== 'undefined') {
    ExerciseChannel.postMessage(JSON.stringify(payload));
  } else {
    console.info('[ExerciseChannel] Hors Flutter :', payload);
  }
}

function _setFeedback(message, isCorrect) {
  dom.feedback.textContent = message;
  dom.feedback.classList.remove('feedback--empty', 'feedback--correct', 'feedback--wrong');
  dom.feedback.classList.add(isCorrect ? 'feedback--correct' : 'feedback--wrong');
}

function _clearFeedback() {
  dom.feedback.textContent = ' ';
  dom.feedback.classList.remove('feedback--correct', 'feedback--wrong');
  dom.feedback.classList.add('feedback--empty');
}

function _markChoiceButton(selectedValue, correctValue) {
  const buttons = dom.answerSection.querySelectorAll('.choice-btn');
  buttons.forEach(function(button) {
    if (button.textContent === correctValue) {
      button.classList.add('choice-btn--correct');
    }
    if (button.textContent === selectedValue && selectedValue !== correctValue) {
      button.classList.add('choice-btn--wrong');
    }
  });
}

function _disableAnswerSection() {
  const interactiveElements = dom.answerSection.querySelectorAll('button, input');
  interactiveElements.forEach(function(element) {
    element.disabled = true;
  });
}

function _formatDuration(durationMs) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return seconds + ' s';
  }

  return minutes + ' min ' + seconds + ' s';
}

dom.btnRestart.addEventListener('click', init);

document.addEventListener('DOMContentLoaded', init);