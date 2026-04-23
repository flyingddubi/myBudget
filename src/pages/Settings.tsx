import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { HARDWARE_BACK_EVENT } from "../hardwareBack";
import { InlineNativeAd } from "../components/InlineNativeAd";
import { useAppContext } from "../context/AppContext";
import { useI18n } from "../i18n";
import { backupToJsonString, parseBackupJson } from "../utils/backup";
import { shareBackupJson } from "../utils/shareBackupJson";
import { formatCurrency } from "../utils/formatCurrency";
import { RecurringManageScreen } from "./RecurringManageScreen";

export type SettingsView = "main" | "privacy" | "guide";

type SettingsProps = {
  view: SettingsView;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onBackToMain: () => void;
};

type BackupDialogType = "download" | "import";

const privacyPolicySections = [
  {
    title: "1. 개인정보 수집",
    body: [
      "본 앱은 사용자의 개인정보를 직접 수집하거나 저장하지 않습니다.",
      "앱에서 입력되는 가계부 데이터는 사용자의 기기 내부에만 저장되며, 외부 서버로 전송되지 않습니다.",
    ],
  },
  {
    title: "2. 제3자 서비스 사용",
    body: [
      "본 앱은 광고 제공을 위해 다음과 같은 제3자 서비스를 사용합니다.",
      "Google의 Google AdMob",
      "AdMob은 광고 제공 및 서비스 개선을 위해 다음과 같은 정보를 수집할 수 있습니다.",
    ],
    bullets: [
      "광고 ID",
      "기기 정보",
      "IP 주소",
      "앱 사용 정보",
      "대략적인 위치 정보",
    ],
  },
  {
    title: "3. 데이터 보관",
    body: [
      "본 앱은 사용자의 개인정보를 별도로 수집하거나 서버에 저장하지 않습니다.",
    ],
  },
  {
    title: "4. 어린이 개인정보 보호",
    body: [
      "본 앱은 어린이를 포함한 모든 연령이 사용할 수 있으나, 13세 미만 어린이의 개인정보를 의도적으로 수집하지 않습니다.",
      "또한, 본 앱에서 사용하는 광고 서비스(Google AdMob)는 관련 법규 및 정책에 따라 데이터를 처리할 수 있습니다.",
    ],
  },
  {
    title: "5. 개인정보처리방침 변경",
    body: [
      "본 개인정보처리방침은 필요에 따라 변경될 수 있으며, 변경 시 본 페이지를 통해 안내됩니다.",
    ],
  },
];

const guideImageModules = import.meta.glob("../assets/explain_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const guideImages = Object.entries(guideImageModules)
  .sort(([pathA], [pathB]) => {
    const a = Number(pathA.match(/explain_(\d+)\.png$/)?.[1] ?? 0);
    const b = Number(pathB.match(/explain_(\d+)\.png$/)?.[1] ?? 0);
    return a - b;
  })
  .map(([path, src]) => ({
    src,
    order: Number(path.match(/explain_(\d+)\.png$/)?.[1] ?? 0),
  }));

function SubscreenHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  const { messages } = useI18n();
  return (
    <header className="mb-5 flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition active:scale-[0.98]"
      >
        {messages.settings.backToSettings}
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </header>
  );
}

function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
  const { messages } = useI18n();
  const privacy = messages.settings.privacy;
  return (
    <div className="space-y-5">
      <SubscreenHeader
        title={messages.settings.privacyTitle}
        description={messages.settings.privacyDesc}
        onBack={onBack}
      />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="space-y-5 text-[15px] leading-7 text-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{messages.settings.privacyTitle}</h3>
            <p className="mt-3">{privacy.intro}</p>
          </div>

          {privacy.sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-slate-900">{section.title}</h4>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {"bullets" in section && section.bullets ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {section.bullets.map((bullet: string) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.title === "2. 제3자 서비스 사용" ? (
                  <p>
                    {privacy.detailLink}
                    <br />
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-600 underline underline-offset-2"
                    >
                      https://policies.google.com/privacy
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          <div>
            <h4 className="font-bold text-slate-900">{privacy.inquiryTitle}</h4>
            <div className="mt-2 space-y-2">
              <p>{privacy.inquiryBody}</p>
              <p>{privacy.developer}</p>
              <p>
                {privacy.emailLabel}{" "}
                <a
                  href="mailto:flyingcompany.ko.tw@gmail.com"
                  className="font-semibold text-indigo-600 underline underline-offset-2"
                >
                  flyingcompany.ko.tw@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div className="rounded-[20px] bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-500">{privacy.lastUpdated}</p>
            <p className="mt-1 font-bold text-slate-900">{privacy.lastUpdatedValue}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AppGuideScreen({ onBack }: { onBack: () => void }) {
  const { messages } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const lastIndex = guideImages.length - 1;

  const goToPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(lastIndex, prev + 1));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (startX === null || endX === null) {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
      return;
    }

    goToPrev();
  };

  return (
    <div className="space-y-5">
      <SubscreenHeader
        title={messages.settings.guideTitle}
        description={messages.settings.guideDesc}
        onBack={onBack}
      />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{messages.settings.guideUsage}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {messages.settings.guideUsageDesc}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
            {currentIndex + 1} / {guideImages.length}
          </span>
        </div>

        <div className="space-y-4">
          <div
            className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {guideImages.map((image) => (
                <figure
                  key={image.order}
                  className="w-full shrink-0"
                  aria-hidden={image.order - 1 !== currentIndex}
                >
                  <img
                    src={image.src}
                    alt={`App 설명서 ${image.order}`}
                    loading="lazy"
                    className="h-[min(68vh,640px)] w-full bg-slate-50 object-contain"
                  />
                </figure>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3">
              <button
                type="button"
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-lg font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition disabled:opacity-35"
                aria-label={messages.settings.prevGuideImage}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex === lastIndex}
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-lg font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition disabled:opacity-35"
                aria-label={messages.settings.nextGuideImage}
              >
                ›
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {guideImages.map((image, index) => {
              const active = index === currentIndex;
              return (
                <button
                  key={image.order}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2.5 rounded-full transition ${
                    active ? "w-6 bg-indigo-500" : "w-2.5 bg-slate-300"
                  }`}
                  aria-label={`${image.order}번 설명 이미지 보기`}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export function Settings({
  view,
  menuOpen,
  onCloseMenu,
  onBackToMain,
}: SettingsProps) {
  const { messages } = useI18n();
  const {
    state,
    state: { budget, categories, transactions },
    setBudget,
    addCategory,
    removeCategory,
    resetAllData,
    importBackup,
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftBudget, setDraftBudget] = useState(String(budget));
  const [draftCategory, setDraftCategory] = useState("");
  const [recurringScreenOpen, setRecurringScreenOpen] = useState(false);
  const [backupDialog, setBackupDialog] = useState<BackupDialogType | null>(null);

  useEffect(() => {
    setDraftBudget(String(budget));
  }, [budget]);

  useEffect(() => {
    if (!recurringScreenOpen && !menuOpen && !backupDialog && view === "main") {
      return;
    }
    const onHardwareBack = (e: Event) => {
      if (backupDialog) {
        setBackupDialog(null);
      } else if (recurringScreenOpen) {
        setRecurringScreenOpen(false);
      } else if (menuOpen) {
        onCloseMenu();
      } else if (view !== "main") {
        onBackToMain();
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener(HARDWARE_BACK_EVENT, onHardwareBack);
    return () => window.removeEventListener(HARDWARE_BACK_EVENT, onHardwareBack);
  }, [backupDialog, menuOpen, onBackToMain, onCloseMenu, recurringScreenOpen, view]);

  const usedCategories = useMemo(
    () => new Set(transactions.map((transaction) => transaction.category)),
    [transactions],
  );

  const handleSaveBudget = () => {
    const raw = Number(draftBudget);
    const next = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    setBudget(next);
  };

  const handleAddCategory = () => {
    if (addCategory(draftCategory)) {
      setDraftCategory("");
    }
  };

  const handleResetData = () => {
    const ok = window.confirm(messages.settings.resetConfirm);
    if (!ok) {
      return;
    }
    resetAllData();
  };

  const handleDownloadBackup = async () => {
    const json = backupToJsonString(state);
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await shareBackupJson(json, stamp);
    } catch {
      window.alert(messages.settings.shareError);
    }
  };

  const handlePickImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmBackupDialog = () => {
    const action = backupDialog;
    setBackupDialog(null);
    if (action === "download") {
      void handleDownloadBackup();
      return;
    }
    if (action === "import") {
      handlePickImportFile();
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      window.alert(messages.settings.readFileError);
      return;
    }

    const parsed = parseBackupJson(text);
    if (!parsed) {
      window.alert(messages.settings.invalidJson);
      return;
    }

    importBackup(parsed);
    window.alert(messages.settings.importCompleted);
  };

  if (view === "privacy") {
    return <PrivacyPolicyScreen onBack={onBackToMain} />;
  }

  if (view === "guide") {
    return <AppGuideScreen onBack={onBackToMain} />;
  }

  return (
    <>
      {recurringScreenOpen && (
        <RecurringManageScreen onClose={() => setRecurringScreenOpen(false)} />
      )}
      {backupDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(2rem+var(--sab))] pt-10"
          role="presentation"
          onClick={() => setBackupDialog(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={messages.settings.dialogTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <InlineNativeAd
                alwaysVisible
                minHeight={108}
                className="rounded-[24px]"
                placeholderText="App(Android/iOS) will show an AdMob native ad here."
              />

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {messages.settings.dialogTitle}
                </h3>
                {backupDialog === "download" ? (
                  <p className="text-sm leading-6 text-slate-500">
                    {messages.settings.dialogDownload}
                  </p>
                ) : (
                  <div className="text-sm leading-6 text-slate-500">
                    <p>{messages.settings.dialogImportLine1}</p>
                    <p>{messages.settings.dialogImportLine2}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBackupDialog(null)}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99]"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBackupDialog}
                  className="rounded-[20px] bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
                >
                  {messages.common.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                {messages.settings.monthlyBudget}
              </h3>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                {messages.settings.currentBudgetPrefix} {formatCurrency(budget)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {messages.settings.monthlyBudgetDesc}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-3">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={draftBudget}
                onChange={(event) => setDraftBudget(event.target.value)}
                placeholder="ex: 800000"
                className="min-w-0 flex-1 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleSaveBudget}
                className="rounded-[20px] bg-slate-900 px-5 py-4 text-sm font-semibold text-white"
              >
                {messages.common.save}
              </button>
            </div>
            <p className="text-xs text-slate-400">{messages.transaction.amountHint}</p>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {messages.settings.categoryManagement}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {messages.settings.categoryManagementDesc}
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              placeholder={messages.settings.newCategoryPlaceholder}
              className="min-w-0 flex-1 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded-[20px] bg-indigo-500 px-5 py-4 text-sm font-semibold text-white"
            >
              {messages.settings.add}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {categories.map((category) => {
              const used = usedCategories.has(category);

              return (
                <div
                  key={category}
                  className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {category}
                  </span>
                  <button
                    type="button"
                    disabled={used}
                    onClick={() => removeCategory(category)}
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      used
                        ? "bg-slate-200 text-slate-400"
                        : "bg-white text-rose-500"
                    }`}
                  >
                    {used ? messages.settings.inUse : messages.common.delete}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-0 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={() => setRecurringScreenOpen(true)}
            className="flex w-full items-center justify-between gap-4 rounded-[28px] px-5 py-5 text-left transition active:bg-slate-50"
          >
            <span className="text-base font-bold text-slate-900">
              {messages.settings.recurringManagement}
            </span>
            <span className="text-lg text-slate-300" aria-hidden>
              ›
            </span>
          </button>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {messages.settings.backupRestore}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {messages.settings.backupRestoreDesc}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setBackupDialog("download")}
              className="w-full rounded-[20px] bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99]"
            >
              {messages.settings.downloadJson}
            </button>
            <button
              type="button"
              onClick={() => setBackupDialog("import")}
              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99]"
            >
              {messages.settings.importJson}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-rose-100 bg-rose-50/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {messages.settings.resetData}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {messages.settings.resetDataDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="mt-4 w-full rounded-[20px] border border-rose-200 bg-white px-4 py-4 text-sm font-bold text-rose-600 shadow-sm transition active:scale-[0.99]"
          >
            {messages.settings.deleteAllLocal}
          </button>
        </section>
      </div>
    </>
  );
}
