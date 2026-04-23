import { Capacitor } from "@capacitor/core";

/**
 * 통계 인라인 광고 단위 ID.
 * 새 키 `VITE_ADMOB_NATIVE_AD_UNIT` 을 우선 사용하고, 기존 `VITE_ADMOB_BANNER_AD_UNIT` 도 호환용으로 허용합니다.
 */
export function resolveInlineAdUnitId(): string {
  const fromNativeEnv = import.meta.env.VITE_ADMOB_NATIVE_AD_UNIT as
    | string
    | undefined;
  const fromLegacyEnv = import.meta.env.VITE_ADMOB_BANNER_AD_UNIT as
    | string
    | undefined;
  const resolved = fromNativeEnv?.trim() || fromLegacyEnv?.trim();
  if (resolved) {
    return resolved;
  }
  return Capacitor.getPlatform() === "ios"
    ? "ca-app-pub-3940256099942544/3986624511"
    : "ca-app-pub-3940256099942544/2247696110";
}
