/** `.env` 에 `VITE_ADMOB_DEBUG=true` 이면 통계 배너 슬롯에 상태 문구 표시 */
export function isAdMobDebugOverlay(): boolean {
  return import.meta.env.VITE_ADMOB_DEBUG === "true";
}

export function logAdMob(...args: unknown[]): void {
  console.info("[myBudget AdMob]", ...args);
}

export function warnAdMob(...args: unknown[]): void {
  console.warn("[myBudget AdMob]", ...args);
}
