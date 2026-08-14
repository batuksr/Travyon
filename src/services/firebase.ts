import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Vite'da çevre değişkenleri import.meta.env üzerinden çekilir
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase'i Başlat
// Eğer .env dosyası yoksa veya ayarlanmamışsa, uygulamanın çökmesini engellemek için mock bir obje döndürüyoruz.
let app;
try {
  app = initializeApp(firebaseConfig);
} catch {
  console.warn("Firebase başlatılamadı. Muhtemelen .env yapılandırması eksik.");
}

// App Check — istekleri gerçek uygulamanın kendi tarayıcı oturumundan
// geldiğini doğrular. Site key yoksa (env boşsa) sessizce atlanır, uygulama
// App Check'siz normal çalışmaya devam eder. Sunucu tarafında henüz
// zorunlu kılınmıyor (enforceAppCheck) — bu ayrı, sonraki bir adım.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (app && recaptchaSiteKey) {
  if (import.meta.env.DEV) {
    // Yerel geliştirmede gerçek reCAPTCHA doğrulaması yerine debug token kullanılır.
    // Firebase Console > App Check > Apps > (⋮) > "Manage debug tokens" üzerinden
    // konsolda basılan token'ı kaydetmen gerekir.
    // @ts-expect-error - Firebase'in resmi debug-token mekanizması, tipte yok
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  try {
    // ReCaptchaV3Provider yerine Enterprise — reCAPTCHA anahtarı klasik v3 değil,
    // Google'ın 2022+ birleştirilmiş altyapısında Enterprise olarak oluşmuş
    // görünüyor ("Cloud Console'da Görüntüle" butonu bunu işaret ediyordu),
    // bu yüzden istemci tarafı da Enterprise akışını kullanmalı.
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    console.warn("App Check başlatılamadı.");
  }
}

// Servisleri dışarı aktar
export const auth = app ? getAuth(app) : ({} as unknown as Auth);
export const db = app ? getFirestore(app) : ({} as unknown as Firestore);
export const storage = app ? getStorage(app) : ({} as unknown as FirebaseStorage);
// Cloud Functions'daki setGlobalOptions region'ıyla eşleşmeli (functions/src/index.ts)
export const functions = app ? getFunctions(app, "europe-west1") : ({} as unknown as Functions);
export const googleProvider = new GoogleAuthProvider();