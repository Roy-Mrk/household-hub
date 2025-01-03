"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Income() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [filter, setFilter] = useState(''); // フィルタ用の状態を追加

  // データ取得
  const fetchIncomes = async () => {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching incomes:', error);
    } else {
      setIncomes(data);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source, amount }),
      });
      if (!response.ok) {
        throw new Error('Failed to save income data');
      }
      console.log('Income data saved successfully');
      setAmount('');
      setSource('');
      // Re-fetch income data to update the list
      fetchIncomes();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // フィルタリングされた収入データ
  const filteredIncomes = incomes.filter(income =>
    income.source.toLowerCase().includes(filter.toLowerCase())
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

        <ul className="space-y-2">
          {filteredIncomes.map((income) => (
            <li
              key={income.id}
              className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-lg text-white">{income.source}</h3>
                <p className="text-sm text-gray-400">
                  入力日時: {new Date(income.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-white text-xl font-semibold">{income.amount.toLocaleString()}円</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}