import { BarChart3, LayoutGrid, ListChecks, Settings, Wallet } from 'lucide-react';
import { hapticSelection } from '../../telegram/webapp';

export type Tab = 'home' | 'accounts' | 'expenses' | 'analytics' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'home', label: 'Главная', icon: LayoutGrid },
  { id: 'accounts', label: 'Счета', icon: Wallet },
  { id: 'expenses', label: 'Расходы', icon: ListChecks },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--tg-separator)] bg-[var(--tg-secondary-bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-[560px] items-stretch justify-between px-2">
        {TABS.map(({ id, label, icon: IconComponent }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (id !== active) hapticSelection();
                onChange(id);
              }}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 active:opacity-60"
            >
              <IconComponent
                size={24}
                strokeWidth={isActive ? 2.4 : 2}
                color={isActive ? 'var(--tg-button)' : 'var(--tg-hint)'}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? 'var(--tg-button)' : 'var(--tg-hint)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
