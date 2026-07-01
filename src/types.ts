export type Recurrence = 'once' | 'monthly' | 'weekly' | 'yearly' | 'custom';

export type ExpenseStatus = 'paid' | 'pending' | 'overdue';

export type TransactionType = 'income' | 'expense' | 'adjustment';

export interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  recurrence: Recurrence;
  dueDay?: number;
  dueDate?: string;
  accountId?: string;
  createdAt: string;
  lastPaidAt?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category?: string;
  date: string;
  note?: string;
  linkedExpenseId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface AppSettings {
  baseCurrency: string;
  accentColor?: string;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
}

export interface BudgetData {
  accounts: Account[];
  expenses: ExpenseItem[];
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
}
