// app/income/page.js
'use client';

import { useEffect, useState } from 'react';

export default function Income() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  // /api/income の GET を叩いて一覧取得（サーバー経由に統一）
  const fetchIncomes = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const res = await fetch('/api/income', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setIncomes(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error('fetchIncomes error:', e);
      setErrMsg('収入履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, amount }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAmount('');
      setSource('');
      await fetchIncomes(); // 保存後に一覧更新
    } catch (e) {
      console.error('save error:', e);
      setErrMsg('保存に失敗しました');
    }
  };

  // フィルタ安全化（null対策）
  const filteredIncomes = incomes.filter((income) =>
    ((income?.source ?? '') + '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">収入の入力</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <input
          type="text"
          placeholder="収入の内容"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
        />
        <input
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white py-2 rounded hover:bg-blue-800 transition-colors"
        >
          保存
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">収入履歴</h2>

        <input
          type="text"
          placeholder="フィルタ"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 mb-4"
        />

        {loading ? (
          <p className="text-gray-400">読み込み中...</p>
        ) : errMsg ? (
          <p className="text-red-400">{errMsg}</p>
        ) : filteredIncomes.length === 0 ? (
          <p className="text-gray-400">データがありません。</p>
        ) : (
          <ul className="space-y-2">
            {filteredIncomes.map((income) => {
              const amt = Number(income?.amount);
              const created =
                income?.created_at
                  ? new Date(income.created_at).toLocaleString()
                  : '—';
              return (
                <li
                  key={income.id}
                  className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-white">{income?.source ?? '(無題)'}</h3>
                    <p className="text-sm text-gray-400">入力日時: {created}</p>
                  </div>
                  <p className="text-white text-xl font-semibold">
                    {Number.isFinite(amt) ? amt.toLocaleString() : '—'}円
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}