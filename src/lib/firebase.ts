import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAVXqy-qPsFJEV0lgJ6GnsgmSoPUMac2SI",
  authDomain: "calendario-34edb.firebaseapp.com",
  projectId: "calendario-34edb",
  storageBucket: "calendario-34edb.firebasestorage.app",
  messagingSenderId: "297841465410",
  appId: "1:297841465410:web:930c0ba96678a30584f5db",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
