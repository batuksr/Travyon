import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Vite'da çevre değişkenleri import.meta.env üzerinden çekilir
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const useFirebaseEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

// Firebase'i Başlat
// Eğer .env dosyası yoksa veya ayarlanmamışsa, uygulamanın çökmesini engellemek için mock bir obje döndürüyoruz.
let app;
try {
  app = initializeApp(firebaseConfig);
} catch {
  console.warn("Firebase başlatılamadı. Muhtemelen .env yapılandırması eksik.");
}

// App Check — callable Cloud Functions tarafında zorunludur. Üretim ortamına
// çıkmadan önce bu anahtar Firebase Console'daki reCAPTCHA v3 kaydıyla eşleşmelidir.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (app && recaptchaSiteKey && !useFirebaseEmulators) {
  if (import.meta.env.DEV) {
    // Yerel geliştirmede gerçek reCAPTCHA doğrulaması yerine debug token kullanılır.
    // Firebase Console > App Check > Apps > (⋮) > "Manage debug tokens" üzerinden
    // konsolda basılan token'ı kaydetmen gerekir.
    // @ts-expect-error - Firebase'in resmi debug-token mekanizması, tipte yok
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    console.warn("App Check başlatılamadı.");
  }
} else if (import.meta.env.PROD) {
  console.error('VITE_RECAPTCHA_SITE_KEY eksik: güvenli sunucu çağrıları çalışmayacak.');
}

// Servisleri dışarı aktar
export const auth = app ? getAuth(app) : ({} as unknown as Auth);
export const db = app ? getFirestore(app) : ({} as unknown as Firestore);
export const storage = app ? getStorage(app) : ({} as unknown as FirebaseStorage);
// Cloud Functions'daki setGlobalOptions region'ıyla eşleşmeli (functions/src/index.ts)
export const functions = app ? getFunctions(app, "europe-west1") : ({} as unknown as Functions);
export const googleProvider = new GoogleAuthProvider();

const emulatorConnectionState = globalThis as typeof globalThis & {
  __TRAVYON_FIREBASE_EMULATORS_CONNECTED__?: boolean;
};

if (app && useFirebaseEmulators && !emulatorConnectionState.__TRAVYON_FIREBASE_EMULATORS_CONNECTED__) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  emulatorConnectionState.__TRAVYON_FIREBASE_EMULATORS_CONNECTED__ = true;
  console.info("Travyon Firebase Emulator Suite'e bağlandı.");
}
