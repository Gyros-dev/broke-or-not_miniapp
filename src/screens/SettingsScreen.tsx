import { useState } from 'react';
import { AlertTriangle, Ban, BookOpen, CheckCircle2, Download, Moon, RotateCcw, Sun, XCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { hasRealTelegramContext, useTelegramTheme } from '../hooks/useTelegramTheme';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { COMMON_CURRENCIES } from '../services/currency';
import { runCloudDiagnostics, type CloudDiagnostics } from '../services/storage';
import { ACCOUNT_COLORS } from '../constants';
import { confirmAction, haptic, hapticNotification } from '../telegram/webapp';

export function SettingsScreen({ onOpenGuide }: { onOpenGuide: () => void }) {
  const {
    settings,
    setBaseCurrency,
    setAccentColor,
    exportData,
    resetAllData,
    accounts,
    expenses,
  } = useData();
  const scheme = useTelegramTheme(settings.accentColor);
  const themeSource = hasRealTelegramContext() ? 'Telegram' : 'системой устройства';

  const [diagnostics, setDiagnostics] = useState<CloudDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const handleRunDiagnostics = async () => {
    haptic('light');
    setDiagnosticsLoading(true);
    try {
      const result = await runCloudDiagnostics();
      setDiagnostics(result);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirmAction(
      'Удалить все счета, расходы и транзакции на этом устройстве и в облаке? Это необратимо.',
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetAllData();
      hapticNotification('success');
    } finally {
      setResetting(false);
    }
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
              Тема управляется {themeSource} ({scheme === 'dark' ? 'тёмная' : 'светлая'})
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
          Помощь
        </h2>
        <Card className="p-2">
          <button
            onClick={() => {
              haptic('light');
              onOpenGuide();
            }}
            className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left active:opacity-60"
          >
            <BookOpen size={18} color="var(--tg-button)" />
            <span className="text-[15px] text-[var(--tg-text)]">Как пользоваться</span>
          </button>
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
          <Button
            variant="destructive"
            disabled={resetting}
            onClick={handleReset}
            className="mt-2 flex w-full items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            {resetting ? 'Сброс...' : 'Сбросить все данные'}
          </Button>
        </Card>
      </div>

      <div className="mx-4 mt-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--tg-hint)]">
          Синхронизация
        </h2>
        <Card className="p-4">
          <p className="text-[13px] text-[var(--tg-hint)]">
            Живая проверка записи и чтения через Telegram CloudStorage прямо на этом
            устройстве — покажет точную причину, если синхронизация не работает.
          </p>
          <Button
            variant="secondary"
            disabled={diagnosticsLoading}
            onClick={handleRunDiagnostics}
            className="mt-3 w-full"
          >
            {diagnosticsLoading ? 'Проверяю...' : 'Проверить синхронизацию'}
          </Button>

          {diagnostics && (
            <div className="mt-4 flex flex-col gap-2 border-t border-[var(--tg-separator)] pt-4 text-[13px]">
              <DiagnosticRow label="Платформа" value={diagnostics.platform} />
              <DiagnosticRow label="Версия Telegram" value={diagnostics.version} />
              <DiagnosticRow
                label="CloudStorage объект"
                value={diagnostics.hasCloudStorageObject ? 'есть' : 'нет'}
                ok={diagnostics.hasCloudStorageObject}
              />
              <DiagnosticRow
                label="Ключей в облаке"
                value={
                  diagnostics.cloudKeysError
                    ? `ошибка: ${diagnostics.cloudKeysError}`
                    : String(diagnostics.cloudKeysCount ?? '—')
                }
                ok={diagnostics.cloudKeysError ? false : diagnostics.cloudKeysCount !== null}
              />
              <DiagnosticRow
                label="Тестовая запись/чтение"
                value={
                  diagnostics.roundTripOk
                    ? 'успешно'
                    : diagnostics.roundTripError ?? 'не выполнено'
                }
                ok={diagnostics.roundTripOk ?? undefined}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DiagnosticRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[var(--tg-hint)]">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-[var(--tg-text)]">
        {ok === true && <CheckCircle2 size={14} color="#34c759" className="shrink-0" />}
        {ok === false && <XCircle size={14} color="#ff3b30" className="shrink-0" />}
        {ok === undefined && <AlertTriangle size={14} color="#ff9500" className="shrink-0" />}
        {value}
      </span>
    </div>
  );
}
