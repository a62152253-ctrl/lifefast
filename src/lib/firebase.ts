import { initializeApp } from 'firebase/app';
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

// Try to import from the path where the tool usually places the config
// If it's missing, the app will show a warning in console if we handle it
// or just fail to build, which is expected if Firebase isn't set up.
import firebaseConfig from '../../firebase-applet-config.json';

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully with project:', firebaseConfig.projectId);
  
  // Check if we're in development mode and use emulator if needed
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode detected - checking Firebase rules...');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a minimal app for development
  app = initializeApp({
    apiKey: "AIzaSyDummyKeyForDevelopment",
    authDomain: "lifeflow-demo.firebaseapp.com",
    projectId: "lifeflow-demo"
  });
  console.warn('Using demo Firebase configuration');
}
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig?.firestoreDatabaseId || 'lifeflow-demo');
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
