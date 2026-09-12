# Travyon Backend

Bu klasör Firebase Cloud Functions ile çalışan ortak backend'i içerir. Hem web
hem de mobil uygulama buradaki sunucu işlevlerini kullanır.

- `src/`: TypeScript backend kaynakları
- `test/`: Node tabanlı backend testleri
- `lib/`: derlenmiş çıktı; elle düzenlenmez
- `.env*`: yalnızca sunucuda kullanılan gizli ayarlar ve örnekleri

Backend'i doğrulamak için depo kökünde çalıştır:

```powershell
npm.cmd --prefix functions run build
npm.cmd --prefix functions test
```

Firebase yapılandırması ve güvenlik kuralları ortak olduğu için depo kökünde
tutulur (`firebase.json`, `firestore.rules`, `storage.rules`).
