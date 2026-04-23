import type { Transaction } from "../types";
import { useI18n } from "../i18n";
import { formatCurrency } from "../utils/formatCurrency";

type TransactionItemProps = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
};

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const { messages } = useI18n();
  const isIncome = transaction.type === "income";

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                isIncome
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isIncome ? messages.common.income : messages.common.expense}
            </span>
            <span className="text-sm font-medium text-slate-500">
              {transaction.category}
            </span>
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {transaction.memo?.trim() || messages.common.memoNone}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              isIncome ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
            >
              {messages.common.edit}
            </button>
            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600"
            >
              {messages.common.delete}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
