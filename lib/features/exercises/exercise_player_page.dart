// Écran de lecture d'un exercice HTML/JS.
//
// Stratégie de chargement :
//   • Exercice embarqué (ExerciseSource.asset)  → rootBundle (assets Flutter)
//   • Exercice téléchargé (ExerciseSource.local) → stockage local (fichiers)
//
// Dans les deux cas, le CSS et le JS sont inlinés dans le HTML avant le
// chargement via loadHtmlString(). Aucune dépendance externe à résoudre :
// fonctionne sur toutes les plateformes indépendamment des politiques
// file:// du WebView Android.
//
// Canal JavaScript :
//   ExerciseChannel.postMessage(JSON.stringify(payload))

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
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

  bool            _isLoading = true;
  ExerciseResult? _result;
  String?         _loadError;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  // -------------------------------------------------------------------------
  // Initialisation de la WebView
  // -------------------------------------------------------------------------

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted:  (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
          onWebResourceError: (error) {
            if (error.isForMainFrame == true &&
                !(error.description.contains('ERR_CACHE_MISS'))) {
              setState(() {
                _loadError = 'Erreur WebView (${error.errorCode}) : '
                    '${error.description}';
                _isLoading = false;
              });
            }
          },
          // Exercices 100 % locaux : aucune navigation externe autorisée.
          onNavigationRequest: (req) {
            final url = req.url;
            if (url.startsWith('about:') || url.startsWith('data:')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..addJavaScriptChannel('ExerciseChannel', onMessageReceived: _onMessage);

    _loadExercise();
  }

  // -------------------------------------------------------------------------
  // Chargement
  // -------------------------------------------------------------------------

  Future<void> _loadExercise() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    try {
      final String? html;

      if (widget.exercise.isLocal) {
        // Exercice téléchargé : fichiers sur le stockage local.
        html = await _buildInlineHtmlFromFiles(widget.exercise.id);
      } else {
        // Exercice embarqué : lit directement depuis les assets Flutter.
        html = await _buildInlineHtmlFromAssets(widget.exercise.id);
      }

      if (html == null) {
        setState(() {
          _loadError = 'Fichiers introuvables pour '
              '« ${widget.exercise.title} ».\n'
              'Vérifiez que l\'exercice est bien installé.';
          _isLoading = false;
        });
        return;
      }

      await _controller.loadHtmlString(html);
    } catch (e) {
      setState(() {
        _loadError = 'Erreur de chargement : $e';
        _isLoading = false;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Construction du HTML autonome – source : assets Flutter
  // -------------------------------------------------------------------------

  /// Lit index.html, style.css et script.js depuis le bundle Flutter (assets)
  /// et retourne un HTML unique avec CSS et JS inlinés.
  Future<String?> _buildInlineHtmlFromAssets(String id) async {
    final base = 'assets/exercises/$id';
    try {
      String html = await rootBundle.loadString('$base/index.html');

      try {
        final css = await rootBundle.loadString('$base/style.css');
        html = _inlineCss(html, css);
      } catch (_) {}

      try {
        final js = await rootBundle.loadString('$base/script.js');
        html = _inlineJs(html, js);
      } catch (_) {}

      return html;
    } catch (_) {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Construction du HTML autonome – source : stockage local
  // -------------------------------------------------------------------------

  /// Lit les fichiers depuis le stockage local (exercices téléchargés)
  /// et retourne un HTML unique avec CSS et JS inlinés.
  Future<String?> _buildInlineHtmlFromFiles(String id) async {
    final dir = await _storage.getExerciseDir(id);

    final indexFile = File(p.join(dir.path, 'index.html'));
    if (!await indexFile.exists()) return null;

    String html = await indexFile.readAsString();

    final cssFile = File(p.join(dir.path, 'style.css'));
    if (await cssFile.exists()) {
      html = _inlineCss(html, await cssFile.readAsString());
    }

    final jsFile = File(p.join(dir.path, 'script.js'));
    if (await jsFile.exists()) {
      html = _inlineJs(html, await jsFile.readAsString());
    }

    return html;
  }

  // -------------------------------------------------------------------------
  // Helpers d'inlinage
  // -------------------------------------------------------------------------

  /// Remplace <link href="style.css" …> par <style>…css…</style>.
  static String _inlineCss(String html, String css) => html.replaceFirst(
        RegExp(
          r'''<link\b[^>]+href=["']style\.css["'][^>]*/?>''',
          caseSensitive: false,
        ),
        '<style>\n$css\n</style>',
      );

  /// Remplace <script src="script.js"></script> par <script>…js…</script>.
  static String _inlineJs(String html, String js) => html.replaceFirst(
        RegExp(
          r'''<script\b[^>]+src=["']script\.js["'][^>]*>\s*</script>''',
          caseSensitive: false,
        ),
        '<script>\n$js\n</script>',
      );

  // -------------------------------------------------------------------------
  // Réception du message JavaScript
  // -------------------------------------------------------------------------

  void _onMessage(JavaScriptMessage message) {
    try {
      final Map<String, dynamic> data =
          json.decode(message.message) as Map<String, dynamic>;

      if (data['type'] != 'exercise_result') return;

      final result = ExerciseResult.fromJson(data);
      _progress.saveResult(result).then((_) {
        if (mounted) setState(() => _result = result);
      });
    } catch (e) {
      debugPrint('[ExerciseChannel] Message invalide : ${message.message}');
    }
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

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
          if (_loadError == null)
            WebViewWidget(controller: _controller),

          if (_isLoading)
            const Center(child: CircularProgressIndicator()),

          if (_loadError != null)
            _ErrorView(message: _loadError!, onRetry: _loadExercise),

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

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

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
                ElevatedButton.icon(
                  onPressed: onRestart,
                  icon: const Icon(Icons.replay),
                  label: const Text('Rejouer'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
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
