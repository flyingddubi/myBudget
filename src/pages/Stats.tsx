import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "../context/AppContext";
import { useI18n } from "../i18n";
import { StatsBannerAd } from "../components/StatsBannerAd";
import { calculateStats } from "../utils/calculateStats";
import { formatCurrency } from "../utils/formatCurrency";
import { isYmdInMonth } from "../utils/aggregateByDate";
import { buildLast12MonthsFlow } from "../utils/yearlyFlow";
import type { Transaction } from "../types";

const CHART_COLORS = ["#0f172a", "#334155", "#6366f1", "#10b981", "#f97316"];

function formatTooltipValue(
  value: number | string | ReadonlyArray<number | string> | undefined,
) {
  if (Array.isArray(value)) {
    return value.map((item) => formatCurrency(Number(item) || 0)).join(" / ");
  }

  return formatCurrency(Number(value) || 0);
}

function formatYAxisTick(value: number) {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${Math.round(value / 10_000)}만`;
  }
  return String(Math.round(value));
}

function YearlyFlowView({
  transactions,
  onBack,
}: {
  transactions: Transaction[];
  onBack: () => void;
}) {
  const { messages } = useI18n();
  const chartData = useMemo(
    () =>
      buildLast12MonthsFlow(transactions).map((row) => ({
        month: row.monthLabel,
        income: row.income,
        expense: row.expense,
      })),
    [transactions],
  );

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] active:scale-[0.99]"
      >
        <span className="text-lg leading-none">‹</span>
        {messages.common.back}
      </button>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">{messages.stats.yearlyFlow}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {messages.stats.yearlyFlowDesc}
          </p>
        </div>
        <div className="h-[340px] w-full [&_.recharts-wrapper_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_circle:focus]:outline-none [&_path:focus]:outline-none [&_rect:focus]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tickFormatter={formatYAxisTick}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Bar
                dataKey="expense"
                name={messages.common.expense}
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                activeBar={false}
              />
              <Line
                type="monotone"
                dataKey="income"
                name={messages.common.income}
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#f43f5e]" />
            {messages.stats.expenseBar}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-emerald-500" />
            {messages.stats.incomeLine}
          </span>
        </div>
      </section>
    </div>
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function CategoryExpenseDetailView({
  categoryName,
  viewMonth,
  transactions,
  onBack,
}: {
  categoryName: string;
  viewMonth: Date;
  transactions: Transaction[];
  onBack: () => void;
}) {
  const { localeTag, messages } = useI18n();
  const rows = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.category === categoryName &&
          isYmdInMonth(transaction.date, viewMonth),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, categoryName, viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(localeTag, {
    year: "numeric",
    month: "long",
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] active:scale-[0.99]"
      >
        <span className="text-lg leading-none">‹</span>
        {messages.common.back}
      </button>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-slate-500">{monthLabel}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          「{categoryName}」 {messages.stats.categoryExpenseDetailSuffix}
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          {messages.stats.total}{" "}
          <span className="font-bold text-rose-600">{formatCurrency(total)}</span> ·{" "}
          {rows.length}
          {messages.common.countSuffix}
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
          {messages.stats.noCategoryExpense}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">
                    {transaction.memo?.trim() || messages.common.memoNone}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(transaction.date).toLocaleDateString(localeTag, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-rose-600">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stats() {
  const { localeTag, messages } = useI18n();
  const [statsView, setStatsView] = useState<"main" | "yearly">("main");
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const categoryPieWrapRef = useRef<HTMLDivElement>(null);

  /** Recharts 파이 조각 포커스 시 스크롤 보정으로 하단 고정 탭이 튀는 현상 방지 */
  const handleCategoryPieFocusCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (!categoryPieWrapRef.current?.contains(target)) {
        return;
      }
      if (
        target instanceof SVGElement ||
        target.closest(".recharts-wrapper") !== null
      ) {
        (target as HTMLElement).blur();
      }
    },
    [],
  );

  const {
    state: { transactions, budget },
  } = useAppContext();

  const isViewingCurrentMonth = useMemo(() => {
    const n = new Date();
    return (
      viewMonth.getFullYear() === n.getFullYear() &&
      viewMonth.getMonth() === n.getMonth()
    );
  }, [viewMonth]);

  const {
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    categoryBreakdown,
    budgetProgress,
    budgetRemaining,
  } = useMemo(
    () => calculateStats(transactions, budget, viewMonth),
    [transactions, budget, viewMonth],
  );

  const expenseHeading = isViewingCurrentMonth
    ? messages.stats.thisMonthExpense
    : `${viewMonth.toLocaleDateString(localeTag, {
        year: "numeric",
        month: "long",
      })} ${messages.common.expense}`;

  const goPrevMonth = useCallback(() => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const cap = startOfMonth(new Date());
      return next > cap ? prev : next;
    });
  }, []);

  const normalizedProgress = Math.min(Math.max(budgetProgress, 0), 100);
  const budgetExceeded = budget > 0 && monthlyExpenseTotal > budget;

  const compareData = [
    { name: messages.common.income, amount: monthlyIncomeTotal },
    { name: messages.common.expense, amount: monthlyExpenseTotal },
  ];

  if (statsView === "yearly") {
    return (
      <YearlyFlowView
        transactions={transactions}
        onBack={() => setStatsView("main")}
      />
    );
  }

  if (detailCategory !== null) {
    return (
      <CategoryExpenseDetailView
        categoryName={detailCategory}
        viewMonth={viewMonth}
        transactions={transactions}
        onBack={() => setDetailCategory(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold text-white transition hover:bg-white/20 active:scale-95"
            aria-label={messages.stats.prevMonthExpense}
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm text-white/70">{expenseHeading}</p>
            <h2 className="mt-2 text-3xl font-bold">
              {formatCurrency(monthlyExpenseTotal)}
            </h2>
          </div>
          <div className="flex h-11 w-11 shrink-0 justify-end">
            {!isViewingCurrentMonth ? (
              <button
                type="button"
                onClick={goNextMonth}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold text-white transition hover:bg-white/20 active:scale-95"
                aria-label={messages.stats.nextMonthExpense}
              >
                ›
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs text-white/70">{messages.common.income}</p>
            <p className="mt-2 text-lg font-semibold">
              {formatCurrency(monthlyIncomeTotal)}
            </p>
          </div>
          <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs text-white/70">{messages.stats.remainingBudget}</p>
            <p className="mt-2 text-lg font-semibold">
              {formatCurrency(Math.max(budgetRemaining, 0))}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {messages.stats.budgetUsageRate}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {budget > 0 ? `${Math.round(budgetProgress)}%` : messages.stats.budgetUnset}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              budgetExceeded
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {budgetExceeded ? messages.stats.overBudget : messages.stats.withinBudget}
          </div>
        </div>

        <div className="mt-4 h-3 rounded-full bg-slate-100">
          <div
            className={`h-3 rounded-full transition-all ${
              budgetExceeded ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
          <span>{messages.stats.monthlyBudget} {formatCurrency(budget)}</span>
          <span>{messages.stats.used} {formatCurrency(monthlyExpenseTotal)}</span>
        </div>
      </section>

      <StatsBannerAd />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">{messages.stats.categorySpending}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {messages.stats.categorySpendingDesc}
          </p>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="rounded-[20px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
            {messages.stats.noExpenseThisMonth}
          </p>
        ) : (
          <>
            <div
              ref={categoryPieWrapRef}
              className="h-56 touch-manipulation select-none [-webkit-tap-highlight-color:transparent] [&_.recharts-wrapper_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_path:focus]:outline-none [&_path]:outline-none [&_svg_*:focus]:outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
              onFocusCapture={handleCategoryPieFocusCapture}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={4}
                    activeShape={false}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={formatTooltipValue}
                    cursor={{ fill: "transparent" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-3">
              {categoryBreakdown.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setDetailCategory(item.name)}
                  className="flex w-full items-center justify-between rounded-[20px] bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {item.name}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.value)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Math.round(item.percentage)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">{messages.stats.incomeVsExpense}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {messages.stats.incomeVsExpenseDesc}
          </p>
        </div>
        <div
          className="h-60 touch-manipulation select-none [-webkit-tap-highlight-color:transparent] [&_.recharts-wrapper_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_path:focus]:outline-none [&_rect:focus]:outline-none [&_rect]:outline-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={formatTooltipValue}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="amount" radius={[14, 14, 0, 0]} activeBar={false}>
                <Cell fill="#10b981" />
                <Cell fill="#f43f5e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          type="button"
          onClick={() => setStatsView("yearly")}
          className="mt-4 w-full rounded-2xl py-3 text-center text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 active:scale-[0.99]"
        >
          {messages.stats.viewYearlyFlow}
        </button>
      </section>
    </div>
  );
}
