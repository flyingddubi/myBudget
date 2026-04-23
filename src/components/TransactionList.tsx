import type { Transaction } from "../types";
import { useI18n } from "../i18n";
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
  const { localeTag, messages } = useI18n();
  if (transactions.length === 0) {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-base font-semibold text-slate-800">
          {messages.transaction.noHistoryTitle}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {messages.transaction.noHistoryDesc}
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
              {new Date(date).toLocaleDateString(localeTag, {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </h3>
            <span className="text-xs text-slate-400">
              {items.length}
              {messages.common.countSuffix}
            </span>
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
