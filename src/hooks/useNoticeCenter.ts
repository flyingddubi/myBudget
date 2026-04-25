import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../context/AuthContext";

export type NoticeItem = {
  id: string;
  title: string;
  content: string;
  publishedAt: Date | null;
  isPinned: boolean;
  showAsPopup: boolean;
};

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate();
    }
  }

  return null;
}

function getNoticeTimeValue(notice: NoticeItem) {
  return notice.publishedAt?.getTime() ?? 0;
}

function sortNotices(items: NoticeItem[]) {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    return getNoticeTimeValue(b) - getNoticeTimeValue(a);
  });
}

export function useNoticeCenter() {
  const { user } = useAuthContext();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [dismissedPopupNoticeIds, setDismissedPopupNoticeIds] = useState<string[]>([]);

  useEffect(() => {
    const noticesRef = query(collection(db, "notices"), orderBy("publishedAt", "desc"));

    const unsubscribe = onSnapshot(
      noticesRef,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => {
            const data = item.data();
            const title = typeof data.title === "string" ? data.title.trim() : "";
            const content = typeof data.content === "string" ? data.content.trim() : "";
            const publishedAt = toDateValue(data.publishedAt) ?? toDateValue(data.createdAt);
            if (!title || !content) {
              return null;
            }

            return {
              id: item.id,
              title,
              content,
              publishedAt,
              isPinned: Boolean(data.isPinned),
              showAsPopup: Boolean(data.showAsPopup),
            } satisfies NoticeItem;
          })
          .filter((item): item is NoticeItem => item !== null);

        setNotices(sortNotices(next));
      },
      (error) => {
        console.warn("Failed to subscribe notices", error);
        setNotices([]);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setReadNoticeIds([]);
      setDismissedPopupNoticeIds([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "noticeReads"),
      (snapshot) => {
        setReadNoticeIds(snapshot.docs.map((item) => item.id));
      },
      (error) => {
        console.warn("Failed to subscribe notice reads", error);
        setReadNoticeIds([]);
      },
    );

    return unsubscribe;
  }, [user]);

  const readNoticeIdSet = useMemo(() => new Set(readNoticeIds), [readNoticeIds]);
  const dismissedPopupIdSet = useMemo(
    () => new Set(dismissedPopupNoticeIds),
    [dismissedPopupNoticeIds],
  );

  const unreadCount = useMemo(
    () => notices.filter((notice) => !readNoticeIdSet.has(notice.id)).length,
    [notices, readNoticeIdSet],
  );

  const popupNotice = useMemo(
    () =>
      notices.find(
        (notice) =>
          notice.showAsPopup &&
          !readNoticeIdSet.has(notice.id) &&
          !dismissedPopupIdSet.has(notice.id),
      ) ?? null,
    [dismissedPopupIdSet, notices, readNoticeIdSet],
  );

  const markNoticeAsRead = async (noticeId: string) => {
    if (!user || readNoticeIdSet.has(noticeId)) {
      return;
    }

    setReadNoticeIds((prev) => (prev.includes(noticeId) ? prev : [...prev, noticeId]));

    try {
      await setDoc(
        doc(db, "users", user.uid, "noticeReads", noticeId),
        {
          readAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn("Failed to mark notice as read", error);
    }
  };

  const dismissPopupNotice = (noticeId: string) => {
    setDismissedPopupNoticeIds((prev) =>
      prev.includes(noticeId) ? prev : [...prev, noticeId],
    );
  };

  return {
    notices,
    readNoticeIdSet,
    unreadCount,
    popupNotice,
    markNoticeAsRead,
    dismissPopupNotice,
  };
}
