import type { ReactNode } from 'react';

export function ScreenHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1">
      <h1 className="text-[28px] font-bold tracking-tight text-[var(--tg-text)]">
        {title}
      </h1>
      {action}
    </div>
  );
}
