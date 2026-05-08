'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EditEntryModal from '@/components/EditEntryModal';
import MonthNav from '@/components/MonthNav';
import { readApiError } from '@/lib/ui/readApiError';
import { parseMonth, monthToRange } from '@/lib/monthUtils';

import type { Database } from '@/types/database.types';
type IncomeRow = Database['public']['Tables']['income']['Row'];

export default function IncomePage() {
  const searchParams = useSearchParams();
  const month = parseMonth(searchParams?.get('month'));
  const { from, to } = monthToRange(month);

  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errMsg, setErrMsg] = useState<string>('');
  const [limit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<IncomeRow | null>(null);
  const [modalErr, setModalErr] = useState('');
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
      if (!res.ok) {
        const msg = await readApiError(res);
        setErrMsg(msg || `HTTP ${res.status}`);
        setIncomes([]);
        setTotalCount(0);
        return;
      }
      const json = (await res.json()) as { data?: IncomeRow[]; count?: number };
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
  }, [q, month, offset]);

  const handleEdit = (row: IncomeRow): void => {
    setEditItem(row);
    setModalErr('');
    setModalOpen(true);
  };

  const handleSave = async (payload: { id?: number; source: string; amount: number; subcategory_id: string; entry_date: string; owner: 'self' | 'shared'; needs_settlement: boolean }) => {
    try {
      const method = payload.id ? 'PATCH' : 'POST';
      const body = JSON.stringify(payload.id ? payload : { source: payload.source, amount: payload.amount, subcategory_id: payload.subcategory_id, entry_date: payload.entry_date, owner: payload.owner, needs_settlement: payload.needs_settlement });
      const res = await fetch('/api/income', {
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
  const handleDelete = async (id: number): Promise<void> => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('削除しますか？')) return;
    try {
      const res = await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await readApiError(res);
        setErrMsg(msg);
        return;
      }
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


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold mb-4">収入</h1>

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
      ) : incomes.length === 0 ? (
        <p className="text-gray-400">データがありません。</p>
      ) : (
        <ul className="space-y-2">
          {incomes.map((income) => {
            const amt = Number(income?.amount);
            const entryDate = income?.entry_date ? new Date(income.entry_date).toLocaleDateString() : '—';
            return (
              <li key={income.id} className="bg-gray-800 shadow-md rounded p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-white">{income?.source ?? '(無題)'}</h3>
                    <p className="text-sm text-gray-400">カテゴリ: {(() => {
                        type Sub = { name: string; category?: { name: string } | null } | null;
                        const sub = (income as { subcategory?: Sub }).subcategory;
                        return sub ? (sub.category ? `${sub.category.name} › ${sub.name}` : sub.name) : '未分類';
                      })()}</p>
                    <p className="text-sm text-gray-400">日付: {entryDate}</p>
                    <div className="mt-1 flex gap-1">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        (income as { owner?: string }).owner === 'shared'
                          ? 'bg-purple-800 text-purple-200'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {(income as { owner?: string }).owner === 'shared' ? '家族共有' : '自分'}
                      </span>
                      {(income as { needs_settlement?: boolean }).needs_settlement && (
                        <span className="inline-block rounded-full bg-yellow-700 px-2 py-0.5 text-xs font-medium text-yellow-200">
                          精算待ち
                        </span>
                      )}
                    </div>
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
      <EditEntryModal
        open={modalOpen}
        title={editItem ? '収入を編集' : '収入を追加'}
        type="income"
        initial={editItem ? { id: editItem.id, source: editItem.source, amount: editItem.amount, subcategory_id: (editItem as { subcategory_id?: string }).subcategory_id ?? '', entry_date: editItem.entry_date ?? '', owner: ((editItem as { owner?: string }).owner === 'shared' ? 'shared' : 'self'), needs_settlement: (editItem as { needs_settlement?: boolean }).needs_settlement ?? true } : null}
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
