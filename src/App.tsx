import { useMemo, useState } from "react";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { BottomNav } from "./components/BottomNav";
import { useAppContext } from "./context/AppContext";
import { Home } from "./pages/Home";
import { Settings } from "./pages/Settings";
import { Stats } from "./pages/Stats";
import type { PageKey, Transaction } from "./types";

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

function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-[420px] px-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="pointer-events-auto h-15 w-15 rounded-full bg-indigo-500 text-3xl font-light text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
          aria-label="거래 추가"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const {
    state: { categories },
    addTransaction,
    updateTransaction,
  } = useAppContext();
  const [currentPage, setCurrentPage] = useState<PageKey>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
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

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
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

      <FloatingAddButton onClick={handleOpenCreate} />

      <BottomNav currentPage={currentPage} onChange={setCurrentPage} />

      <AddTransactionModal
        open={modalOpen}
        categories={categories}
        initialTransaction={editingTransaction}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSubmitTransaction}
      />
    </div>
  );
}
