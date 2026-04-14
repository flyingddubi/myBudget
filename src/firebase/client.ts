import { FirebaseError, initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() ?? "";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  ...(measurementId ? { measurementId } : {}),
};

export function isFirebaseConfigured(): boolean {
  const c = firebaseConfig;
  return (
    typeof c.apiKey === "string" &&
    c.apiKey.length > 0 &&
    typeof c.authDomain === "string" &&
    c.authDomain.length > 0 &&
    typeof c.projectId === "string" &&
    c.projectId.length > 0 &&
    typeof c.storageBucket === "string" &&
    c.storageBucket.length > 0 &&
    typeof c.messagingSenderId === "string" &&
    c.messagingSenderId.length > 0 &&
    typeof c.appId === "string" &&
    c.appId.length > 0
  );
}

let cachedApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (cachedApp) {
    return cachedApp;
  }
  cachedApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return cachedApp;
}

let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  if (cachedAuth) {
    return cachedAuth;
  }
  cachedAuth = getAuth(app);
  return cachedAuth;
}

let analyticsInitialized = false;

export async function initFirebaseAnalytics(): Promise<void> {
  if (analyticsInitialized || !measurementId) {
    return;
  }
  const app = getFirebaseApp();
  if (!app) {
    return;
  }
  try {
    const supported = await isSupported();
    if (!supported) {
      return;
    }
    getAnalytics(app);
    analyticsInitialized = true;
  } catch {
    /* 일부 환경·광고 차단 시 Analytics 초기화 실패 */
  }
}

export function mapFirebaseAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "이미 가입된 이메일입니다.";
      case "auth/invalid-email":
        return "올바른 이메일 형식이 아닙니다.";
      case "auth/weak-password":
        return "비밀번호가 너무 짧습니다. 6자 이상으로 설정해 주세요.";
      case "auth/operation-not-allowed":
        return "이메일/비밀번호 로그인이 Firebase 콘솔에서 비활성화되어 있습니다.";
      case "auth/network-request-failed":
        return "네트워크 오류입니다. 연결을 확인해 주세요.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "이메일 또는 비밀번호가 올바르지 않습니다.";
      case "auth/user-not-found":
        return "등록되지 않은 이메일입니다.";
      case "auth/user-disabled":
        return "비활성화된 계정입니다.";
      case "auth/too-many-requests":
        return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
      default:
        return err.message || "요청에 실패했습니다.";
    }
  }
  return "알 수 없는 오류가 발생했습니다.";
}
