import { describe, expect, it } from 'vitest';
import { localDateKey, monthGrid, monthLabel, parseDateKey, shiftMonth } from './calendar';

describe('monthGrid', () => {
  it('outubro de 2026 começa numa quinta e tem 31 dias', () => {
    const grid = monthGrid(2026, 9, new Date(2026, 9, 12));
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    const first = grid[0]!;
    expect(first.slice(0, 4).every((day) => !day.inMonth)).toBe(true);
    expect(first[4]).toMatchObject({ day: 1, inMonth: true });
    expect(grid.flat().filter((day) => day.inMonth)).toHaveLength(31);
  });

  it('marca hoje', () => {
    const today = monthGrid(2026, 9, new Date(2026, 9, 12)).flat().filter((day) => day.isToday);
    expect(today.map((day) => day.day)).toEqual([12]);
  });
});

describe('navegação', () => {
  it('vira o ano nos dois sentidos', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('rótulo em português com inicial maiúscula', () => {
    expect(monthLabel(2026, 9)).toBe('Outubro de 2026');
  });
});

describe('chave de data', () => {
  it('ida e volta sem fuso', () => {
    const date = new Date(2026, 0, 5);
    expect(localDateKey(date)).toBe('2026-01-05');
    expect(parseDateKey('2026-01-05').getTime()).toBe(date.getTime());
  });
});
