import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  LayoutGrid,
  ListChecks,
  Settings as SettingsIcon,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from './ui/Button';
import { haptic } from '../telegram/webapp';

interface GuideSection {
  icon: LucideIcon;
  title: string;
  items: string[];
}

const SECTIONS: GuideSection[] = [
  {
    icon: LayoutGrid,
    title: 'Главная',
    items: [
      'Общий баланс всех счетов — сразу в вашей базовой валюте.',
      '«Обязательные платежи» — сумма расходов на 30 дней, «Свободно» — сколько остаётся.',
      'Нажмите на счёт в списке, чтобы быстро изменить его баланс.',
      'Ниже — ближайшие платежи на 30 дней с датами и статусом.',
    ],
  },
  {
    icon: Wallet,
    title: 'Счета',
    items: [
      'Кнопка «+» вверху — создать счёт: название, валюта, начальный баланс, иконка и цвет.',
      'Нажмите на счёт, чтобы пополнить или списать средства.',
      'Свайп влево по счёту — изменить или удалить его.',
    ],
  },
  {
    icon: ListChecks,
    title: 'Расходы',
    items: [
      'Кнопка «+» вверху — добавить регулярный платёж (подписка, аренда, кредит и т.д.).',
      'Периодичность: раз в неделю / месяц / год, каждые 2, 3 или 6 месяцев, или разовый платёж.',
      'Свайп влево по расходу — отметить оплаченным (сумма спишется со счёта) или отменить, а также изменить или удалить.',
      'Поиск и фильтр по категориям — над списком.',
      'Категория «Другое» при создании расхода позволяет добавить свою категорию; крестик рядом со своей категорией — удалить её.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Аналитика',
    items: [
      'Структура расходов по категориям — кольцевая диаграмма.',
      'Динамика трат по месяцам.',
      'Переключение периода: неделя / месяц / год.',
    ],
  },
  {
    icon: SettingsIcon,
    title: 'Настройки',
    items: [
      'Базовая валюта — в неё пересчитываются все сводные цифры.',
      'Цвет кнопок и тема (следует за оформлением Telegram).',
      'Экспорт данных в JSON и полный сброс.',
      'Данные синхронизируются между устройствами через Telegram — там же можно проверить синхронизацию.',
    ],
  },
];

export function OnboardingGuide({ onClose }: { onClose: () => void }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex flex-col bg-[var(--tg-bg)]"
      >
        <div className="flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-4">
          <div className="mx-auto flex max-w-[560px] flex-col">
            <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[var(--tg-button)]/12 text-[var(--tg-button)]">
              <Wallet size={28} />
            </div>
            <h1 className="mt-3 text-[26px] font-bold tracking-tight text-[var(--tg-text)]">
              Как пользоваться
            </h1>
            <p className="mt-1 text-[14px] text-[var(--tg-hint)]">
              Приложение помогает вести счета, планировать обязательные платежи и
              видеть, сколько денег свободно. Вот что можно делать на каждой вкладке.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {SECTIONS.map((section) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] bg-[var(--tg-secondary-bg)] p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-button)]/12 text-[var(--tg-button)]">
                      <section.icon size={18} />
                    </div>
                    <h2 className="text-[17px] font-semibold text-[var(--tg-text)]">
                      {section.title}
                    </h2>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tg-button)]" />
                        <span className="text-[var(--tg-text)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--tg-separator)] bg-[var(--tg-bg)] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="mx-auto max-w-[560px]">
            <Button
              className="w-full"
              onClick={() => {
                haptic('medium');
                onClose();
              }}
            >
              Понятно, начать
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
