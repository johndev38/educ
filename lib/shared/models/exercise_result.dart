// Modèle représentant le résultat d'une session d'exercice.
//
// Envoyé par le JavaScript via ExerciseChannel.postMessage(), au format :
//   {
//     "type":        "exercise_result",
//     "exerciseId":  "addition",
//     "score":       7,
//     "total":       10,        ← anciennement "maxScore"
//     "successRate": 0.7,
//     "durationMs":  23400,
//     "answers": [
//       { "question": "2+3=?", "given": "5", "correct": "5", "ok": true },
//       …
//     ]
//   }

class ExerciseResult {
  final String exerciseId;
  final int score;
  final int maxScore;

  /// Durée de la session en millisecondes.
  final int durationMs;

  /// Taux de réussite (0.0 → 1.0), calculé côté JS.
  final double successRate;

  /// Historique détaillé des réponses.
  final List<AnswerRecord> answers;

  final DateTime completedAt;

  const ExerciseResult({
    required this.exerciseId,
    required this.score,
    required this.maxScore,
    required this.durationMs,
    required this.successRate,
    required this.answers,
    required this.completedAt,
  });

  // ---------------------------------------------------------------------------
  // Désérialisation depuis le canal JS
  // ---------------------------------------------------------------------------

  factory ExerciseResult.fromJson(Map<String, dynamic> json) {
    final rawAnswers = json['answers'] as List<dynamic>? ?? [];
    return ExerciseResult(
      exerciseId:  json['exerciseId'] as String,
      score:       json['score']      as int,
      maxScore:    (json['total'] ?? json['maxScore']) as int,
      durationMs:  (json['durationMs'] ?? ((json['durationSeconds'] as int? ?? 0) * 1000)) as int,
      successRate: (json['successRate'] as num?)?.toDouble() ??
                   (json['score'] as int) / ((json['total'] ?? json['maxScore']) as int),
      answers:     rawAnswers
                     .map((e) => AnswerRecord.fromJson(e as Map<String, dynamic>))
                     .toList(),
      completedAt: DateTime.now(),
    );
  }

  // ---------------------------------------------------------------------------
  // Sérialisation pour SharedPreferences
  // ---------------------------------------------------------------------------

  Map<String, dynamic> toJson() => {
        'exerciseId':  exerciseId,
        'score':       score,
        'maxScore':    maxScore,
        'durationMs':  durationMs,
        'successRate': successRate,
        'answers':     answers.map((a) => a.toJson()).toList(),
        'completedAt': completedAt.toIso8601String(),
      };

  factory ExerciseResult.fromStoredJson(Map<String, dynamic> json) {
    final rawAnswers = json['answers'] as List<dynamic>? ?? [];
    return ExerciseResult(
      exerciseId:  json['exerciseId']  as String,
      score:       json['score']       as int,
      maxScore:    json['maxScore']    as int,
      durationMs:  (json['durationMs'] ?? ((json['durationSeconds'] as int? ?? 0) * 1000)) as int,
      successRate: (json['successRate'] as num).toDouble(),
      answers:     rawAnswers
                     .map((e) => AnswerRecord.fromJson(e as Map<String, dynamic>))
                     .toList(),
      completedAt: DateTime.parse(json['completedAt'] as String),
    );
  }

  // ---------------------------------------------------------------------------
  // Accesseurs calculés
  // ---------------------------------------------------------------------------

  double get percentage    => successRate * 100;
  bool   get isPassed      => successRate >= 0.6;
  int    get durationSeconds => durationMs ~/ 1000;
}

// =============================================================================
// Enregistrement d'une réponse individuelle
// =============================================================================

class AnswerRecord {
  final String question;
  final String given;
  final String correct;
  final bool   isCorrect;

  const AnswerRecord({
    required this.question,
    required this.given,
    required this.correct,
    required this.isCorrect,
  });

  factory AnswerRecord.fromJson(Map<String, dynamic> json) => AnswerRecord(
        question:  json['question'] as String? ?? '',
        given:     json['given']    as String? ?? '',
        correct:   json['correct']  as String? ?? '',
        isCorrect: json['ok']       as bool?   ?? false,
      );

  Map<String, dynamic> toJson() => {
        'question': question,
        'given':    given,
        'correct':  correct,
        'ok':       isCorrect,
      };
}
