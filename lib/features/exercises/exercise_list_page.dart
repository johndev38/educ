// Écran de liste des exercices disponibles.
// Affiche chaque exercice sous forme de carte avec son état de progression.

import 'package:flutter/material.dart';

import '../../shared/models/exercise_definition.dart';
import '../../shared/services/exercise_catalog_service.dart';
import '../../shared/services/progress_service.dart';
import 'exercise_player_page.dart';

class ExerciseListPage extends StatefulWidget {
  const ExerciseListPage({super.key});

  @override
  State<ExerciseListPage> createState() => _ExerciseListPageState();
}

class _ExerciseListPageState extends State<ExerciseListPage> {
  final _catalog = ExerciseCatalogService();
  final _progress = ProgressService();

  List<ExerciseDefinition> _exercises = [];
  bool _isLoading = true;
  String? _errorMessage;

  // Cache des scores pour ne pas les recharger à chaque rebuild.
  final Map<String, double?> _bestScores = {};
  final Map<String, bool> _playedStatus = {};

  @override
  void initState() {
    super.initState();
    _loadExercises();
  }

  Future<void> _loadExercises() async {
    try {
      final exercises = await _catalog.getAll();
      // Charge les stats en parallèle.
      await Future.wait(exercises.map(_loadStatsFor));
      if (mounted) {
        setState(() {
          _exercises = exercises;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Impossible de charger les exercices : $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadStatsFor(ExerciseDefinition ex) async {
    final best = await _progress.getBestPercentage(ex.id);
    final played = await _progress.hasBeenPlayed(ex.id);
    _bestScores[ex.id] = best;
    _playedStatus[ex.id] = played;
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Exercices'),
        leading: const BackButton(),
      ),
      body: _buildBody(isTablet),
    );
  }

  Widget _buildBody(bool isTablet) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red, fontSize: 16),
          ),
        ),
      );
    }

    if (_exercises.isEmpty) {
      return const Center(child: Text('Aucun exercice disponible.'));
    }

    // Grille responsive : 1 colonne sur téléphone, 2 sur tablette.
    return GridView.builder(
      padding: EdgeInsets.symmetric(
        horizontal: isTablet ? 32 : 16,
        vertical: 16,
      ),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isTablet ? 2 : 1,
        crossAxisSpacing: 16,
        mainAxisSpacing: 4,
        childAspectRatio: isTablet ? 1.6 : 2.8,
      ),
      itemCount: _exercises.length,
      itemBuilder: (_, index) => _ExerciseCard(
        exercise: _exercises[index],
        bestScore: _bestScores[_exercises[index].id],
        hasBeenPlayed: _playedStatus[_exercises[index].id] ?? false,
        onTap: () => _openExercise(_exercises[index]),
      ),
    );
  }

  // ---------------------------------------------------------------------------

  Future<void> _openExercise(ExerciseDefinition exercise) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ExercisePlayerPage(exercise: exercise),
      ),
    );
    // Recharge les statistiques après le retour du lecteur.
    await _loadStatsFor(exercise);
    setState(() {});
  }
}

// =============================================================================
// Carte d'un exercice
// =============================================================================

class _ExerciseCard extends StatelessWidget {
  final ExerciseDefinition exercise;
  final double? bestScore;
  final bool hasBeenPlayed;
  final VoidCallback onTap;

  const _ExerciseCard({
    required this.exercise,
    required this.bestScore,
    required this.hasBeenPlayed,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = Color(exercise.colorValue);
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            // Bande colorée à gauche avec l'icône
            Container(
              width: 80,
              color: cardColor.withOpacity(0.85),
              child: Center(
                child: Icon(
                  _iconFromName(exercise.iconName),
                  size: 36,
                  color: Colors.white,
                ),
              ),
            ),

            // Contenu texte
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Titre
                    Text(
                      exercise.title,
                      style: theme.textTheme.titleLarge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),

                    // Description
                    Text(
                      exercise.description,
                      style: theme.textTheme.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),

                    // Badges : catégorie, difficulté, âge
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        _Badge(
                          label: exercise.category,
                          color: cardColor,
                        ),
                        _Badge(
                          label: exercise.difficultyLabel,
                          color: _difficultyColor(exercise.difficulty),
                        ),
                        _Badge(
                          label: '${exercise.ageMin}–${exercise.ageMax} ans',
                          color: Colors.grey,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Score ou icône "à faire"
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: _ScoreIndicator(
                bestScore: bestScore,
                hasBeenPlayed: hasBeenPlayed,
                color: cardColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _difficultyColor(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'hard':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _iconFromName(String name) {
    const map = {
      'calculate': Icons.calculate,
      'format_list_numbered': Icons.format_list_numbered,
      'menu_book': Icons.menu_book,
      'color_lens': Icons.color_lens,
      'music_note': Icons.music_note,
      'science': Icons.science,
      'star': Icons.star,
    };
    return map[name] ?? Icons.school;
  }
}

// =============================================================================
// Badge de catégorie / difficulté
// =============================================================================

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
        child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color.withOpacity(0.85),
        ),
      ),
    );
  }
}

// =============================================================================
// Indicateur de score
// =============================================================================

class _ScoreIndicator extends StatelessWidget {
  final double? bestScore;
  final bool hasBeenPlayed;
  final Color color;

  const _ScoreIndicator({
    required this.bestScore,
    required this.hasBeenPlayed,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (!hasBeenPlayed) {
      return const Icon(Icons.play_circle_outline, size: 36, color: Colors.grey);
    }

    final score = bestScore ?? 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '${score.toStringAsFixed(0)} %',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: score >= 60 ? Colors.green : Colors.orange,
          ),
        ),
        Icon(
          score >= 60 ? Icons.check_circle : Icons.replay,
          size: 20,
          color: score >= 60 ? Colors.green : Colors.orange,
        ),
      ],
    );
  }
}
