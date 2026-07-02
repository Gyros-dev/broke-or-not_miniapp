import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage, resetAllData as resetAllDataInStorage } from '../services/storage';
import { getExchangeRates, convertAmount } from '../services/currency';
import { DEFAULT_CATEGORIES } from '../constants';
import type {
  Account,
  AppSettings,
  Category,
  ExchangeRates,
  ExpenseItem,
  Transaction,
  TransactionType,
} from '../types';

const KEYS = {
  accounts: 'accounts',
  expenses: 'expenses',
  transactions: 'transactions',
  categories: 'categories',
  settings: 'settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = { baseCurrency: 'USD' };

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(): string {
  return crypto.randomUUID();
}

interface DataContextValue {
  loading: boolean;
  accounts: Account[];
  expenses: ExpenseItem[];
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  rates: ExchangeRates | null;

  addAccount: (input: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  adjustBalance: (
    accountId: string,
    delta: number,
    note?: string,
    type?: TransactionType,
  ) => Promise<void>;

  addCategory: (input: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addExpense: (
    input: Omit<ExpenseItem, 'id' | 'createdAt'>,
  ) => Promise<ExpenseItem>;
  updateExpense: (id: string, patch: Partial<ExpenseItem>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markExpensePaid: (id: string, accountId?: string) => Promise<void>;
  revertExpensePayment: (id: string) => Promise<void>;

  addTransaction: (input: Omit<Transaction, 'id'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

  setBaseCurrency: (currency: string) => Promise<void>;
  setAccentColor: (color?: string) => Promise<void>;
  convert: (amount: number, from: string, to?: string) => number;
  exportData: () => string;
  resetAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  const loadAllFromStorage = useCallback(async () => {
    const [a, e, t, c, s] = await Promise.all([
      loadJson(KEYS.accounts, [] as Account[]),
      loadJson(KEYS.expenses, [] as ExpenseItem[]),
      loadJson(KEYS.transactions, [] as Transaction[]),
      loadJson(KEYS.categories, DEFAULT_CATEGORIES),
      loadJson(KEYS.settings, DEFAULT_SETTINGS),
    ]);
    setAccounts(a);
    setExpenses(e);
    setTransactions(t);
    setCategories(c);
    setSettings(s);
  }, []);

  // Данные, созданные до того как CloudStorage заработал (или на устройстве,
  // где он был недоступен), лежат только в localStorage и никогда не
  // попадали в облако — persistX пишет туда только при НОВЫХ изменениях, а
  // не при обычной загрузке. Один раз при старте досылаем то, что уже есть
  // локально, чтобы другие устройства тоже это увидели.
  const pushLocalToCloud = useCallback(async () => {
    for (const key of Object.values(KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        await storage.setItem(key, raw);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      await storage.syncFromCloud(Object.values(KEYS));
      await loadAllFromStorage();
      await pushLocalToCloud();
      setLoading(false);
    })();
  }, [loadAllFromStorage, pushLocalToCloud]);

  // Telegram CloudStorage не умеет пушить изменения в реальном времени, поэтому
  // кросс-платформенная синхронизация приближена опросом: подтягиваем свежие
  // данные при возврате в приложение (открыли на другом устройстве и вернулись)
  // и периодически, пока приложение открыто и видимо на экране.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      await storage.syncFromCloud(Object.values(KEYS));
      if (!cancelled) await loadAllFromStorage();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15000);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
    };
  }, [loadAllFromStorage]);

  useEffect(() => {
    let cancelled = false;
    getExchangeRates(settings.baseCurrency).then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.baseCurrency]);

  const persistAccounts = useCallback(async (next: Account[]) => {
    setAccounts(next);
    await storage.setItem(KEYS.accounts, JSON.stringify(next));
  }, []);

  const persistExpenses = useCallback(async (next: ExpenseItem[]) => {
    setExpenses(next);
    await storage.setItem(KEYS.expenses, JSON.stringify(next));
  }, []);

  const persistTransactions = useCallback(async (next: Transaction[]) => {
    setTransactions(next);
    await storage.setItem(KEYS.transactions, JSON.stringify(next));
  }, []);

  const persistSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    await storage.setItem(KEYS.settings, JSON.stringify(next));
  }, []);

  const addAccount: DataContextValue['addAccount'] = useCallback(
    async (input) => {
      const account: Account = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      await persistAccounts([...accounts, account]);
      return account;
    },
    [accounts, persistAccounts],
  );

  const updateAccount: DataContextValue['updateAccount'] = useCallback(
    async (id, patch) => {
      await persistAccounts(
        accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
    },
    [accounts, persistAccounts],
  );

  const deleteAccount: DataContextValue['deleteAccount'] = useCallback(
    async (id) => {
      await persistAccounts(accounts.filter((a) => a.id !== id));
    },
    [accounts, persistAccounts],
  );

  const adjustBalance: DataContextValue['adjustBalance'] = useCallback(
    async (accountId, delta, note, type) => {
      if (delta === 0) return;
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;
      await persistAccounts(
        accounts.map((a) =>
          a.id === accountId ? { ...a, balance: a.balance + delta } : a,
        ),
      );
      const tx: Transaction = {
        id: uid(),
        accountId,
        amount: Math.abs(delta),
        currency: account.currency,
        type: type ?? (delta >= 0 ? 'income' : 'expense'),
        date: new Date().toISOString(),
        note: note ?? 'Корректировка баланса',
      };
      await persistTransactions([tx, ...transactions]);
    },
    [accounts, transactions, persistAccounts, persistTransactions],
  );

  const persistCategories = useCallback(async (next: Category[]) => {
    setCategories(next);
    await storage.setItem(KEYS.categories, JSON.stringify(next));
  }, []);

  const addCategory: DataContextValue['addCategory'] = useCallback(
    async (input) => {
      const category: Category = { ...input, id: uid() };
      await persistCategories([...categories, category]);
      return category;
    },
    [categories, persistCategories],
  );

  const updateCategory: DataContextValue['updateCategory'] = useCallback(
    async (id, patch) => {
      await persistCategories(
        categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [categories, persistCategories],
  );

  const deleteCategory: DataContextValue['deleteCategory'] = useCallback(
    async (id) => {
      await persistCategories(categories.filter((c) => c.id !== id));
    },
    [categories, persistCategories],
  );

  const addExpense: DataContextValue['addExpense'] = useCallback(
    async (input) => {
      const expense: ExpenseItem = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      await persistExpenses([...expenses, expense]);
      return expense;
    },
    [expenses, persistExpenses],
  );

  const updateExpense: DataContextValue['updateExpense'] = useCallback(
    async (id, patch) => {
      await persistExpenses(
        expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [expenses, persistExpenses],
  );

  const deleteExpense: DataContextValue['deleteExpense'] = useCallback(
    async (id) => {
      await persistExpenses(expenses.filter((e) => e.id !== id));
    },
    [expenses, persistExpenses],
  );

  const markExpensePaid: DataContextValue['markExpensePaid'] = useCallback(
    async (id, accountId) => {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return;
      const now = new Date().toISOString();
      await persistExpenses(
        expenses.map((e) => (e.id === id ? { ...e, lastPaidAt: now } : e)),
      );
      const targetAccountId = accountId ?? expense.accountId;
      if (targetAccountId) {
        const account = accounts.find((a) => a.id === targetAccountId);
        if (account) {
          await persistAccounts(
            accounts.map((a) =>
              a.id === targetAccountId
                ? { ...a, balance: a.balance - expense.amount }
                : a,
            ),
          );
          const tx: Transaction = {
            id: uid(),
            accountId: targetAccountId,
            amount: expense.amount,
            currency: expense.currency,
            type: 'expense',
            category: expense.category,
            date: now,
            note: expense.title,
            linkedExpenseId: expense.id,
          };
          await persistTransactions([tx, ...transactions]);
        }
      }
    },
    [expenses, accounts, transactions, persistExpenses, persistAccounts, persistTransactions],
  );

  const revertExpensePayment: DataContextValue['revertExpensePayment'] = useCallback(
    async (id) => {
      const expense = expenses.find((e) => e.id === id);
      if (!expense || !expense.lastPaidAt) return;

      await persistExpenses(
        expenses.map((e) => (e.id === id ? { ...e, lastPaidAt: undefined } : e)),
      );

      const linkedTx = [...transactions]
        .filter((t) => t.linkedExpenseId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (!linkedTx) return;

      const account = accounts.find((a) => a.id === linkedTx.accountId);
      if (account) {
        await persistAccounts(
          accounts.map((a) =>
            a.id === linkedTx.accountId ? { ...a, balance: a.balance + linkedTx.amount } : a,
          ),
        );
      }
      await persistTransactions(transactions.filter((t) => t.id !== linkedTx.id));
    },
    [expenses, accounts, transactions, persistExpenses, persistAccounts, persistTransactions],
  );

  const addTransaction: DataContextValue['addTransaction'] = useCallback(
    async (input) => {
      const tx: Transaction = { ...input, id: uid() };
      await persistTransactions([tx, ...transactions]);
      return tx;
    },
    [transactions, persistTransactions],
  );

  const deleteTransaction: DataContextValue['deleteTransaction'] = useCallback(
    async (id) => {
      await persistTransactions(transactions.filter((t) => t.id !== id));
    },
    [transactions, persistTransactions],
  );

  const setBaseCurrency: DataContextValue['setBaseCurrency'] = useCallback(
    async (currency) => {
      await persistSettings({ ...settings, baseCurrency: currency });
    },
    [settings, persistSettings],
  );

  const setAccentColor: DataContextValue['setAccentColor'] = useCallback(
    async (color) => {
      await persistSettings({ ...settings, accentColor: color });
    },
    [settings, persistSettings],
  );

  const convert = useCallback(
    (amount: number, from: string, to?: string) =>
      convertAmount(amount, from, to ?? settings.baseCurrency, rates),
    [rates, settings.baseCurrency],
  );

  const exportData = useCallback(() => {
    return JSON.stringify(
      { accounts, expenses, transactions, categories, settings },
      null,
      2,
    );
  }, [accounts, expenses, transactions, categories, settings]);

  const resetAllData: DataContextValue['resetAllData'] = useCallback(async () => {
    await resetAllDataInStorage(Object.values(KEYS));
    setAccounts([]);
    setExpenses([]);
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      accounts,
      expenses,
      transactions,
      categories,
      settings,
      rates,
      addAccount,
      updateAccount,
      deleteAccount,
      adjustBalance,
      addCategory,
      updateCategory,
      deleteCategory,
      addExpense,
      updateExpense,
      deleteExpense,
      markExpensePaid,
      revertExpensePayment,
      addTransaction,
      deleteTransaction,
      setBaseCurrency,
      setAccentColor,
      convert,
      exportData,
      resetAllData,
    }),
    [
      loading,
      accounts,
      expenses,
      transactions,
      categories,
      settings,
      rates,
      addAccount,
      updateAccount,
      deleteAccount,
      adjustBalance,
      addCategory,
      updateCategory,
      deleteCategory,
      addExpense,
      updateExpense,
      deleteExpense,
      markExpensePaid,
      revertExpensePayment,
      addTransaction,
      deleteTransaction,
      setBaseCurrency,
      setAccentColor,
      convert,
      exportData,
      resetAllData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
