import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { ExpenseStatus } from '../../types';

const CONFIG: Record<
  ExpenseStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  paid: { label: 'Оплачено', color: '#34c759', bg: 'rgba(52,199,89,0.12)', icon: CheckCircle2 },
  pending: { label: 'Ожидается', color: '#ff9500', bg: 'rgba(255,149,0,0.12)', icon: Clock },
  overdue: { label: 'Просрочено', color: '#ff3b30', bg: 'rgba(255,59,48,0.12)', icon: AlertTriangle },
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const { label, color, bg, icon: IconComponent } = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg }}
    >
      <IconComponent size={12} />
      {label}
    </span>
  );
}
