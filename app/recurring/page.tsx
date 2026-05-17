'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readApiError } from '@/lib/ui/readApiError';
import RecurringEntryModal, { type RecurringEntry } from '@/components/RecurringEntryModal';

type RecurringRow = RecurringEntry & {
  id: number;
  next_apply_date: string;
  is_active: boolean;
  subcategory?: { name: string; category?: { name: string } | null } | null;
};

export default function RecurringPage() {
  const [entries, setEntries] = useState<RecurringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringRow | null>(null);
  const [modalErr, setModalErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const res = await fetch('/api/recurring', { cache: 'no-store' });
      if (!res.ok) { setErrMsg(await readApiError(res) || `HTTP ${res.status}`); return; }
      const json = await res.json() as { data?: RecurringRow[] };
      setEntries(Array.isArray(json.data) ? json.data : []);
    } catch {
      setErrMsg('データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (payload: RecurringEntry & { amount: number }) => {
    try {
      const method = payload.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/recurring', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setModalErr(await readApiError(res)); return; }
      setModalOpen(false);
      setEditItem(null);
      await load();
    } catch {
      setModalErr(payload.id ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('削除しますか？')) return;
    try {
      const res = await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { setErrMsg(await readApiError(res)); return; }
      await load();
    } catch {
      setErrMsg('削除に失敗しました');
    }
  };

  const handleToggleActive = async (row: RecurringRow) => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
      });
      if (!res.ok) { setErrMsg(await readApiError(res)); return; }
      await load();
    } catch {
      setErrMsg('更新に失敗しました');
    }
  };

  const freqLabel = (row: RecurringRow) => {
    if (row.frequency === 'monthly') return `毎月 ${row.day_of_month}日`;
    return `毎年 ${row.month_of_year}月 ${row.day_of_month}日`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold mb-4">繰り返しエントリ</h1>

      <div className="mb-6">
        <button type="button"
          onClick={() => { setEditItem(null); setModalErr(''); setModalOpen(true); }}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
          新規追加
        </button>
      </div>

      {errMsg && <p className="mb-4 text-red-400">{errMsg}</p>}

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400">繰り返しエントリがありません。</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((row) => (
            <li key={row.id} className={`bg-gray-800 rounded p-4 ${!row.is_active ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.type === 'income' ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'
                    }`}>
                      {row.type === 'income' ? '収入' : '支出'}
                    </span>
                    <h3 className="font-bold text-white">{row.source}</h3>
                    {!row.is_active && <span className="text-xs text-gray-500">（停止中）</span>}
                  </div>
                  <p className="text-xl font-semibold mt-1">{Number(row.amount).toLocaleString()}円</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {freqLabel(row)}
                    <span className="ml-3">次回: {row.next_apply_date}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    カテゴリ: {row.subcategory
                      ? (row.subcategory.category ? `${row.subcategory.category.name} › ${row.subcategory.name}` : row.subcategory.name)
                      : '未分類'}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.owner === 'shared' ? 'bg-purple-800 text-purple-200' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {row.owner === 'shared' ? '家族共有' : '自分'}
                    </span>
                    {row.needs_settlement && (
                      <span className="inline-block rounded-full bg-yellow-700 px-2 py-0.5 text-xs font-medium text-yellow-200">
                        精算待ち
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleToggleActive(row)}
                    className={`rounded px-3 py-1 text-sm ${row.is_active ? 'bg-gray-600 hover:bg-gray-500' : 'bg-blue-800 hover:bg-blue-700'}`}>
                    {row.is_active ? '停止' : '有効化'}
                  </button>
                  <button onClick={() => { setEditItem(row); setModalErr(''); setModalOpen(true); }}
                    className="rounded bg-yellow-600 px-3 py-1 text-sm hover:bg-yellow-500">
                    編集
                  </button>
                  <button onClick={() => handleDelete(row.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500">
                    削除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecurringEntryModal
        open={modalOpen}
        title={editItem ? '繰り返しエントリを編集' : '繰り返しエントリを追加'}
        initial={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave}
        error={modalErr}
        setError={setModalErr}
      />
    </div>
  );
}
