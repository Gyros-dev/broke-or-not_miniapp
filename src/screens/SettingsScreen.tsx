import { Ban, Download, Moon, Sun } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTelegramTheme } from '../hooks/useTelegramTheme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { COMMON_CURRENCIES } from '../services/currency';
import { ACCOUNT_COLORS } from '../constants';
import { haptic } from '../telegram/webapp';

export function SettingsScreen() {
  const { settings, setBaseCurrency, setAccentColor, exportData, accounts, expenses } =
    useData();
  const scheme = useTelegramTheme(settings.accentColor);

  const handleExport = () => {
    haptic('medium');
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-6">
      <ScreenHeader title="Настройки" />

      <div className="mx-4 mt-2">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Базовая валюта
        </h2>
        <Card className="p-2">
          <select
            value={settings.baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="w-full rounded-[12px] bg-transparent px-3 py-2.5 text-[15px] text-[var(--tg-text)] outline-none"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Card>
        <p className="mt-2 px-1 text-[12px] text-[var(--tg-hint)]">
          Все сводные суммы пересчитываются в эту валюту по актуальному курсу
        </p>
      </div>

      <div className="mx-4 mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Оформление
        </h2>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            {scheme === 'dark' ? (
              <Moon size={18} color="var(--tg-hint)" />
            ) : (
              <Sun size={18} color="var(--tg-hint)" />
            )}
            <p className="text-[15px] text-[var(--tg-text)]">
              Тема синхронизирована с Telegram ({scheme === 'dark' ? 'тёмная' : 'светлая'})
            </p>
          </div>

          <div className="mt-4 border-t border-[var(--tg-separator)] pt-4">
            <p className="mb-2 text-[13px] font-medium text-[var(--tg-hint)]">Цвет кнопок</p>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className="h-8 w-8 rounded-full"
                  style={{
                    background: c,
                    outline: settings.accentColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
              <button
                onClick={() => setAccentColor(undefined)}
                title="Как в Telegram"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--tg-separator)]"
                style={{
                  outline: !settings.accentColor ? '2px solid var(--tg-hint)' : 'none',
                  outlineOffset: 2,
                }}
              >
                <Ban size={16} color="var(--tg-hint)" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mx-4 mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Данные
        </h2>
        <Card className="p-4">
          <p className="text-[13px] text-[var(--tg-hint)]">
            Счетов: {accounts.length} · Расходов: {expenses.length}
          </p>
          <button
            onClick={handleExport}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--tg-button)] py-3 text-[15px] font-semibold text-[var(--tg-button-text)] active:opacity-70"
          >
            <Download size={16} />
            Экспортировать в JSON
          </button>
        </Card>
      </div>
    </div>
  );
}
