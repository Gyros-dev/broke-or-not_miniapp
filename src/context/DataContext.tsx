import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { storage, resetAllData as resetAllDataInStorage } from '../services/storage';
import { getExchangeRates, convertAmount } from '../services/currency';
import { computeExpenseStatus } from '../utils/expenseStatus';
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

  // Рефы держат самое свежее состояние и обновляются синхронно при каждой
  // записи (persistX ниже). Мутаторы читают из рефов, а не из замыкания
  // useState — иначе при быстрых повторных нажатиях (напр. оплатить/отменить)
  // несколько обработчиков видели бы один и тот же устаревший снимок и
  // затирали изменения друг друга, из-за чего баланс расходился.
  const accountsRef = useRef<Account[]>([]);
  const expensesRef = useRef<ExpenseItem[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const categoriesRef = useRef<Category[]>(DEFAULT_CATEGORIES);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

  const loadAllFromStorage = useCallback(async () => {
    const [a, e, t, c, s] = await Promise.all([
      loadJson(KEYS.accounts, [] as Account[]),
      loadJson(KEYS.expenses, [] as ExpenseItem[]),
      loadJson(KEYS.transactions, [] as Transaction[]),
      loadJson(KEYS.categories, DEFAULT_CATEGORIES),
      loadJson(KEYS.settings, DEFAULT_SETTINGS),
    ]);
    accountsRef.current = a;
    expensesRef.current = e;
    transactionsRef.current = t;
    categoriesRef.current = c;
    settingsRef.current = s;
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
    await Promise.all(
      Object.values(KEYS).map(async (key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          await storage.setItem(key, raw);
        }
      }),
    );
  }, []);

  // Локальные данные показываем сразу, не дожидаясь сети — CloudStorage
  // может отвечать медленно, и блокировать первый рендер на нём не стоит.
  // Синхронизация с облаком (подтянуть свежее + досослать локальное)
  // происходит следом, в фоне, и обновляет экран, когда действительно есть
  // что обновлять.
  useEffect(() => {
    (async () => {
      await loadAllFromStorage();
      setLoading(false);

      await storage.syncFromCloud(Object.values(KEYS));
      await loadAllFromStorage();
      await pushLocalToCloud();
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

  // persistX — единственные писатели: синхронно обновляют реф (источник
  // истины для чтения в мутаторах), затем состояние для рендера, затем
  // отправляют снимок в storage. Обновление рефа ДО setState гарантирует,
  // что следующий вызов (даже в том же кадре) увидит уже свежие данные.
  const persistAccounts = useCallback((next: Account[]) => {
    accountsRef.current = next;
    setAccounts(next);
    return storage.setItem(KEYS.accounts, JSON.stringify(next));
  }, []);

  const persistExpenses = useCallback((next: ExpenseItem[]) => {
    expensesRef.current = next;
    setExpenses(next);
    return storage.setItem(KEYS.expenses, JSON.stringify(next));
  }, []);

  const persistTransactions = useCallback((next: Transaction[]) => {
    transactionsRef.current = next;
    setTransactions(next);
    return storage.setItem(KEYS.transactions, JSON.stringify(next));
  }, []);

  const persistSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    return storage.setItem(KEYS.settings, JSON.stringify(next));
  }, []);

  const persistCategories = useCallback((next: Category[]) => {
    categoriesRef.current = next;
    setCategories(next);
    return storage.setItem(KEYS.categories, JSON.stringify(next));
  }, []);

  const addAccount: DataContextValue['addAccount'] = useCallback(
    async (input) => {
      const account: Account = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      await persistAccounts([...accountsRef.current, account]);
      return account;
    },
    [persistAccounts],
  );

  const updateAccount: DataContextValue['updateAccount'] = useCallback(
    async (id, patch) => {
      await persistAccounts(
        accountsRef.current.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
    },
    [persistAccounts],
  );

  const deleteAccount: DataContextValue['deleteAccount'] = useCallback(
    async (id) => {
      await persistAccounts(accountsRef.current.filter((a) => a.id !== id));
    },
    [persistAccounts],
  );

  const adjustBalance: DataContextValue['adjustBalance'] = useCallback(
    async (accountId, delta, note, type) => {
      if (delta === 0) return;
      const account = accountsRef.current.find((a) => a.id === accountId);
      if (!account) return;
      await persistAccounts(
        accountsRef.current.map((a) =>
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
      await persistTransactions([tx, ...transactionsRef.current]);
    },
    [persistAccounts, persistTransactions],
  );

  const addCategory: DataContextValue['addCategory'] = useCallback(
    async (input) => {
      const category: Category = { ...input, id: uid() };
      await persistCategories([...categoriesRef.current, category]);
      return category;
    },
    [persistCategories],
  );

  const updateCategory: DataContextValue['updateCategory'] = useCallback(
    async (id, patch) => {
      await persistCategories(
        categoriesRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [persistCategories],
  );

  const deleteCategory: DataContextValue['deleteCategory'] = useCallback(
    async (id) => {
      await persistCategories(categoriesRef.current.filter((c) => c.id !== id));
    },
    [persistCategories],
  );

  const addExpense: DataContextValue['addExpense'] = useCallback(
    async (input) => {
      const expense: ExpenseItem = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      await persistExpenses([...expensesRef.current, expense]);
      return expense;
    },
    [persistExpenses],
  );

  const updateExpense: DataContextValue['updateExpense'] = useCallback(
    async (id, patch) => {
      await persistExpenses(
        expensesRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [persistExpenses],
  );

  const deleteExpense: DataContextValue['deleteExpense'] = useCallback(
    async (id) => {
      // Удаляем только определение расхода. Уже совершённые платежи
      // (транзакции и списанный баланс) — это факт истории, его не трогаем.
      await persistExpenses(expensesRef.current.filter((e) => e.id !== id));
    },
    [persistExpenses],
  );

  const markExpensePaid: DataContextValue['markExpensePaid'] = useCallback(
    async (id, accountId) => {
      const expense = expensesRef.current.find((e) => e.id === id);
      if (!expense) return;
      // Идемпотентность: если уже оплачено за текущий период — ничего не
      // делаем. Защищает от двойного списания при быстрых повторных тапах.
      if (computeExpenseStatus(expense) === 'paid') return;

      const now = new Date().toISOString();
      await persistExpenses(
        expensesRef.current.map((e) =>
          e.id === id ? { ...e, lastPaidAt: now } : e,
        ),
      );
      const targetAccountId = accountId ?? expense.accountId;
      if (!targetAccountId) return;
      const account = accountsRef.current.find((a) => a.id === targetAccountId);
      if (!account) return;

      await persistAccounts(
        accountsRef.current.map((a) =>
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
      await persistTransactions([tx, ...transactionsRef.current]);
    },
    [persistExpenses, persistAccounts, persistTransactions],
  );

  const revertExpensePayment: DataContextValue['revertExpensePayment'] = useCallback(
    async (id) => {
      const expense = expensesRef.current.find((e) => e.id === id);
      // Идемпотентность: откатывать нечего, если сейчас не «оплачено».
      if (!expense || computeExpenseStatus(expense) !== 'paid') return;

      const linkedTx = transactionsRef.current
        .filter((t) => t.linkedExpenseId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      await persistExpenses(
        expensesRef.current.map((e) =>
          e.id === id ? { ...e, lastPaidAt: undefined } : e,
        ),
      );
      if (!linkedTx) return;

      const account = accountsRef.current.find((a) => a.id === linkedTx.accountId);
      if (account) {
        await persistAccounts(
          accountsRef.current.map((a) =>
            a.id === linkedTx.accountId
              ? { ...a, balance: a.balance + linkedTx.amount }
              : a,
          ),
        );
      }
      await persistTransactions(
        transactionsRef.current.filter((t) => t.id !== linkedTx.id),
      );
    },
    [persistExpenses, persistAccounts, persistTransactions],
  );

  const addTransaction: DataContextValue['addTransaction'] = useCallback(
    async (input) => {
      const tx: Transaction = { ...input, id: uid() };
      await persistTransactions([tx, ...transactionsRef.current]);
      return tx;
    },
    [persistTransactions],
  );

  const deleteTransaction: DataContextValue['deleteTransaction'] = useCallback(
    async (id) => {
      await persistTransactions(
        transactionsRef.current.filter((t) => t.id !== id),
      );
    },
    [persistTransactions],
  );

  const setBaseCurrency: DataContextValue['setBaseCurrency'] = useCallback(
    async (currency) => {
      await persistSettings({ ...settingsRef.current, baseCurrency: currency });
    },
    [persistSettings],
  );

  const setAccentColor: DataContextValue['setAccentColor'] = useCallback(
    async (color) => {
      await persistSettings({ ...settingsRef.current, accentColor: color });
    },
    [persistSettings],
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
    accountsRef.current = [];
    expensesRef.current = [];
    transactionsRef.current = [];
    categoriesRef.current = DEFAULT_CATEGORIES;
    settingsRef.current = DEFAULT_SETTINGS;
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
