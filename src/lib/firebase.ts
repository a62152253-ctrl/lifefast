import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: "AIzaSyAb8SPI8SKNsRiHsh0AQdTGoAaiTR22qkk",
  authDomain: "ai-studio-applet-webapp-ff4dd.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-ff4dd",
  storageBucket: "ai-studio-applet-webapp-ff4dd.firebasestorage.app",
  messagingSenderId: "492152329442",
  appId: "1:492152329442:web:fc4f7909ab18bf26ba7abb",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

const FIRESTORE_DB_ID =
  import.meta.env.VITE_FIREBASE_DB_ID || "ai-studio-706c02b6-48a9-412e-967a-5b843ea607fd";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_DB_ID);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error.code !== 'auth/cancelled-popup-request') throw error;
  }
};

export const logout = () => signOut(auth);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const isFirebaseInitialized = true;
export const firebaseInitError = null;
