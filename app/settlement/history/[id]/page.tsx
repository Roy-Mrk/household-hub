'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Payment, SplitRatio } from '@/lib/settlementCalc';

type SettlementDetail = {
  id: string;
  settled_at: string;
  total_amount: number;
  split_ratios: SplitRatio[];
  payments: Payment[];
  items: { item_type: 'income' | 'expense'; item_id: number }[];
};

export default function SettlementDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

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

          {/* 対象明細件数 */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-gray-200">対象明細</h2>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>支出: {settlement.items.filter(i => i.item_type === 'expense').length}件</span>
              <span>収入: {settlement.items.filter(i => i.item_type === 'income').length}件</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
