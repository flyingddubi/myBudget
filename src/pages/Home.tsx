import { useMemo, useState } from "react";
import { HomeCalendar, type CalendarViewMode } from "../components/HomeCalendar";
import { useAppContext } from "../context/AppContext";
import type { Transaction } from "../types";
import {
  aggregateByDate,
  getWeekDateStringsFromYmd,
  isYmdInMonth,
  parseYmd,
  toYmd,
} from "../utils/aggregateByDate";
import { TransactionList } from "../components/TransactionList";

type HomeProps = {
  onEditTransaction: (transaction: Transaction) => void;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function Home({ onEditTransaction }: HomeProps) {
  const {
    state: { transactions },
    deleteTransaction,
  } = useAppContext();

  const [calendarView, setCalendarView] = useState<CalendarViewMode>("day");
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toYmd(new Date()));

  const byDate = useMemo(() => aggregateByDate(transactions), [transactions]);

  const filteredTransactions = useMemo(() => {
    if (calendarView === "day") {
      return transactions.filter((transaction) => transaction.date === selectedDate);
    }

    if (calendarView === "week") {
      const weekSet = new Set(getWeekDateStringsFromYmd(selectedDate));
      return transactions.filter((transaction) => weekSet.has(transaction.date));
    }

    return transactions.filter((transaction) =>
      isYmdInMonth(transaction.date, cursorMonth),
    );
  }, [transactions, calendarView, selectedDate, cursorMonth]);

  const handleNavigatePrev = () => {
    if (calendarView === "week") {
      const d = parseYmd(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    if (calendarView === "day") {
      const d = parseYmd(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    const next = new Date(cursorMonth);
    next.setMonth(next.getMonth() - 1);
    const nextMonth = startOfMonth(next);
    setCursorMonth(nextMonth);
    if (!isYmdInMonth(selectedDate, nextMonth)) {
      setSelectedDate(toYmd(nextMonth));
    }
  };

  const handleNavigateNext = () => {
    if (calendarView === "week") {
      const d = parseYmd(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    if (calendarView === "day") {
      const d = parseYmd(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    const next = new Date(cursorMonth);
    next.setMonth(next.getMonth() + 1);
    const nextMonth = startOfMonth(next);
    setCursorMonth(nextMonth);
    if (!isYmdInMonth(selectedDate, nextMonth)) {
      setSelectedDate(toYmd(nextMonth));
    }
  };

  const listSubtitle =
    calendarView === "day"
      ? `${parseYmd(selectedDate).toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
          weekday: "short",
        })} 거래`
      : calendarView === "week"
        ? "이번 주 거래"
        : `${cursorMonth.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
          })} 거래`;

  return (
    <div className="space-y-5">
      <HomeCalendar
        viewMode={calendarView}
        onViewModeChange={setCalendarView}
        cursorMonth={cursorMonth}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        byDate={byDate}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">거래 내역</h3>
          <p className="text-sm text-slate-400">{listSubtitle}</p>
        </div>

        <TransactionList
          transactions={filteredTransactions}
          onEdit={onEditTransaction}
          onDelete={deleteTransaction}
        />
      </section>
    </div>
  );
}
