'use client';

import React, { useEffect, useMemo, useState } from 'react';

// 型定義（最低限 / 後で Supabase の自動生成型に差し替え可能）
import type { Database } from '@/types/database.types';
type IncomeRow = Database['public']['Tables']['income']['Row'];

export default function IncomePage(): JSX.Element {
  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [from, setFrom] = useState<string>(''); // YYYY-MM-DD
  const [to, setTo] = useState<string>(''); // YYYY-MM-DD
  const [loading, setLoading] = useState<boolean>(true);
  const [errMsg, setErrMsg] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [limit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const q = filter.trim();

  const load = async (): Promise<void> => {
    setLoading(true);
    setErrMsg('');
    try {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      sp.set('limit', String(limit));
      sp.set('offset', String(offset));

      const res = await fetch(`/api/income?${sp.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: Income[]; count?: number };
      setIncomes(Array.isArray(json.data) ? json.data : []);
      setTotalCount(typeof json.count === 'number' ? json.count : 0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setErrMsg('収入履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to, offset]);

  const resetForm = (): void => {
    setAmount('');
    setSource('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrMsg('');
    try {
      const payload = { source, amount };
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? JSON.stringify({ id: editingId, ...payload }) : JSON.stringify(payload);

      const res = await fetch('/api/income', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      resetForm();
      await load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setErrMsg(editingId ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  const handleEdit = (row: Income): void => {
    setEditingId(row.id);
    setSource(row.source ?? '');
    setAmount(String(row.amount ?? ''));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('削除しますか？')) return;
    try {
      const res = await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setErrMsg('削除に失敗しました');
    }
  };

  const total = useMemo<number>(() => {
    return incomes.reduce((sum, row) => {
      const n = Number(row.amount);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  }, [incomes]);

  // 月範囲をワンタップで入れる補助（今月）
  const setThisMonth = (): void => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
    setFrom(fmt(first));
    setTo(fmt(last));
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">収入</h1>

      {/* 入力/編集フォーム */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mb-6">
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
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-700 text-white py-2 px-4 rounded hover:bg-blue-800 transition-colors">
            {editingId ? '更新' : '保存'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="border border-gray-500 py-2 px-4 rounded hover:bg-gray-800">
              キャンセル
            </button>
          )}
        </div>
        {errMsg && <p className="text-red-400">{errMsg}</p>}
      </form>

      {/* フィルタ＆ヘッダ */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1">収入の内容</label>
          <input
            type="text"
            placeholder="収入の内容 を検索"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
            className="p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <label className="text-sm mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setOffset(0);
              }}
              className="p-2 border border-gray-600 rounded bg-gray-800 text-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setOffset(0);
              }}
              className="p-2 border border-gray-600 rounded bg-gray-800 text-white"
            />
          </div>
          <button type="button" onClick={setThisMonth} className="h-10 px-3 bg-gray-700 rounded hover:bg-gray-600">
            今月
          </button>
        </div>
        <div className="ml-auto">
          <div className="text-sm text-gray-400">件数: {totalCount.toLocaleString()} / 合計: {total.toLocaleString()} 円</div>
        </div>
      </div>

      {/* 一覧 */}
      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : incomes.length === 0 ? (
        <p className="text-gray-400">データがありません。</p>
      ) : (
        <ul className="space-y-2">
          {incomes.map((income) => {
            const amt = Number(income?.amount);
            const created = income?.created_at ? new Date(income.created_at).toLocaleString() : '—';
            return (
              <li key={income.id} className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-white">{income?.source ?? '(無題)'}</h3>
                    <p className="text-sm text-gray-400">入力日時: {created}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-white text-xl font-semibold">
                      {Number.isFinite(amt) ? amt.toLocaleString() : '—'}円
                    </p>
                    <button
                      onClick={() => handleEdit(income)}
                      className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ページング */}
      <div className="flex gap-2 mt-6">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
        >
          前へ
        </button>
        <button
          disabled={offset + limit >= totalCount}
          onClick={() => setOffset(offset + limit)}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
        >
          次へ
        </button>
      </div>
    </div>
  );
}