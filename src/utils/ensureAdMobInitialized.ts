import { Capacitor } from "@capacitor/core";
import { logAdMob, warnAdMob } from "./admobDebug";

let initialized: Promise<void> | null = null;

/** 네이티브에서 한 번만 AdMob 초기화 (showBanner 전에 필요) */
export function ensureAdMobInitialized(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return Promise.resolve();
  }
  if (!initialized) {
    initialized = import("@capacitor-community/admob")
      .then(({ AdMob }) => AdMob.initialize())
      .then(() => {
        logAdMob("initialize() 완료");
      })
      .catch((err: unknown) => {
        warnAdMob("initialize() 실패:", err);
        initialized = null;
        throw err;
      });
  }
  return initialized;
}
