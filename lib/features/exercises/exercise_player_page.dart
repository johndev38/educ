// Écran de lecture d'un exercice HTML/JS.
//
// Stratégie de chargement (dans l'ordre de priorité) :
//   1. Exercice local téléchargé (ExerciseSource.local)
//        → loadFile(absolutePath) directement.
//   2. Exercice embarqué dans les assets (ExerciseSource.asset)
//        → copie d'abord vers le stockage local via initBundledExercise(),
//          puis loadFile() — garantit que CSS/JS relatifs se chargent.
//   3. Fallback (extraction impossible) → message d'erreur.
//
// Pourquoi loadFile() et pas loadHtmlString() ?
//   loadHtmlString() n'a pas de base URL : les <link href="style.css">
//   et <script src="script.js"> ne se resolvent pas.
//   loadFile() fixe la base URL au répertoire du fichier, ce qui rend
//   les références relatives pleinement fonctionnelles.
//
// Canal JavaScript :
//   ExerciseChannel.postMessage(JSON.stringify(payload))
//   payload contient : type, exerciseId, score, total, successRate,
//                      durationMs, answers

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../shared/models/exercise_definition.dart';
import '../../shared/models/exercise_result.dart';
import '../../shared/services/exercise_storage_service.dart';
import '../../shared/services/progress_service.dart';

class ExercisePlayerPage extends StatefulWidget {
  final ExerciseDefinition exercise;

  const ExercisePlayerPage({super.key, required this.exercise});

  @override
  State<ExercisePlayerPage> createState() => _ExercisePlayerPageState();
}

class _ExercisePlayerPageState extends State<ExercisePlayerPage> {
  final _storage  = ExerciseStorageService();
  final _progress = ProgressService();

  late final WebViewController _controller;

  bool _isLoading  = true;
  ExerciseResult?  _result;
  String?          _loadError;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  // ---------------------------------------------------------------------------
  // Initialisation de la WebView
  // ---------------------------------------------------------------------------

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted:   (_) => setState(() => _isLoading = true),
          onPageFinished:  (_) => setState(() => _isLoading = false),
          onWebResourceError: (error) {
            // On ignore les erreurs mineures de sous-ressources
            // (polices système manquantes, etc.).
            if (error.errorType == WebResourceErrorType.unknown &&
                error.description.contains('ERR_CACHE_MISS')) return;

            setState(() {
              _loadError =
                  'Erreur de chargement (${error.errorCode}) : '
                  '${error.description}';
              _isLoading = false;
            });
          },
          // Bloque toute navigation externe — les exercices sont 100 % locaux.
          onNavigationRequest: (request) {
            final url = request.url;
            if (url.startsWith('file://') ||
                url.startsWith('about:') ||
                url.startsWith('data:')) {
              return NavigationDecision.navigate;
            }
            debugPrint('[Player] Navigation externe bloquée : $url');
            return NavigationDecision.prevent;
          },
        ),
      )
      // Canal nommé "ExerciseChannel" — injecté dans la WebView.
      // Côté JS : ExerciseChannel.postMessage(JSON.stringify(payload))
      ..addJavaScriptChannel('ExerciseChannel', onMessageReceived: _onMessage);

    _loadExercise();
  }

  // ---------------------------------------------------------------------------
  // Chargement du fichier HTML
  // ---------------------------------------------------------------------------

  Future<void> _loadExercise() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    try {
      // Pour les exercices embarqués : extraction vers le stockage local
      // si ce n'est pas déjà fait (ou si une version téléchargée existe déjà).
      if (!widget.exercise.isLocal) {
        await _storage.initBundledExercise(widget.exercise.id);
      }

      // Récupère le chemin absolu vers index.html.
      final indexPath = await _storage.getIndexFilePath(widget.exercise.id);

      if (indexPath == null) {
        setState(() {
          _loadError = 'Fichiers de l\'exercice introuvables. '
              'Vérifiez votre connexion et réessayez.';
          _isLoading = false;
        });
        return;
      }

      // loadFile() fixe la base URL au répertoire du fichier :
      // les CSS/JS relatifs (style.css, script.js) se chargent correctement.
      await _controller.loadFile(indexPath);
    } catch (e) {
      setState(() {
        _loadError = 'Erreur lors du chargement : $e';
        _isLoading = false;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Réception du message JavaScript
  // ---------------------------------------------------------------------------

  void _onMessage(JavaScriptMessage message) {
    try {
      final Map<String, dynamic> data =
          json.decode(message.message) as Map<String, dynamic>;

      // Le JS peut envoyer des messages intermédiaires (type ≠ exercise_result).
      final type = data['type'] as String?;
      if (type != 'exercise_result') {
        debugPrint('[ExerciseChannel] Message ignoré (type=$type)');
        return;
      }

      final result = ExerciseResult.fromJson(data);

      _progress.saveResult(result).then((_) {
        if (mounted) setState(() => _result = result);
      });
    } catch (e) {
      debugPrint('[ExerciseChannel] Message invalide : ${message.message}');
      debugPrint('[ExerciseChannel] Erreur : $e');
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.exercise.title),
        leading: const BackButton(),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Recommencer',
            onPressed: _restart,
          ),
        ],
      ),
      body: Stack(
        children: [
          // ------------------------------------------------------------------
          // WebView
          // ------------------------------------------------------------------
          if (_loadError == null)
            WebViewWidget(controller: _controller),

          // ------------------------------------------------------------------
          // Indicateur de chargement
          // ------------------------------------------------------------------
          if (_isLoading)
            const Center(child: CircularProgressIndicator()),

          // ------------------------------------------------------------------
          // Erreur de chargement
          // ------------------------------------------------------------------
          if (_loadError != null)
            _ErrorView(message: _loadError!, onRetry: _loadExercise),

          // ------------------------------------------------------------------
          // Overlay de résultat (dès que le JS envoie le payload final)
          // ------------------------------------------------------------------
          if (_result != null)
            _ResultOverlay(
              result:       _result!,
              exerciseName: widget.exercise.title,
              onRestart:    _restart,
              onGoBack:     () => Navigator.pop(context),
            ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  void _restart() {
    setState(() {
      _result    = null;
      _loadError = null;
    });
    _loadExercise();
  }
}

// =============================================================================
// Vue d'erreur
// =============================================================================

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Overlay de résultat
// =============================================================================

class _ResultOverlay extends StatelessWidget {
  final ExerciseResult result;
  final String exerciseName;
  final VoidCallback onRestart;
  final VoidCallback onGoBack;

  const _ResultOverlay({
    required this.result,
    required this.exerciseName,
    required this.onRestart,
    required this.onGoBack,
  });

  @override
  Widget build(BuildContext context) {
    final theme  = Theme.of(context);
    final passed = result.isPassed;
    final color  = passed ? Colors.green : Colors.orange;

    return Container(
      color: Colors.black54,
      child: Center(
        child: Card(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  passed ? '🎉' : '💪',
                  style: const TextStyle(fontSize: 64),
                ),
                const SizedBox(height: 8),
                Text(
                  passed ? 'Excellent travail !' : 'Continue, tu y arrives !',
                  style: theme.textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // Score
                Text(
                  '${result.score} / ${result.maxScore}',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  '${result.percentage.toStringAsFixed(0)} % de réussite',
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  'Durée : ${(result.durationMs / 1000).toStringAsFixed(0)} s',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: Colors.grey),
                ),
                const SizedBox(height: 32),

                // Actions
                ElevatedButton.icon(
                  onPressed: onRestart,
                  icon: const Icon(Icons.replay),
                  label: const Text('Rejouer'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: onGoBack,
                  icon: const Icon(Icons.list),
                  label: const Text('Retour aux exercices'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
