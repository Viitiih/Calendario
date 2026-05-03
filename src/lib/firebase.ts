import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// Habilita persistência offline — dados ficam no IndexedDB
// Operações feitas sem internet são enfileiradas e sincronizadas quando a conexão voltar
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Múltiplas abas abertas — persistência só funciona em uma aba por vez
    console.warn("[Offline] Persistência desabilitada: múltiplas abas abertas.");
  } else if (err.code === "unimplemented") {
    // Browser não suporta (raro em 2024)
    console.warn("[Offline] Browser não suporta persistência offline.");
  }
});
