import { InlineNativeAd } from "./InlineNativeAd";

export { APP_MAIN_SCROLL_ID } from "./InlineNativeAd";

/**
 * 통계 메인 화면 — 예산 사용률과 카테고리별 소비 사이.
 * 인라인 네이티브 광고를 컴팩트한 높이로 표시합니다.
 */
export function StatsBannerAd() {
  return (
    <InlineNativeAd
      minHeight={108}
      placeholderText="앱(Android/iOS)에서 이 위치에 AdMob 네이티브 광고가 표시됩니다."
    />
  );
}
