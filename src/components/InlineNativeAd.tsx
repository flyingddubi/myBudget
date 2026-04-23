import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveInlineAdUnitId } from "../config/admobIds";
import { isAdMobDebugOverlay, logAdMob, warnAdMob } from "../utils/admobDebug";
import { ensureAdMobInitialized } from "../utils/ensureAdMobInitialized";

export const APP_MAIN_SCROLL_ID = "app-main-scroll";

type InlineNativeAdProps = {
  placeholderText?: string;
  minHeight?: number;
  alwaysVisible?: boolean;
  className?: string;
  collapseWhenHidden?: boolean;
};

export function InlineNativeAd({
  placeholderText = "앱(Android/iOS)에서 이 위치에 AdMob 네이티브 광고가 표시됩니다.",
  minHeight = 108,
  alwaysVisible = false,
  className,
  collapseWhenHidden = false,
}: InlineNativeAdProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [reservedHeight, setReservedHeight] = useState(0);
  const [debugLine, setDebugLine] = useState<string | null>(null);

  const hideNativeAd = useCallback(
    async (reason: string) => {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.hideBanner().catch(() => {});
      if (isAdMobDebugOverlay()) {
        setDebugLine(reason);
      }
    },
    [],
  );

  const syncBannerPosition = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !anchorRef.current) {
      return;
    }

    try {
      await ensureAdMobInitialized();

      const { AdMob, BannerAdPosition, BannerAdSize } = await import(
        "@capacitor-community/admob"
      );

      const rect = anchorRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const top = Math.round(rect.top);
      const bottom = Math.round(rect.bottom);
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      const overlapsViewport = bottom > 0 && top < vh;
      const shouldHide =
        !alwaysVisible && (width <= 0 || height <= 0 || !overlapsViewport);

      if (shouldHide) {
        await hideNativeAd(
          `슬롯 숨김 · top=${top} bottom=${bottom} width=${width} viewport=${vh} → hideBanner`,
        );
        return;
      }

      const adId = resolveInlineAdUnitId();
      const offsetX = Math.round(rect.left);
      const contentWidth = width;
      const contentHeight = Math.max(reservedHeight || 0, minHeight);

      logAdMob("showBanner(native) 요청", {
        adId,
        top,
        bottom,
        offsetX,
        contentWidth,
        contentHeight,
      });

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: top,
        offsetX,
        contentWidth,
        contentHeight,
      } as any);

      if (isAdMobDebugOverlay()) {
        setDebugLine(
          `요청함 · top=${top}px left=${offsetX}px width=${contentWidth}px`,
        );
      }
    } catch (err) {
      warnAdMob("showBanner 예외:", err);
      if (isAdMobDebugOverlay()) {
        setDebugLine(
          `오류: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }, [alwaysVisible, hideNativeAd, minHeight, reservedHeight]);

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
    void syncBannerPosition();
  }, [syncBannerPosition]);

  useEffect(() => {
    const root = document.getElementById(APP_MAIN_SCROLL_ID);
    if (!root) {
      warnAdMob(`스크롤 루트 없음 #${APP_MAIN_SCROLL_ID}`);
      return;
    }

    root.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    const anchor = anchorRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && anchor
        ? new ResizeObserver(() => scheduleSync())
        : null;
    if (ro && anchor) {
      ro.observe(anchor);
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

        logAdMob("광고 단위 ID:", resolveInlineAdUnitId());

        const h1 = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (info: { height: number }) => {
            if (!cancelled) {
              if (info.height > 0) {
                setReservedHeight(Math.ceil(info.height));
                logAdMob("SizeChanged", info);
              } else if (collapseWhenHidden) {
                setReservedHeight(0);
              }
            }
          },
        );
        handles.push(h1);

        const h2 = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          logAdMob("nativeAdLoaded");
          if (isAdMobDebugOverlay()) {
            setDebugLine("로드 성공 (nativeAdLoaded)");
          }
        });
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
  }, [collapseWhenHidden]);

  const nativeMinHeight = Capacitor.isNativePlatform()
    ? reservedHeight > 0
      ? reservedHeight
      : minHeight
    : undefined;

  const showDebugOverlay =
    Capacitor.isNativePlatform() && isAdMobDebugOverlay();

  return (
    <div ref={anchorRef} className="w-full">
      <div
        className={[
          "flex w-full flex-col items-center justify-center overflow-hidden rounded-[20px] bg-slate-100/90 ring-1 ring-slate-200/80",
          className ?? "",
        ].join(" ")}
        style={{ minHeight: nativeMinHeight }}
        aria-hidden={Capacitor.isNativePlatform()}
      >
        {!Capacitor.isNativePlatform() ? (
          <p className="px-4 py-3 text-center text-[11px] font-medium text-slate-400">
            {placeholderText}
          </p>
        ) : null}
        {showDebugOverlay && debugLine ? (
          <p className="border-t border-slate-200/80 px-2 py-1 text-center text-[10px] leading-snug text-amber-800">
            [AdMob DEBUG] {debugLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
