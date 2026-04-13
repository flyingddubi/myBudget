import type { CategoryStat, Transaction } from "../types";

function isSameMonth(dateString: string, referenceDate: Date) {
  const date = new Date(dateString);
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

export function calculateStats(
  transactions: Transaction[],
  budget: number,
  /** 집계 기준 월 (기본: 오늘 날짜가 속한 달) */
  referenceMonth: Date = new Date(),
) {
  const currentMonthTransactions = transactions.filter((transaction) =>
    isSameMonth(transaction.date, referenceMonth),
  );

  const monthlyIncomeTotal = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthlyExpenseTotal = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryTotals = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
      return acc;
    }, {});

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
