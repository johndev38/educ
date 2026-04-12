'use strict';

/* ════════════════════════════════════════════════════════════
   CONFIGURATION
   ════════════════════════════════════════════════════════════ */
const CONFIG = {
  exerciseId:     'conjugaison_mixte',
  totalQuestions: 15,   // 5 par groupe
  passingRate:    0.7,
  delayNextMs:    1000,
};

/* ════════════════════════════════════════════════════════════
   DONNÉES  –  verbes des 3 groupes avec toutes leurs formes
   Les distracteurs sont générés à partir des autres formes du
   même verbe : l'enfant doit vraiment penser à la personne.
   ════════════════════════════════════════════════════════════ */
const VERBES = [

  // ── 1er groupe (-ER) ─────────────────────────────────────
  { inf: 'aimer',    groupe: 1,
    formes: { je:'aime',    tu:'aimes',    il:'aime',    nous:'aimons',     vous:'aimez',     ils:'aiment'     } },
  { inf: 'parler',   groupe: 1,
    formes: { je:'parle',   tu:'parles',   il:'parle',   nous:'parlons',    vous:'parlez',    ils:'parlent'    } },
  { inf: 'chanter',  groupe: 1,
    formes: { je:'chante',  tu:'chantes',  il:'chante',  nous:'chantons',   vous:'chantez',   ils:'chantent'   } },
  { inf: 'jouer',    groupe: 1,
    formes: { je:'joue',    tu:'joues',    il:'joue',    nous:'jouons',     vous:'jouez',     ils:'jouent'     } },
  { inf: 'regarder', groupe: 1,
    formes: { je:'regarde', tu:'regardes', il:'regarde', nous:'regardons',  vous:'regardez',  ils:'regardent'  } },
  { inf: 'marcher',  groupe: 1,
    formes: { je:'marche',  tu:'marches',  il:'marche',  nous:'marchons',   vous:'marchez',   ils:'marchent'   } },
  { inf: 'donner',   groupe: 1,
    formes: { je:'donne',   tu:'donnes',   il:'donne',   nous:'donnons',    vous:'donnez',    ils:'donnent'    } },
  { inf: 'trouver',  groupe: 1,
    formes: { je:'trouve',  tu:'trouves',  il:'trouve',  nous:'trouvons',   vous:'trouvez',   ils:'trouvent'   } },

  // ── 2ème groupe (-IR + -ISS-) ────────────────────────────
  { inf: 'finir',    groupe: 2,
    formes: { je:'finis',   tu:'finis',    il:'finit',   nous:'finissons',  vous:'finissez',  ils:'finissent'  } },
  { inf: 'choisir',  groupe: 2,
    formes: { je:'choisis', tu:'choisis',  il:'choisit', nous:'choisissons',vous:'choisissez',ils:'choisissent' } },
  { inf: 'grandir',  groupe: 2,
    formes: { je:'grandis', tu:'grandis',  il:'grandit', nous:'grandissons',vous:'grandissez',ils:'grandissent' } },
  { inf: 'réussir',  groupe: 2,
    formes: { je:'réussis', tu:'réussis',  il:'réussit', nous:'réussissons',vous:'réussissez',ils:'réussissent' } },
  { inf: 'rougir',   groupe: 2,
    formes: { je:'rougis',  tu:'rougis',   il:'rougit',  nous:'rougissons', vous:'rougissez', ils:'rougissent'  } },
  { inf: 'remplir',  groupe: 2,
    formes: { je:'remplis', tu:'remplis',  il:'remplit', nous:'remplissons',vous:'remplissez',ils:'remplissent' } },
  { inf: 'punir',    groupe: 2,
    formes: { je:'punis',   tu:'punis',    il:'punit',   nous:'punissons',  vous:'punissez',  ils:'punissent'  } },
  { inf: 'nourrir',  groupe: 2,
    formes: { je:'nourris', tu:'nourris',  il:'nourrit', nous:'nourrissons',vous:'nourrissez',ils:'nourrissent' } },

  // ── 3ème groupe (irréguliers) ────────────────────────────
  { inf: 'vendre',   groupe: 3,
    formes: { je:'vends',   tu:'vends',    il:'vend',    nous:'vendons',    vous:'vendez',    ils:'vendent'    } },
  { inf: 'prendre',  groupe: 3,
    formes: { je:'prends',  tu:'prends',   il:'prend',   nous:'prenons',    vous:'prenez',    ils:'prennent'   } },
  { inf: 'partir',   groupe: 3,
    formes: { je:'pars',    tu:'pars',     il:'part',    nous:'partons',    vous:'partez',    ils:'partent'    } },
  { inf: 'dormir',   groupe: 3,
    formes: { je:'dors',    tu:'dors',     il:'dort',    nous:'dormons',    vous:'dormez',    ils:'dorment'    } },
  { inf: 'mettre',   groupe: 3,
    formes: { je:'mets',    tu:'mets',     il:'met',     nous:'mettons',    vous:'mettez',    ils:'mettent'    } },
  { inf: 'venir',    groupe: 3,
    formes: { je:'viens',   tu:'viens',    il:'vient',   nous:'venons',     vous:'venez',     ils:'viennent'   } },
  { inf: 'voir',     groupe: 3,
    formes: { je:'vois',    tu:'vois',     il:'voit',    nous:'voyons',     vous:'voyez',     ils:'voient'     } },
  { inf: 'faire',    groupe: 3,
    formes: { je:'fais',    tu:'fais',     il:'fait',    nous:'faisons',    vous:'faites',    ils:'font'       } },
  { inf: 'dire',     groupe: 3,
    formes: { je:'dis',     tu:'dis',      il:'dit',     nous:'disons',     vous:'dites',     ils:'disent'     } },
  { inf: 'pouvoir',  groupe: 3,
    formes: { je:'peux',    tu:'peux',     il:'peut',    nous:'pouvons',    vous:'pouvez',    ils:'peuvent'    } },
  { inf: 'vouloir',  groupe: 3,
    formes: { je:'veux',    tu:'veux',     il:'veut',    nous:'voulons',    vous:'voulez',    ils:'veulent'    } },
  { inf: 'savoir',   groupe: 3,
    formes: { je:'sais',    tu:'sais',     il:'sait',    nous:'savons',     vous:'savez',     ils:'savent'     } },
];

const PRONOMS = [
  { key: 'je',   label: 'je'        },
  { key: 'tu',   label: 'tu'        },
  { key: 'il',   label: 'il/elle'   },
  { key: 'nous', label: 'nous'      },
  { key: 'vous', label: 'vous'      },
  { key: 'ils',  label: 'ils/elles' },
];

const GROUPE_LABELS = { 1: '1ᵉʳ groupe', 2: '2ᵉ groupe', 3: '3ᵉ groupe' };

/* ════════════════════════════════════════════════════════════
   ÉTAT
   ════════════════════════════════════════════════════════════ */
const state = {
  currentIndex: 0,
  score:        0,
  startTime:    0,
  isLocked:     false,
  answers:      [],
  questions:    [],
};

/* ════════════════════════════════════════════════════════════
   RÉFÉRENCES DOM
   ════════════════════════════════════════════════════════════ */
const dom = {
  progressFill:   document.getElementById('progress-fill'),
  progressLabel:  document.getElementById('progress-label'),
  groupBadge:     document.getElementById('group-badge'),
  questionText:   document.getElementById('question-text'),
  answerSection:  document.getElementById('answer-section'),
  feedback:       document.getElementById('feedback'),
  questionSection:document.getElementById('question-section'),
  resultScreen:   document.getElementById('result-screen'),
  resultEmoji:    document.getElementById('result-emoji'),
  resultTitle:    document.getElementById('result-title'),
  resultScore:    document.getElementById('result-score'),
  resultDetail:   document.getElementById('result-detail'),
  btnRestart:     document.getElementById('btn-restart'),
  btnHelp:        document.getElementById('btn-help'),
  helpModal:      document.getElementById('help-modal'),
  modalOverlay:   document.getElementById('modal-overlay'),
  helpClose:      document.getElementById('help-close'),
};

/* ════════════════════════════════════════════════════════════
   INIT / RESTART
   ════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════
   CONSTRUCTION DES QUESTIONS
   5 questions tirées de chaque groupe, puis mélangées.
   ════════════════════════════════════════════════════════════ */
function _buildQuestionList() {
  const g1 = VERBES.filter(v => v.groupe === 1);
  const g2 = VERBES.filter(v => v.groupe === 2);
  const g3 = VERBES.filter(v => v.groupe === 3);

  return _shuffle([
    ..._pickQuestions(g1, 5),
    ..._pickQuestions(g2, 5),
    ..._pickQuestions(g3, 5),
  ]);
}

function _pickQuestions(verbes, n) {
  const shuffled = _shuffle([...verbes]);
  const result   = [];
  for (let i = 0; i < n; i++) {
    const verbe  = shuffled[i % shuffled.length];
    const pronoun = PRONOMS[_randInt(0, PRONOMS.length - 1)];
    result.push({
      verbe,
      pronoun,
      correctForm: verbe.formes[pronoun.key],
      choices:     _buildChoices(verbe, pronoun.key),
    });
  }
  return result;
}

/* ════════════════════════════════════════════════════════════
   CONSTRUCTION DES CHOIX
   Les distracteurs = autres formes conjuguées du même verbe.
   Pédagogiquement très efficace : l'enfant distingue la personne.
   ════════════════════════════════════════════════════════════ */
function _buildChoices(verbe, pronKey) {
  const correct = verbe.formes[pronKey];

  // Toutes les formes du verbe sauf la bonne personne, sans doublon
  const distractors = _shuffle(
    Object.entries(verbe.formes)
      .filter(([k])  => k !== pronKey)
      .map(([, v])   => v)
      .filter((v, i, arr) => arr.indexOf(v) === i)  // déduplique
      .filter(v => v !== correct),                   // exclut la bonne réponse
  ).slice(0, 3);

  // Fallback si trop peu de formes distinctes (ne devrait pas arriver)
  if (distractors.length < 3) distractors.push(verbe.inf);

  return _shuffle([correct, ...distractors.slice(0, 3)]);
}

/* ════════════════════════════════════════════════════════════
   AFFICHAGE D'UNE QUESTION
   ════════════════════════════════════════════════════════════ */
function showQuestion() {
  if (state.currentIndex >= CONFIG.totalQuestions) {
    showResult();
    return;
  }

  state.isLocked = false;
  _clearFeedback();

  const q = state.questions[state.currentIndex];

  // Progression
  const pct = (state.currentIndex / CONFIG.totalQuestions) * 100;
  dom.progressFill.style.width  = `${pct}%`;
  dom.progressLabel.textContent = `${state.currentIndex + 1} / ${CONFIG.totalQuestions}`;

  // Badge groupe (couleur changée via data-group + CSS)
  dom.groupBadge.textContent      = GROUPE_LABELS[q.verbe.groupe];
  dom.groupBadge.dataset.group    = q.verbe.groupe;

  // Formule : pronom + verbe = ?
  dom.questionText.innerHTML = `
    <span class="formula-pronoun">${q.pronoun.label}</span>
    <span class="formula-op">+</span>
    <span class="formula-verb">${q.verbe.inf}</span>
    <span class="formula-op">=</span>
    <span class="formula-blank" id="formula-blank">?</span>
  `;

  // Boutons de choix
  dom.answerSection.innerHTML = '';
  q.choices.forEach(value => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.type        = 'button';
    btn.textContent = value;
    btn.addEventListener('click', () => handleAnswer(value));
    dom.answerSection.appendChild(btn);
  });
}

/* ════════════════════════════════════════════════════════════
   GESTION DE LA RÉPONSE
   ════════════════════════════════════════════════════════════ */
function handleAnswer(chosen) {
  if (state.isLocked) return;
  state.isLocked = true;

  const q    = state.questions[state.currentIndex];
  const isOk = chosen === q.correctForm;

  state.answers.push({
    question: `${q.pronoun.label} + ${q.verbe.inf} [G${q.verbe.groupe}]`,
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

  // Colorie les boutons
  dom.answerSection.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === chosen && !isOk) btn.classList.add('choice-btn--wrong');
    if (btn.textContent === q.correctForm)   btn.classList.add('choice-btn--correct');
  });

  if (isOk) {
    state.score++;
    _setFeedback('correct', _pickBravo());
  } else {
    _setFeedback('wrong',
      `❌ La bonne réponse était : <strong>${q.correctForm}</strong>`);
  }

  state.currentIndex++;
  setTimeout(showQuestion, CONFIG.delayNextMs);
}

/* ════════════════════════════════════════════════════════════
   ÉCRAN DE RÉSULTAT + ENVOI FLUTTER
   ════════════════════════════════════════════════════════════ */
function showResult() {
  const durationMs  = Date.now() - state.startTime;
  const successRate = state.score / CONFIG.totalQuestions;
  const passed      = successRate >= CONFIG.passingRate;
  const pct         = Math.round(successRate * 100);

  dom.questionSection.style.display = 'none';
  dom.resultScreen.classList.add('is-visible');

  dom.resultEmoji.textContent  = passed ? '🎉' : '💪';
  dom.resultTitle.textContent  = passed
    ? 'Bravo, tu maîtrises les 3 groupes !'
    : 'Entraîne-toi encore !';
  dom.resultScore.textContent  = `${state.score} / ${CONFIG.totalQuestions}`;
  dom.resultDetail.textContent =
    `${pct} % de réussite · ${Math.round(durationMs / 1000)} s`;

  _sendToFlutter({
    type:        'exercise_result',
    exerciseId:  CONFIG.exerciseId,
    score:       state.score,
    total:       CONFIG.totalQuestions,
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
   MODALE D'AIDE
   ════════════════════════════════════════════════════════════ */
function openHelp()  { dom.helpModal.removeAttribute('hidden'); }
function closeHelp() { dom.helpModal.setAttribute('hidden', ''); }

dom.btnHelp.addEventListener('click', openHelp);
dom.helpClose.addEventListener('click', closeHelp);
dom.modalOverlay.addEventListener('click', closeHelp);

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

/* ════════════════════════════════════════════════════════════
   LANCEMENT
   ════════════════════════════════════════════════════════════ */
dom.btnRestart.addEventListener('click', init);
init();
