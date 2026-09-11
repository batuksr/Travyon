# Travyon Mobile

Flutter istemcisi, mevcut React web uygulamasıyla aynı Firebase projesini kullanır.

## Platform kimlikleri

- Android application ID: `com.travyon.app`
- iOS bundle ID: `com.travyon.app`
- Firebase project: `travyon-5fb01`
- Cloud Functions region: `europe-west1`

## Yerel çalıştırma

```powershell
cd mobile
flutter.bat pub get
flutter.bat run
```

## Mimari notu

Web arayüzü `src/` altında yaşamaya devam eder. `mobile/` yalnızca Android ve
iOS arayüzüdür. Authentication, Firestore, Storage ve Cloud Functions iki
istemci arasında ortaktır.

Firebase App Check paketi kuruludur. Play Integrity ve App Attest kayıtları
Firebase Console'da tamamlandıktan sonra enforcement etkinleştirilmelidir.
