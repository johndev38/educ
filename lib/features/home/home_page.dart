// Écran d'accueil.
//
// Nouvelles responsabilités par rapport à la version précédente :
//   - Lance la synchronisation du catalogue au démarrage (en arrière-plan).
//   - Affiche l'état de la synchronisation (chargement, erreur, succès,
//     hors-ligne).
//   - Indique la date de dernière synchronisation.
//
// L'URL du catalogue distant est définie dans [_catalogUrl].
// Remplacez-la par votre URL de production avant de déployer.

import 'package:flutter/material.dart';

import '../../shared/models/sync_report.dart';
import '../../shared/services/catalog_sync_service.dart';
import '../../shared/services/exercise_catalog_service.dart';
import '../../shared/services/progress_service.dart';
import '../exercises/exercise_list_page.dart';

/// URL du catalog.json hébergé sur votre serveur.
/// Exemple : 'https://mon-serveur.com/edukids/catalog.json'
const String _catalogUrl = 'https://mon-serveur.com/edukids/catalog.json';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _catalog  = ExerciseCatalogService();
  final _progress = ProgressService();
  final _sync     = CatalogSyncService();

  // Statistiques de progression
  int _totalExercises     = 0;
  int _completedExercises = 0;

  // État de la synchronisation
  _SyncState _syncState = _SyncState.idle;
  SyncReport? _lastReport;
  DateTime?   _lastSyncTime;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _startSync();
  }

  // ---------------------------------------------------------------------------
  // Synchronisation
  // ---------------------------------------------------------------------------

  Future<void> _startSync() async {
    setState(() => _syncState = _SyncState.syncing);

    _lastSyncTime = await _sync.getLastSyncTime();

    final report = await _sync.sync(_catalogUrl);
    _lastReport  = report;

    if (!mounted) return;

    if (report.isCatalogUnreachable) {
      setState(() => _syncState = _SyncState.offline);
    } else if (report.hasErrors) {
      setState(() => _syncState = _SyncState.error);
    } else {
      setState(() => _syncState = _SyncState.done);
    }

    // Si des exercices ont été mis à jour, recharge les stats.
    if (report.hasUpdates) _loadStats();
  }

  // ---------------------------------------------------------------------------
  // Statistiques
  // ---------------------------------------------------------------------------

  Future<void> _loadStats() async {
    final exercises = await _catalog.getAll();
    var completed = 0;
    for (final ex in exercises) {
      if (await _progress.hasBeenPlayed(ex.id)) completed++;
    }
    if (!mounted) return;
    setState(() {
      _totalExercises     = exercises.length;
      _completedExercises = completed;
    });
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final theme    = Theme.of(context);
    final isTablet = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: isTablet ? 48 : 24,
            vertical: 24,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(theme),
              const SizedBox(height: 24),

              // Bandeau de synchronisation
              _buildSyncBanner(theme),
              const SizedBox(height: 24),

              // Progression
              _buildProgressCard(theme),
              const SizedBox(height: 32),

              // Bouton principal
              ElevatedButton.icon(
                onPressed: _goToExercises,
                icon: const Icon(Icons.play_circle_fill, size: 28),
                label: const Text('Commencer les exercices'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: 16),

              // Réinitialisation
              OutlinedButton.icon(
                onPressed: _confirmReset,
                icon: const Icon(Icons.restart_alt),
                label: const Text('Remettre les scores à zéro'),
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
    );
  }

  // ---------------------------------------------------------------------------
  // Widgets
  // ---------------------------------------------------------------------------

  Widget _buildHeader(ThemeData theme) {
    return Row(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.school, size: 40, color: Colors.white),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('EduKids', style: theme.textTheme.displayLarge),
              Text(
                'Apprendre en s\'amusant !',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgressCard(ThemeData theme) {
    final percent = _totalExercises > 0
        ? _completedExercises / _totalExercises
        : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ma progression', style: theme.textTheme.titleLarge),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: percent,
                minHeight: 16,
                backgroundColor: const Color(0xFFE0E0E0),
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$_completedExercises / $_totalExercises exercices essayés',
                  style: theme.textTheme.bodyMedium,
                ),
                Text(
                  '${(percent * 100).toStringAsFixed(0)} %',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Bandeau d'état de la synchronisation.
  Widget _buildSyncBanner(ThemeData theme) {
    switch (_syncState) {
      case _SyncState.idle:
        return const SizedBox.shrink();

      case _SyncState.syncing:
        return _SyncBanner(
          icon: const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          message: 'Recherche de nouveaux exercices…',
          color: theme.colorScheme.primary.withOpacity(0.1),
          borderColor: theme.colorScheme.primary,
        );

      case _SyncState.done:
        final report = _lastReport!;
        if (report.hasUpdates) {
          return _SyncBanner(
            icon: const Icon(Icons.download_done, color: Colors.green),
            message: '${report.updated.length} exercice(s) mis à jour !',
            color: const Color(0xFFD5F5E3),
            borderColor: Colors.green,
            onDismiss: () => setState(() => _syncState = _SyncState.idle),
          );
        }
        // Rien de nouveau → on masque le bandeau silencieusement.
        return const SizedBox.shrink();

      case _SyncState.offline:
        final lastSync = _lastSyncTime;
        final lastSyncLabel = lastSync != null
            ? 'Dernière sync : ${_formatDate(lastSync)}'
            : 'Jamais synchronisé';
        return _SyncBanner(
          icon: const Icon(Icons.wifi_off, color: Colors.grey),
          message: 'Hors-ligne — $lastSyncLabel',
          color: const Color(0xFFF5F5F5),
          borderColor: Colors.grey,
          onDismiss: () => setState(() => _syncState = _SyncState.idle),
        );

      case _SyncState.error:
        final report  = _lastReport!;
        final errCount = report.errors.length;
        return _SyncBanner(
          icon: const Icon(Icons.warning_amber, color: Colors.orange),
          message: '$errCount exercice(s) n\'ont pas pu être mis à jour.',
          color: const Color(0xFFFEF3CD),
          borderColor: Colors.orange,
          onDismiss: () => setState(() => _syncState = _SyncState.idle),
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  void _goToExercises() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ExerciseListPage()),
    ).then((_) => _loadStats());
  }

  Future<void> _confirmReset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remettre à zéro ?'),
        content: const Text(
          'Tous les scores et la progression seront effacés. '
          'Cette action est irréversible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Effacer'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _progress.clearAll();
      _loadStats();
    }
  }

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'aujourd\'hui à ${dt.hour.toString().padLeft(2, '0')}:'
             '${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.day.toString().padLeft(2, '0')}/'
           '${dt.month.toString().padLeft(2, '0')}/'
           '${dt.year}';
  }
}

// =============================================================================
// Bandeau de synchronisation
// =============================================================================

class _SyncBanner extends StatelessWidget {
  final Widget  icon;
  final String  message;
  final Color   color;
  final Color   borderColor;
  final VoidCallback? onDismiss;

  const _SyncBanner({
    required this.icon,
    required this.message,
    required this.color,
    required this.borderColor,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
          if (onDismiss != null)
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// État interne de la synchronisation
// =============================================================================

enum _SyncState { idle, syncing, done, offline, error }
