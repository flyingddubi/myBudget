import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { FirebaseError } from "firebase/app";
import { PrivacyPolicyContent } from "../components/PrivacyPolicyContent";
import { useAuthContext } from "../context/AuthContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useI18n } from "../i18n";

type AuthMode = "login" | "signup";
const LAST_EMAIL_STORAGE_KEY = "budget-auth-last-email";

function mapFirebaseAuthError(error: unknown, fallbackMessage: string) {
  const code = (error as FirebaseError | undefined)?.code;

  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/missing-password":
      return "비밀번호를 입력해 주세요.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/email-already-in-use":
      return "이미 가입된 이메일입니다.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다.";
    case "auth/network-request-failed":
      return "네트워크 상태를 확인한 뒤 다시 시도해 주세요.";
    case "auth/popup-closed-by-user":
      return "구글 로그인 창이 닫혔습니다. 다시 시도해 주세요.";
    case "auth/cancelled-popup-request":
      return "이미 로그인 창이 열려 있습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/popup-blocked":
      return "브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.";
    case "auth/account-exists-with-different-credential":
      return "같은 이메일로 다른 로그인 방식이 이미 연결되어 있습니다.";
    default:
      return fallbackMessage;
  }
}

export function AuthScreen() {
  const { locale, setLocale, messages } = useI18n();
  const { signIn, signInWithGoogle, signUp } = useAuthContext();
  const [savedEmail, setSavedEmail] = useLocalStorage<string>(LAST_EMAIL_STORAGE_KEY, "");
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState(savedEmail);
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState(savedEmail);
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    setLoginEmail((prev) => prev || savedEmail);
    setSignupEmail((prev) => prev || savedEmail);
  }, [savedEmail]);

  const activeTitle = useMemo(
    () => (mode === "login" ? messages.auth.loginTitle : messages.auth.signupTitle),
    [messages.auth.loginTitle, messages.auth.signupTitle, mode],
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setErrorMessage(messages.auth.requiredLogin);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await signIn(email, loginPassword);
      setSavedEmail(email);
      setLoginPassword("");
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error, messages.auth.loginFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = signupEmail.trim();
    const name = signupName.trim();
    if (!email || !name || !signupPassword || !signupConfirmPassword) {
      setErrorMessage(messages.auth.requiredSignup);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage(messages.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await signUp({
        email,
        name,
        password: signupPassword,
      });
      setSavedEmail(email);
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error, messages.auth.signupFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error, messages.auth.googleAuthFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6">
      <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-start sm:justify-center">
        <div className="rounded-[32px] bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
          <div className="mb-6">
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {messages.auth.languageLabel}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setLocale("ko")}
                  className={`rounded-[16px] px-3 py-3 text-left transition ${
                    locale === "ko"
                      ? "bg-white shadow-sm ring-1 ring-slate-200"
                      : "bg-transparent"
                  }`}
                >
                  <p className="text-lg leading-none">🇰🇷</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {messages.auth.languageKo}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("zh-TW")}
                  className={`rounded-[16px] px-3 py-3 text-left transition ${
                    locale === "zh-TW"
                      ? "bg-white shadow-sm ring-1 ring-slate-200"
                      : "bg-transparent"
                  }`}
                >
                  <p className="text-lg leading-none">🇹🇼</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {messages.auth.languageZhTw}
                  </p>
                </button>
              </div>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {activeTitle} <span className="text-sm font-semibold text-indigo-600"> - {messages.auth.brand}</span>
            </h1>
          </div>

          {mode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.emailLabel}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder={messages.auth.emailPlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.passwordLabel}
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder={messages.auth.passwordPlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              {errorMessage ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[20px] bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? messages.auth.loggingIn : messages.auth.loginButton}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleAuth}
                className="flex w-full items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  G
                </span>
                <span>{messages.auth.googleLoginButton}</span>
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.emailLabel}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder={messages.auth.emailPlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.nameLabel}
                </span>
                <input
                  type="text"
                  autoComplete="nickname"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  placeholder={messages.auth.namePlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.passwordLabel}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  placeholder={messages.auth.passwordPlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {messages.auth.passwordConfirmLabel}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signupConfirmPassword}
                  onChange={(event) => setSignupConfirmPassword(event.target.value)}
                  placeholder={messages.auth.passwordConfirmPlaceholder}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </label>

              {errorMessage ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[20px] bg-indigo-500 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? messages.auth.signingUp : messages.auth.signupButton}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleAuth}
                className="flex w-full items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  G
                </span>
                <span>{messages.auth.googleSignupButton}</span>
              </button>
            </form>
          )}

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage("");
                }}
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99]"
              >
                {messages.auth.openSignup}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage("");
                }}
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99]"
              >
                {messages.auth.backToLogin}
              </button>
            )}

            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="w-full text-sm font-medium text-slate-500 underline underline-offset-2"
            >
              {messages.auth.privacyLink}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs tracking-wide text-slate-400">flyingCompany</p>
      </div>

      {privacyOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 pb-6 pt-12"
          role="presentation"
          onClick={() => setPrivacyOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={messages.auth.privacyLink}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{messages.settings.privacyTitle}</h2>
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
              >
                {messages.common.close}
              </button>
            </div>
            <PrivacyPolicyContent />
          </div>
        </div>
      ) : null}
    </div>
  );
}
