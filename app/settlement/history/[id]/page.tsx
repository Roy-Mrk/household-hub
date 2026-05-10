'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Payment, SplitRatio } from '@/lib/settlementCalc';

type SettlementItem = {
  item_type: 'income' | 'expense';
  item_id: number;
  source: string;
  amount: number;
  entry_date: string;
  user_id: string;
};

type SettlementDetail = {
  id: string;
  settled_at: string;
  cancelled_at: string | null;
  total_amount: number;
  split_ratios: SplitRatio[];
  payments: Payment[];
  items: SettlementItem[];
};

export default function SettlementDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/settlement/${id}`, { cache: 'no-store' });
        if (!res.ok) { setErrMsg('精算詳細の取得に失敗しました'); return; }
        const json = await res.json() as { data?: SettlementDetail };
        if (json.data) setSettlement(json.data);
      } catch (e) {
        console.error(e);
        setErrMsg('精算詳細の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('この精算をキャンセルしますか？\n対象明細の精算待ちフラグが元に戻ります。')) return;
    setCancelling(true);
    setErrMsg('');
    try {
      const res = await fetch(`/api/settlement/${id}`, { method: 'PATCH' });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setErrMsg(json.error ?? 'キャンセルに失敗しました');
        return;
      }
      setSettlement(prev => prev ? { ...prev, cancelled_at: new Date().toISOString() } : prev);
    } catch (e) {
      console.error(e);
      setErrMsg('キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/settlement/history" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← 履歴に戻る</Link>
      <h1 className="text-2xl font-bold mb-6">精算詳細</h1>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : errMsg || !settlement ? (
        <p className="text-red-400">{errMsg || '精算が見つかりません'}</p>
      ) : (
        <div className="space-y-6">

          {/* 基本情報 */}
          <section className="bg-gray-800 rounded p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">精算日時</p>
                <p className="font-semibold">{new Date(settlement.settled_at).toLocaleString()}</p>
                <p className="mt-2 text-sm text-gray-400">精算合計（支出-収入）</p>
                <p className="font-bold text-xl">{Number(settlement.total_amount).toLocaleString()}円</p>
              </div>
              {settlement.cancelled_at ? (
                <div className="text-right shrink-0">
                  <span className="inline-block rounded-full bg-gray-600 px-3 py-1 text-xs font-medium text-gray-300">
                    キャンセル済み
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{new Date(settlement.cancelled_at).toLocaleString()}</p>
                </div>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="shrink-0 rounded border border-red-700 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900 hover:bg-opacity-30 disabled:opacity-40 transition-colors"
                >
                  {cancelling ? 'キャンセル中...' : '精算をキャンセル'}
                </button>
              )}
            </div>
          </section>

          {/* 分担割合 */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-gray-200">分担割合</h2>
            <ul className="space-y-1">
              {settlement.split_ratios.map(r => (
                <li key={r.user_id} className="flex justify-between text-sm bg-gray-800 rounded px-3 py-2">
                  <span>{r.display_name}</span>
                  <span className="text-gray-300">{r.ratio}%</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 精算内容 */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-gray-200">精算内容</h2>
            {settlement.payments.length === 0 ? (
              <p className="text-gray-400">精算不要（全員均等）</p>
            ) : (
              <ul className="space-y-2">
                {settlement.payments.map((p, i) => (
                  <li key={i} className="bg-blue-900 bg-opacity-40 rounded p-3 text-sm">
                    <span className="font-semibold text-blue-300">{p.from_name}</span>
                    <span className="text-gray-300"> → </span>
                    <span className="font-semibold text-blue-300">{p.to_name}</span>
                    <span className="text-gray-300">：</span>
                    <span className="font-bold text-white">{p.amount.toLocaleString()}円</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 対象明細 */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-gray-200">対象明細</h2>
            <div className="flex gap-4 text-sm text-gray-400 mb-3">
              <span>支出: {settlement.items.filter(i => i.item_type === 'expense').length}件</span>
              <span>収入: {settlement.items.filter(i => i.item_type === 'income').length}件</span>
            </div>
            {settlement.items.length === 0 ? (
              <p className="text-gray-400 text-sm">明細なし</p>
            ) : (
              <ul className="space-y-2">
                {settlement.items.map((item, i) => {
                  const member = settlement.split_ratios.find(r => r.user_id === item.user_id);
                  const date = item.entry_date ? new Date(item.entry_date).toLocaleDateString() : '—';
                  return (
                    <li key={i} className="flex items-center gap-3 bg-gray-800 rounded p-3 text-sm">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.item_type === 'expense'
                          ? 'bg-red-900 text-red-200'
                          : 'bg-green-900 text-green-200'
                      }`}>
                        {item.item_type === 'expense' ? '支出' : '収入'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{item.source}</p>
                        <p className="text-xs text-gray-400">{member?.display_name ?? '—'} · {date}</p>
                      </div>
                      <span className="shrink-0 font-semibold">
                        {item.amount.toLocaleString()}円
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
