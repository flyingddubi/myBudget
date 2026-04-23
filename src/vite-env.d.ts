/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMOB_NATIVE_AD_UNIT?: string;
  readonly VITE_ADMOB_BANNER_AD_UNIT?: string;
  /** `true` 이면 통계 탭 광고 슬롯에 AdMob 상태 문구 표시 */
  readonly VITE_ADMOB_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
