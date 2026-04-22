import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/formatCurrency";
import type { RecurringTemplate, TransactionType } from "../types";

type RecurringManageScreenProps = {
  onClose: () => void;
};

export function RecurringManageScreen({ onClose }: RecurringManageScreenProps) {
  const {
    state: { categories, recurringTemplates },
    addRecurringTemplate,
    updateRecurringTemplate,
    removeRecurringTemplate,
  } = useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [recurringName, setRecurringName] = useState("");
  const [recurringType, setRecurringType] = useState<TransactionType>("expense");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState("");
  const [recurringMemo, setRecurringMemo] = useState("");

  useEffect(() => {
    if (!recurringCategory && categories.length > 0) {
      setRecurringCategory(categories[0]);
    }
  }, [categories, recurringCategory]);

  const resetFormForNew = () => {
    setEditingId(null);
    setRecurringName("");
    setRecurringAmount("");
    setRecurringMemo("");
    setRecurringType("expense");
    setRecurringCategory(categories[0] ?? "");
  };

  const loadTemplateForEdit = (tpl: RecurringTemplate) => {
    setEditingId(tpl.id);
    setRecurringName(tpl.name);
    setRecurringType(tpl.type);
    setRecurringAmount(String(tpl.amount));
    setRecurringCategory(tpl.category);
    setRecurringMemo(tpl.memo ?? "");
  };

  const handleSaveRecurringTemplate = () => {
    const name = recurringName.trim();
    const raw = Number(recurringAmount);
    if (!name) {
      window.alert("이름을 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(raw) || raw <= 0) {
      window.alert("금액은 1원 이상으로 입력해 주세요.");
      return;
    }
    const cat = recurringCategory.trim() || categories[0];
    if (!cat) {
      window.alert("카테고리를 먼저 추가해 주세요.");
      return;
    }
    const memo = recurringMemo.trim();
    const payload: RecurringTemplate = {
      id: editingId ?? crypto.randomUUID(),
      name,
      type: recurringType,
      amount: Math.round(raw),
      category: cat,
      ...(memo ? { memo } : {}),
    };
    if (editingId) {
      updateRecurringTemplate(payload);
    } else {
      addRecurringTemplate(payload);
    }
    resetFormForNew();
  };

  return (
    <div
      className="fixed inset-0 z-[45] flex flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-manage-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col px-4 pb-[calc(3rem+var(--bottom-overlay-pad))] pt-6">
        <header className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition active:scale-[0.98]"
          >
            ← 설정
          </button>
          <div className="min-w-0 flex-1">
            <h1
              id="recurring-manage-title"
              className="text-xl font-bold tracking-tight text-slate-900"
            >
              반복 거래 관리
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              홈의 + → 「반복」에서 불러올 항목을 저장합니다. 날짜는 추가 시 오늘로
              채워집니다.
            </p>
          </div>
        </header>

        <div className="space-y-5">
          <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? "반복 항목 수정" : "새 반복 항목"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetFormForNew}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  수정 취소
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  표시 이름
                </span>
                <input
                  type="text"
                  value={recurringName}
                  onChange={(event) => setRecurringName(event.target.value)}
                  placeholder="예: 월세, 구독료"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecurringType("expense")}
                  className={`rounded-[20px] px-4 py-3 text-sm font-semibold ${
                    recurringType === "expense"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  지출
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringType("income")}
                  className={`rounded-[20px] px-4 py-3 text-sm font-semibold ${
                    recurringType === "income"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  수입
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  금액 (원)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={recurringAmount}
                  onChange={(event) => setRecurringAmount(event.target.value)}
                  placeholder="예: 50000"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  카테고리
                </span>
                <select
                  value={recurringCategory || categories[0] || ""}
                  onChange={(event) => setRecurringCategory(event.target.value)}
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  메모 (선택)
                </span>
                <textarea
                  value={recurringMemo}
                  onChange={(event) => setRecurringMemo(event.target.value)}
                  rows={2}
                  placeholder="거래 추가 화면에 자동으로 넣을 메모"
                  className="w-full resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveRecurringTemplate}
                className="w-full rounded-[20px] bg-indigo-500 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
              >
                {editingId ? "변경 저장" : "반복 항목 추가"}
              </button>
            </div>
          </section>

          {recurringTemplates.length > 0 && (
            <section className="mb-[calc(2rem+var(--bottom-overlay-pad))] rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <h2 className="text-base font-bold text-slate-900">저장된 항목</h2>
              <ul className="mt-4 space-y-2">
                {recurringTemplates.map((tpl) => {
                  const memo = tpl.memo?.trim();
                  return (
                  <li
                    key={tpl.id}
                    className="rounded-[20px] bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className="min-w-0 truncate font-semibold text-slate-900"
                        title={tpl.name}
                      >
                        {tpl.name}
                      </p>
                      <p
                        className="max-w-[45%] shrink-0 truncate text-sm font-medium text-slate-600"
                        title={tpl.category}
                      >
                        {tpl.category}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            tpl.type === "expense"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {tpl.type === "expense" ? "지출" : "수입"}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-slate-800">
                          {formatCurrency(tpl.amount)}
                        </span>
                        {memo ? (
                          <span
                            className="min-w-0 truncate text-xs text-slate-500"
                            title={memo}
                          >
                            {memo}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadTemplateForEdit(tpl)}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm("삭제하시겠습니까?")) {
                              return;
                            }
                            if (editingId === tpl.id) {
                              resetFormForNew();
                            }
                            removeRecurringTemplate(tpl.id);
                          }}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-500 shadow-sm"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
