export interface CalendarDay {
  readonly date: Date;
  readonly day: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly key: string;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Grade do mês em 6 semanas × 7 dias, começando no domingo (padrão brasileiro).
 * `month` é 0–11, como em `Date`.
 */
export function monthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + weekday);
      days.push({
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: sameDay(date, today),
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export function monthLabel(year: number, month: number): string {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "AAAA-MM-DD" (local) para a data de hoje. */
export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
