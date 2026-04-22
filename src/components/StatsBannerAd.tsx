import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveBannerAdUnitId } from "../config/admobIds";
import { isAdMobDebugOverlay, logAdMob, warnAdMob } from "../utils/admobDebug";
import { ensureAdMobInitialized } from "../utils/ensureAdMobInitialized";

/** App.tsx 메인 스크롤 영역과 동일해야 합니다 */
export const APP_MAIN_SCROLL_ID = "app-main-scroll";

/**
 * 통계 메인 화면 — 예산 사용률과 카테고리별 소비 사이.
 * 네이티브: 슬롯 상단 좌표에 맞춰 배너를 표시하고 스크롤 시 위치만 동기화합니다.
 */
export function StatsBannerAd() {
  const slotRef = useRef<HTMLDivElement>(null);
  const slotVisibleRef = useRef(false);
  const [reservedHeight, setReservedHeight] = useState(0);
  const [slotVisible, setSlotVisible] = useState(false);
  const [debugLine, setDebugLine] = useState<string | null>(null);
  const rafRef = useRef<number>(0);

  const syncBannerPosition = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !slotRef.current) {
      return;
    }
    try {
      await ensureAdMobInitialized();

      const {
        AdMob,
        BannerAdPosition,
        BannerAdSize,
      } = await import("@capacitor-community/admob");

      if (!slotVisibleRef.current) {
        await AdMob.hideBanner().catch(() => {});
        if (isAdMobDebugOverlay()) {
          setDebugLine("슬롯이 화면에 안 보임 → hideBanner");
        }
        return;
      }

      const rect = slotRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // 슬롯이 뷰포트와 한 픽셀이라도 겹치면 표시. (이전: rect.top < vh-8 등으로
      // 화면 아래쪽에 걸친 경우 오판하여 배너가 계속 숨겨지는 문제가 있었음)
      const overlapsViewport = rect.bottom > 0 && rect.top < vh;
      if (!overlapsViewport || rect.height <= 0) {
        await AdMob.hideBanner().catch(() => {});
        if (isAdMobDebugOverlay()) {
          setDebugLine(
            `슬롯이 뷰포트 밖 · top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)} → hideBanner`,
          );
        }
        return;
      }

      // TOP_CENTER + margin: 슬롯 상단이 화면 위로 나가면 margin 0에 가까워져 상단 고정처럼 보임 → 그때는 숨김
      if (rect.top < 0) {
        await AdMob.hideBanner().catch(() => {});
        if (isAdMobDebugOverlay()) {
          setDebugLine(`슬롯 상단 잘림(top=${Math.round(rect.top)}) → hideBanner`);
        }
        return;
      }

      const marginTop = Math.round(rect.top);
      const adId = resolveBannerAdUnitId();

      logAdMob("showBanner 요청", {
        adId,
        marginTop,
        slotHeight: Math.round(rect.height),
      });

      // hideBanner() 가 네이티브에서 배너를 GONE 처리하는데, 이후 showBanner 는
      // 기존 AdView 가 있으면 loadAd 만 하고 다시 보이게 하지 않음 → resumeBanner 필요.
      await AdMob.resumeBanner().catch(() => {});

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: marginTop,
      });
      if (isAdMobDebugOverlay()) {
        setDebugLine(`요청함 · marginTop=${marginTop}px`);
      }
    } catch (err) {
      warnAdMob("showBanner 예외:", err);
      if (isAdMobDebugOverlay()) {
        setDebugLine(
          `오류: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      void syncBannerPosition();
    });
  }, [syncBannerPosition]);

  useEffect(() => {
    slotVisibleRef.current = slotVisible;
    if (isAdMobDebugOverlay()) {
      logAdMob("슬롯 intersecting:", slotVisible);
    }
    void syncBannerPosition();
  }, [slotVisible, syncBannerPosition]);

  useEffect(() => {
    const slot = slotRef.current;
    const root = document.getElementById(APP_MAIN_SCROLL_ID);
    if (!slot || !root) {
      warnAdMob(
        `IntersectionObserver 설정 실패: slot=${Boolean(slot)} root(#${APP_MAIN_SCROLL_ID})=${Boolean(root)}`,
      );
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        setSlotVisible(entries[0]?.isIntersecting ?? false);
      },
      { root, threshold: [0, 0.01] },
    );
    io.observe(slot);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = document.getElementById(APP_MAIN_SCROLL_ID);
    if (!root) {
      warnAdMob(`스크롤 루트 없음 #${APP_MAIN_SCROLL_ID}`);
      return;
    }
    root.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    const slot = slotRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && slot
        ? new ResizeObserver(() => scheduleSync())
        : null;
    if (ro && slot) {
      ro.observe(slot);
    }
    return () => {
      ro?.disconnect();
      root.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scheduleSync]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];

    void (async () => {
      try {
        await ensureAdMobInitialized();
        const { AdMob, BannerAdPluginEvents } = await import(
          "@capacitor-community/admob"
        );
        if (cancelled) {
          return;
        }

        logAdMob("배너 단위 ID:", resolveBannerAdUnitId());

        const h1 = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (info: { height: number }) => {
            if (!cancelled && info.height > 0) {
              setReservedHeight(Math.ceil(info.height));
              logAdMob("SizeChanged", info);
            }
          },
        );
        handles.push(h1);

        const h2 = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => {
            logAdMob("bannerAdLoaded");
            if (isAdMobDebugOverlay()) {
              setDebugLine("로드 성공 (bannerAdLoaded)");
            }
          },
        );
        handles.push(h2);

        const h3 = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (info: { code: number; message: string }) => {
            warnAdMob("bannerAdFailedToLoad", {
              code: info.code,
              message: info.message,
            });
            if (isAdMobDebugOverlay()) {
              setDebugLine(`실패 code=${info.code} · ${info.message}`);
            }
          },
        );
        handles.push(h3);

        const h4 = await AdMob.addListener(
          BannerAdPluginEvents.AdImpression,
          () => logAdMob("AdImpression"),
        );
        handles.push(h4);
      } catch (e) {
        warnAdMob("리스너 등록 실패:", e);
      }
    })();

    return () => {
      cancelled = true;
      void Promise.all(handles.map((h) => h.remove()));
      void import("@capacitor-community/admob").then(({ AdMob }) =>
        AdMob.removeBanner().catch(() => {}),
      );
    };
  }, []);

  const nativeMinHeight =
    reservedHeight > 0 ? reservedHeight : undefined;

  const showDebugOverlay =
    Capacitor.isNativePlatform() && isAdMobDebugOverlay();

  return (
    <div
      ref={slotRef}
      className="flex min-h-[52px] w-full flex-col items-center justify-center overflow-hidden rounded-[20px] bg-slate-100/90 ring-1 ring-slate-200/80"
      style={{ minHeight: nativeMinHeight }}
      aria-hidden={Capacitor.isNativePlatform()}
    >
      {!Capacitor.isNativePlatform() ? (
        <p className="px-4 py-3 text-center text-[11px] font-medium text-slate-400">
          앱(Android/iOS)에서 이 위치에 AdMob 배너가 표시됩니다.
        </p>
      ) : null}
      {showDebugOverlay && debugLine ? (
        <p className="border-t border-slate-200/80 px-2 py-1 text-center text-[10px] leading-snug text-amber-800">
          [AdMob DEBUG] {debugLine}
        </p>
      ) : null}
    </div>
  );
}
