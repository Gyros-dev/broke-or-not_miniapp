import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tg-button)]/10">
        <IconComponent size={30} color="var(--tg-button)" />
      </div>
      <h3 className="text-[17px] font-semibold text-[var(--tg-text)]">
        {title}
      </h3>
      <p className="max-w-[280px] text-[14px] text-[var(--tg-hint)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
