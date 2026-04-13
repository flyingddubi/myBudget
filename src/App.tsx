import { useMemo, useState } from "react";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { BottomNav } from "./components/BottomNav";
import { useAppContext } from "./context/AppContext";
import { Home } from "./pages/Home";
import { Settings } from "./pages/Settings";
import { Stats } from "./pages/Stats";
import type { PageKey, RecurringTemplate, Transaction } from "./types";

type FabOverlay = "none" | "choose" | "recurring";

const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  home: {
    title: "내 가계부",
    subtitle: "오늘도 가볍게 수입과 지출을 기록해보세요.",
  },
  stats: {
    title: "통계",
    subtitle: "이번 달 돈의 흐름을 한눈에 확인하세요.",
  },
  settings: {
    title: "설정",
    subtitle: "예산과 카테고리를 취향에 맞게 관리하세요.",
  },
};

function FloatingAddCluster({
  chooseOpen,
  onMainClick,
  onChooseNew,
  onChooseRecurring,
}: {
  chooseOpen: boolean;
  onMainClick: () => void;
  onChooseNew: () => void;
  onChooseRecurring: () => void;
}) {
  return (
    <>
      {chooseOpen && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-[28] bg-slate-950/35"
          onClick={onMainClick}
        />
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[35] mx-auto flex w-full max-w-[420px] justify-end px-5">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {chooseOpen && (
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={onChooseNew}
                className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
              >
                신규
              </button>
              <button
                type="button"
                onClick={onChooseRecurring}
                className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
              >
                반복
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onMainClick}
            className="h-15 w-15 rounded-full bg-indigo-500 text-3xl font-light leading-none text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
            aria-label={chooseOpen ? "메뉴 닫기" : "거래 추가"}
          >
            {chooseOpen ? "×" : "+"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const {
    state: { categories, recurringTemplates },
    addTransaction,
    updateTransaction,
  } = useAppContext();
  const [currentPage, setCurrentPage] = useState<PageKey>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
    null,
  );
  const [fabOverlay, setFabOverlay] = useState<FabOverlay>("none");
  const [prefillRecurring, setPrefillRecurring] = useState<RecurringTemplate | null>(
    null,
  );

  const currentMeta = useMemo(() => PAGE_META[currentPage], [currentPage]);

  const handleSubmitTransaction = (transaction: Transaction) => {
    if (editingTransaction) {
      updateTransaction(transaction);
      return;
    }

    addTransaction(transaction);
  };

  const handleFabMainClick = () => {
    if (fabOverlay === "recurring") {
      setFabOverlay("none");
      return;
    }
    if (fabOverlay === "choose") {
      setFabOverlay("none");
      return;
    }
    setEditingTransaction(null);
    setPrefillRecurring(null);
    setFabOverlay("choose");
  };

  const handleChooseNew = () => {
    setPrefillRecurring(null);
    setFabOverlay("none");
    setModalOpen(true);
  };

  const handleChooseRecurring = () => {
    setFabOverlay("recurring");
  };

  const handlePickRecurringTemplate = (template: RecurringTemplate) => {
    setPrefillRecurring(template);
    setFabOverlay("none");
    setModalOpen(true);
  };

  const closeFabOverlay = () => {
    setFabOverlay("none");
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setPrefillRecurring(null);
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Home onEditTransaction={handleEditTransaction} />;
      case "stats":
        return <Stats />;
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto min-h-screen w-full max-w-[420px] px-4 pb-28 pt-6">
        <header className="mb-6">
          <p className="text-sm font-semibold text-indigo-500">
            {new Date().toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {currentMeta.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {currentMeta.subtitle}
          </p>
        </header>

        <main>{renderPage()}</main>
      </div>

      <FloatingAddCluster
        chooseOpen={fabOverlay === "choose"}
        onMainClick={handleFabMainClick}
        onChooseNew={handleChooseNew}
        onChooseRecurring={handleChooseRecurring}
      />

      <BottomNav currentPage={currentPage} onChange={setCurrentPage} />

      {fabOverlay === "recurring" && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 px-4 pb-28 pt-10"
          role="presentation"
          onClick={closeFabOverlay}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label="반복 프리셋 선택"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFabOverlay("choose")}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
                >
                  ← 뒤로
                </button>
                <p className="flex-1 text-center text-lg font-bold text-slate-900">
                  반복 항목
                </p>
                <button
                  type="button"
                  onClick={closeFabOverlay}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500"
                >
                  닫기
                </button>
              </div>
              {recurringTemplates.length === 0 ? (
                <p className="rounded-[20px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  등록된 반복 항목이 없습니다. 설정 탭에서 프리셋을 추가해 주세요.
                </p>
              ) : (
                <ul className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
                  {recurringTemplates.map((tpl) => (
                    <li key={tpl.id}>
                      <button
                        type="button"
                        onClick={() => handlePickRecurringTemplate(tpl)}
                        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4 text-left transition active:scale-[0.99]"
                      >
                        <span className="min-w-0 flex-1 font-semibold text-slate-900">
                          {tpl.name}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                            tpl.type === "expense"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {tpl.type === "expense" ? "지출" : "수입"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <AddTransactionModal
        open={modalOpen}
        categories={categories}
        initialTransaction={editingTransaction}
        prefillTemplate={editingTransaction ? null : prefillRecurring}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
          setPrefillRecurring(null);
        }}
        onSubmit={handleSubmitTransaction}
      />
    </div>
  );
}
