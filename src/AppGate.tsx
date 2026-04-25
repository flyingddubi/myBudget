import { type User } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
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
import { useEffect, useMemo, useState } from "react";
import App from "./App";
import { AuthScreen } from "./pages/AuthScreen";
import { AppProvider } from "./context/AppContext";
import { useAuthContext } from "./context/AuthContext";
import { useI18n } from "./i18n";
import { LoadingScreen } from "./pages/LoadingScreen";
import { db } from "./firebase";
import { LedgerSelectionScreen } from "./pages/LedgerSelectionScreen";

type Phase = "loading" | "main";
type BusyAction = "none" | "create" | "accept";
type LedgerRef = {
  id: string;
  ownerId: string;
};
type InviteLedger = LedgerRef & {
  inviteId: string;
  ownerName: string;
  invitedBy: string;
};

const LOADING_MS = 2000;

function dedupeLedgers(items: LedgerRef[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function AppWithLedger({
  user,
  ledgerId,
}: {
  user: User;
  ledgerId: string;
}) {
  return (
    <AppProvider ledgerId={ledgerId}>
      <App />
    </AppProvider>
  );
}

export function AppGate() {
  const { user, loading } = useAuthContext();
  const { messages } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>("none");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerErrorMessage, setLedgerErrorMessage] = useState("");
  const [accessibleLedgers, setAccessibleLedgers] = useState<LedgerRef[]>([]);
  const [inviteLedgers, setInviteLedgers] = useState<InviteLedger[]>([]);
  const [requestedBy, setRequestedBy] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("main"), LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!user) {
      setSelectedLedgerId("");
      setRequestedBy("");
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const data = snapshot.data();
        const nextSelectedLedgerId = data?.selectedLedgerId;
        const nextRequestedBy = data?.requestedBy;
        setSelectedLedgerId(typeof nextSelectedLedgerId === "string" ? nextSelectedLedgerId : "");
        setRequestedBy(typeof nextRequestedBy === "string" ? nextRequestedBy : "");
      },
      (error) => {
        console.warn("Failed to subscribe selected ledger", error);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAccessibleLedgers([]);
      setInviteLedgers([]);
      setLedgerErrorMessage("");
      setLedgerLoading(false);
      return;
    }

    let cancelled = false;

    const loadLedgers = async () => {
      setLedgerLoading(true);
      setLedgerErrorMessage("");

      try {
        const ledgersRef = collection(db, "ledgers");
        const [ownedSnapshot, memberSnapshot, inviteSnapshot] = await Promise.all([
          getDocs(query(ledgersRef, where("ownerId", "==", user.uid))),
          getDocs(query(ledgersRef, where("members", "array-contains", user.uid))),
          getDocs(query(ledgersRef, where("pendingInviteUserIds", "array-contains", user.uid))),
        ]);

        if (cancelled) {
          return;
        }

        const nextAccessible = dedupeLedgers([
          ...ownedSnapshot.docs.map((item) => ({
            id: item.id,
            ownerId: String(item.data().ownerId ?? ""),
          })),
          ...memberSnapshot.docs.map((item) => ({
            id: item.id,
            ownerId: String(item.data().ownerId ?? ""),
          })),
        ]);

        const nextInvites = (
          await Promise.all(
            inviteSnapshot.docs.map(async (item) => {
              const ownerId = String(item.data().ownerId ?? "");
              if (!user.email) {
                return null;
              }

              const inviteDocs = await getDocs(
                query(collection(db, "ledgers", item.id, "invites"), where("email", "==", user.email)),
              );
              const pendingInviteDoc =
                inviteDocs.docs.find((inviteDoc) => inviteDoc.data().status === "요청중") ?? null;

              if (!pendingInviteDoc) {
                return null;
              }

              const pendingInviteData = pendingInviteDoc.data();
              const invitedBy =
                typeof pendingInviteData.invitedBy === "string"
                  ? pendingInviteData.invitedBy.trim()
                  : "";
              const ownerSnapshot = ownerId ? await getDoc(doc(db, "users", ownerId)) : null;
              const ownerData = ownerSnapshot?.data();
              const ownerName =
                invitedBy ||
                (typeof ownerData?.name === "string" && ownerData.name.trim().length > 0
                  ? ownerData.name.trim()
                  : typeof ownerData?.email === "string" && ownerData.email.trim().length > 0
                    ? ownerData.email.trim()
                    : "Unknown");

              return {
                id: item.id,
                ownerId,
                inviteId: pendingInviteDoc.id,
                ownerName,
                invitedBy,
              } satisfies InviteLedger;
            }),
          )
        ).filter((item): item is InviteLedger => item !== null && Boolean(item.ownerId));

        setAccessibleLedgers(nextAccessible);
        setInviteLedgers(nextInvites);

        if (!selectedLedgerId && nextAccessible[0]?.id) {
          void setDoc(
            doc(db, "users", user.uid),
            { selectedLedgerId: nextAccessible[0].id },
            { merge: true },
          );
        }
      } catch (error) {
        console.warn("Failed to load ledgers", error);
        if (!cancelled) {
          setLedgerErrorMessage(messages.ledgerSelect.failed);
        }
      } finally {
        if (!cancelled) {
          setLedgerLoading(false);
        }
      }
    };

    void loadLedgers();

    return () => {
      cancelled = true;
    };
  }, [requestedBy, selectedLedgerId, user]);

  const activeLedgerId = useMemo(() => {
    if (!selectedLedgerId) {
      return "";
    }

    return accessibleLedgers.some((item) => item.id === selectedLedgerId) ? selectedLedgerId : "";
  }, [accessibleLedgers, selectedLedgerId]);

  const handleCreateLedger = async () => {
    if (!user) {
      return;
    }

    setBusyAction("create");
    setLedgerErrorMessage("");
    try {
      const created = await addDoc(collection(db, "ledgers"), {
        ownerId: user.uid,
        members: [],
        pendingInviteUserIds: [],
        createdAt: serverTimestamp(),
      });

      setAccessibleLedgers((prev) =>
        dedupeLedgers([...prev, { id: created.id, ownerId: user.uid }]),
      );
      await setDoc(doc(db, "users", user.uid), { selectedLedgerId: created.id }, { merge: true });
    } catch (error) {
      console.warn("Failed to create ledger", error);
      setLedgerErrorMessage(messages.ledgerSelect.failed);
    } finally {
      setBusyAction("none");
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      return;
    }

    let invite: InviteLedger | null = inviteLedgers[0] ?? null;
    if (!invite && user.email) {
      try {
        const pendingLedgers = await getDocs(
          query(collection(db, "ledgers"), where("pendingInviteUserIds", "array-contains", user.uid)),
        );
        const resolvedInvite = await Promise.all(
          pendingLedgers.docs.map(async (item) => {
            const ownerId = String(item.data().ownerId ?? "");
            const inviteDocs = await getDocs(
              query(collection(db, "ledgers", item.id, "invites"), where("email", "==", user.email)),
            );
            const pendingInviteDoc =
              inviteDocs.docs.find((inviteDoc) => inviteDoc.data().status === "요청중") ?? null;

            if (!pendingInviteDoc) {
              return null;
            }

            const pendingInviteData = pendingInviteDoc.data();
            const invitedBy =
              typeof pendingInviteData.invitedBy === "string"
                ? pendingInviteData.invitedBy.trim()
                : "";

            return {
              id: item.id,
              ownerId,
              inviteId: pendingInviteDoc.id,
              ownerName: invitedBy || requestedBy || "Unknown",
              invitedBy,
            } satisfies InviteLedger;
          }),
        );

        invite = resolvedInvite.find((item): item is InviteLedger => item !== null) ?? null;
      } catch (error) {
        console.warn("Failed to resolve invite", error);
      }
    }

    if (!invite) {
      setLedgerErrorMessage(messages.ledgerSelect.failed);
      return;
    }

    setBusyAction("accept");
    setLedgerErrorMessage("");
    try {
      await updateDoc(doc(db, "ledgers", invite.id), {
        members: arrayUnion(user.uid),
        pendingInviteUserIds: arrayRemove(user.uid),
      });

      await updateDoc(doc(db, "ledgers", invite.id, "invites", invite.inviteId), {
        status: "수락함",
      });

      setInviteLedgers((prev) => prev.filter((item) => item.id !== invite.id));
      setAccessibleLedgers((prev) =>
        dedupeLedgers([...prev, { id: invite.id, ownerId: invite.ownerId }]),
      );
      await setDoc(
        doc(db, "users", user.uid),
        { selectedLedgerId: invite.id, requestedBy: "" },
        { merge: true },
      );
    } catch (error) {
      console.warn("Failed to accept invite", error);
      setLedgerErrorMessage(messages.ledgerSelect.failed);
    } finally {
      setBusyAction("none");
    }
  };

  if (phase === "loading" || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!activeLedgerId) {
    return (
      <LedgerSelectionScreen
        loading={ledgerLoading}
        busyAction={busyAction}
        invite={
          inviteLedgers[0]
            ? { ownerName: inviteLedgers[0].ownerName }
            : requestedBy
              ? { ownerName: requestedBy }
              : null
        }
        errorMessage={ledgerErrorMessage}
        onCreateLedger={() => void handleCreateLedger()}
        onAcceptInvite={() => void handleAcceptInvite()}
      />
    );
  }

  return (
    <AppWithLedger user={user} ledgerId={activeLedgerId} />
  );
}
