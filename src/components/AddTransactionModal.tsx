import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RecurringTemplate, Transaction, TransactionType } from "../types";

type AddTransactionModalProps = {
  open: boolean;
  categories: string[];
  initialTransaction: Transaction | null;
  /** 신규 추가 시 설정한 반복 프리셋으로 폼을 채움 (날짜는 오늘) */
  prefillTemplate: RecurringTemplate | null;
  onClose: () => void;
  onSubmit: (transaction: Transaction) => void;
};

type FormState = {
  type: TransactionType;
  amount: string;
  category: string;
  memo: string;
  date: string;
};

function createInitialState(
  categories: string[],
  transaction: Transaction | null,
  prefill: RecurringTemplate | null,
): FormState {
  if (transaction) {
    return {
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category,
      memo: transaction.memo ?? "",
      date: transaction.date,
    };
  }

  if (prefill) {
    const category = categories.includes(prefill.category)
      ? prefill.category
      : (categories[0] ?? "");
    return {
      type: prefill.type,
      amount: String(prefill.amount),
      category,
      memo: prefill.memo ?? "",
      date: new Date().toISOString().slice(0, 10),
    };
  }

  return {
    type: "expense",
    amount: "",
    category: categories[0] ?? "",
    memo: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

export function AddTransactionModal({
  open,
  categories,
  initialTransaction,
  prefillTemplate,
  onClose,
  onSubmit,
}: AddTransactionModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(categories, initialTransaction, prefillTemplate),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createInitialState(categories, initialTransaction, prefillTemplate));
  }, [categories, initialTransaction, open, prefillTemplate]);

  const title = useMemo(
    () => (initialTransaction ? "거래 수정" : "새 거래 추가"),
    [initialTransaction],
  );

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const raw = Number(form.amount);
    if (!Number.isFinite(raw) || raw <= 0 || !form.category || !form.date) {
      return;
    }

    const amount = Math.round(raw);

    onSubmit({
      id: initialTransaction?.id ?? crypto.randomUUID(),
      type: form.type,
      amount,
      category: form.category,
      memo: form.memo.trim(),
      date: form.date,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(1rem+var(--sab))] pt-10">
      <div className="w-full max-w-[420px] rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold text-slate-900">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-light leading-none text-slate-500"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            3단계 안에 빠르게 입력할 수 있게 구성했어요.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: "expense" }))}
              className={`rounded-[20px] px-4 py-3 text-sm font-semibold ${
                form.type === "expense"
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: "income" }))}
              className={`rounded-[20px] px-4 py-3 text-sm font-semibold ${
                form.type === "income"
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
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              placeholder="예: 12500"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none ring-0 transition focus:border-slate-400"
            />
            <p className="mt-2 text-xs text-slate-400">1원 단위까지 입력할 수 있어요.</p>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                카테고리
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-400"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                날짜
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              메모
            </span>
            <textarea
              value={form.memo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, memo: event.target.value }))
              }
              rows={3}
              placeholder="기록을 남기고 싶다면 입력하세요"
              className="w-full resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-[22px] bg-slate-900 px-4 py-4 text-base font-semibold text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition active:scale-[0.99]"
          >
            {initialTransaction ? "거래 저장" : "거래 추가"}
          </button>
        </form>
      </div>
    </div>
  );
}
