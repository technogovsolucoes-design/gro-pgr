import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyB51ndUTK2keEhouS9CQSp46Hp7SlfleXY",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "gro-pgr.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "gro-pgr",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "gro-pgr.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "77895462661",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:77895462661:web:9d1f09afa84ea86181516c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);