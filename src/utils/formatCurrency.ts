type FormattingLocale = "ko" | "zh-TW" | "zh-CN" | "en-US" | "vi" | "ja-JP";

let currentFormattingLocale: FormattingLocale = "ko";

export function setFormattingLocale(locale: FormattingLocale) {
  currentFormattingLocale = locale;
}

function getLocaleTag() {
  switch (currentFormattingLocale) {
    case "ko":
      return "ko-KR";
    case "zh-TW":
      return "zh-TW";
    case "zh-CN":
      return "zh-CN";
    case "en-US":
      return "en-US";
    case "vi":
      return "vi-VN";
    case "ja-JP":
      return "ja-JP";
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat(getLocaleTag(), {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** 만 원 단위 숫자만 (범례에서 단위 안내 시 달력 칸용, `만` 접미사 없음) */
export function formatAmountManUnit(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return "0";
  }
  const sign = amount < 0 ? "-" : "";
  const man = Math.abs(amount) / 10_000;
  const rounded = man >= 100 ? Math.round(man) : Math.round(man * 10) / 10;
  const body = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  return `${sign}${body}`;
}
