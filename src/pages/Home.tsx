import { useMemo, useState } from "react";
import { HomeCalendar, type CalendarViewMode } from "../components/HomeCalendar";
import { useAppContext } from "../context/AppContext";
import { useI18n } from "../i18n";
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
  const { localeTag, messages } = useI18n();
  const {
    state: { transactions },
    deleteTransaction,
  } = useAppContext();

  const [calendarView, setCalendarView] = useState<CalendarViewMode>("day");
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    toYmd(new Date()),
  );
  /** 주간 달력에서 어떤 주를 보여줄지 (selectedDate와 독립) */
  const [weekAnchorYmd, setWeekAnchorYmd] = useState(() => toYmd(new Date()));
  /** 주간·월간에서 달력에서 특정 일을 눌렀을 때만 그날만 필터 */
  const [dayDrillDown, setDayDrillDown] = useState(false);

  const byDate = useMemo(() => aggregateByDate(transactions), [transactions]);

  const handleViewModeChange = (mode: CalendarViewMode) => {
    setDayDrillDown(false);
    if (mode === "week") {
      const anchor = selectedDate ?? weekAnchorYmd ?? toYmd(new Date());
      setWeekAnchorYmd(anchor);
      setCursorMonth(startOfMonth(parseYmd(anchor)));
      setSelectedDate(null);
    } else if (mode === "month") {
      const ref = selectedDate ?? weekAnchorYmd ?? toYmd(new Date());
      setCursorMonth(startOfMonth(parseYmd(ref)));
      setSelectedDate(null);
    } else {
      setSelectedDate((prev) => prev ?? weekAnchorYmd ?? toYmd(new Date()));
    }
    setCalendarView(mode);
  };

  const filteredTransactions = useMemo(() => {
    if (calendarView === "day") {
      const ymd = selectedDate ?? toYmd(new Date());
      return transactions.filter((transaction) => transaction.date === ymd);
    }

    if (calendarView === "week") {
      if (dayDrillDown && selectedDate) {
        return transactions.filter((transaction) => transaction.date === selectedDate);
      }
      const weekSet = new Set(getWeekDateStringsFromYmd(weekAnchorYmd));
      return transactions.filter((transaction) => weekSet.has(transaction.date));
    }

    if (dayDrillDown && selectedDate) {
      return transactions.filter((transaction) => transaction.date === selectedDate);
    }

    return transactions.filter((transaction) =>
      isYmdInMonth(transaction.date, cursorMonth),
    );
  }, [
    transactions,
    calendarView,
    selectedDate,
    cursorMonth,
    dayDrillDown,
    weekAnchorYmd,
  ]);

  const handleSelectDate = (ymd: string) => {
    if (calendarView === "week" || calendarView === "month") {
      if (ymd === selectedDate && dayDrillDown) {
        setDayDrillDown(false);
        setSelectedDate(null);
        return;
      }
      setSelectedDate(ymd);
      setDayDrillDown(true);
      return;
    }
    setSelectedDate(ymd);
  };

  const handleNavigatePrev = () => {
    if (calendarView === "week") {
      setDayDrillDown(false);
      setSelectedDate(null);
      const d = parseYmd(weekAnchorYmd);
      d.setDate(d.getDate() - 7);
      setWeekAnchorYmd(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    if (calendarView === "day") {
      const base = selectedDate ?? toYmd(new Date());
      const d = parseYmd(base);
      d.setDate(d.getDate() - 1);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    setDayDrillDown(false);
    setSelectedDate(null);
    const next = new Date(cursorMonth);
    next.setMonth(next.getMonth() - 1);
    const nextMonth = startOfMonth(next);
    setCursorMonth(nextMonth);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (!window.confirm(messages.transaction.deleteConfirm)) {
      return;
    }
    deleteTransaction(transactionId);
  };

  const handleNavigateNext = () => {
    if (calendarView === "week") {
      setDayDrillDown(false);
      setSelectedDate(null);
      const d = parseYmd(weekAnchorYmd);
      d.setDate(d.getDate() + 7);
      setWeekAnchorYmd(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    if (calendarView === "day") {
      const base = selectedDate ?? toYmd(new Date());
      const d = parseYmd(base);
      d.setDate(d.getDate() + 1);
      setSelectedDate(toYmd(d));
      setCursorMonth(startOfMonth(d));
      return;
    }

    setDayDrillDown(false);
    setSelectedDate(null);
    const next = new Date(cursorMonth);
    next.setMonth(next.getMonth() + 1);
    const nextMonth = startOfMonth(next);
    setCursorMonth(nextMonth);
  };

  const listSubtitle = useMemo(() => {
    if (calendarView === "day") {
      const ymd = selectedDate ?? toYmd(new Date());
      return `${parseYmd(ymd).toLocaleDateString(localeTag, {
        month: "long",
        day: "numeric",
        weekday: "short",
      })} ${messages.transaction.dayTransactions}`;
    }

    if (calendarView === "week") {
      if (dayDrillDown && selectedDate) {
        return `${parseYmd(selectedDate).toLocaleDateString(localeTag, {
          month: "long",
          day: "numeric",
          weekday: "short",
        })} ${messages.transaction.dayTransactions}`;
      }
      return messages.transaction.thisWeekTransactions;
    }

    if (dayDrillDown && selectedDate) {
      return `${parseYmd(selectedDate).toLocaleDateString(localeTag, {
        month: "long",
        day: "numeric",
        weekday: "short",
      })} ${messages.transaction.dayTransactions}`;
    }

    return `${cursorMonth.toLocaleDateString(localeTag, {
      year: "numeric",
      month: "long",
    })} ${messages.transaction.monthTransactions}`;
  }, [calendarView, cursorMonth, dayDrillDown, localeTag, messages.transaction, selectedDate]);

  return (
    <div className="space-y-5">
      <HomeCalendar
        viewMode={calendarView}
        onViewModeChange={handleViewModeChange}
        cursorMonth={cursorMonth}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        selectedDate={selectedDate}
        weekRangeAnchorYmd={weekAnchorYmd}
        onSelectDate={handleSelectDate}
        byDate={byDate}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {messages.transaction.historyTitle}
          </h3>
          <p className="text-sm text-slate-400">{listSubtitle}</p>
        </div>

        <TransactionList
          transactions={filteredTransactions}
          onEdit={onEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      </section>
    </div>
  );
}
