type FormattingLocale = "ko" | "zh-TW";

let currentFormattingLocale: FormattingLocale = "ko";

export function setFormattingLocale(locale: FormattingLocale) {
  currentFormattingLocale = locale;
}

function getLocaleTag() {
  return currentFormattingLocale === "ko" ? "ko-KR" : "zh-TW";
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat(getLocaleTag(), {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** 달력 칸처럼 폭이 좁을 때 (예: `12만`, `3500`) */
export function formatCurrencyCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return "0";
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    return `${sign}${Math.round(abs / 100_000_000)}${
      currentFormattingLocale === "ko" ? "억" : "億"
    }`;
  }
  if (abs >= 10_000) {
    const man = abs / 10_000;
    const rounded = man >= 100 ? Math.round(man) : Math.round(man * 10) / 10;
    const body = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
    return `${sign}${body}${currentFormattingLocale === "ko" ? "만" : "萬"}`;
  }
  return `${sign}${Math.round(abs)}`;
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
