import type { Transaction } from "../types";

export type DayTotals = {
  income: number;
  expense: number;
};

export function aggregateByDate(transactions: Transaction[]) {
  const map = new Map<string, DayTotals>();

  for (const transaction of transactions) {
    const key = transaction.date;
    const current = map.get(key) ?? { income: 0, expense: 0 };

    if (transaction.type === "income") {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }

    map.set(key, current);
  }

  return map;
}

export function sumTotalsForDates(
  byDate: Map<string, DayTotals>,
  dates: string[],
): DayTotals {
  return dates.reduce<DayTotals>(
    (acc, date) => {
      const day = byDate.get(date);
      if (!day) {
        return acc;
      }
      return {
        income: acc.income + day.income,
        expense: acc.expense + day.expense,
      };
    },
    { income: 0, expense: 0 },
  );
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function startOfWeekSunday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getWeekDateStringsFromYmd(ymd: string): string[] {
  const start = startOfWeekSunday(parseYmd(ymd));
  return Array.from({ length: 7 }, (_, index) => toYmd(addDays(start, index)));
}

export function isYmdInMonth(ymd: string, monthAnchor: Date): boolean {
  const d = parseYmd(ymd);
  return (
    d.getFullYear() === monthAnchor.getFullYear() &&
    d.getMonth() === monthAnchor.getMonth()
  );
}
