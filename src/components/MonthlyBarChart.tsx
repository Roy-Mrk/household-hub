'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type MonthlyData = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

function formatYen(n: number) {
  if (Math.abs(n) >= 10000) return `¥${Math.round(n / 10000)}万`;
  return `¥${new Intl.NumberFormat('ja-JP').format(n)}`;
}

function shortMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-');
  return `${y.slice(2)}/${Number(m)}`;
}

const LEGEND_LABELS: Record<string, string> = {
  income: '収入',
  expense: '支出',
};

export default function MonthlyBarChart({ months = 12 }: { months?: number }) {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/report/monthly?months=${months}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(j => setData(j.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-52 flex items-center justify-center text-red-400 text-sm">
        データの取得に失敗しました
      </div>
    );
  }

  if (data.every(d => d.income === 0 && d.expense === 0)) {
    return (
      <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
        データなし
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={208}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="month"
          tickFormatter={shortMonth}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <YAxis
          tickFormatter={formatYen}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          width={52}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `¥${new Intl.NumberFormat('ja-JP').format(value)}`,
            LEGEND_LABELS[name] ?? name,
          ]}
          labelFormatter={(label: string) => label}
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
          labelStyle={{ color: '#e5e7eb' }}
          itemStyle={{ color: '#e5e7eb' }}
        />
        <Legend formatter={(value: string) => LEGEND_LABELS[value] ?? value} />
        <Bar dataKey="income"  name="income"  fill="#4ade80" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" name="expense" fill="#f87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
