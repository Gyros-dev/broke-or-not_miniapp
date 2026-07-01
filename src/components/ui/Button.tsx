import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { haptic } from '../../telegram/webapp';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--tg-button)] text-[var(--tg-button-text)]',
  secondary:
    'bg-[var(--tg-bg)] text-[var(--tg-link)] border border-[var(--tg-separator)]',
  destructive: 'bg-[var(--tg-destructive)] text-white',
  plain: 'text-[var(--tg-link)]',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={(e) => {
        haptic('light');
        onClick?.(e);
      }}
      className={`rounded-[14px] px-4 py-3 font-semibold text-[15px] transition-opacity active:opacity-60 disabled:opacity-40 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
