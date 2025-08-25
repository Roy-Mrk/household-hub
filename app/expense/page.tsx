'use client';

import { useEffect, useMemo, useState } from 'react';
import { readApiError } from '@/lib/ui/readApiError';
import EditEntryModal from '@/components/EditEntryModal';

import type { Database } from '@/types/database.types';

type ExpenseRow = Database['public']['Tables']['expense']['Row'];
export default function ExpensePage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [filter, setFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseRow | null>(null);
  const [modalErr, setModalErr] = useState('');

  const q = filter.trim();

  const load = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      sp.set('limit', String(limit));
      sp.set('offset', String(offset));

      const res = await fetch(`/api/expense?${sp.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const msg = await readApiError(res);
        setErrMsg(msg || `HTTP ${res.status}`);
        setExpenses([]);
        setTotalCount(0);
        return;
      }
      const json = (await res.json()) as { data?: ExpenseRow[]; count?: number };
      setExpenses(Array.isArray(json.data) ? json.data : []);
      setTotalCount(typeof json.count === 'number' ? json.count : 0);
    } catch (e) {
      console.error(e);
      setErrMsg('支出履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to, offset]);

  const handleSave = async (payload: { id?: number; source: string; amount: number }) => {
    try {
      const method = payload.id ? 'PATCH' : 'POST';
      const body = payload.id ? JSON.stringify(payload) : JSON.stringify({ source: payload.source, amount: payload.amount });
      const res = await fetch('/api/expense', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        setModalErr(msg);
        return;
      }
      setModalOpen(false);
      setEditItem(null);
      await load();
    } catch (e) {
      console.error(e);
      setModalErr(payload.id ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  const handleEdit = (row: ExpenseRow) => {
    setEditItem(row);
    setModalErr('');
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('削除しますか？')) return;
    try {
      const res = await fetch(`/api/expense?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await readApiError(res);
        setErrMsg(msg);
        return;
      }
      await load();
    } catch (e) {
      console.error(e);
      setErrMsg('削除に失敗しました');
    }
  };

  const total = useMemo(() => {
    return expenses.reduce((sum, row) => {
      const n = Number(row.amount);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  }, [expenses]);

  const setThisMonth = () => {
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
      <h1 className="text-2xl font-bold mb-4">支出</h1>

      {/* 新規追加ボタン */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => {
            setEditItem(null); // 新規
            setModalErr('');
            setModalOpen(true);
          }}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          新規追加
        </button>
      </div>

      {/* フィルタ＆ヘッダ */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1">内容</label>
          <input
            type="text"
            placeholder="内容を検索"
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
      ) : expenses.length === 0 ? (
        <p className="text-gray-400">データがありません。</p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((row) => {
            const amt = Number(row?.amount);
            const created = row?.created_at ? new Date(row.created_at).toLocaleString() : '—';
            return (
              <li key={row.id} className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-white">{row?.source ?? '(無題)'}</h3>
                    <p className="text-sm text-gray-400">入力日時: {created}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-white text-xl font-semibold">
                      {Number.isFinite(amt) ? amt.toLocaleString() : '—'}円
                    </p>
                    <button onClick={() => handleEdit(row)} className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500">
                      編集
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500">
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

      <EditEntryModal
        open={modalOpen}
        title={editItem ? '支出を編集' : '支出を追加'}
        initial={editItem ? { id: editItem.id, source: editItem.source, amount: editItem.amount } : null}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        error={modalErr}
        setError={setModalErr}
      />
    </div>
  );
}