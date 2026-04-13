import { useMemo, useState } from "react";
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
import { calculateStats } from "../utils/calculateStats";
import { formatCurrency } from "../utils/formatCurrency";
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
        뒤로
      </button>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">연간 흐름</h3>
          <p className="mt-1 text-sm text-slate-400">
            최근 12개월(이번 달 포함) 수입·지출 추이예요.
          </p>
        </div>
        <div className="h-[340px] w-full">
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
                name="지출"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="수입"
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
            지출 (막대)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-emerald-500" />
            수입 (선)
          </span>
        </div>
      </section>
    </div>
  );
}

export function Stats() {
  const [statsView, setStatsView] = useState<"main" | "yearly">("main");
  const {
    state: { transactions, budget },
  } = useAppContext();
  const {
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    categoryBreakdown,
    budgetProgress,
    budgetRemaining,
  } = calculateStats(transactions, budget);

  const normalizedProgress = Math.min(Math.max(budgetProgress, 0), 100);
  const budgetExceeded = budget > 0 && monthlyExpenseTotal > budget;

  const compareData = [
    { name: "수입", amount: monthlyIncomeTotal },
    { name: "지출", amount: monthlyExpenseTotal },
  ];

  if (statsView === "yearly") {
    return (
      <YearlyFlowView
        transactions={transactions}
        onBack={() => setStatsView("main")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <p className="text-sm text-white/70">이번 달 지출</p>
        <h2 className="mt-2 text-3xl font-bold">
          {formatCurrency(monthlyExpenseTotal)}
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs text-white/70">수입</p>
            <p className="mt-2 text-lg font-semibold">
              {formatCurrency(monthlyIncomeTotal)}
            </p>
          </div>
          <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
            <p className="text-xs text-white/70">남은 예산</p>
            <p className="mt-2 text-lg font-semibold">
              {formatCurrency(Math.max(budgetRemaining, 0))}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">예산 사용률</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {budget > 0 ? `${Math.round(budgetProgress)}%` : "예산 미설정"}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              budgetExceeded
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {budgetExceeded ? "예산 초과" : "예산 내 사용 중"}
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
          <span>월 예산 {formatCurrency(budget)}</span>
          <span>사용 {formatCurrency(monthlyExpenseTotal)}</span>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">카테고리별 소비</h3>
          <p className="mt-1 text-sm text-slate-400">
            이번 달 지출을 카테고리 기준으로 나눠봤어요.
          </p>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="rounded-[20px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
            아직 이번 달 지출 데이터가 없어요.
          </p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={84}
                    paddingAngle={4}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatTooltipValue} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-3">
              {categoryBreakdown.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-[20px] bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.value)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Math.round(item.percentage)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">수입 vs 지출</h3>
          <p className="mt-1 text-sm text-slate-400">
            이번 달 흐름을 한 번에 볼 수 있어요.
          </p>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="amount" radius={[14, 14, 0, 0]}>
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
          연간 흐름 보기
        </button>
      </section>
    </div>
  );
}
