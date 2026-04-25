export const MONTHLY_BUDGET_COLLECTION = "monthlyBudget";

export function formatBudgetMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
