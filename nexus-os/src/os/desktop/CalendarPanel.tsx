'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { localDateKey, monthGrid, monthLabel, parseDateKey, shiftMonth, WEEKDAY_INITIALS } from './calendar';

const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function subscribeDay(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

/** Data de hoje, atualizada na virada do dia. */
function useToday(): Date {
  const key = useSyncExternalStore(
    subscribeDay,
    () => localDateKey(new Date()),
    () => '1970-01-01',
  );
  return useMemo(() => parseDateKey(key), [key]);
}

export function CalendarPanel() {
  const today = useToday();
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const weeks = monthGrid(cursor.year, cursor.month, today);

  return (
    <div data-testid="calendar" className="w-72 p-4">
      <p className="type-label text-slate">{fullDate.format(today)}</p>
      <div className="mt-3 flex items-center justify-between">
        <h3 className="text-lg font-medium tracking-[-0.02em]" aria-live="polite">
          {monthLabel(cursor.year, cursor.month)}
        </h3>
        <div className="flex">
          <MonthButton label="Mês anterior" icon="chevronLeft" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))} />
          <MonthButton label="Próximo mês" icon="chevronRight" onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))} />
        </div>
      </div>
      <table className="mt-3 w-full table-fixed text-center text-sm">
        <thead>
          <tr className="type-label text-slate">
            {WEEKDAY_INITIALS.map((initial, index) => (
              <th key={index} scope="col" className="pb-2 font-normal">
                {initial}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.key}>
              {week.map((day) => (
                <td key={day.key} className="p-0.5">
                  <span
                    aria-current={day.isToday ? 'date' : undefined}
                    className={cn(
                      'mx-auto flex size-8 items-center justify-center tabular-nums',
                      day.inMonth ? 'text-paper/80' : 'text-paper/24',
                      day.isToday && 'border border-signal text-paper',
                    )}
                  >
                    {day.day}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthButton({ label, icon, onClick }: { label: string; icon: 'chevronLeft' | 'chevronRight'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center text-paper/56 hover:text-paper"
    >
      <Icon name={icon} />
    </button>
  );
}
