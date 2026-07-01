import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { formatMoney } from '../utils/format';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
};

function periodStart(period: Period): Date {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(now.getDate() - 7);
  if (period === 'month') start.setMonth(now.getMonth() - 1);
  if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  return start;
}

export function AnalyticsScreen() {
  const { transactions, categories, settings, convert } = useData();
  const [period, setPeriod] = useState<Period>('month');

  const filteredTx = useMemo(() => {
    const from = periodStart(period);
    return transactions.filter(
      (t) => t.type === 'expense' && new Date(t.date) >= from,
    );
  }, [transactions, period]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of filteredTx) {
      const key = tx.category ?? 'other';
      const converted = convert(tx.amount, tx.currency);
      totals.set(key, (totals.get(key) ?? 0) + converted);
    }
    return Array.from(totals.entries())
      .map(([id, value]) => {
        const category = categories.find((c) => c.id === id);
        return {
          id,
          name: category?.name ?? 'Другое',
          color: category?.color ?? '#8e8e93',
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, categories, convert]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; expense: number; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('ru-RU', { month: 'short' }),
        expense: 0,
        income: 0,
      });
    }
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (!bucket) continue;
      const converted = convert(tx.amount, tx.currency);
      if (tx.type === 'expense') bucket.expense += converted;
      if (tx.type === 'income') bucket.income += converted;
    }
    return months;
  }, [transactions, convert]);

  const totalExpense = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div className="pb-6">
      <ScreenHeader title="Аналитика" />

      <div className="mx-4 mt-2 flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="flex-1 rounded-[12px] py-2 text-[14px] font-semibold"
            style={{
              background: period === p ? 'var(--tg-button)' : 'var(--tg-secondary-bg)',
              color: period === p ? 'var(--tg-button-text)' : 'var(--tg-hint)',
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Пока нет данных"
          description="Аналитика появится, как только вы добавите транзакции"
        />
      ) : (
        <>
          <div className="mx-4 mt-4">
            <Card className="p-4">
              <h2 className="mb-2 text-[15px] font-semibold text-[var(--tg-text)]">
                Структура расходов
              </h2>
              {categoryBreakdown.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-[var(--tg-hint)]">
                  Нет расходов за период
                </p>
              ) : (
                <>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {categoryBreakdown.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            formatMoney(Number(value), settings.baseCurrency)
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {categoryBreakdown.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: c.color }}
                          />
                          <span className="text-[var(--tg-text)]">{c.name}</span>
                        </span>
                        <span className="text-[var(--tg-hint)]">
                          {totalExpense > 0 ? Math.round((c.value / totalExpense) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="mx-4 mt-4">
            <Card className="p-4">
              <h2 className="mb-2 text-[15px] font-semibold text-[var(--tg-text)]">
                Динамика по месяцам
              </h2>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tg-separator)" />
                    <XAxis
                      dataKey="label"
                      stroke="var(--tg-hint)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--tg-hint)" fontSize={12} tickLine={false} width={40} />
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value), settings.baseCurrency)}
                    />
                    <Bar dataKey="income" fill="#34c759" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ff3b30" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
