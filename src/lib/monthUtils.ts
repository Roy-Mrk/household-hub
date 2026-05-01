export function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonth(raw: string | null | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return currentYYYYMM();
}

export function monthToRange(yyyyMM: string): { from: string; to: string } {
  const [y, m] = yyyyMM.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}
