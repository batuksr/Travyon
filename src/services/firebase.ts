import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
} catch (error) {
  console.warn("Firebase başlatılamadı. Muhtemelen .env yapılandırması eksik.");
} // Servisleri dışarı aktar
export const auth = app ? getAuth(app) : ({} as any);
export const db = app ? getFirestore(app) : ({} as any);
export const storage = app ? getStorage(app) : ({} as any);
export const googleProvider = new GoogleAuthProvider();