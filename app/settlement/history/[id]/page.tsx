'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Payment } from '@/lib/settlementCalc';

type SplitRatio = {
  user_id: string;
  display_name: string;
  ratio: number;
  avatar_url: string | null;
};

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

function UserAvatar({ avatarUrl, name, color = 'blue' }: { avatarUrl: string | null; name: string; color?: 'blue' | 'green' }) {
  const bg = color === 'green' ? 'bg-green-800' : 'bg-blue-800';
  return avatarUrl ? (
    <Image src={avatarUrl} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );
}

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

          {/* 精算内容（最重要・最上部に強調表示） */}
          <section className="rounded-xl bg-blue-950 border border-blue-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-blue-300">精算内容</h2>
              {settlement.cancelled_at ? (
                <div className="text-right">
                  <span className="inline-block rounded-full bg-gray-600 px-3 py-1 text-xs font-medium text-gray-300">
                    キャンセル済み
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{new Date(settlement.cancelled_at).toLocaleString()}</p>
                </div>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="rounded border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900 hover:bg-opacity-30 disabled:opacity-40 transition-colors"
                >
                  {cancelling ? 'キャンセル中...' : '精算をキャンセル'}
                </button>
              )}
            </div>
            {settlement.payments.length === 0 ? (
              <p className="text-blue-300 text-sm">精算不要（全員均等）</p>
            ) : (
              <ul className="space-y-5">
                {settlement.payments.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 支払元 */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <UserAvatar
                          avatarUrl={settlement.split_ratios.find(r => r.display_name === p.from_name)?.avatar_url ?? null}
                          name={p.from_name}
                          color="blue"
                        />
                        <span className="text-xs font-medium text-white max-w-16 truncate text-center">{p.from_name}</span>
                      </div>

                      {/* 矢印 */}
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                      </svg>

                      {/* 支払先 */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <UserAvatar
                          avatarUrl={settlement.split_ratios.find(r => r.display_name === p.to_name)?.avatar_url ?? null}
                          name={p.to_name}
                          color="green"
                        />
                        <span className="text-xs font-medium text-white max-w-16 truncate text-center">{p.to_name}</span>
                      </div>
                    </div>

                    <span className="text-2xl font-bold text-white shrink-0">
                      {p.amount.toLocaleString()}円
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 基本情報 */}
          <section className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400">精算日時</p>
            <p className="font-semibold">{new Date(settlement.settled_at).toLocaleString()}</p>
            <p className="mt-2 text-sm text-gray-400">精算合計（支出-収入）</p>
            <p className="font-bold text-xl">{Number(settlement.total_amount).toLocaleString()}円</p>
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
