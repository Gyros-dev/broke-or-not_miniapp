import { useMemo, useState } from 'react';
import { ListChecks, Pencil, Plus, Search, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Sheet } from '../components/ui/Sheet';
import { SwipeableRow } from '../components/ui/SwipeableRow';
import { Icon } from '../components/ui/Icon';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatMoney } from '../utils/format';
import { computeExpenseStatus } from '../utils/expenseStatus';
import { COMMON_CURRENCIES } from '../services/currency';
import { ACCOUNT_COLORS, CATEGORY_ICONS, DEFAULT_CATEGORIES } from '../constants';
import { confirmAction } from '../telegram/webapp';
import type { Category, ExpenseItem, Recurrence } from '../types';

function isCustomCategory(category: Category): boolean {
  return !DEFAULT_CATEGORIES.some((dc) => dc.id === category.id);
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  once: 'Разовый',
  monthly: 'Ежемесячно',
  weekly: 'Еженедельно',
  yearly: 'Ежегодно',
  custom: 'Произвольная дата',
};

function ExpenseForm({
  initial,
  onSubmit,
}: {
  initial?: ExpenseItem;
  onSubmit: (
    data: Omit<ExpenseItem, 'id' | 'createdAt' | 'lastPaidAt'>,
  ) => void;
}) {
  const { categories, accounts, addCategory, deleteCategory } = useData();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(String(initial?.amount ?? ''));
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.id ?? '');
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? 'monthly');
  const [dueDay, setDueDay] = useState(String(initial?.dueDay ?? '1'));
  const [dueDate, setDueDate] = useState(
    initial?.dueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [addingCategory, setAddingCategory] = useState(false);

  const handleDeleteCategory = async (cat: Category) => {
    const confirmed = await confirmAction(`Удалить категорию «${cat.name}»?`);
    if (!confirmed) return;
    await deleteCategory(cat.id);
    if (category === cat.id) {
      setCategory(categories.find((c) => c.id !== cat.id)?.id ?? '');
    }
  };

  const needsDueDay = recurrence === 'monthly' || recurrence === 'weekly';
  const needsDueDate = recurrence === 'once' || recurrence === 'custom' || recurrence === 'yearly';

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название (например, Netflix)"
        className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
      />

      <div className="flex gap-3">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Сумма"
          className="flex-1 rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
        >
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {addingCategory ? (
        <CategoryForm
          onBack={() => setAddingCategory(false)}
          onSubmit={async (data) => {
            const created = await addCategory(data);
            setCategory(created.id);
            setAddingCategory(false);
          }}
        />
      ) : (
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
            Категория
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const deletable = isCustomCategory(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center overflow-hidden rounded-full"
                  style={{ background: category === c.id ? `${c.color}33` : 'var(--tg-bg)' }}
                >
                  <button
                    onClick={() =>
                      c.id === 'other' ? setAddingCategory(true) : setCategory(c.id)
                    }
                    className="flex items-center gap-1.5 py-1.5 pl-3 text-[13px] font-medium"
                    style={{
                      color: category === c.id ? c.color : 'var(--tg-hint)',
                      paddingRight: deletable ? 4 : 12,
                    }}
                  >
                    <Icon name={c.icon} size={14} />
                    {c.name}
                    {c.id === 'other' && <Plus size={12} />}
                  </button>
                  {deletable && (
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      aria-label={`Удалить категорию ${c.name}`}
                      className="flex h-full items-center py-1.5 pr-2.5 pl-1 text-[var(--tg-hint)]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!addingCategory && (
        <>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
              Периодичность
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
              className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
            >
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {needsDueDay && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
                {recurrence === 'monthly' ? 'Число месяца' : 'День недели (0 — вс)'}
              </label>
              <input
                type="number"
                min={recurrence === 'monthly' ? 1 : 0}
                max={recurrence === 'monthly' ? 31 : 6}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
              />
            </div>
          )}

          {needsDueDate && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
                Дата платежа
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
              />
            </div>
          )}

          {accounts.length > 0 && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
                Списывать со счёта
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            disabled={!title.trim() || !Number(amount)}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                amount: Number(amount),
                currency,
                category,
                recurrence,
                dueDay: needsDueDay ? Number(dueDay) : undefined,
                dueDate: needsDueDate ? new Date(dueDate).toISOString() : undefined,
                accountId: accountId || undefined,
              })
            }
          >
            {initial ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      )}
    </div>
  );
}

function CategoryForm({
  initial,
  onBack,
  onSubmit,
}: {
  initial?: Category;
  onBack: () => void;
  onSubmit: (data: { name: string; icon: string; color: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLORS[0]);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start text-[14px] font-medium text-[var(--tg-link)]"
      >
        ← К категориям
      </button>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название категории"
        className="w-full rounded-[12px] bg-[var(--tg-bg)] px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
      />

      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--tg-hint)]">
          Иконка
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICONS.map((i) => (
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
        onClick={() => onSubmit({ name: name.trim(), icon, color })}
      >
        {initial ? 'Сохранить' : 'Создать категорию'}
      </Button>
    </div>
  );
}

export function ExpensesScreen() {
  const { expenses, categories, addExpense, updateExpense, deleteExpense, markExpensePaid, revertExpensePayment } =
    useData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => !categoryFilter || e.category === categoryFilter)
      .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => computeExpenseStatus(a).localeCompare(computeExpenseStatus(b)));
  }, [expenses, categoryFilter, query]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Расходы"
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

      {expenses.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Нет обязательных расходов"
          description="Добавьте подписки, аренду, кредиты и другие регулярные платежи"
          actionLabel="Добавить расход"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <>
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-[12px] bg-[var(--tg-secondary-bg)] px-3 py-2">
            <Search size={16} color="var(--tg-hint)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="w-full bg-transparent text-[15px] text-[var(--tg-text)] outline-none"
            />
          </div>

          <div className="mx-4 mt-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter(null)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium"
              style={{
                background: !categoryFilter ? 'var(--tg-button)' : 'var(--tg-secondary-bg)',
                color: !categoryFilter ? 'var(--tg-button-text)' : 'var(--tg-hint)',
              }}
            >
              Все
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium"
                style={{
                  background: categoryFilter === c.id ? c.color : 'var(--tg-secondary-bg)',
                  color: categoryFilter === c.id ? '#fff' : 'var(--tg-hint)',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="mx-4 mt-3 flex flex-col gap-3">
            {filtered.map((expense) => {
              const category = categories.find((c) => c.id === expense.category);
              const status = computeExpenseStatus(expense);
              return (
                <SwipeableRow
                  key={expense.id}
                  onEdit={() => {
                    setEditing(expense);
                    setSheetOpen(true);
                  }}
                  onDelete={() => deleteExpense(expense.id)}
                >
                  <Card
                    className="flex items-center gap-3 p-4"
                    onClick={() =>
                      status === 'paid'
                        ? revertExpensePayment(expense.id)
                        : markExpensePaid(expense.id)
                    }
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${category?.color}22`, color: category?.color }}
                    >
                      <Icon name={category?.icon ?? 'MoreHorizontal'} size={20} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[15px] font-medium text-[var(--tg-text)]">
                        {expense.title}
                      </p>
                      <p className="text-[12px] text-[var(--tg-hint)]">
                        {RECURRENCE_LABELS[expense.recurrence]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-semibold text-[var(--tg-text)]">
                        {formatMoney(expense.amount, expense.currency)}
                      </p>
                      <StatusBadge status={status} />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(expense);
                        setSheetOpen(true);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--tg-hint)] active:opacity-60"
                    >
                      <Pencil size={16} />
                    </button>
                  </Card>
                </SwipeableRow>
              );
            })}
          </div>
        </>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Изменить расход' : 'Новый расход'}
      >
        <ExpenseForm
          initial={editing ?? undefined}
          onSubmit={async (data) => {
            if (editing) {
              await updateExpense(editing.id, data);
            } else {
              await addExpense(data);
            }
            setSheetOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}
