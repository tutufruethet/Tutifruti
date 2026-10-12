const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** Tamanho legível em pt-BR: 1536 → "1,5 KB". */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} ${UNITS[unit]}`;
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function formatDateTime(timestamp: number): string {
  return dateTime.format(timestamp);
}
