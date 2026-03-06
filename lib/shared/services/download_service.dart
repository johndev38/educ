// Service de téléchargement HTTP.
//
// Responsabilités :
//   - Récupérer catalog.json depuis le serveur distant.
//   - Télécharger les archives zip des exercices.
//
// Ce service est sans état ; chaque appel crée sa propre requête.
// Le [http.Client] est injecté pour faciliter les tests unitaires.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/catalog_entry.dart';

/// Délais et limites configurables.
class DownloadConfig {
  /// Timeout pour le téléchargement du catalogue (léger, quelques Ko).
  static const Duration catalogTimeout = Duration(seconds: 10);

  /// Timeout global pour le téléchargement d'un zip.
  /// Augmenter si les exercices sont volumineux.
  static const Duration zipTimeout = Duration(seconds: 120);

  /// Taille maximale d'un zip accepté (10 Mo par défaut).
  static const int maxZipBytes = 10 * 1024 * 1024;
}

class DownloadService {
  final http.Client _client;

  DownloadService({http.Client? client}) : _client = client ?? http.Client();

  // ---------------------------------------------------------------------------
  // Catalogue distant
  // ---------------------------------------------------------------------------

  /// Télécharge et désérialise le catalog.json depuis [url].
  ///
  /// Lève une [DownloadException] si :
  ///   - le serveur répond avec un statut ≠ 200,
  ///   - le contenu n'est pas un JSON valide,
  ///   - la connexion échoue ou expire.
  Future<List<CatalogEntry>> fetchRemoteCatalog(String url) async {
    late http.Response response;

    try {
      response = await _client
          .get(Uri.parse(url))
          .timeout(
            DownloadConfig.catalogTimeout,
            onTimeout: () => throw DownloadException(
              'Délai dépassé pour le catalogue ($url)',
            ),
          );
    } on SocketException catch (e) {
      throw DownloadException('Pas de connexion réseau : ${e.message}');
    }

    if (response.statusCode != 200) {
      throw DownloadException(
        'Catalogue inaccessible — HTTP ${response.statusCode} ($url)',
      );
    }

    try {
      final List<dynamic> list =
          json.decode(response.body) as List<dynamic>;
      return list
          .map((e) => CatalogEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on FormatException catch (e) {
      throw DownloadException('Catalogue JSON invalide : ${e.message}');
    }
  }

  // ---------------------------------------------------------------------------
  // Téléchargement d'un zip
  // ---------------------------------------------------------------------------

  /// Télécharge le fichier zip depuis [url] et retourne ses octets bruts.
  ///
  /// [onProgress] est appelé régulièrement avec (octetsReçus, tailleTotal).
  /// [tailleTotal] peut être null si le serveur ne fournit pas Content-Length.
  ///
  /// Lève une [DownloadException] si :
  ///   - le statut HTTP est ≠ 200,
  ///   - le fichier dépasse [DownloadConfig.maxZipBytes],
  ///   - la connexion échoue ou expire.
  Future<Uint8List> downloadZip(
    String url, {
    void Function(int received, int? total)? onProgress,
  }) async {
    late http.StreamedResponse streamed;

    try {
      final request = http.Request('GET', Uri.parse(url));
      streamed = await _client
          .send(request)
          .timeout(
            DownloadConfig.zipTimeout,
            onTimeout: () => throw DownloadException(
              'Délai dépassé pour le téléchargement ($url)',
            ),
          );
    } on SocketException catch (e) {
      throw DownloadException('Pas de connexion réseau : ${e.message}');
    }

    if (streamed.statusCode != 200) {
      throw DownloadException(
        'Téléchargement échoué — HTTP ${streamed.statusCode} ($url)',
      );
    }

    final total = streamed.contentLength; // peut être null
    final buffer = <int>[];
    var received = 0;

    await for (final chunk in streamed.stream) {
      buffer.addAll(chunk);
      received += chunk.length;

      // Protection contre les fichiers anormalement volumineux.
      if (received > DownloadConfig.maxZipBytes) {
        throw DownloadException(
          'Fichier trop volumineux (> ${DownloadConfig.maxZipBytes ~/ 1024} Ko) : $url',
        );
      }

      onProgress?.call(received, total);
    }

    return Uint8List.fromList(buffer);
  }

  /// Libère les ressources du client HTTP.
  void dispose() => _client.close();
}

// ---------------------------------------------------------------------------
// Exception spécifique au téléchargement
// ---------------------------------------------------------------------------

/// Exception levée par [DownloadService] pour tout problème réseau ou HTTP.
class DownloadException implements Exception {
  final String message;
  const DownloadException(this.message);

  @override
  String toString() => 'DownloadException: $message';
}
