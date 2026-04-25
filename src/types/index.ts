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

export type AppContextValue = {
  state: AppState;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  setBudget: (budget: number) => Promise<void>;
  addCategory: (category: string) => Promise<boolean>;
  removeCategory: (category: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  importBackup: (next: AppState) => Promise<void>;
  addRecurringTemplate: (template: RecurringTemplate) => Promise<void>;
  updateRecurringTemplate: (template: RecurringTemplate) => Promise<void>;
  removeRecurringTemplate: (id: string) => Promise<void>;
};

export type PageKey = "home" | "stats" | "settings";

export type CategoryStat = {
  name: string;
  value: number;
  percentage: number;
};
