import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";

export async function registerUser(email: string, password: string, name: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  return credential.user;
}

export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function loginWithApple(): Promise<FirebaseUser> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

// Inicializa o reCAPTCHA invisível (deve ser chamado antes de sendPhoneOtp)
// Recria o elemento DOM a cada chamada para evitar "already rendered" error
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // 1. Limpa instância anterior do Firebase
  if ((window as any)._recaptchaVerifier) {
    try { (window as any)._recaptchaVerifier.clear(); } catch {}
    (window as any)._recaptchaVerifier = null;
  }

  // 2. Recria o elemento DOM do zero (o reCAPTCHA não consegue re-renderizar no mesmo nó)
  const existing = document.getElementById(containerId);
  if (existing) {
    const fresh = document.createElement("div");
    fresh.id = containerId;
    existing.replaceWith(fresh);
  }

  // 3. Cria novo verifier
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  (window as any)._recaptchaVerifier = verifier;
  return verifier;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  } catch (err: any) {
    console.error("[Phone Auth] sendPhoneOtp error:", err?.code, err?.message, err);
    throw err;
  }
}

export async function confirmPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<FirebaseUser> {
  const credential = await confirmationResult.confirm(otp);
  return credential.user;
}

export async function getGoogleRedirectResult(): Promise<FirebaseUser | null> {
  return null;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChanged(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
