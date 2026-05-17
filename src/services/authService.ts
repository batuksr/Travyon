import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

/**
 * Kullanıcı giriş yaptığında (veya kayıt olduğunda) verilerini Firestore'daki
 * 'users' koleksiyonuna kaydeder/günceller.
 */
export const saveUserToFirestore = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Kullanıcı ilk kez giriş yapıyorsa (kayıt)
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      // İleride uygulamanızda toplanacak profil/onboarding verileri de eklenebilir
    });
  } else {
    // Mevcut kullanıcı giriş yaptığında sadece son giriş tarihini/verilerini güncelle
    await setDoc(userRef, {
      lastLogin: serverTimestamp()
    }, { merge: true });
  }
};

/**
 * Google ile giriş yapar ve Firestore'a kaydeder.
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

/**
 * E-posta ve şifre ile yeni kullanıcı kaydı oluşturur ve Firestore'a kaydeder.
 */
export const registerWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch (error) {
    console.error("Email registration error:", error);
    throw error;
  }
};

/**
 * E-posta ve şifre ile giriş yapar ve Firestore'a son giriş tarihini kaydeder.
 */
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch (error) {
    console.error("Email login error:", error);
    throw error;
  }
};

/**
 * Sistemden çıkış yapar.
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};
