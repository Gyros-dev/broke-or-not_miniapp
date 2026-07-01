import { motion, useAnimation, type PanInfo } from 'framer-motion';
import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { haptic } from '../../telegram/webapp';

const ACTION_WIDTH = 72;

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
}: {
  children: ReactNode;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const controls = useAnimation();
  const revealWidth = onEdit ? ACTION_WIDTH * 2 : ACTION_WIDTH;

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
        {onEdit && (
          <button
            onClick={() => {
              haptic('medium');
              controls.start({ x: 0 });
              onEdit();
            }}
            style={{ width: ACTION_WIDTH }}
            className="flex flex-col items-center justify-center gap-1 bg-[var(--tg-hint)] text-white"
          >
            <Pencil size={18} />
            <span className="text-[11px]">Изменить</span>
          </button>
        )}
        <button
          onClick={() => {
            haptic('medium');
            onDelete();
          }}
          style={{ width: ACTION_WIDTH }}
          className="flex flex-col items-center justify-center gap-1 bg-[var(--tg-destructive)] text-white"
        >
          <Trash2 size={18} />
          <span className="text-[11px]">Удалить</span>
        </button>
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
