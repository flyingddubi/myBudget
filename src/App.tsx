import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { BottomNav } from "./components/BottomNav";
import { InlineNativeAd } from "./components/InlineNativeAd";
import { useAppContext } from "./context/AppContext";
import { useAuthContext } from "./context/AuthContext";
import { useNoticeCenter } from "./hooks/useNoticeCenter";
import { HARDWARE_BACK_EVENT } from "./hardwareBack";
import { APP_LOCALE_OPTIONS, type AppLocale, useI18n } from "./i18n";
import { Home } from "./pages/Home";
import { Settings, type SettingsView } from "./pages/Settings";
import type { PageKey, RecurringTemplate, Transaction } from "./types";

const EXIT_CONFIRM_MS = 2000;
const Stats = lazy(async () => {
  const module = await import("./pages/Stats");
  return { default: module.Stats };
});

type FabOverlay = "none" | "choose" | "recurring";

function FloatingAddCluster({
  chooseOpen,
  onMainClick,
  onChooseNew,
  onChooseRecurring,
  labels,
}: {
  chooseOpen: boolean;
  onMainClick: () => void;
  onChooseNew: () => void;
  onChooseRecurring: () => void;
  labels: {
    new: string;
    recurring: string;
    closeMenu: string;
    addTransaction: string;
  };
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+var(--sab))] z-[35] mx-auto flex w-full max-w-[420px] justify-end px-5 [transform:translateZ(0)]">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {chooseOpen && (
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={onChooseNew}
                className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
              >
                {labels.new}
              </button>
              <button
                type="button"
                onClick={onChooseRecurring}
                className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
              >
                {labels.recurring}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onMainClick}
            className="grid h-15 w-15 shrink-0 place-items-center rounded-full bg-indigo-500 text-3xl font-light leading-none text-white shadow-[0_18px_30px_rgba(99,102,241,0.4)] transition active:scale-95"
            aria-label={chooseOpen ? labels.closeMenu : labels.addTransaction}
          >
            <span className="-translate-y-[0.06em] leading-none select-none">
              {chooseOpen ? "×" : "+"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { locale, setLocale, messages, formatDate } = useI18n();
  const { user, signOut } = useAuthContext();
  const {
    state: { categories, recurringTemplates },
    addTransaction,
    updateTransaction,
  } = useAppContext();
  const { notices, unreadCount, popupNotice, readNoticeIdSet, markNoticeAsRead, dismissPopupNotice } =
    useNoticeCenter();
  const [currentPage, setCurrentPage] = useState<PageKey>("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
    null,
  );
  const [fabOverlay, setFabOverlay] = useState<FabOverlay>("none");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [prefillRecurring, setPrefillRecurring] = useState<RecurringTemplate | null>(
    null,
  );
  const [exitToast, setExitToast] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const lastBackPressRef = useRef(0);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const backStateRef = useRef({
    modalOpen: false,
    fabOverlay: "none" as FabOverlay,
    logoutDialogOpen: false,
  });

  backStateRef.current.modalOpen = modalOpen;
  backStateRef.current.fabOverlay = fabOverlay;
  backStateRef.current.logoutDialogOpen = logoutDialogOpen;

  useEffect(() => {
    if (currentPage !== "home") {
      setFabOverlay("none");
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== "settings") {
      setSettingsMenuOpen(false);
      setSettingsView("main");
      setLogoutDialogOpen(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!settingsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const clickedMenu = settingsMenuRef.current?.contains(target);
      const clickedButton = settingsMenuButtonRef.current?.contains(target);
      if (!clickedMenu && !clickedButton) {
        setSettingsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    void CapacitorApp.addListener("backButton", async ({ canGoBack }) => {
      const delegated = new CustomEvent(HARDWARE_BACK_EVENT, { cancelable: true });
      window.dispatchEvent(delegated);
      if (delegated.defaultPrevented) {
        return;
      }

      const { modalOpen: open, fabOverlay: fab, logoutDialogOpen: logoutOpen } = backStateRef.current;

      if (open) {
        setModalOpen(false);
        setEditingTransaction(null);
        setPrefillRecurring(null);
        return;
      }

      if (fab === "recurring" || fab === "choose") {
        setFabOverlay("none");
        return;
      }

      if (logoutOpen) {
        setLogoutDialogOpen(false);
        return;
      }

      if (canGoBack) {
        window.history.back();
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_CONFIRM_MS) {
        await CapacitorApp.exitApp();
        return;
      }
      lastBackPressRef.current = now;
      setExitToast(true);
      window.setTimeout(() => setExitToast(false), EXIT_CONFIRM_MS);
    }).then((h) => {
      if (cancelled) {
        void h.remove();
      } else {
        handle = h;
      }
    });

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, []);

  const currentMeta = useMemo(() => {
    if (currentPage !== "settings") {
      return messages.app.pageMeta[currentPage];
    }

    if (settingsView === "privacy") {
      return messages.app.pageMeta.privacy;
    }

    if (settingsView === "guide") {
      return messages.app.pageMeta.guide;
    }

    if (settingsView === "notices") {
      return messages.app.pageMeta.notices;
    }

    return messages.app.pageMeta.settings;
  }, [currentPage, messages.app.pageMeta, settingsView]);

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
        return (
          <Suspense
            fallback={
              <section className="rounded-[28px] bg-white px-5 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-medium text-slate-400">{messages.loading.loading}</p>
              </section>
            }
          >
            <Stats />
          </Suspense>
        );
      case "settings":
        return (
          <Settings
            view={settingsView}
            menuOpen={settingsMenuOpen}
            onCloseMenu={() => setSettingsMenuOpen(false)}
            onBackToMain={() => setSettingsView("main")}
            noticeCenter={{ notices, readNoticeIdSet, markNoticeAsRead }}
          />
        );
      default:
        return null;
    }
  };

  const showSettingsMenuButton =
    currentPage === "settings" && settingsView === "main";
  const showPopupNotice =
    popupNotice !== null && !(currentPage === "settings" && settingsView === "notices");
  const unreadNoticeBadge = unreadCount > 99 ? "99+" : String(unreadCount);
  const currentDateLabel = formatDate(new Date(), {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setLogoutDialogOpen(false);
      setSettingsMenuOpen(false);
    } catch {
      window.alert(messages.settings.logoutError);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
        <div
          id="app-main-scroll"
          className="mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 pb-[calc(7rem+var(--sab))] pt-6 touch-pan-y"
        >
          <header className="relative mb-6 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {currentMeta.title}
                  </h1>
                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
                    {currentDateLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {currentMeta.subtitle}
                </p>
              </div>
              {showSettingsMenuButton ? (
                <button
                  ref={settingsMenuButtonRef}
                  type="button"
                  onClick={() => setSettingsMenuOpen((prev) => !prev)}
                  className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition active:scale-[0.97]"
                  aria-label={
                    settingsMenuOpen
                      ? messages.app.settingsMenu.close
                      : messages.app.settingsMenu.open
                  }
                  aria-expanded={settingsMenuOpen}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                      {unreadNoticeBadge}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
            {showSettingsMenuButton && settingsMenuOpen ? (
              <div
                ref={settingsMenuRef}
                className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[220px] rounded-[28px] bg-white p-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80"
              >
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setSettingsView("notices");
                    }}
                    className="flex w-full items-center justify-between rounded-[20px] bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition active:scale-[0.99]"
                  >
                    <span>{messages.app.settingsMenu.notices}</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 ? (
                        <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-bold leading-none text-white">
                          {unreadNoticeBadge}
                        </span>
                      ) : null}
                      <span className="text-slate-300" aria-hidden>
                        ›
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setSettingsView("privacy");
                    }}
                    className="flex w-full items-center justify-between rounded-[20px] bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition active:scale-[0.99]"
                  >
                    <span>{messages.app.settingsMenu.privacy}</span>
                    <span className="text-slate-300" aria-hidden>
                      ›
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setSettingsView("guide");
                    }}
                    className="flex w-full items-center justify-between rounded-[20px] bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-800 transition active:scale-[0.99]"
                  >
                    <span>{messages.app.settingsMenu.guide}</span>
                    <span className="text-slate-300" aria-hidden>
                      ›
                    </span>
                  </button>
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-left">
                    <p className="text-sm font-semibold text-slate-800">
                      {messages.app.settingsMenu.versionTitle}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {messages.app.settingsMenu.versionLine}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 rounded-[20px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    <span className="text-base leading-none" aria-hidden="true">
                      🌐
                    </span>
                    <select
                      value={locale}
                      onChange={(event) => setLocale(event.target.value as AppLocale)}
                      className="min-w-0 flex-1 rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400"
                      aria-label="Language"
                    >
                      {APP_LOCALE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setLogoutDialogOpen(true);
                    }}
                    className="flex w-full items-center justify-center rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-bold text-rose-600 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                  >
                    {messages.settings.logout}
                  </button>
                </div>
              </div>
            ) : null}
          </header>

          <main>{renderPage()}</main>
        </div>
      </div>

      {createPortal(
        <>
          {currentPage === "home" ? (
            <FloatingAddCluster
              chooseOpen={fabOverlay === "choose"}
              onMainClick={handleFabMainClick}
              onChooseNew={handleChooseNew}
              onChooseRecurring={handleChooseRecurring}
              labels={{
                new: messages.app.fab.new,
                recurring: messages.app.fab.recurring,
                closeMenu: messages.app.fab.closeMenu,
                addTransaction: messages.app.fab.addTransaction,
              }}
            />
          ) : null}
          <BottomNav currentPage={currentPage} onChange={setCurrentPage} />
        </>,
        document.body,
      )}

      {fabOverlay === "recurring" && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(7rem+var(--sab))] pt-10"
          role="presentation"
          onClick={closeFabOverlay}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={messages.app.recurringPicker.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFabOverlay("choose")}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
                >
                  ← {messages.common.back}
                </button>
                <p className="flex-1 text-center text-lg font-bold text-slate-900">
                  {messages.app.recurringPicker.title}
                </p>
                <button
                  type="button"
                  onClick={closeFabOverlay}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500"
                >
                  {messages.common.close}
                </button>
              </div>
              {recurringTemplates.length === 0 ? (
                <p className="rounded-[20px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  {messages.app.recurringPicker.empty}
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
                          {tpl.type === "expense"
                            ? messages.common.expense
                            : messages.common.income}
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

      {logoutDialogOpen ? (
        <div
          className="fixed inset-0 z-[180] flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(2rem+var(--sab))] pt-10"
          role="presentation"
          onClick={() => {
            if (!loggingOut) {
              setLogoutDialogOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={messages.settings.logout}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <InlineNativeAd
                alwaysVisible
                minHeight={108}
                className="rounded-[24px]"
                placeholderText="App(Android/iOS) will show an AdMob native ad here."
              />
              <div className="rounded-[24px] bg-slate-50 px-4 py-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {messages.settings.accountEmail}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {user?.email ?? "-"}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {messages.settings.accountName}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {user?.displayName ?? "-"}
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {messages.settings.logoutDialogQuestion}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLogoutDialogOpen(false)}
                  disabled={loggingOut}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  className="rounded-[20px] bg-rose-500 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {loggingOut ? messages.settings.loggingOut : messages.common.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {exitToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-[calc(8rem+var(--sab))] left-1/2 z-[200] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-full bg-slate-900/92 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
        >
          {messages.app.exitToast}
        </div>
      )}

      {showPopupNotice ? (
        <div
          className="fixed inset-0 z-[190] flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(2rem+var(--sab))] pt-10"
          role="presentation"
          onClick={() => dismissPopupNotice(popupNotice.id)}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={messages.settings.noticePopupTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-600">
                  {messages.settings.noticePopupBadge}
                </span>
                {popupNotice.isPinned ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    {messages.settings.noticePinned}
                  </span>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {popupNotice.publishedAt
                    ? formatDate(popupNotice.publishedAt, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : messages.settings.noticeDateUnknown}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{popupNotice.title}</h2>
              </div>

              <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                {popupNotice.content}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => dismissPopupNotice(popupNotice.id)}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99]"
                >
                  {messages.settings.noticePopupLater}
                </button>
                <button
                  type="button"
                  onClick={() => void markNoticeAsRead(popupNotice.id)}
                  className="rounded-[20px] bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
                >
                  {messages.settings.noticePopupConfirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
