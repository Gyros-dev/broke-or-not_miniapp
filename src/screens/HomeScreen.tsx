import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Icon } from '../components/ui/Icon';
import { formatDate, formatMoney } from '../utils/format';
import { getUpcomingEntries } from '../utils/upcoming';

export function HomeScreen({
  onGoToAccounts,
  onOpenAccount,
}: {
  onGoToAccounts: () => void;
  onOpenAccount: (accountId: string) => void;
}) {
  const { loading, accounts, expenses, categories, settings, convert } = useData();

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + convert(a.balance, a.currency), 0),
    [accounts, convert],
  );

  const upcoming = useMemo(() => getUpcomingEntries(expenses, 30), [expenses]);

  const upcomingSum = useMemo(
    () =>
      upcoming.reduce(
        (sum, e) => sum + convert(e.expense.amount, e.expense.currency),
        0,
      ),
    [upcoming, convert],
  );

  const free = totalBalance - upcomingSum;

  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <div>
        <ScreenHeader title="Бюджет" />
        <EmptyState
          icon={Wallet}
          title="Добавьте первый счёт"
          description="Создайте счёт (наличные, карта, накопления), чтобы начать учёт финансов"
          actionLabel="Перейти к счетам"
          onAction={onGoToAccounts}
        />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <ScreenHeader title="Бюджет" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-2"
      >
        <Card className="p-5">
          <p className="text-[13px] font-medium text-[var(--tg-hint)]">
            Общий баланс
          </p>
          <p className="mt-1 text-[34px] font-bold tracking-tight text-[var(--tg-text)]">
            {formatMoney(totalBalance, settings.baseCurrency)}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--tg-separator)] pt-3">
            <div>
              <p className="text-[12px] text-[var(--tg-hint)]">Обязательные платежи</p>
              <p className="text-[16px] font-semibold text-[var(--tg-text)]">
                {formatMoney(upcomingSum, settings.baseCurrency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[var(--tg-hint)]">Свободно</p>
              <p
                className="text-[16px] font-semibold"
                style={{ color: free >= 0 ? '#34c759' : '#ff3b30' }}
              >
                {formatMoney(free, settings.baseCurrency)}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="mx-4 mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Счета
        </h2>
        <Card className="divide-y divide-[var(--tg-separator)]">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => onOpenAccount(account.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-70"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${account.color}22`, color: account.color }}
              >
                <Icon name={account.icon ?? 'Wallet'} size={18} />
              </div>
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--tg-text)]">
                {account.name}
              </p>
              <div className="text-right">
                <p className="text-[15px] font-semibold text-[var(--tg-text)]">
                  {formatMoney(account.balance, account.currency)}
                </p>
                {account.currency !== settings.baseCurrency && (
                  <p className="text-[12px] text-[var(--tg-hint)]">
                    {formatMoney(convert(account.balance, account.currency), settings.baseCurrency)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </Card>
      </div>

      <div className="mx-4 mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Ближайшие 30 дней
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-5 text-center text-[14px] text-[var(--tg-hint)]">
            Нет предстоящих платежей
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--tg-separator)]">
            {upcoming.slice(0, 8).map(({ expense, dueDate, status }) => {
              const category = categories.find((c) => c.id === expense.category);
              return (
                <div key={expense.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `${category?.color ?? '#8e8e93'}22`,
                      color: category?.color ?? '#8e8e93',
                    }}
                  >
                    <Icon name={category?.icon ?? 'MoreHorizontal'} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-[var(--tg-text)]">
                      {expense.title}
                    </p>
                    <p className="text-[12px] text-[var(--tg-hint)]">
                      {formatDate(dueDate.toISOString())}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold text-[var(--tg-text)]">
                      {formatMoney(expense.amount, expense.currency)}
                    </p>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
