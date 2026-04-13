import type { Transaction } from "../types";
import { TransactionItem } from "./TransactionItem";

type TransactionListProps = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
};

function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    acc[transaction.date] = [...(acc[transaction.date] ?? []), transaction];
    return acc;
  }, {});
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-base font-semibold text-slate-800">
          아직 기록된 내역이 없어요
        </p>
        <p className="mt-2 text-sm text-slate-400">
          하단의 + 버튼으로 첫 거래를 추가해보세요.
        </p>
      </div>
    );
  }

  const groupedTransactions = groupTransactionsByDate(
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
  );

  return (
    <div className="space-y-5">
      {Object.entries(groupedTransactions).map(([date, items]) => (
        <section key={date}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500">
              {new Date(date).toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </h3>
            <span className="text-xs text-slate-400">{items.length}건</span>
          </div>

          <div className="space-y-3">
            {items.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
