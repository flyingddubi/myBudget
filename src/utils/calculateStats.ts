import type { CategoryStat, Transaction } from "../types";

function toMonthKey(referenceDate: Date) {
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${referenceDate.getFullYear()}-${month}`;
}

export function calculateStats(
  transactions: Transaction[],
  budget: number,
  /** 집계 기준 월 (기본: 오늘 날짜가 속한 달) */
  referenceMonth: Date = new Date(),
) {
  const monthKey = toMonthKey(referenceMonth);
  const currentMonthTransactions: Transaction[] = [];
  let monthlyIncomeTotal = 0;
  let monthlyExpenseTotal = 0;
  const categoryTotals: Record<string, number> = {};

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(monthKey)) {
      continue;
    }

    currentMonthTransactions.push(transaction);
    if (transaction.type === "income") {
      monthlyIncomeTotal += transaction.amount;
      continue;
    }

    monthlyExpenseTotal += transaction.amount;
    categoryTotals[transaction.category] =
      (categoryTotals[transaction.category] ?? 0) + transaction.amount;
  }

  const categoryBreakdown: CategoryStat[] = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: monthlyExpenseTotal === 0 ? 0 : (value / monthlyExpenseTotal) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  const budgetProgress = budget > 0 ? (monthlyExpenseTotal / budget) * 100 : 0;

  return {
    currentMonthTransactions,
    monthlyIncomeTotal,
    monthlyExpenseTotal,
    monthlyNetTotal: monthlyIncomeTotal - monthlyExpenseTotal,
    categoryBreakdown,
    budgetProgress,
    budgetRemaining: budget - monthlyExpenseTotal,
  };
}
