import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/firebase/firebase_services.dart';

const walletCategories = {
  'flight': 'Uçuş',
  'stay': 'Konaklama',
  'ticket': 'Etkinlik',
  'insurance': 'Sigorta',
  'document': 'Belge',
  'other': 'Diğer',
};
const walletFields = <String, Map<String, String>>{
  'flight': {
    'airline': 'Havayolu',
    'flightNumber': 'Uçuş numarası',
    'origin': 'Kalkış',
    'destination': 'Varış',
    'time': 'Saat',
    'terminal': 'Terminal',
    'seat': 'Koltuk',
    'baggage': 'Bagaj',
  },
  'stay': {
    'address': 'Adres',
    'checkOut': 'Çıkış tarihi',
    'roomType': 'Oda tipi',
    'contact': 'İletişim',
  },
  'ticket': {
    'venue': 'Mekân',
    'time': 'Saat',
    'seat': 'Koltuk',
    'gate': 'Kapı',
  },
  'insurance': {
    'insurer': 'Sigorta şirketi',
    'endDate': 'Bitiş tarihi',
    'emergencyPhone': 'Acil telefon',
  },
  'document': {
    'documentType': 'Belge türü',
    'expiryDate': 'Geçerlilik tarihi',
    'issuer': 'Düzenleyen',
  },
  'other': {},
};
const walletDateFields = ['checkOut', 'endDate', 'expiryDate'];
String walletText(Object? value) => value is String ? value : '';
String? walletUrl(String value) {
  if (value.trim().isEmpty) return '';
  final raw = value.trim();
  final uri = Uri.tryParse(raw.contains('://') ? raw : 'https://$raw');
  return uri != null &&
          ['https', 'http'].contains(uri.scheme) &&
          uri.host.isNotEmpty &&
          uri.userInfo.isEmpty &&
          !raw.contains(RegExp(r'\s')) &&
          !raw.startsWith(
            RegExp(r'(javascript|data|file):', caseSensitive: false),
          )
      ? uri.toString()
      : null;
}

String cleanWalletText(String value, int limit) {
  final text = value.trim().replaceAll(RegExp(r'\s+'), ' ');
  return text.length > limit ? text.substring(0, limit) : text;
}

class WalletEntry {
  const WalletEntry({
    required this.id,
    required this.planId,
    required this.category,
    required this.title,
    this.reference = '',
    this.date = '',
    this.note = '',
    this.url = '',
    this.details = const {},
    required this.createdAt,
    this.updatedAt = 0,
  });
  final String id, planId, category, title, reference, date, note, url;
  final Map<String, String> details;
  final int createdAt, updatedAt;
  factory WalletEntry.fromMap(String id, Map<String, dynamic> data) =>
      WalletEntry(
        id: id,
        planId: walletText(data['planId']).isEmpty
            ? 'general'
            : walletText(data['planId']),
        category: walletCategories.containsKey(data['category'])
            ? data['category'] as String
            : 'other',
        title: walletText(data['title']),
        reference: walletText(data['reference']),
        date: walletText(data['date']),
        note: walletText(data['note']),
        url: walletText(data['url']),
        details: data['details'] is Map
            ? {
                for (final e in (data['details'] as Map).entries)
                  if (e.value is String) e.key.toString(): e.value as String,
              }
            : {},
        createdAt: data['createdAt'] is num
            ? (data['createdAt'] as num).toInt()
            : 0,
        updatedAt: data['updatedAt'] is num
            ? (data['updatedAt'] as num).toInt()
            : 0,
      );
  Map<String, dynamic> toMap() => {
    'planId': cleanWalletText(planId, 100),
    'category': category,
    'title': cleanWalletText(title, 100),
    'reference': cleanWalletText(reference, 80),
    'date': date,
    'note': cleanWalletText(note, 500),
    'url': walletUrl(url) ?? '',
    'details': {
      for (final e in details.entries)
        if ((walletFields[category] ?? {}).containsKey(e.key) &&
            e.value.trim().isNotEmpty)
          e.key: cleanWalletText(e.value, 160),
    },
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'schemaVersion': 1,
    'deleted': false,
  };
}

List<WalletEntry> sortedWalletEntries(Iterable<WalletEntry> entries) =>
    entries.toList()..sort((a, b) {
      final date = (a.date.isEmpty ? '9999' : a.date).compareTo(
        b.date.isEmpty ? '9999' : b.date,
      );
      if (date != 0) return date;
      final time = (a.details['time'] ?? '').compareTo(b.details['time'] ?? '');
      return time != 0 ? time : b.createdAt.compareTo(a.createdAt);
    });

abstract interface class WalletRepository {
  Stream<List<WalletEntry>> watch(String uid);
  Future<void> save(String uid, WalletEntry entry, {required bool create});
  Future<void> remove(String uid, String id);
}

class FirebaseWalletRepository implements WalletRepository {
  CollectionReference<Map<String, dynamic>> _wallet(String uid) =>
      FirebaseServices.firestore
          .collection('users')
          .doc(uid)
          .collection('wallet');
  @override
  Stream<List<WalletEntry>> watch(String uid) => _wallet(uid).snapshots().map(
    (snap) => sortedWalletEntries(
      snap.docs
          .where((d) => d.data()['deleted'] != true)
          .map((d) => WalletEntry.fromMap(d.id, d.data())),
    ),
  );
  @override
  Future<void> save(
    String uid,
    WalletEntry entry, {
    required bool create,
  }) async {
    if (entry.title.trim().isEmpty ||
        !walletCategories.containsKey(entry.category) ||
        walletUrl(entry.url) == null) {
      throw StateError('Kayıt bilgilerini kontrol et.');
    }
    await FirebaseServices.firestore.runTransaction((tx) async {
      final ref = _wallet(uid).doc(entry.id);
      final current = await tx.get(ref);
      if (!create && (!current.exists || current.data()?['deleted'] == true)) {
        throw StateError('Bu kayıt silinmiş.');
      }
      if (!create && (current.data()?['updatedAt'] ?? 0) != entry.updatedAt) {
        throw StateError('Kayıt başka bir cihazda değişti. Yeniden açıp dene.');
      }
      if (create && current.exists) {
        // Retry after a lost acknowledgement must not duplicate an entry.
        if (current.data()?['createdAt'] == entry.createdAt &&
            current.data()?['deleted'] != true) {
          return;
        }
        throw StateError('Bu kayıt kimliği kullanılıyor. Cüzdanı yeniden aç.');
      }
      tx.set(ref, {
        ...entry.toMap(),
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      });
    });
  }

  @override
  Future<void> remove(String uid, String id) =>
      FirebaseServices.firestore.runTransaction((tx) async {
        final ref = _wallet(uid).doc(id);
        await tx.get(ref);
        tx.set(ref, {
          'deleted': true,
          'updatedAt': DateTime.now().millisecondsSinceEpoch,
          'schemaVersion': 1,
        });
      });
}
