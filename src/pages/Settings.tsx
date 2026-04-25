import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { HARDWARE_BACK_EVENT } from "../hardwareBack";
import { InlineNativeAd } from "../components/InlineNativeAd";
import { PrivacyPolicyContent } from "../components/PrivacyPolicyContent";
import { useAppContext, useLedgerId } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { useNoticeCenter } from "../hooks/useNoticeCenter";
import { useI18n } from "../i18n";
import { db } from "../firebase";
import { formatCurrency } from "../utils/formatCurrency";
import { MONTHLY_BUDGET_COLLECTION } from "../utils/monthlyBudget";
import { RecurringManageScreen } from "./RecurringManageScreen";

export type SettingsView = "main" | "privacy" | "guide" | "notices";

type SettingsProps = {
  view: SettingsView;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onBackToMain: () => void;
};

type MemberListItem = {
  id: string;
  email: string;
};

type SettingsDialogState =
  | { type: "invite"; email: string }
  | { type: "remove-member"; member: MemberListItem }
  | { type: "leave-ledger" }
  | { type: "delete-ledger" }
  | null;

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

async function deleteCollectionDocuments(collectionPath: string[]) {
  const snapshot = await getDocs(collection(db, collectionPath.join("/")));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

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
  return (
    <div className="space-y-5">
      <SubscreenHeader
        title={messages.settings.privacyTitle}
        description={messages.settings.privacyDesc}
        onBack={onBack}
      />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <PrivacyPolicyContent />
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
  const { user, signOut } = useAuthContext();
  const ledgerId = useLedgerId();
  const {
    state: { budget, categories, transactions },
    setBudget,
    addCategory,
    removeCategory,
  } = useAppContext();
  const [draftBudget, setDraftBudget] = useState(String(budget));
  const [draftCategory, setDraftCategory] = useState("");
  const [recurringScreenOpen, setRecurringScreenOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [dialogState, setDialogState] = useState<SettingsDialogState>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [ledgerOwnerId, setLedgerOwnerId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pendingInviteUserIds, setPendingInviteUserIds] = useState<string[]>([]);
  const [memberList, setMemberList] = useState<MemberListItem[]>([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const { notices, readNoticeIdSet, markNoticeAsRead } = useNoticeCenter();
  const isOwner = Boolean(user?.uid && ledgerOwnerId === user.uid);

  useEffect(() => {
    setDraftBudget(String(budget));
  }, [budget]);

  useEffect(() => {
    if (view !== "notices") {
      setSelectedNoticeId(null);
    }
  }, [view]);

  useEffect(() => {
    if (!recurringScreenOpen && !menuOpen && !dialogState && view === "main") {
      return;
    }
    const onHardwareBack = (e: Event) => {
      if (dialogState && !dialogBusy) {
        setDialogState(null);
      } else if (view === "notices" && selectedNoticeId) {
        setSelectedNoticeId(null);
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
  }, [
    dialogBusy,
    dialogState,
    menuOpen,
    onBackToMain,
    onCloseMenu,
    recurringScreenOpen,
    selectedNoticeId,
    view,
  ]);

  useEffect(() => {
    if (!ledgerId) {
      setLedgerOwnerId("");
      setMemberIds([]);
      setPendingInviteUserIds([]);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "ledgers", ledgerId),
      (snapshot) => {
        const data = snapshot.data();
        setLedgerOwnerId(typeof data?.ownerId === "string" ? data.ownerId : "");
        setMemberIds(
          Array.isArray(data?.members)
            ? data.members.filter((value): value is string => typeof value === "string")
            : [],
        );
        setPendingInviteUserIds(
          Array.isArray(data?.pendingInviteUserIds)
            ? data.pendingInviteUserIds.filter((value): value is string => typeof value === "string")
            : [],
        );
      },
      (error) => {
        console.warn("Failed to subscribe ledger metadata", error);
        setLedgerOwnerId("");
        setMemberIds([]);
        setPendingInviteUserIds([]);
      },
    );

    return unsubscribe;
  }, [ledgerId]);

  useEffect(() => {
    if (!isOwner || memberIds.length === 0) {
      setMemberList([]);
      return;
    }

    let cancelled = false;

    const loadMembers = async () => {
      try {
        const rows = await Promise.all(
          memberIds.map(async (memberId) => {
            const snapshot = await getDoc(doc(db, "users", memberId));
            const data = snapshot.data();
            const email =
              typeof data?.email === "string" && data.email.trim().length > 0
                ? data.email.trim()
                : memberId;
            return {
              id: memberId,
              email,
            } satisfies MemberListItem;
          }),
        );

        if (!cancelled) {
          setMemberList(rows.sort((a, b) => a.email.localeCompare(b.email, "ko")));
        }
      } catch (error) {
        console.warn("Failed to load member list", error);
        if (!cancelled) {
          setMemberList(memberIds.map((id) => ({ id, email: id })));
        }
      }
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [isOwner, memberIds]);

  const usedCategories = useMemo(
    () => new Set(transactions.map((transaction) => transaction.category)),
    [transactions],
  );
  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedNoticeId) ?? null,
    [notices, selectedNoticeId],
  );

  const handleSaveBudget = async () => {
    const raw = Number(draftBudget);
    const next = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    await setBudget(next);
  };

  const handleAddCategory = async () => {
    if (await addCategory(draftCategory)) {
      setDraftCategory("");
    }
  };

  const handleOpenInviteDialog = () => {
    if (!inviteEmail.trim()) {
      window.alert(messages.settings.inviteRequiredEmail);
      return;
    }

    setDialogState({ type: "invite", email: inviteEmail.trim() });
  };

  const handleConfirmInvite = async (requestedEmail: string) => {
    const requesterEmail = user?.email?.trim() ?? "";

    if (!requestedEmail) {
      setDialogBusy(false);
      window.alert(messages.settings.inviteRequiredEmail);
      return;
    }

    if (!user || !requesterEmail || !ledgerId) {
      setDialogBusy(false);
      window.alert(messages.settings.inviteFailed);
      return;
    }

    if (requestedEmail === requesterEmail) {
      setDialogBusy(false);
      window.alert(messages.settings.inviteSelfError);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const targetUsers = await getDocs(query(usersRef, where("email", "==", requestedEmail)));
      const targetUser = targetUsers.docs[0];

      if (!targetUser) {
        window.alert(messages.settings.inviteUserNotFound);
        return;
      }

      const targetUserData = targetUser.data();
      if (typeof targetUserData.selectedLedgerId === "string" && targetUserData.selectedLedgerId) {
        window.alert(messages.settings.inviteUserAlreadyUsing(requestedEmail));
        return;
      }

      await addDoc(collection(db, "ledgers", ledgerId, "invites"), {
        email: requestedEmail,
        invitedBy: requesterEmail,
        status: "요청중",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "ledgers", ledgerId), {
        pendingInviteUserIds: arrayUnion(targetUser.id),
      });

      await setDoc(
        doc(db, "users", targetUser.id),
        {
          requestedBy: requesterEmail,
        },
        { merge: true },
      );

      setDialogState(null);
      setInviteEmail("");
      window.alert(messages.settings.inviteSent);
    } catch (error) {
      console.warn("Failed to send invite", error);
      window.alert(messages.settings.inviteFailed);
    } finally {
      setDialogBusy(false);
    }
  };

  const handleOpenRemoveMemberDialog = (member: MemberListItem) => {
    setDialogState({ type: "remove-member", member });
  };

  const handleConfirmRemoveMember = async (member: MemberListItem) => {
    if (!ledgerId) {
      setDialogBusy(false);
      window.alert(messages.settings.memberRemoveFailed);
      return;
    }

    try {
      await updateDoc(doc(db, "ledgers", ledgerId), {
        members: arrayRemove(member.id),
      });

      await updateDoc(doc(db, "users", member.id), {
        selectedLedgerId: deleteField(),
        requestedBy: deleteField(),
      });

      setDialogState(null);
      window.alert(messages.settings.memberRemoved);
    } catch (error) {
      console.warn("Failed to remove member", error);
      window.alert(messages.settings.memberRemoveFailed);
    } finally {
      setDialogBusy(false);
    }
  };

  const handleOpenLeaveLedgerDialog = () => {
    if (!ledgerId || !user) {
      window.alert(messages.settings.leaveLedgerFailed);
      return;
    }

    if (isOwner) {
      if (memberIds.length > 0) {
        window.alert(messages.settings.ownerLeaveHasMembers);
        return;
      }
      setDialogState({ type: "delete-ledger" });
      return;
    }

    setDialogState({ type: "leave-ledger" });
  };

  const handleConfirmLeaveLedger = async () => {
    if (!ledgerId || !user) {
      setDialogBusy(false);
      window.alert(messages.settings.leaveLedgerFailed);
      return;
    }

    try {
      await updateDoc(doc(db, "ledgers", ledgerId), {
        members: arrayRemove(user.uid),
      });

      await updateDoc(doc(db, "users", user.uid), {
        selectedLedgerId: deleteField(),
        requestedBy: deleteField(),
      });

      setDialogState(null);
    } catch (error) {
      console.warn("Failed to leave ledger", error);
      window.alert(messages.settings.leaveLedgerFailed);
    } finally {
      setDialogBusy(false);
    }
  };

  const handleConfirmDeleteLedger = async () => {
    if (!ledgerId || !user) {
      setDialogBusy(false);
      window.alert(messages.settings.deleteLedgerFailed);
      return;
    }

    try {
      await Promise.all(
        pendingInviteUserIds.map(async (userId) => {
          await updateDoc(doc(db, "users", userId), {
            requestedBy: deleteField(),
          });
        }),
      );

      await Promise.all([
        deleteCollectionDocuments(["ledgers", ledgerId, "transactions"]),
        deleteCollectionDocuments(["ledgers", ledgerId, "recurringTemplates"]),
        deleteCollectionDocuments(["ledgers", ledgerId, "categories"]),
        deleteCollectionDocuments(["ledgers", ledgerId, MONTHLY_BUDGET_COLLECTION]),
        deleteCollectionDocuments(["ledgers", ledgerId, "invites"]),
      ]);

      await deleteDoc(doc(db, "ledgers", ledgerId));

      await updateDoc(doc(db, "users", user.uid), {
        selectedLedgerId: deleteField(),
      });

      setDialogState(null);
    } catch (error) {
      console.warn("Failed to delete ledger", error);
      window.alert(messages.settings.deleteLedgerFailed);
    } finally {
      setDialogBusy(false);
    }
  };

  const handleConfirmDialog = () => {
    if (!dialogState) {
      return;
    }

    setDialogBusy(true);

    if (dialogState.type === "invite") {
      void handleConfirmInvite(dialogState.email);
      return;
    }

    if (dialogState.type === "remove-member") {
      void handleConfirmRemoveMember(dialogState.member);
      return;
    }

    if (dialogState.type === "leave-ledger") {
      void handleConfirmLeaveLedger();
      return;
    }

    void handleConfirmDeleteLedger();
  };

  const formatNoticeDate = (value: Date | null) => {
    if (!value) {
      return messages.settings.noticeDateUnknown;
    }

    return value.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleOpenNotice = (notice: (typeof notices)[number]) => {
    setSelectedNoticeId(notice.id);
    void markNoticeAsRead(notice.id);
  };

  const dialogTitle = useMemo(() => {
    if (!dialogState) {
      return "";
    }

    switch (dialogState.type) {
      case "invite":
        return messages.settings.inviteDialogTitle;
      case "remove-member":
        return messages.settings.memberRemoveDialogTitle;
      case "leave-ledger":
        return messages.settings.leaveLedgerDialogTitle;
      case "delete-ledger":
        return messages.settings.deleteLedgerDialogTitle;
    }
  }, [dialogState, messages.settings]);

  const dialogMessage = useMemo(() => {
    if (!dialogState) {
      return "";
    }

    switch (dialogState.type) {
      case "invite":
        return messages.settings.inviteDialogQuestion(dialogState.email);
      case "remove-member":
        return messages.settings.memberRemoveDialogQuestion(dialogState.member.email);
      case "leave-ledger":
        return messages.settings.leaveLedgerDialogQuestion;
      case "delete-ledger":
        return messages.settings.deleteLedgerDialogQuestion;
    }
  }, [dialogState, messages.settings]);

  const confirmButtonLabel = dialogBusy
    ? messages.settings.processing
    : messages.common.confirm;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      window.alert(messages.settings.logoutError);
    } finally {
      setLoggingOut(false);
    }
  };

  if (view === "privacy") {
    return <PrivacyPolicyScreen onBack={onBackToMain} />;
  }

  if (view === "guide") {
    return <AppGuideScreen onBack={onBackToMain} />;
  }

  if (view === "notices") {
    if (selectedNotice) {
      return (
        <div className="space-y-5">
          <SubscreenHeader
            title={messages.settings.noticeTitle}
            description={messages.settings.noticeDesc}
            onBack={() => setSelectedNoticeId(null)}
          />

          <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {formatNoticeDate(selectedNotice.publishedAt)}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedNotice.title}</h2>
            <div className="mt-5 rounded-[22px] bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
              {selectedNotice.content}
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <SubscreenHeader
          title={messages.settings.noticeTitle}
          description={messages.settings.noticeDesc}
          onBack={onBackToMain}
        />

        {notices.length === 0 ? (
          <section className="rounded-[28px] bg-white px-5 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-medium text-slate-400">{messages.settings.noticeEmpty}</p>
          </section>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => {
              const unread = !readNoticeIdSet.has(notice.id);
              return (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => handleOpenNotice(notice)}
                  className="flex w-full items-center justify-between gap-3 rounded-[24px] bg-white px-5 py-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      {notice.isPinned ? (
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
                          {messages.settings.noticePinned}
                        </span>
                      ) : null}
                      <p className="truncate text-base font-bold text-slate-900">{notice.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatNoticeDate(notice.publishedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {unread ? (
                      <span className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">
                        N
                      </span>
                    ) : null}
                    <span className="text-lg text-slate-300" aria-hidden>
                      ›
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {recurringScreenOpen && (
        <RecurringManageScreen onClose={() => setRecurringScreenOpen(false)} />
      )}
      {dialogState && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 px-4 pb-[calc(2rem+var(--sab))] pt-10"
          role="presentation"
          onClick={() => {
            if (!dialogBusy) {
              setDialogState(null);
            }
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.3)]"
            role="dialog"
            aria-modal="true"
            aria-label={dialogTitle}
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
                <h3 className="text-lg font-bold text-slate-900">{dialogTitle}</h3>
                <p className="text-sm leading-6 text-slate-500">{dialogMessage}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDialogState(null)}
                  disabled={dialogBusy}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDialog}
                  disabled={dialogBusy}
                  className="rounded-[20px] bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {confirmButtonLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-5">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div>
            <h3 className="text-base font-bold text-slate-900">{messages.settings.accountTitle}</h3>
            <p className="mt-1 text-sm text-slate-400">{messages.settings.accountDesc}</p>
          </div>

          <div className="mt-4 space-y-3 rounded-[24px] bg-slate-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {messages.settings.accountEmail}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {user?.email ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {messages.settings.accountName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {user?.displayName ?? "-"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-4 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            {loggingOut ? messages.settings.loggingOut : messages.settings.logout}
          </button>
        </section>

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
                onClick={() => void handleSaveBudget()}
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
                onClick={() => void handleAddCategory()}
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
                    onClick={() => void removeCategory(category)}
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
              {messages.settings.inviteTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {messages.settings.inviteDesc}
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={messages.settings.inviteEmailPlaceholder}
              className="min-w-0 flex-1 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              onClick={handleOpenInviteDialog}
              disabled={dialogBusy}
              className="rounded-[20px] bg-slate-900 px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {dialogBusy && dialogState?.type === "invite"
                ? messages.settings.inviting
                : messages.settings.inviteButton}
            </button>
          </div>
        </section>

        {isOwner ? (
          <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {messages.settings.memberCheckTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {messages.settings.memberCheckDesc}
              </p>
            </div>

            {memberList.length === 0 ? (
              <p className="mt-4 rounded-[20px] bg-slate-50 px-4 py-5 text-sm text-slate-400">
                {messages.settings.memberEmpty}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {memberList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-[22px] bg-slate-50 px-4 py-4"
                  >
                    <p className="min-w-0 flex-1 break-all text-sm font-semibold text-slate-800">
                      {member.email}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenRemoveMemberDialog(member)}
                      disabled={dialogBusy}
                      className="shrink-0 rounded-[16px] bg-rose-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {messages.settings.memberRemoveButton}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="rounded-[28px] border border-rose-100 bg-rose-50/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {messages.settings.leaveLedgerTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {isOwner
                ? messages.settings.leaveLedgerOwnerDesc
                : messages.settings.leaveLedgerMemberDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenLeaveLedgerDialog}
            disabled={dialogBusy}
            className="mt-4 w-full rounded-[20px] border border-rose-200 bg-white px-4 py-4 text-sm font-bold text-rose-600 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            {messages.settings.leaveLedgerButton}
          </button>
        </section>
      </div>
    </>
  );
}
