import { useEffect, useRef, useState } from "react";

/**
 * localStorage 동기화 훅.
 * - JSON 파싱 실패 시 기본값으로 즉시 덮어쓰지 않음(데이터 보호).
 * - 직렬화 결과가 기존과 같으면 setItem 생략.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const parseFailedRef = useRef(false);
  const initialSnapshotRef = useRef(initialValue);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error("localStorage read error", error);
      parseFailedRef.current = true;
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // 손상된 JSON이 있는데 아직 UI가 기본값과 동일하면 덮어쓰지 않음
    if (parseFailedRef.current) {
      const sameAsInitial =
        JSON.stringify(storedValue) ===
        JSON.stringify(initialSnapshotRef.current);
      if (sameAsInitial) {
        return;
      }
      parseFailedRef.current = false;
    }

    try {
      const next = JSON.stringify(storedValue);
      const prev = window.localStorage.getItem(key);
      if (prev === next) {
        return;
      }
      window.localStorage.setItem(key, next);
    } catch (error) {
      console.error("localStorage write error", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
