'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Payment, SplitRatio } from '@/lib/settlementCalc';

type Settlement = {
  id: string;
  settled_at: string;
  total_amount: number;
  split_ratios: SplitRatio[];
  payments: Payment[];
};

export default function SettlementHistoryPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/settlement?limit=${limit}&offset=${offset}`, { cache: 'no-store' });
        if (!res.ok) { setErrMsg('履歴の取得に失敗しました'); return; }
        const json = await res.json() as { data?: Settlement[]; count?: number };
        setSettlements(Array.isArray(json.data) ? json.data : []);
        setTotalCount(typeof json.count === 'number' ? json.count : 0);
      } catch (e) {
        console.error(e);
        setErrMsg('履歴の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [offset, limit]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/settlement" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← 精算に戻る</Link>
      <h1 className="text-2xl font-bold mb-6">精算履歴</h1>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : errMsg ? (
        <p className="text-red-400">{errMsg}</p>
      ) : settlements.length === 0 ? (
        <p className="text-gray-400">精算履歴がありません。</p>
      ) : (
        <>
          <ul className="space-y-3">
            {settlements.map(s => {
              const date = new Date(s.settled_at).toLocaleString();
              return (
                <li key={s.id}>
                  <Link href={`/settlement/history/${s.id}`}
                    className="block bg-gray-800 rounded p-4 hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-400">{date}</p>
                        <p className="mt-1 font-semibold">合計 {Number(s.total_amount).toLocaleString()}円</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.split_ratios.map(r => (
                            <span key={r.user_id} className="text-xs text-gray-400">
                              {r.display_name} {r.ratio}%
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm shrink-0 ml-4">
                        {s.payments.length === 0 ? (
                          <span className="text-gray-400">精算なし</span>
                        ) : (
                          s.payments.map((p, i) => (
                            <p key={i} className="text-blue-300">
                              {p.from_name} → {p.to_name}：{p.amount.toLocaleString()}円
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 mt-6">
            <button disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40">前へ</button>
            <button disabled={offset + limit >= totalCount}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40">次へ</button>
          </div>
        </>
      )}
    </div>
  );
}
