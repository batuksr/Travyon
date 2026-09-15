import '../../../core/firebase/firebase_services.dart';

abstract interface class ContactRepository {
  Future<void> send({
    required String name,
    required String email,
    required String subject,
    required String message,
  });
}

/// Same public, App Check-protected callable used by the website.
/// Firebase is accessed only when the user explicitly submits the form.
class FirebaseContactRepository implements ContactRepository {
  const FirebaseContactRepository();

  @override
  Future<void> send({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) async {
    final result = await FirebaseServices.functions
        .httpsCallable('submitContactMessage')
        .call<Map<String, dynamic>>({
          'name': name.trim(),
          'email': email.trim(),
          'subject': subject.trim(),
          'message': message.trim(),
        });
    if (result.data['ok'] != true) {
      throw StateError('Contact submission was not acknowledged.');
    }
  }
}
