/**
 * lib/firebase.ts
 * Inicialización de Firebase con el SDK modular (v10+).
 * Usa el mismo proyecto que el sitio antiguo (normalis-5587d).
 * Los valores NEXT_PUBLIC_* son seguros para exponer en el cliente.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton — evita re-inicializar en hot-reload de Next.js
const app: FirebaseApp = getApps().length > 0
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const auth: Auth       = getAuth(app);
export const db:   Firestore  = getFirestore(app);
export default app;
