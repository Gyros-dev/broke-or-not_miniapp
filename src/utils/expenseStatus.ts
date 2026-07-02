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

/** Прибавляет к дате `months` месяцев, сохраняя число (с обрезкой под длину месяца). */
function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return clampDay(shifted.getFullYear(), shifted.getMonth(), day);
}

/**
 * Начало текущего цикла для интервального расхода: самое позднее вхождение
 * (якорь + k·N месяцев), которое ≤ today. null — если today раньше самого
 * первого платежа (расход ещё не начался).
 */
function intervalCycleStart(
  anchorIso: string,
  intervalMonths: number,
  today: Date,
): Date | null {
  const anchor = startOfDay(new Date(anchorIso));
  if (today < anchor) return null;
  const monthsDiff =
    (today.getFullYear() - anchor.getFullYear()) * 12 +
    (today.getMonth() - anchor.getMonth());
  let k = Math.max(0, Math.floor(monthsDiff / intervalMonths));
  while (k > 0 && startOfDay(addMonths(anchor, k * intervalMonths)) > today) k--;
  while (startOfDay(addMonths(anchor, (k + 1) * intervalMonths)) <= today) k++;
  return startOfDay(addMonths(anchor, k * intervalMonths));
}

/** Ближайшая дата платежа для текущего периода (месяц/неделя/год/интервал). */
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

    case 'interval': {
      if (!expense.dueDate || !expense.intervalMonths) return null;
      // Пока расход не начался — показываем первый платёж (якорь) как ближайший.
      return (
        intervalCycleStart(expense.dueDate, expense.intervalMonths, today) ??
        startOfDay(new Date(expense.dueDate))
      );
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
            : // интервал: цикл начинается с текущего вхождения (== dueDate)
              expense.recurrence === 'interval'
              ? dueDate
              : new Date(0);
    if (paidAt >= periodStart) return 'paid';
  }

  return today > dueDate ? 'overdue' : 'pending';
}
