import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[18px] bg-[var(--tg-secondary-bg)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        onClick ? 'active:opacity-70 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
