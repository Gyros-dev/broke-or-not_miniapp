import type { ExpenseItem, ExpenseStatus } from '../types';

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Ближайшая дата платежа для текущего периода (месяц/неделя/год). */
export function getCurrentPeriodDueDate(
  expense: ExpenseItem,
  now: Date = new Date(),
): Date | null {
  const today = startOfDay(now);

  switch (expense.recurrence) {
    case 'once':
    case 'custom':
      return expense.dueDate ? startOfDay(new Date(expense.dueDate)) : null;

    case 'monthly': {
      if (!expense.dueDay) return null;
      return clampDay(today.getFullYear(), today.getMonth(), expense.dueDay);
    }

    case 'weekly': {
      if (expense.dueDay === undefined) return null;
      const currentDow = today.getDay();
      const diff = expense.dueDay - currentDow;
      const result = new Date(today);
      result.setDate(today.getDate() + diff);
      return result;
    }

    case 'yearly': {
      if (!expense.dueDate) return null;
      const src = new Date(expense.dueDate);
      return clampDay(today.getFullYear(), src.getMonth(), src.getDate());
    }

    default:
      return null;
  }
}

export function computeExpenseStatus(
  expense: ExpenseItem,
  now: Date = new Date(),
): ExpenseStatus {
  const today = startOfDay(now);
  const dueDate = getCurrentPeriodDueDate(expense, now);
  if (!dueDate) return 'pending';

  if (expense.lastPaidAt) {
    const paidAt = startOfDay(new Date(expense.lastPaidAt));
    const periodStart =
      expense.recurrence === 'monthly'
        ? new Date(today.getFullYear(), today.getMonth(), 1)
        : expense.recurrence === 'yearly'
          ? new Date(today.getFullYear(), 0, 1)
          : expense.recurrence === 'weekly'
            ? new Date(today.getTime() - today.getDay() * 86400000)
            : new Date(0);
    if (paidAt >= periodStart) return 'paid';
  }

  return today > dueDate ? 'overdue' : 'pending';
}
