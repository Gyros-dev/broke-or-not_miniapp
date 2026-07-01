import type { ExpenseItem } from '../types';
import { computeExpenseStatus, getCurrentPeriodDueDate } from './expenseStatus';

export interface UpcomingEntry {
  expense: ExpenseItem;
  dueDate: Date;
  status: ReturnType<typeof computeExpenseStatus>;
}

/** Список обязательных платежей на ближайшие `days` дней, включая просроченные. */
export function getUpcomingEntries(
  expenses: ExpenseItem[],
  days = 30,
  now: Date = new Date(),
): UpcomingEntry[] {
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  const entries: UpcomingEntry[] = [];
  for (const expense of expenses) {
    const dueDate = getCurrentPeriodDueDate(expense, now);
    if (!dueDate) continue;
    const status = computeExpenseStatus(expense, now);
    if (status === 'paid') continue;
    if (dueDate <= horizon) {
      entries.push({ expense, dueDate, status });
    }
  }
  return entries.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}
