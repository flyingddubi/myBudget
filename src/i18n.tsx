import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { setFormattingLocale } from "./utils/formatCurrency";

export type AppLocale = "ko" | "zh-TW";

const I18N_STORAGE_KEY = "budget-app-locale";

export const MESSAGES = {
  ko: {
    common: {
      home: "홈",
      stats: "통계",
      settings: "설정",
      back: "뒤로",
      close: "닫기",
      cancel: "취소",
      confirm: "확인",
      save: "저장",
      edit: "수정",
      delete: "삭제",
      income: "수입",
      expense: "지출",
      category: "카테고리",
      date: "날짜",
      memo: "메모",
      memoNone: "메모 없음",
      today: "오늘",
      countSuffix: "건",
    },
    app: {
      pageMeta: {
        home: {
          title: "내 가계부",
          subtitle: "오늘도 가볍게 수입과 지출을 기록해보세요.",
        },
        stats: {
          title: "통계",
          subtitle: "이번 달 돈의 흐름을 한눈에 확인하세요.",
        },
        settings: {
          title: "설정",
          subtitle: "예산과 카테고리를 취향에 맞게 관리하세요.",
        },
        privacy: {
          title: "설정",
          subtitle: "개인정보 처리방침을 확인할 수 있어요.",
        },
        guide: {
          title: "설정",
          subtitle: "앱 설명서를 이미지로 확인할 수 있어요.",
        },
      },
      fab: {
        new: "신규",
        recurring: "반복",
        addTransaction: "거래 추가",
        closeMenu: "메뉴 닫기",
      },
      recurringPicker: {
        title: "반복 항목",
        empty: "등록된 반복 항목이 없습니다. 설정 탭에서 프리셋을 추가해 주세요.",
      },
      settingsMenu: {
        open: "설정 메뉴 열기",
        close: "설정 메뉴 닫기",
        privacy: "개인정보 처리방침",
        guide: "App 설명서",
        languageKo: "한국어",
        languageZhTw: "繁體中文",
        versionTitle: "Flying 가계부",
        versionLine: "- myBudget v1.0.0",
      },
      exitToast: "두번누르면 앱이 종료됩니다.",
    },
    loading: {
      loading: "불러오는 중…",
    },
    transaction: {
      noHistoryTitle: "아직 기록된 내역이 없어요",
      noHistoryDesc: "하단의 + 버튼으로 첫 거래를 추가해보세요.",
      historyTitle: "거래 내역",
      deleteConfirm: "삭제하시겠습니까?",
      saveTitle: "거래 저장",
      addTitle: "거래 추가",
      editTitle: "거래 수정",
      addNewTitle: "새 거래 추가",
      quickInputDesc: "3단계 안에 빠르게 입력할 수 있게 구성했어요.",
      amountWon: "금액 (원)",
      amountPlaceholder: "예: 12500",
      amountHint: "1원 단위까지 입력할 수 있어요.",
      memoPlaceholder: "기록을 남기고 싶다면 입력하세요",
      closeAria: "닫기",
      dayTransactions: "거래",
      thisWeekTransactions: "이번 주 거래",
      monthTransactions: "거래",
    },
    calendar: {
      title: "달력",
      day: "일간",
      week: "주간",
      month: "월간",
      incomeLegend: "수입",
      expenseLegend: "지출",
      unitManWon: "단위: 만 원",
      legendAria: "수입은 초록색, 지출은 빨간색 숫자이며 단위는 만 원입니다",
      prevDay: "이전 날",
      nextDay: "다음 날",
      prevWeek: "이전 주",
      nextWeek: "다음 주",
      prevMonth: "이전 달",
      nextMonth: "다음 달",
      selectedDay: "선택한 하루",
      oneDayMoveHint: "‹ › 로 하루씩 이동할 수 있어요.",
      weekTotal: "이번 주 합계",
      monthTotal: "이번 달 합계",
    },
    stats: {
      back: "뒤로",
      yearlyFlow: "연간 흐름",
      yearlyFlowDesc: "최근 12개월(이번 달 포함) 수입·지출 추이예요.",
      expenseBar: "지출 (막대)",
      incomeLine: "수입 (선)",
      categoryExpenseDetailSuffix: "지출 내역",
      total: "합계",
      noCategoryExpense: "이 달 이 카테고리 지출이 없어요.",
      thisMonthExpense: "이번 달 지출",
      income: "수입",
      remainingBudget: "남은 예산",
      budgetUsageRate: "예산 사용률",
      budgetUnset: "예산 미설정",
      overBudget: "예산 초과",
      withinBudget: "예산 내 사용 중",
      monthlyBudget: "월 예산",
      used: "사용",
      categorySpending: "카테고리별 소비",
      categorySpendingDesc:
        "선택한 달의 지출을 카테고리 기준으로 나눴도록 했어요. 항목을 누르면 상세 내역을 볼 수 있어요.",
      noExpenseThisMonth: "아직 이 달 지출 데이터가 없어요.",
      incomeVsExpense: "수입 vs 지출",
      incomeVsExpenseDesc: "이번 달 흐름을 한 번에 볼 수 있어요.",
      viewYearlyFlow: "연간 흐름 보기",
      prevMonthExpense: "이전 달 지출",
      nextMonthExpense: "다음 달 지출",
    },
    settings: {
      backToSettings: "← 설정",
      privacyTitle: "개인정보처리방침",
      privacyDesc: "앱에서 개인정보가 어떻게 처리되는지 안내합니다.",
      guideTitle: "App 설명서",
      guideDesc: "앱 사용법 이미지를 순서대로 확인할 수 있습니다.",
      guideUsage: "사용 안내",
      guideUsageDesc: "좌우로 넘기며 설명 이미지를 확인해 주세요.",
      prevGuideImage: "이전 설명 이미지",
      nextGuideImage: "다음 설명 이미지",
      monthlyBudget: "월 예산",
      currentBudgetPrefix: "현재",
      monthlyBudgetDesc: "이번 달 목표 예산을 설정해보세요.",
      categoryManagement: "카테고리 관리",
      categoryManagementDesc: "사용 중인 카테고리는 삭제가 잠겨 있어요.",
      newCategoryPlaceholder: "새 카테고리 입력",
      add: "추가",
      inUse: "사용 중",
      recurringManagement: "반복 거래 관리",
      backupRestore: "백업 · 복원",
      backupRestoreDesc:
        "거래 내역·카테고리·월 예산·반복 프리셋을 JSON 파일로 저장하거나, 같은 형식의 파일을 불러올 수 있어요.",
      downloadJson: "전체 데이터 내려받기 (JSON)",
      importJson: "JSON 파일에서 가져오기",
      resetData: "데이터 초기화",
      resetDataDesc:
        "브라우저에 저장된 가계부 데이터(거래, 예산, 반복 프리셋)를 모두 지웁니다. 기본 카테고리 목록은 유지됩니다.",
      deleteAllLocal: "로컬 데이터 전체 삭제",
      resetConfirm:
        "모든 거래·예산·반복 프리셋을 지우고 기본 카테고리만 남길까요?\n이 작업은 되돌릴 수 없습니다.",
      shareError:
        "백업 파일을 만들거나 공유할 수 없습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.",
      readFileError: "파일을 읽을 수 없습니다.",
      invalidJson:
        "JSON 형식이 맞지 않습니다. 이 앱에서 내려받은 백업 파일인지 확인해 주세요.",
      importCompleted: "가져오기가 완료되었습니다.",
      dialogTitle: "확인",
      dialogDownload: "데이터를 내려받으시겠습니까?",
      dialogImportLine1: "데이터를 가져오시겠습니까?",
      dialogImportLine2: "- ※가져온 데이터로 데이터가 교체 됩니다.",
      privacy: {
        intro:
          'Flying 가계부 - myBudget(이하 "앱")은 사용자의 개인정보를 중요하게 생각하며, 다음과 같은 방침을 따릅니다.',
        sections: [
          {
            title: "1. 개인정보 수집",
            body: [
              "본 앱은 사용자의 개인정보를 직접 수집하거나 저장하지 않습니다.",
              "앱에서 입력되는 가계부 데이터는 사용자의 기기 내부에만 저장되며, 외부 서버로 전송되지 않습니다.",
            ],
          },
          {
            title: "2. 제3자 서비스 사용",
            body: [
              "본 앱은 광고 제공을 위해 다음과 같은 제3자 서비스를 사용합니다.",
              "Google의 Google AdMob",
              "AdMob은 광고 제공 및 서비스 개선을 위해 다음과 같은 정보를 수집할 수 있습니다.",
            ],
            bullets: [
              "광고 ID",
              "기기 정보",
              "IP 주소",
              "앱 사용 정보",
              "대략적인 위치 정보",
            ],
          },
          {
            title: "3. 데이터 보관",
            body: [
              "본 앱은 사용자의 개인정보를 별도로 수집하거나 서버에 저장하지 않습니다.",
            ],
          },
          {
            title: "4. 어린이 개인정보 보호",
            body: [
              "본 앱은 어린이를 포함한 모든 연령이 사용할 수 있으나, 13세 미만 어린이의 개인정보를 의도적으로 수집하지 않습니다.",
              "또한, 본 앱에서 사용하는 광고 서비스(Google AdMob)는 관련 법규 및 정책에 따라 데이터를 처리할 수 있습니다.",
            ],
          },
          {
            title: "5. 개인정보처리방침 변경",
            body: [
              "본 개인정보처리방침은 필요에 따라 변경될 수 있으며, 변경 시 본 페이지를 통해 안내됩니다.",
            ],
          },
        ],
        detailLink: "자세한 내용은 아래 링크를 참고하시기 바랍니다.",
        inquiryTitle: "6. 문의",
        inquiryBody: "개인정보 관련 문의가 있을 경우 아래 연락처로 문의하시기 바랍니다.",
        developer: "개발자: FlyingCompany - DDubi",
        emailLabel: "이메일:",
        lastUpdated: "마지막 업데이트",
        lastUpdatedValue: "2026년 4월 23일",
      },
    },
    recurring: {
      title: "반복 거래 관리",
      subtitle:
        "홈의 + → 「반복」에서 불러올 항목을 저장합니다. 날짜는 추가 시 오늘로 채워집니다.",
      editItem: "반복 항목 수정",
      newItem: "새 반복 항목",
      cancelEdit: "수정 취소",
      displayName: "표시 이름",
      displayNamePlaceholder: "예: 월세, 구독료",
      amountWon: "금액 (원)",
      amountPlaceholder: "예: 50000",
      optionalMemo: "메모 (선택)",
      memoPlaceholder: "거래 추가 화면에 자동으로 넣을 메모",
      saveChanges: "변경 저장",
      addItem: "반복 항목 추가",
      savedItems: "저장된 항목",
      nameRequired: "이름을 입력해 주세요.",
      amountMin: "금액은 1원 이상으로 입력해 주세요.",
      addCategoryFirst: "카테고리를 먼저 추가해 주세요.",
      deleteConfirm: "삭제하시겠습니까?",
    },
  },
  "zh-TW": {
    common: {
      home: "首頁",
      stats: "統計",
      settings: "設定",
      back: "返回",
      close: "關閉",
      cancel: "取消",
      confirm: "確認",
      save: "儲存",
      edit: "編輯",
      delete: "刪除",
      income: "收入",
      expense: "支出",
      category: "分類",
      date: "日期",
      memo: "備註",
      memoNone: "無備註",
      today: "今天",
      countSuffix: "筆",
    },
    app: {
      pageMeta: {
        home: {
          title: "我的記帳本",
          subtitle: "今天也輕鬆記錄收入與支出吧。",
        },
        stats: {
          title: "統計",
          subtitle: "一眼掌握本月的金流狀況。",
        },
        settings: {
          title: "設定",
          subtitle: "依照你的喜好管理預算與分類。",
        },
        privacy: {
          title: "設定",
          subtitle: "可查看隱私權政策。",
        },
        guide: {
          title: "設定",
          subtitle: "可用圖片查看 App 使用說明。",
        },
      },
      fab: {
        new: "新增",
        recurring: "重複",
        addTransaction: "新增交易",
        closeMenu: "關閉選單",
      },
      recurringPicker: {
        title: "重複項目",
        empty: "尚未註冊任何重複項目。請到設定頁新增預設項目。",
      },
      settingsMenu: {
        open: "開啟設定選單",
        close: "關閉設定選單",
        privacy: "隱私權政策",
        guide: "App 說明書",
        languageKo: "韓文",
        languageZhTw: "繁體中文",
        versionTitle: "Flying 記帳本",
        versionLine: "- myBudget v1.0.0",
      },
      exitToast: "連按兩次即可結束 App。",
    },
    loading: {
      loading: "載入中…",
    },
    transaction: {
      noHistoryTitle: "尚無任何記錄",
      noHistoryDesc: "請用下方的 + 按鈕新增第一筆交易。",
      historyTitle: "交易記錄",
      deleteConfirm: "確定要刪除嗎？",
      saveTitle: "儲存交易",
      addTitle: "新增交易",
      editTitle: "編輯交易",
      addNewTitle: "新增交易",
      quickInputDesc: "設計成可在 3 個步驟內快速輸入。",
      amountWon: "金額（韓元）",
      amountPlaceholder: "例如：12500",
      amountHint: "可輸入到 1 元單位。",
      memoPlaceholder: "若想留下記錄，請輸入備註",
      closeAria: "關閉",
      dayTransactions: "交易",
      thisWeekTransactions: "本週交易",
      monthTransactions: "交易",
    },
    calendar: {
      title: "日曆",
      day: "日",
      week: "週",
      month: "月",
      incomeLegend: "收入",
      expenseLegend: "支出",
      unitManWon: "單位：萬元",
      legendAria: "收入為綠色，支出為紅色，數字單位為萬元",
      prevDay: "前一天",
      nextDay: "後一天",
      prevWeek: "上一週",
      nextWeek: "下一週",
      prevMonth: "上個月",
      nextMonth: "下個月",
      selectedDay: "所選日期",
      oneDayMoveHint: "可用 ‹ › 逐日移動。",
      weekTotal: "本週合計",
      monthTotal: "本月合計",
    },
    stats: {
      back: "返回",
      yearlyFlow: "年度趨勢",
      yearlyFlowDesc: "最近 12 個月（含本月）的收入與支出趨勢。",
      expenseBar: "支出（長條）",
      incomeLine: "收入（折線）",
      categoryExpenseDetailSuffix: "支出明細",
      total: "合計",
      noCategoryExpense: "本月此分類沒有支出。",
      thisMonthExpense: "本月支出",
      income: "收入",
      remainingBudget: "剩餘預算",
      budgetUsageRate: "預算使用率",
      budgetUnset: "尚未設定預算",
      overBudget: "超出預算",
      withinBudget: "仍在預算內",
      monthlyBudget: "月預算",
      used: "已使用",
      categorySpending: "分類支出",
      categorySpendingDesc: "將所選月份的支出依分類分開顯示。點選項目可查看明細。",
      noExpenseThisMonth: "本月尚無支出資料。",
      incomeVsExpense: "收入 vs 支出",
      incomeVsExpenseDesc: "可一次查看本月的金流狀況。",
      viewYearlyFlow: "查看年度趨勢",
      prevMonthExpense: "上個月支出",
      nextMonthExpense: "下個月支出",
    },
    settings: {
      backToSettings: "← 設定",
      privacyTitle: "隱私權政策",
      privacyDesc: "說明 App 如何處理個人資料。",
      guideTitle: "App 說明書",
      guideDesc: "可依序查看 App 使用說明圖片。",
      guideUsage: "使用說明",
      guideUsageDesc: "請左右滑動查看說明圖片。",
      prevGuideImage: "上一張說明圖片",
      nextGuideImage: "下一張說明圖片",
      monthlyBudget: "月預算",
      currentBudgetPrefix: "目前",
      monthlyBudgetDesc: "請設定本月目標預算。",
      categoryManagement: "分類管理",
      categoryManagementDesc: "使用中的分類無法刪除。",
      newCategoryPlaceholder: "輸入新分類",
      add: "新增",
      inUse: "使用中",
      recurringManagement: "重複交易管理",
      backupRestore: "備份／還原",
      backupRestoreDesc:
        "可將交易記錄、分類、月預算與重複預設匯出為 JSON 檔，或匯入相同格式的檔案。",
      downloadJson: "下載全部資料（JSON）",
      importJson: "從 JSON 檔匯入",
      resetData: "資料重設",
      resetDataDesc:
        "將刪除瀏覽器中儲存的記帳資料（交易、預算、重複預設）。預設分類會保留。",
      deleteAllLocal: "刪除所有本機資料",
      resetConfirm:
        "要刪除所有交易、預算與重複預設，只保留基本分類嗎？\n此操作無法復原。",
      shareError: "無法建立或分享備份檔案。請確認儲存空間後再試一次。",
      readFileError: "無法讀取檔案。",
      invalidJson: "JSON 格式不正確。請確認是否為本 App 匯出的備份檔。",
      importCompleted: "匯入完成。",
      dialogTitle: "確認",
      dialogDownload: "要下載資料嗎？",
      dialogImportLine1: "要匯入資料嗎？",
      dialogImportLine2: "- ※匯入後現有資料將被取代。",
      privacy: {
        intro:
          'Flying 記帳本 - myBudget（以下稱「本 App」）非常重視使用者的個人資料，並遵循以下政策。',
        sections: [
          {
            title: "1. 個人資料蒐集",
            body: [
              "本 App 不會直接蒐集或儲存使用者的個人資料。",
              "在 App 中輸入的記帳資料僅儲存在使用者裝置內部，不會傳送到外部伺服器。",
            ],
          },
          {
            title: "2. 使用第三方服務",
            body: [
              "本 App 為提供廣告服務，使用以下第三方服務。",
              "Google 的 Google AdMob",
              "AdMob 為提供廣告與改善服務，可能會蒐集以下資訊。",
            ],
            bullets: [
              "廣告 ID",
              "裝置資訊",
              "IP 位址",
              "App 使用資訊",
              "大略位置資訊",
            ],
          },
          {
            title: "3. 資料保存",
            body: ["本 App 不會另外蒐集或將使用者個人資料儲存在伺服器中。"],
          },
          {
            title: "4. 兒童個人資料保護",
            body: [
              "本 App 供所有年齡層使用，但不會刻意蒐集 13 歲以下兒童的個人資料。",
              "此外，本 App 所使用的廣告服務（Google AdMob）可能依相關法規與政策處理資料。",
            ],
          },
          {
            title: "5. 隱私權政策變更",
            body: ["本隱私權政策可能視需要變更，若有變更將透過本頁面公告。"],
          },
        ],
        detailLink: "詳細內容請參考以下連結。",
        inquiryTitle: "6. 聯絡方式",
        inquiryBody: "若有任何與個人資料相關的問題，請透過以下聯絡方式洽詢。",
        developer: "開發者：FlyingCompany - DDubi",
        emailLabel: "電子郵件：",
        lastUpdated: "最後更新",
        lastUpdatedValue: "2026 年 4 月 23 日",
      },
    },
    recurring: {
      title: "重複交易管理",
      subtitle:
        "可儲存要在首頁 + →「重複」中載入的項目。新增時日期會自動填入今天。",
      editItem: "編輯重複項目",
      newItem: "新增重複項目",
      cancelEdit: "取消編輯",
      displayName: "顯示名稱",
      displayNamePlaceholder: "例如：房租、訂閱費",
      amountWon: "金額（韓元）",
      amountPlaceholder: "例如：50000",
      optionalMemo: "備註（選填）",
      memoPlaceholder: "新增交易時自動帶入的備註",
      saveChanges: "儲存變更",
      addItem: "新增重複項目",
      savedItems: "已儲存項目",
      nameRequired: "請輸入名稱。",
      amountMin: "金額請輸入 1 元以上。",
      addCategoryFirst: "請先新增分類。",
      deleteConfirm: "確定要刪除嗎？",
    },
  },
} as const;

type MessagesShape = typeof MESSAGES.ko;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  localeTag: string;
  messages: MessagesShape;
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function toLocaleTag(locale: AppLocale) {
  return locale === "ko" ? "ko-KR" : "zh-TW";
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useLocalStorage<AppLocale>(I18N_STORAGE_KEY, "ko");
  const localeTag = toLocaleTag(locale);

  useEffect(() => {
    setFormattingLocale(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      localeTag,
      messages: MESSAGES[locale] as MessagesShape,
      formatDate: (value, options) =>
        new Date(value).toLocaleDateString(localeTag, options),
    }),
    [locale, localeTag, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
