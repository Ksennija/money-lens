// The server sends ISO dates (2026-09-30); the CSV and the pages use DD.MM.YYYY. Splitting the
// text keeps a time zone from shifting the day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}
