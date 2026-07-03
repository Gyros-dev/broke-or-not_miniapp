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

/**
 * Строка со свайпом в обе стороны: свайп вправо открывает действия слева
 * (leftActions), свайп влево — действия справа (rightActions). Любую сторону
 * можно не задавать.
 */
export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
}: {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
}) {
  const controls = useAnimation();
  const leftWidth = ACTION_WIDTH * leftActions.length; // видно при свайпе вправо
  const rightWidth = ACTION_WIDTH * rightActions.length; // видно при свайпе влево

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (rightWidth > 0 && info.offset.x < -rightWidth / 2) {
      haptic('light');
      controls.start({ x: -rightWidth });
    } else if (leftWidth > 0 && info.offset.x > leftWidth / 2) {
      haptic('light');
      controls.start({ x: leftWidth });
    } else {
      controls.start({ x: 0 });
    }
  };

  const renderAction = (action: SwipeAction) => (
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
      <span className="px-1 text-center text-[11px] leading-tight">{action.label}</span>
    </button>
  );

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map(renderAction)}
        </div>
      )}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map(renderAction)}
        </div>
      )}
      <motion.div
        drag="x"
        dragConstraints={{ left: -rightWidth, right: leftWidth }}
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
