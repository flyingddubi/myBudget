import { Capacitor } from "@capacitor/core";

/** 배너 단위 ID — .env 에 VITE_ADMOB_BANNER_AD_UNIT 로 실제 단위를 넣으면 됩니다. 미설정 시 Google 공식 테스트 단위 */
export function resolveBannerAdUnitId(): string {
  const fromEnv = import.meta.env.VITE_ADMOB_BANNER_AD_UNIT as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  return Capacitor.getPlatform() === "ios"
    ? "ca-app-pub-3940256099942544/2934735716"
    : "ca-app-pub-3940256099942544/6300978111";
}
