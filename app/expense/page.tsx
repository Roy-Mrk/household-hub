'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { readApiError } from '@/lib/ui/readApiError';
import EditEntryModal from '@/components/EditEntryModal';
import MonthNav from '@/components/MonthNav';
import { parseMonth, monthToRange } from '@/lib/monthUtils';

import type { Database } from '@/types/database.types';

type ExpenseRow = Database['public']['Tables']['expense']['Row'];
export default function ExpensePage() {
  const searchParams = useSearchParams();
  const month = parseMonth(searchParams?.get('month'));
  const { from, to } = monthToRange(month);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [filter, setFilter] = useState('');
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
  }, [q, month, offset]);

  const handleSave = async (payload: { id?: number; source: string; amount: number; subcategory_id: string; entry_date: string; owner: 'self' | 'shared' }) => {
    try {
      const method = payload.id ? 'PATCH' : 'POST';
      const body = JSON.stringify(
        payload.id
          ? payload
          : { source: payload.source, amount: payload.amount, subcategory_id: payload.subcategory_id, entry_date: payload.entry_date, owner: payload.owner }
      );
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


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← ホームに戻る</Link>
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

      {/* 月切り替え＆フィルタ */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <MonthNav month={month} />
          <div className="text-sm text-gray-400">
            {totalCount.toLocaleString()} 件 / 合計 {total.toLocaleString()} 円
          </div>
        </div>
        <input
          type="text"
          placeholder="内容を検索"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setOffset(0); }}
          className="p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 max-w-xs"
        />
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
            const entryDate = row?.entry_date ? new Date(row.entry_date).toLocaleDateString() : '—';
            return (
              <li key={row.id} className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-white">{row?.source ?? '(無題)'}</h3>
                    <p className="text-sm text-gray-400">カテゴリ: {(() => {
                        type Sub = { name: string; category?: { name: string } | null } | null;
                        const sub = (row as { subcategory?: Sub }).subcategory;
                        return sub ? (sub.category ? `${sub.category.name} › ${sub.name}` : sub.name) : '未分類';
                      })()}</p>
                    <p className="text-sm text-gray-400">日付: {entryDate}</p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      (row as { owner?: string }).owner === 'shared'
                        ? 'bg-purple-800 text-purple-200'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {(row as { owner?: string }).owner === 'shared' ? '家族共有' : '自分'}
                    </span>
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
        type="expense"
        initial={editItem ? { id: editItem.id, source: editItem.source, amount: editItem.amount, subcategory_id: (editItem as { subcategory_id?: string }).subcategory_id ?? '', entry_date: editItem.entry_date ?? '', owner: ((editItem as { owner?: string }).owner === 'shared' ? 'shared' : 'self') } : null}
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