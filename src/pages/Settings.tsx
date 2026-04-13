import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { backupToJsonString, parseBackupJson } from "../utils/backup";
import { formatCurrency } from "../utils/formatCurrency";

export function Settings() {
  const {
    state,
    state: { budget, categories, transactions },
    setBudget,
    addCategory,
    removeCategory,
    resetAllData,
    importBackup,
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftBudget, setDraftBudget] = useState(String(budget));
  const [draftCategory, setDraftCategory] = useState("");

  useEffect(() => {
    setDraftBudget(String(budget));
  }, [budget]);

  const usedCategories = useMemo(
    () => new Set(transactions.map((transaction) => transaction.category)),
    [transactions],
  );

  const handleSaveBudget = () => {
    const raw = Number(draftBudget);
    const next = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    setBudget(next);
  };

  const handleAddCategory = () => {
    if (addCategory(draftCategory)) {
      setDraftCategory("");
    }
  };

  const handleResetData = () => {
    const ok = window.confirm(
      "모든 거래·예산 설정을 지우고 기본 카테고리만 남길까요?\n이 작업은 되돌릴 수 없습니다.",
    );
    if (!ok) {
      return;
    }
    resetAllData();
  };

  const handleDownloadBackup = () => {
    const json = backupToJsonString(state);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `가계부-백업-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePickImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      window.alert("파일을 읽을 수 없습니다.");
      return;
    }

    const parsed = parseBackupJson(text);
    if (!parsed) {
      window.alert(
        "JSON 형식이 맞지 않습니다. 이 앱에서 내려받은 백업 파일인지 확인해 주세요.",
      );
      return;
    }

    const ok = window.confirm(
      "현재 앱에 있는 거래·카테고리·예산이 모두 이 파일 내용으로 바뀝니다. 계속할까요?",
    );
    if (!ok) {
      return;
    }

    importBackup(parsed);
    window.alert("가져오기가 완료되었습니다.");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">월 예산</h3>
            <p className="mt-1 text-sm text-slate-400">
              이번 달 목표 예산을 설정해보세요.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
            현재 {formatCurrency(budget)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-3">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={draftBudget}
              onChange={(event) => setDraftBudget(event.target.value)}
              placeholder="예: 800000"
              className="min-w-0 flex-1 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              onClick={handleSaveBudget}
              className="rounded-[20px] bg-slate-900 px-5 py-4 text-sm font-semibold text-white"
            >
              저장
            </button>
          </div>
          <p className="text-xs text-slate-400">1원 단위까지 입력할 수 있어요.</p>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div>
          <h3 className="text-base font-bold text-slate-900">카테고리 관리</h3>
          <p className="mt-1 text-sm text-slate-400">
            사용 중인 카테고리는 삭제가 잠겨 있어요.
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={draftCategory}
            onChange={(event) => setDraftCategory(event.target.value)}
            placeholder="새 카테고리 입력"
            className="min-w-0 flex-1 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            className="rounded-[20px] bg-indigo-500 px-5 py-4 text-sm font-semibold text-white"
          >
            추가
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {categories.map((category) => {
            const used = usedCategories.has(category);

            return (
              <div
                key={category}
                className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3"
              >
                <span className="text-sm font-semibold text-slate-700">
                  {category}
                </span>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => removeCategory(category)}
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    used
                      ? "bg-slate-200 text-slate-400"
                      : "bg-white text-rose-500"
                  }`}
                >
                  {used ? "사용 중" : "삭제"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div>
          <h3 className="text-base font-bold text-slate-900">백업 · 복원</h3>
          <p className="mt-1 text-sm text-slate-400">
            거래 내역·카테고리·월 예산을 JSON 파일로 저장하거나, 같은 형식의
            파일을 불러올 수 있어요.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full rounded-[20px] bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
          >
            전체 데이터 내려받기 (JSON)
          </button>
          <button
            type="button"
            onClick={handlePickImportFile}
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99]"
          >
            JSON 파일에서 가져오기
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-rose-100 bg-rose-50/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div>
          <h3 className="text-base font-bold text-slate-900">데이터 초기화</h3>
          <p className="mt-1 text-sm text-slate-500">
            브라우저에 저장된 가계부 데이터(거래, 예산)를 모두 지웁니다. 기본
            카테고리 목록은 유지됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetData}
          className="mt-4 w-full rounded-[20px] border border-rose-200 bg-white px-4 py-4 text-sm font-bold text-rose-600 shadow-sm transition active:scale-[0.99]"
        >
          로컬 데이터 전체 삭제
        </button>
      </section>
    </div>
  );
}
