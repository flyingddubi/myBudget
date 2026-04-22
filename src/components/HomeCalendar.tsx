import { useMemo } from "react";
import { formatAmountManUnit, formatCurrency } from "../utils/formatCurrency";
import {
  getWeekDateStringsFromYmd,
  parseYmd,
  sumTotalsForDates,
  toYmd,
  type DayTotals,
} from "../utils/aggregateByDate";

export type CalendarViewMode = "day" | "week" | "month";

type HomeCalendarProps = {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  cursorMonth: Date;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  /** 일간: 항상 날짜. 주간·월간: null이면 달력에 선택 하이라이트 없음 */
  selectedDate: string | null;
  /** 주간 뷰에서 표시할 주(이 날짜가 속한 주) */
  weekRangeAnchorYmd: string;
  onSelectDate: (date: string) => void;
  byDate: Map<string, DayTotals>;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function IncomeExpenseLegend({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${className ?? ""}`}
      role="note"
      aria-label="수입은 초록색, 지출은 빨간색 숫자이며 단위는 만 원입니다"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          수입
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />
          지출
        </span>
      </div>
      <p className="text-[10px] text-slate-400">단위: 만 원</p>
    </div>
  );
}

function getMonthMatrix(anchor: Date): (Date | null)[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function getMonthDateStrings(anchor: Date): string[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, index) =>
    toYmd(new Date(year, month, index + 1)),
  );
}

function MiniDayCell({
  date,
  totals,
  isSelected,
  isToday,
  onSelect,
  compact,
}: {
  date: Date;
  totals: DayTotals | undefined;
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
  compact: boolean;
}) {
  const income = totals?.income ?? 0;
  const expense = totals?.expense ?? 0;
  const fmtIn = formatAmountManUnit(income);
  const fmtOut = formatAmountManUnit(expense);

  const dateCorner = compact ? "left-1.5 top-1.5" : "left-2 top-2";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col items-stretch overflow-visible rounded-2xl border text-left transition active:scale-[0.98] ${
        isSelected
          ? "border-indigo-500 bg-indigo-50 shadow-[0_8px_20px_rgba(99,102,241,0.2)]"
          : "border-slate-100 bg-slate-50/80"
      } ${compact ? "min-h-[52px] p-1.5" : "min-h-[56px] p-2"}`}
    >
      <span
        className={`pointer-events-none absolute ${dateCorner} text-xs font-bold ${
          isToday ? "text-indigo-600" : "text-slate-700"
        }`}
      >
        {date.getDate()}
      </span>
      {isToday ? (
        <span
          className="pointer-events-none absolute right-0 top-0 flex translate-x-1/2 -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full bg-indigo-100 px-[5px] py-px text-[7px] font-semibold leading-none text-indigo-700"
        >
          오늘
        </span>
      ) : null}
      <div
        className={`space-y-px ${compact ? "pt-6 text-[8px] leading-tight" : "pt-7 text-[9px] leading-snug"}`}
      >
        <p className="break-all font-medium tabular-nums text-emerald-600">{fmtIn}</p>
        <p className="break-all font-medium tabular-nums text-rose-600">{fmtOut}</p>
      </div>
    </button>
  );
}

export function HomeCalendar({
  viewMode,
  onViewModeChange,
  cursorMonth,
  onNavigatePrev,
  onNavigateNext,
  selectedDate,
  weekRangeAnchorYmd,
  onSelectDate,
  byDate,
}: HomeCalendarProps) {
  const todayYmd = useMemo(() => toYmd(new Date()), []);

  const dayModeYmd = selectedDate ?? todayYmd;

  const monthLabel = useMemo(
    () =>
      cursorMonth.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
      }),
    [cursorMonth],
  );

  const monthMatrix = useMemo(() => getMonthMatrix(cursorMonth), [cursorMonth]);

  const weekDates = useMemo(
    () => getWeekDateStringsFromYmd(weekRangeAnchorYmd),
    [weekRangeAnchorYmd],
  );

  const monthDateStrings = useMemo(
    () => getMonthDateStrings(cursorMonth),
    [cursorMonth],
  );

  const weekTotals = useMemo(
    () => sumTotalsForDates(byDate, weekDates),
    [byDate, weekDates],
  );

  const monthTotals = useMemo(
    () => sumTotalsForDates(byDate, monthDateStrings),
    [byDate, monthDateStrings],
  );

  const weekRangeLabel = useMemo(() => {
    const start = parseYmd(weekDates[0]!);
    const end = parseYmd(weekDates[6]!);
    const sameMonth = start.getMonth() === end.getMonth();
    const startText = start.toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
    const endText = end.toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
    if (sameMonth) {
      return `${startText} ~ ${endText}`;
    }
    return `${start.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    })} ~ ${end.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    })}`;
  }, [weekDates]);

  const dayDetailLabel = useMemo(() => {
    const d = parseYmd(dayModeYmd);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  }, [dayModeYmd]);

  const selectedDayTotals = useMemo(
    () => byDate.get(dayModeYmd) ?? { income: 0, expense: 0 },
    [byDate, dayModeYmd],
  );

  const navAriaPrev =
    viewMode === "day"
      ? "이전 날"
      : viewMode === "week"
        ? "이전 주"
        : "이전 달";

  const navAriaNext =
    viewMode === "day"
      ? "다음 날"
      : viewMode === "week"
        ? "다음 주"
        : "다음 달";

  const headerTitle =
    viewMode === "day"
      ? dayDetailLabel
      : viewMode === "week"
        ? weekRangeLabel
        : monthLabel;

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">달력</p>
        <div className="flex rounded-2xl bg-slate-100 p-1">
          {(
            [
              { key: "day" as const, label: "일간" },
              { key: "week" as const, label: "주간" },
              { key: "month" as const, label: "월간" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewModeChange(item.key)}
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                viewMode === item.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onNavigatePrev}
          className="flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-slate-100 px-3 text-lg font-semibold text-slate-600"
          aria-label={navAriaPrev}
        >
          ‹
        </button>
        <p className="flex-1 text-center text-sm font-bold leading-snug text-slate-900 sm:text-base">
          {headerTitle}
        </p>
        <button
          type="button"
          onClick={onNavigateNext}
          className="flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-slate-100 px-3 text-lg font-semibold text-slate-600"
          aria-label={navAriaNext}
        >
          ›
        </button>
      </div>

      {viewMode === "week" ? (
        <p className="mt-2 text-center text-xs text-slate-400">{monthLabel}</p>
      ) : null}

      {viewMode === "day" ? (
        <div className="mt-4 rounded-[24px] border border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-5 shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">선택한 하루</p>
            {dayModeYmd === todayYmd ? (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                오늘
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400">수입</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">
                {formatCurrency(selectedDayTotals.income)}
              </p>
            </div>
            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400">지출</p>
              <p className="mt-1 text-lg font-bold text-rose-600">
                {formatCurrency(selectedDayTotals.expense)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-400">
            ‹ › 로 하루씩 이동할 수 있어요.
          </p>
        </div>
      ) : null}

      {viewMode === "month" ? (
        <>
          <IncomeExpenseLegend className="mt-3" />
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-2 space-y-1">
            {monthMatrix.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-7 gap-1">
                {row.map((cell, colIndex) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${rowIndex}-${colIndex}`}
                        className="min-h-[52px] rounded-2xl bg-transparent"
                      />
                    );
                  }

                  const ymd = toYmd(cell);
                  const totals = byDate.get(ymd);
                  const isSelected =
                    selectedDate !== null && ymd === selectedDate;
                  const isToday = ymd === todayYmd;

                  return (
                    <MiniDayCell
                      key={ymd}
                      date={cell}
                      totals={totals}
                      isSelected={isSelected}
                      isToday={isToday}
                      onSelect={() => onSelectDate(ymd)}
                      compact
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </>
      ) : viewMode === "week" ? (
        <div className="mt-4 space-y-3">
          <IncomeExpenseLegend />
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((ymd) => {
              const cell = parseYmd(ymd);
              const totals = byDate.get(ymd);
              const isSelected =
                selectedDate !== null && ymd === selectedDate;
              const isToday = ymd === todayYmd;

              return (
                <MiniDayCell
                  key={ymd}
                  date={cell}
                  totals={totals}
                  isSelected={isSelected}
                  isToday={isToday}
                  onSelect={() => onSelectDate(ymd)}
                  compact={false}
                />
              );
            })}
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">이번 주 합계</p>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-[11px] text-slate-400">수입</p>
                <p className="font-bold text-emerald-600">
                  {formatCurrency(weekTotals.income)}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-[11px] text-slate-400">지출</p>
                <p className="font-bold text-rose-600">
                  {formatCurrency(weekTotals.expense)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {viewMode === "month" ? (
        <div className="mt-3 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">이번 달 합계</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-[11px] text-slate-400">수입</p>
              <p className="font-bold text-emerald-600">
                {formatCurrency(monthTotals.income)}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[11px] text-slate-400">지출</p>
              <p className="font-bold text-rose-600">
                {formatCurrency(monthTotals.expense)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
