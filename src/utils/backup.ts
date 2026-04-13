import type {
  AppState,
  RecurringTemplate,
  Transaction,
  TransactionType,
} from "../types";

export const BACKUP_VERSION = 1 as const;

export type BackupFileV1 = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  /** 거래·카테고리·월 예산·반복 거래 프리셋 전체 */
  state: AppState;
};

function isYmd(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function normalizeTransaction(item: unknown): Transaction | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const row = item as Record<string, unknown>;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : "";
  if (!id) {
    return null;
  }

  const typeRaw = row.type;
  const type: TransactionType | null =
    typeRaw === "income" || typeRaw === "expense" ? typeRaw : null;
  if (!type) {
    return null;
  }

  const amountRaw = row.amount;
  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number(amountRaw)
        : NaN;
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const category =
    typeof row.category === "string" && row.category.trim()
      ? row.category.trim()
      : "";
  if (!category) {
    return null;
  }

  const date = typeof row.date === "string" ? row.date : "";
  if (!isYmd(date)) {
    return null;
  }

  let memo: string | undefined;
  if (row.memo !== undefined && row.memo !== null) {
    if (typeof row.memo !== "string") {
      return null;
    }
    memo = row.memo;
  }

  return {
    id,
    type,
    amount: Math.round(amount),
    category,
    memo,
    date,
  };
}

function normalizeRecurringTemplate(item: unknown): RecurringTemplate | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const row = item as Record<string, unknown>;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : "";
  if (!id) {
    return null;
  }
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "";
  if (!name) {
    return null;
  }
  const typeRaw = row.type;
  const type: TransactionType | null =
    typeRaw === "income" || typeRaw === "expense" ? typeRaw : null;
  if (!type) {
    return null;
  }
  const amountRaw = row.amount;
  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number(amountRaw)
        : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const category =
    typeof row.category === "string" && row.category.trim()
      ? row.category.trim()
      : "";
  if (!category) {
    return null;
  }
  let memo: string | undefined;
  if (row.memo !== undefined && row.memo !== null) {
    if (typeof row.memo !== "string") {
      return null;
    }
    memo = row.memo;
  }
  return {
    id,
    name,
    type,
    amount: Math.round(amount),
    category,
    memo,
  };
}

export function normalizeAppState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;

  if (!Array.isArray(r.transactions)) {
    return null;
  }

  const categoriesInput = Array.isArray(r.categories) ? r.categories : [];

  const budgetRaw = r.budget;
  const budget =
    typeof budgetRaw === "number" && Number.isFinite(budgetRaw)
      ? Math.max(0, Math.round(budgetRaw))
      : typeof budgetRaw === "string"
        ? Math.max(0, Math.round(Number(budgetRaw) || 0))
        : 0;

  const transactions: Transaction[] = [];
  for (const item of r.transactions) {
    const t = normalizeTransaction(item);
    if (t) {
      transactions.push(t);
    }
  }
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const categorySet = new Set<string>();
  for (const c of categoriesInput) {
    if (typeof c === "string" && c.trim()) {
      categorySet.add(c.trim());
    }
  }
  for (const t of transactions) {
    categorySet.add(t.category);
  }

  const recurringRaw = Array.isArray(r.recurringTemplates)
    ? r.recurringTemplates
    : [];
  const recurringTemplates: RecurringTemplate[] = [];
  for (const item of recurringRaw) {
    const tpl = normalizeRecurringTemplate(item);
    if (tpl) {
      recurringTemplates.push(tpl);
    }
  }
  for (const tpl of recurringTemplates) {
    categorySet.add(tpl.category);
  }

  return {
    transactions,
    categories: [...categorySet],
    budget,
    recurringTemplates,
  };
}

export function parseBackupJson(text: string): AppState | null {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const root = data as Record<string, unknown>;

  if (root.version === BACKUP_VERSION && root.state && typeof root.state === "object") {
    return normalizeAppState(root.state);
  }

  return normalizeAppState(root);
}

export function createBackupFile(state: AppState): BackupFileV1 {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)) as AppState,
  };
}

export function backupToJsonString(state: AppState): string {
  return JSON.stringify(createBackupFile(state), null, 2);
}
