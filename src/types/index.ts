export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  memo?: string;
  date: string;
};

export type AppState = {
  transactions: Transaction[];
  categories: string[];
  budget: number;
};

export type AppAction =
  | { type: "add-transaction"; payload: Transaction }
  | { type: "update-transaction"; payload: Transaction }
  | { type: "delete-transaction"; payload: string }
  | { type: "set-budget"; payload: number }
  | { type: "add-category"; payload: string }
  | { type: "remove-category"; payload: string }
  | { type: "reset"; payload: AppState };

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
};

export type PageKey = "home" | "stats" | "settings";

export type CategoryStat = {
  name: string;
  value: number;
  percentage: number;
};
