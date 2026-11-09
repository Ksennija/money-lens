function monthDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

export function formatMonth(month: string): string {
  return monthDate(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatMonthName(month: string): string {
  return monthDate(month).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
}

export function nextMonth(month: string): string {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 7);
}
