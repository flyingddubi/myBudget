import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { db } from "../firebase";
import type { AppContextValue, AppState, RecurringTemplate, Transaction } from "../types";
import { MONTHLY_BUDGET_COLLECTION, formatBudgetMonthKey } from "../utils/monthlyBudget";

const DEFAULT_STATE: AppState = {
  transactions: [],
  categories: [],
  budget: 0,
  recurringTemplates: [],
};

const AppContext = createContext<AppContextValue | null>(null);
const LedgerIdContext = createContext<string | undefined>(undefined);

type AppProviderProps = PropsWithChildren<{
  ledgerId?: string;
}>;

function sortTransactions(items: Transaction[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

function sortRecurringTemplates(items: RecurringTemplate[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

async function deleteAllDocuments(collectionPath: string[]) {
  const snapshot = await getDocs(collection(db, collectionPath.join("/")));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

export function AppProvider({ children, ledgerId }: AppProviderProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_STATE.transactions);
  const [categories, setCategories] = useState<string[]>(DEFAULT_STATE.categories);
  const [budget, setBudgetState] = useState(DEFAULT_STATE.budget);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>(
    DEFAULT_STATE.recurringTemplates,
  );

  useEffect(() => {
    if (!ledgerId) {
      setTransactions(DEFAULT_STATE.transactions);
      setCategories(DEFAULT_STATE.categories);
      setBudgetState(DEFAULT_STATE.budget);
      setRecurringTemplates(DEFAULT_STATE.recurringTemplates);
      return;
    }

    const transactionsRef = collection(db, "ledgers", ledgerId, "transactions");
    const recurringRef = collection(db, "ledgers", ledgerId, "recurringTemplates");
    const categoriesRef = collection(db, "ledgers", ledgerId, "categories");
    const currentBudgetRef = doc(
      db,
      "ledgers",
      ledgerId,
      MONTHLY_BUDGET_COLLECTION,
      formatBudgetMonthKey(new Date()),
    );

    const unsubscribeTransactions = onSnapshot(
      query(transactionsRef),
      (snapshot) => {
        const nextTransactions = snapshot.docs
          .map((item) => {
            const data = item.data();
            const amount = Number(data.amount ?? 0);
            const category = typeof data.category === "string" ? data.category.trim() : "";
            const date = typeof data.date === "string" ? data.date : "";
            const type = data.type === "income" || data.type === "expense" ? data.type : null;
            if (!type || !category || !date || !Number.isFinite(amount)) {
              return null;
            }

            const nextTransaction: Transaction = {
              id: item.id,
              type,
              amount: Math.round(amount),
              category,
              date,
            };
            if (typeof data.memo === "string") {
              nextTransaction.memo = data.memo;
            }

            return nextTransaction;
          })
          .filter((item): item is Transaction => item !== null);

        setTransactions(sortTransactions(nextTransactions));
      },
      (error) => {
        console.warn("Failed to subscribe transactions", error);
      },
    );

    const unsubscribeCategories = onSnapshot(
      query(categoriesRef),
      (snapshot) => {
        const nextCategories = snapshot.docs
          .map((item) => item.data().name)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim())
          .sort((a, b) => a.localeCompare(b, "ko"));

        setCategories(nextCategories);
      },
      (error) => {
        console.warn("Failed to subscribe categories", error);
      },
    );

    const unsubscribeRecurring = onSnapshot(
      query(recurringRef),
      (snapshot) => {
        const nextTemplates = snapshot.docs
          .map((item) => {
            const data = item.data();
            const name = typeof data.name === "string" ? data.name.trim() : "";
            const category = typeof data.category === "string" ? data.category.trim() : "";
            const type = data.type === "income" || data.type === "expense" ? data.type : null;
            const amount = Number(data.amount ?? 0);
            if (!name || !category || !type || !Number.isFinite(amount) || amount <= 0) {
              return null;
            }

            const nextTemplate: RecurringTemplate = {
              id: item.id,
              name,
              type,
              amount: Math.round(amount),
              category,
            };
            if (typeof data.memo === "string") {
              nextTemplate.memo = data.memo;
            }

            return nextTemplate;
          })
          .filter((item): item is RecurringTemplate => item !== null);

        setRecurringTemplates(sortRecurringTemplates(nextTemplates));
      },
      (error) => {
        console.warn("Failed to subscribe recurring templates", error);
      },
    );

    const unsubscribeBudget = onSnapshot(
      currentBudgetRef,
      (snapshot) => {
        const raw = snapshot.data()?.amount;
        const nextBudget = Number(raw ?? 0);
        setBudgetState(Number.isFinite(nextBudget) ? Math.max(0, Math.round(nextBudget)) : 0);
      },
      (error) => {
        console.warn("Failed to subscribe monthly budget", error);
      },
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
      unsubscribeRecurring();
      unsubscribeBudget();
    };
  }, [ledgerId]);

  const state = useMemo<AppState>(
    () => ({
      transactions,
      categories,
      budget,
      recurringTemplates,
    }),
    [budget, categories, recurringTemplates, transactions],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addTransaction: async (transaction) => {
        if (!ledgerId) {
          return;
        }

        await setDoc(doc(db, "ledgers", ledgerId, "transactions", transaction.id), {
          type: transaction.type,
          amount: Math.round(transaction.amount),
          category: transaction.category.trim(),
          memo: transaction.memo?.trim() ?? "",
          date: transaction.date,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      },
      updateTransaction: async (transaction) => {
        if (!ledgerId) {
          return;
        }

        await setDoc(
          doc(db, "ledgers", ledgerId, "transactions", transaction.id),
          {
            type: transaction.type,
            amount: Math.round(transaction.amount),
            category: transaction.category.trim(),
            memo: transaction.memo?.trim() ?? "",
            date: transaction.date,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
      deleteTransaction: async (transactionId) => {
        if (!ledgerId) {
          return;
        }

        await deleteDoc(doc(db, "ledgers", ledgerId, "transactions", transactionId));
      },
      setBudget: async (nextBudget) => {
        if (!ledgerId) {
          return;
        }

        const normalized = Math.max(0, Math.round(nextBudget));
        await setDoc(
          doc(
            db,
            "ledgers",
            ledgerId,
            MONTHLY_BUDGET_COLLECTION,
            formatBudgetMonthKey(new Date()),
          ),
          {
            amount: normalized,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
      addCategory: async (category) => {
        const normalized = category.trim();
        if (!normalized || categories.includes(normalized) || !ledgerId) {
          return false;
        }

        await addDoc(collection(db, "ledgers", ledgerId, "categories"), {
          name: normalized,
          createdAt: serverTimestamp(),
        });
        return true;
      },
      removeCategory: async (category) => {
        if (!ledgerId) {
          return;
        }

        const categoriesRef = collection(db, "ledgers", ledgerId, "categories");
        const snapshot = await getDocs(query(categoriesRef, where("name", "==", category)));
        await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
      },
      resetAllData: async () => {
        if (!ledgerId) {
          return;
        }

        await Promise.all([
          deleteAllDocuments(["ledgers", ledgerId, "transactions"]),
          deleteAllDocuments(["ledgers", ledgerId, "recurringTemplates"]),
          deleteAllDocuments(["ledgers", ledgerId, MONTHLY_BUDGET_COLLECTION]),
        ]);
      },
      importBackup: async (next) => {
        if (!ledgerId) {
          return;
        }

        await Promise.all([
          deleteAllDocuments(["ledgers", ledgerId, "transactions"]),
          deleteAllDocuments(["ledgers", ledgerId, "recurringTemplates"]),
          deleteAllDocuments(["ledgers", ledgerId, MONTHLY_BUDGET_COLLECTION]),
          deleteAllDocuments(["ledgers", ledgerId, "categories"]),
        ]);

        await Promise.all([
          ...next.transactions.map((transaction) =>
            setDoc(doc(db, "ledgers", ledgerId, "transactions", transaction.id), {
              type: transaction.type,
              amount: Math.round(transaction.amount),
              category: transaction.category.trim(),
              memo: transaction.memo?.trim() ?? "",
              date: transaction.date,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }),
          ),
          ...next.recurringTemplates.map((template) =>
            setDoc(doc(db, "ledgers", ledgerId, "recurringTemplates", template.id), {
              name: template.name.trim(),
              type: template.type,
              amount: Math.round(template.amount),
              category: template.category.trim(),
              memo: template.memo?.trim() ?? "",
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }),
          ),
          ...next.categories
            .map((category) => category.trim())
            .filter((category, index, items) => category && items.indexOf(category) === index)
            .map((category) =>
              addDoc(collection(db, "ledgers", ledgerId, "categories"), {
                name: category,
                createdAt: serverTimestamp(),
              }),
            ),
        ]);

        if (next.budget > 0) {
          await setDoc(
            doc(
              db,
              "ledgers",
              ledgerId,
              MONTHLY_BUDGET_COLLECTION,
              formatBudgetMonthKey(new Date()),
            ),
            {
              amount: Math.max(0, Math.round(next.budget)),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      },
      addRecurringTemplate: async (template: RecurringTemplate) => {
        if (!ledgerId) {
          return;
        }

        await setDoc(doc(db, "ledgers", ledgerId, "recurringTemplates", template.id), {
          name: template.name.trim(),
          type: template.type,
          amount: Math.round(template.amount),
          category: template.category.trim(),
          memo: template.memo?.trim() ?? "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      },
      updateRecurringTemplate: async (template: RecurringTemplate) => {
        if (!ledgerId) {
          return;
        }

        await setDoc(
          doc(db, "ledgers", ledgerId, "recurringTemplates", template.id),
          {
            name: template.name.trim(),
            type: template.type,
            amount: Math.round(template.amount),
            category: template.category.trim(),
            memo: template.memo?.trim() ?? "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
      removeRecurringTemplate: async (id: string) => {
        if (!ledgerId) {
          return;
        }

        await deleteDoc(doc(db, "ledgers", ledgerId, "recurringTemplates", id));
      },
    }),
    [categories, ledgerId, state],
  );

  return (
    <LedgerIdContext.Provider value={ledgerId}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </LedgerIdContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}

export function useLedgerId() {
  return useContext(LedgerIdContext);
}
