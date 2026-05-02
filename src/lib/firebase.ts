import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB_-jDERcUf05UJlldAxCQnOeuTl9KcUK0",
  authDomain: "calendari-a01d7.firebaseapp.com",
  projectId: "calendari-a01d7",
  storageBucket: "calendari-a01d7.firebasestorage.app",
  messagingSenderId: "553668013103",
  appId: "1:553668013103:web:ddd4d8f081c5d6371a6ada",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
