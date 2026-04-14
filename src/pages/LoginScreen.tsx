import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import loginBg from "../assets/myBudget_background.png";
import { getFirebaseAuth, isFirebaseConfigured, mapFirebaseAuthError } from "../firebase/client";

type LoginScreenProps = {
  onLogin: () => void;
  onGoSignup: () => void;
};

export function LoginScreen({ onLogin, onGoSignup }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const auth = getFirebaseAuth();
    if (!auth) {
      setError(
        "Firebase가 설정되지 않았습니다. .env에 VITE_FIREBASE_* 값을 넣고 개발 서버를 다시 실행해 주세요.",
      );
      return;
    }

    setPending(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative isolate min-h-dvh w-full overflow-hidden bg-[#fdfbe2]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-5 pb-8 pt-14">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">myBudget</h1>
          <p className="mt-2 text-sm text-slate-600">가볍게 기록하는 나만의 가계부</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          {!isFirebaseConfigured() && (
            <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              .env에 웹 앱 Firebase 설정이 없으면 로그인할 수 없습니다.
            </p>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">이메일</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/25"
                placeholder="가입한 이메일 주소"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/25"
                placeholder="비밀번호를 입력하세요"
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-2xl bg-indigo-500 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(99,102,241,0.35)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "로그인 중…" : "로그인"}
          </button>

          <div className="mt-5 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={onGoSignup}
              className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
            >
              회원가입
            </button>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <button
              type="button"
              className="font-semibold text-slate-600 underline-offset-2 hover:underline"
            >
              비밀번호 찾기
            </button>
          </div>
        </form>

        <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-slate-600">
          © {new Date().getFullYear()} myBudget. All rights reserved.
        </p>
      </div>
    </div>
  );
}
