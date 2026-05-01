'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

function addMonths(yyyyMM: string, delta: number): string {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

type Props = { month: string };

export default function MonthNav({ month }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (m: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('month', m);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [year, monthNum] = month.split('-').map(Number);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(addMonths(month, -1))}
        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        aria-label="前月"
      >
        ‹
      </button>

      <select
        value={month}
        onChange={(e) => go(e.target.value)}
        className="bg-gray-800 text-white text-sm rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-blue-500"
      >
        {monthOptions().map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <button
        onClick={() => go(addMonths(month, 1))}
        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        aria-label="翌月"
      >
        ›
      </button>

      <span className="text-gray-400 text-sm hidden sm:inline">
        {year}年{monthNum}月
      </span>
    </div>
  );
}
