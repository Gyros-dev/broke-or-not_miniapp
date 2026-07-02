import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Sheet } from '../components/ui/Sheet';
import { SwipeableRow } from '../components/ui/SwipeableRow';
import { Icon } from '../components/ui/Icon';
import { formatMoney } from '../utils/format';
import { COMMON_CURRENCIES } from '../services/currency';
import { ACCOUNT_COLORS, ACCOUNT_ICONS } from '../constants';
import type { Account } from '../types';

function AccountForm({
  initial,
  onSubmit,
}: {
  initial?: Account;
  onSubmit: (data: {
    name: string;
    currency: string;
    balance: number;
    icon: string;
    color: string;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
  const [balance, setBalance] = useState(initial ? String(initial.balance) : '');
  const [icon, setIcon] = useState(initial?.icon ?? ACCOUNT_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLORS[0]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
          Название
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Карта"
          className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
            Валюта
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
            Баланс
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
          Иконка
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_ICONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: icon === i ? `${color}33` : 'var(--tg-bg)',
                color: icon === i ? color : 'var(--tg-hint)',
              }}
            >
              <Icon name={i} size={18} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
          Цвет
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-8 w-8 rounded-full"
              style={{
                background: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      <Button
        disabled={!name.trim()}
        onClick={() =>
          onSubmit({
            name: name.trim(),
            currency,
            balance: Number(balance) || 0,
            icon,
            color,
          })
        }
      >
        {initial ? 'Сохранить' : 'Создать счёт'}
      </Button>
    </div>
  );
}

export function AccountsScreen({
  initialAdjustAccountId,
  onConsumeInitialAdjust,
}: {
  initialAdjustAccountId?: string | null;
  onConsumeInitialAdjust?: () => void;
} = {}) {
  const { accounts, addAccount, updateAccount, deleteAccount, adjustBalance } =
    useData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [adjusting, setAdjusting] = useState<Account | null>(null);

  useEffect(() => {
    if (!initialAdjustAccountId) return;
    const account = accounts.find((a) => a.id === initialAdjustAccountId);
    if (account) setAdjusting(account);
    onConsumeInitialAdjust?.();
  }, [initialAdjustAccountId, accounts, onConsumeInitialAdjust]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Счета"
        action={
          <button
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-button)]/10 text-[var(--tg-button)]"
          >
            <Plus size={20} />
          </button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Пока нет счетов"
          description="Добавьте наличные, карту или накопительный счёт"
          actionLabel="Добавить счёт"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <div className="mx-4 mt-2 flex flex-col gap-3">
          {accounts.map((account) => (
            <SwipeableRow
              key={account.id}
              actions={[
                {
                  key: 'edit',
                  label: 'Изменить',
                  icon: Pencil,
                  bg: 'var(--tg-hint)',
                  onClick: () => {
                    setEditing(account);
                    setSheetOpen(true);
                  },
                },
                {
                  key: 'delete',
                  label: 'Удалить',
                  icon: Trash2,
                  bg: 'var(--tg-destructive)',
                  onClick: () => deleteAccount(account.id),
                },
              ]}
            >
              <Card
                className="flex items-center gap-3 p-4"
                onClick={() => setAdjusting(account)}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${account.color}22`, color: account.color }}
                >
                  <Icon name={account.icon ?? 'Wallet'} size={20} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium text-[var(--tg-text)]">
                    {account.name}
                  </p>
                  <p className="text-[12px] text-[var(--tg-hint)]">{account.currency}</p>
                </div>
                <p className="text-[17px] font-semibold text-[var(--tg-text)]">
                  {formatMoney(account.balance, account.currency)}
                </p>
              </Card>
            </SwipeableRow>
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Изменить счёт' : 'Новый счёт'}
      >
        <AccountForm
          initial={editing ?? undefined}
          onSubmit={async (data) => {
            if (editing) {
              await updateAccount(editing.id, data);
            } else {
              await addAccount(data);
            }
            setSheetOpen(false);
          }}
        />
      </Sheet>

      <Sheet
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title={`Баланс: ${adjusting?.name ?? ''}`}
      >
        {adjusting && (
          <BalanceAdjustForm
            account={adjusting}
            onSubmit={async (delta, note) => {
              await adjustBalance(adjusting.id, delta, note);
              setAdjusting(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

type BalanceMode = 'income' | 'expense';

const BALANCE_MODE_LABELS: Record<BalanceMode, string> = {
  income: 'Пополнение',
  expense: 'Списание',
};

const BALANCE_MODE_COLORS: Record<BalanceMode, string> = {
  income: '#34c759',
  expense: '#ff3b30',
};

function BalanceAdjustForm({
  account,
  onSubmit,
}: {
  account: Account;
  onSubmit: (delta: number, note?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<BalanceMode>('income');

  const handleSubmit = () => {
    const value = Math.abs(Number(amount));
    onSubmit(mode === 'income' ? value : -value, note || undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="number"
        inputMode="decimal"
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Сумма в ${account.currency}`}
        className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
      />
      <div className="flex gap-2">
        {(Object.keys(BALANCE_MODE_LABELS) as BalanceMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold"
            style={{
              background: mode === m ? `${BALANCE_MODE_COLORS[m]}22` : 'var(--tg-bg)',
              color: mode === m ? BALANCE_MODE_COLORS[m] : 'var(--tg-hint)',
            }}
          >
            {BALANCE_MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Комментарий (необязательно)"
        className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
      />
      <Button disabled={amount.trim() === ''} onClick={handleSubmit}>
        Применить
      </Button>
    </div>
  );
}
