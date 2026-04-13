import type { Transaction } from "../types";

export type YearlyFlowPoint = {
  monthLabel: string;
  income: number;
  expense: number;
};

/**
 * 이번 달 포함 과거 11개월(총 12개월), 시간순(가장 과거 → 이번 달).
 */
export function buildLast12MonthsFlow(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): YearlyFlowPoint[] {
  const months: { ym: string; monthLabel: string }[] = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - offset,
      1,
    );
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
    });
    months.push({ ym, monthLabel });
  }

  const totals = new Map<string, { income: number; expense: number }>();
  for (const { ym } of months) {
    totals.set(ym, { income: 0, expense: 0 });
  }

  for (const transaction of transactions) {
    const ym = transaction.date.slice(0, 7);
    if (!totals.has(ym)) {
      continue;
    }
    const bucket = totals.get(ym)!;
    if (transaction.type === "income") {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += transaction.amount;
    }
  }

  return months.map(({ ym, monthLabel }) => {
    const bucket = totals.get(ym)!;
    return {
      monthLabel,
      income: bucket.income,
      expense: bucket.expense,
    };
  });
}
