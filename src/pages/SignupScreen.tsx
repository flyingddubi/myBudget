import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import loginBg from "../assets/myBudget_background.png";
import { getFirebaseAuth, isFirebaseConfigured, mapFirebaseAuthError } from "../firebase/client";

type SignupScreenProps = {
  onBack: () => void;
  onSignedUp: () => void;
};

export function SignupScreen({ onBack, onSignedUp }: SignupScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setError(
        "Firebase가 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 만들고 VITE_FIREBASE_* 값을 입력해 주세요.",
      );
      return;
    }

    setPending(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      onSignedUp();
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

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-5 pb-8 pt-10">
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition active:scale-[0.98]"
          >
            ← 로그인
          </button>
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">회원가입</h1>
          <p className="mt-2 text-sm text-slate-600">이메일로 간단히 가입할 수 있어요.</p>
        </header>

        {!isFirebaseConfigured() && (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            Firebase 환경 변수가 없습니다. 콘솔에서 웹 앱을 추가한 뒤 <code className="rounded bg-amber-100 px-1">.env</code>에
            설정 값을 넣어 주세요.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
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
                placeholder="example@email.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호</span>
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/25"
                placeholder="6자 이상"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호 확인</span>
              <input
                type="password"
                name="newPasswordConfirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/25"
                placeholder="비밀번호를 다시 입력하세요"
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
            {pending ? "처리 중…" : "회원가입"}
          </button>
        </form>

        <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-slate-600">
          © {new Date().getFullYear()} myBudget. All rights reserved.
        </p>
      </div>
    </div>
  );
}
