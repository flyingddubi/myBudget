export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  memo?: string;
  date: string;
};

/** 거래 추가 시 불러올 반복 프리셋 (설정에서 관리) */
export type RecurringTemplate = {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  category: string;
  memo?: string;
};

export type AppState = {
  transactions: Transaction[];
  categories: string[];
  budget: number;
  recurringTemplates: RecurringTemplate[];
};

export type AppAction =
  | { type: "add-transaction"; payload: Transaction }
  | { type: "update-transaction"; payload: Transaction }
  | { type: "delete-transaction"; payload: string }
  | { type: "set-budget"; payload: number }
  | { type: "add-category"; payload: string }
  | { type: "remove-category"; payload: string }
  | { type: "reset"; payload: AppState }
  | { type: "add-recurring-template"; payload: RecurringTemplate }
  | { type: "remove-recurring-template"; payload: string };

export type AppContextValue = {
  state: AppState;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (transactionId: string) => void;
  setBudget: (budget: number) => void;
  addCategory: (category: string) => boolean;
  removeCategory: (category: string) => void;
  resetAllData: () => void;
  importBackup: (next: AppState) => void;
  addRecurringTemplate: (template: RecurringTemplate) => void;
  removeRecurringTemplate: (id: string) => void;
};

export type PageKey = "home" | "stats" | "settings";

export type CategoryStat = {
  name: string;
  value: number;
  percentage: number;
};
