import { motion, useAnimation, type PanInfo } from 'framer-motion';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { haptic } from '../../telegram/webapp';

const ACTION_WIDTH = 72;

export interface SwipeAction {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Цвет фона кнопки действия (CSS-переменная или hex). */
  bg: string;
  /** Цвет иконки и подписи, по умолчанию белый. */
  color?: string;
  onClick: () => void;
}

export function SwipeableRow({
  children,
  actions,
}: {
  children: ReactNode;
  actions: SwipeAction[];
}) {
  const controls = useAnimation();
  const revealWidth = ACTION_WIDTH * actions.length;

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -revealWidth / 2) {
      haptic('light');
      controls.start({ x: -revealWidth });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => {
              haptic('medium');
              controls.start({ x: 0 });
              action.onClick();
            }}
            style={{ width: ACTION_WIDTH, background: action.bg, color: action.color ?? '#fff' }}
            className="flex flex-col items-center justify-center gap-1"
          >
            <action.icon size={18} />
            <span className="px-1 text-center text-[11px] leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={0.05}
        animate={controls}
        onDragEnd={handleDragEnd}
        className="relative bg-[var(--tg-secondary-bg)]"
      >
        {children}
      </motion.div>
    </div>
  );
}
