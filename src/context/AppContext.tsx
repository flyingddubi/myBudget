import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type {
  AppAction,
  AppContextValue,
  AppState,
  RecurringTemplate,
} from "../types";

export const BUDGET_APP_STORAGE_KEY = "budget-app-state";

/** 첫 설치·스토리지 없음 시 보여줄 샘플 포함 기본값 */
const DEFAULT_STATE: AppState = {
  transactions: [
    {
      id: "sample-expense",
      type: "expense",
      amount: 12800,
      category: "식비",
      memo: "점심 샐러드",
      date: new Date().toISOString().slice(0, 10),
    },
    {
      id: "sample-income",
      type: "income",
      amount: 2500000,
      category: "월급",
      memo: "이번 달 급여",
      date: new Date().toISOString().slice(0, 10),
    },
  ],
  categories: ["식비", "교통", "쇼핑", "생활", "월급", "부수입"],
  budget: 800000,
  recurringTemplates: [],
};

/** 설정에서 「데이터 초기화」 시 적용: 거래 삭제, 기본 카테고리·예산 0 */
const RESET_STATE: AppState = {
  transactions: [],
  categories: ["식비", "교통", "쇼핑", "생활", "월급", "부수입"],
  budget: 0,
  recurringTemplates: [],
};

function withRecurringTemplates(state: AppState): AppState {
  return {
    ...state,
    recurringTemplates: state.recurringTemplates ?? [],
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "add-transaction":
      return {
        ...state,
        transactions: [action.payload, ...state.transactions].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      };
    case "update-transaction":
      return {
        ...state,
        transactions: state.transactions
          .map((transaction) =>
            transaction.id === action.payload.id ? action.payload : transaction,
          )
          .sort((a, b) => b.date.localeCompare(a.date)),
      };
    case "delete-transaction":
      return {
        ...state,
        transactions: state.transactions.filter(
          (transaction) => transaction.id !== action.payload,
        ),
      };
    case "set-budget":
      return {
        ...state,
        budget: action.payload,
      };
    case "add-category": {
      if (state.categories.includes(action.payload)) {
        return state;
      }

      return {
        ...state,
        categories: [...state.categories, action.payload],
      };
    }
    case "remove-category":
      return {
        ...state,
        categories: state.categories.filter((category) => category !== action.payload),
      };
    case "reset":
      return action.payload;
    case "add-recurring-template":
      return {
        ...state,
        recurringTemplates: [...state.recurringTemplates, action.payload],
      };
    case "remove-recurring-template":
      return {
        ...state,
        recurringTemplates: state.recurringTemplates.filter(
          (t) => t.id !== action.payload,
        ),
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [storedState, setStoredState] = useLocalStorage<AppState>(
    BUDGET_APP_STORAGE_KEY,
    DEFAULT_STATE,
  );
  const [state, dispatch] = useReducer(appReducer, withRecurringTemplates(storedState));

  useEffect(() => {
    setStoredState(state);
  }, [setStoredState, state]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addTransaction: (transaction) =>
        dispatch({ type: "add-transaction", payload: transaction }),
      updateTransaction: (transaction) =>
        dispatch({ type: "update-transaction", payload: transaction }),
      deleteTransaction: (transactionId) =>
        dispatch({ type: "delete-transaction", payload: transactionId }),
      setBudget: (budget) => dispatch({ type: "set-budget", payload: budget }),
      addCategory: (category) => {
        const normalized = category.trim();
        if (!normalized || state.categories.includes(normalized)) {
          return false;
        }

        dispatch({ type: "add-category", payload: normalized });
        return true;
      },
      removeCategory: (category) =>
        dispatch({ type: "remove-category", payload: category }),
      resetAllData: () => {
        try {
          window.localStorage.removeItem(BUDGET_APP_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        dispatch({ type: "reset", payload: RESET_STATE });
      },
      importBackup: (next) => {
        dispatch({ type: "reset", payload: withRecurringTemplates(next) });
      },
      addRecurringTemplate: (template: RecurringTemplate) => {
        dispatch({ type: "add-recurring-template", payload: template });
      },
      removeRecurringTemplate: (id: string) => {
        dispatch({ type: "remove-recurring-template", payload: id });
      },
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
