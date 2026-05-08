'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { readApiError } from '@/lib/ui/readApiError';
import { calcPayments } from '@/lib/settlementCalc';
import type { SplitRatio, SettlementItem } from '@/lib/settlementCalc';

type Member = { user_id: string; display_name: string };
type PendingItem = {
  id: number;
  item_type: 'income' | 'expense';
  source: string;
  amount: number;
  user_id: string;
  entry_date: string;
};

export default function SettlementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [splitRatios, setSplitRatios] = useState<SplitRatio[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 世帯メンバーと未精算明細を並行ロード
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [householdRes, expenseRes, incomeRes] = await Promise.all([
          fetch('/api/households', { cache: 'no-store' }),
          fetch('/api/expense?limit=200&offset=0', { cache: 'no-store' }),
          fetch('/api/income?limit=200&offset=0', { cache: 'no-store' }),
        ]);

        if (!householdRes.ok) { setErrMsg('世帯情報の取得に失敗しました'); return; }
        const hJson = await householdRes.json() as { household?: { members?: { user_id: string; profile?: { display_name?: string } | null }[] } | null };
        const rawMembers: Member[] = (hJson.household?.members ?? []).map(m => ({
          user_id: m.user_id,
          display_name: m.profile?.display_name ?? m.user_id.slice(0, 8),
        }));
        setMembers(rawMembers);

        // 等分で初期化
        if (rawMembers.length > 0) {
          const base = Math.floor(100 / rawMembers.length);
          const remainder = 100 - base * rawMembers.length;
          setSplitRatios(rawMembers.map((m, i) => ({
            user_id: m.user_id,
            display_name: m.display_name,
            ratio: i === 0 ? base + remainder : base,
          })));
        }

        const items: PendingItem[] = [];
        if (expenseRes.ok) {
          const eJson = await expenseRes.json() as { data?: { id: number; source: string; amount: number; user_id: string; entry_date: string; owner?: string; needs_settlement?: boolean }[] };
          for (const e of eJson.data ?? []) {
            if (e.owner === 'shared' && e.needs_settlement) {
              items.push({ id: e.id, item_type: 'expense', source: e.source, amount: Number(e.amount), user_id: e.user_id, entry_date: e.entry_date });
            }
          }
        }
        if (incomeRes.ok) {
          const iJson = await incomeRes.json() as { data?: { id: number; source: string; amount: number; user_id: string; entry_date: string; owner?: string; needs_settlement?: boolean }[] };
          for (const i of iJson.data ?? []) {
            if (i.owner === 'shared' && i.needs_settlement) {
              items.push({ id: i.id, item_type: 'income', source: i.source, amount: Number(i.amount), user_id: i.user_id, entry_date: i.entry_date });
            }
          }
        }
        setPendingItems(items);
        setSelectedIds(new Set(items.map(i => `${i.item_type}-${i.id}`)));
      } catch (e) {
        console.error(e);
        setErrMsg('データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleItem = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedItems = useMemo(() =>
    pendingItems.filter(i => selectedIds.has(`${i.item_type}-${i.id}`)),
    [pendingItems, selectedIds]
  );

  const calcItems = useMemo<SettlementItem[]>(() =>
    selectedItems.map(i => ({ item_type: i.item_type, item_id: i.id, user_id: i.user_id, amount: i.amount })),
    [selectedItems]
  );

  const { totalAmount, payments } = useMemo(
    () => splitRatios.length > 0 ? calcPayments(calcItems, splitRatios) : { totalAmount: 0, payments: [] },
    [calcItems, splitRatios]
  );

  const handleRatioChange = (userId: string, value: number) => {
    setSplitRatios(prev => {
      const others = prev.filter(r => r.user_id !== userId);
      if (others.length === 0) return prev;
      // 変更したメンバーを固定し、残りに余りを割り当て
      const clamped = Math.max(0, Math.min(100, value));
      const remaining = 100 - clamped;
      const baseOther = Math.floor(remaining / others.length);
      const rem = remaining - baseOther * others.length;
      return prev.map((r, i) => {
        if (r.user_id === userId) return { ...r, ratio: clamped };
        const idx = others.findIndex(o => o.user_id === r.user_id);
        return { ...r, ratio: baseOther + (idx === 0 ? rem : 0) };
      });
    });
  };

  const ratioSum = splitRatios.reduce((s, r) => s + r.ratio, 0);

  const handleConfirm = async () => {
    if (selectedItems.length === 0) { setErrMsg('精算対象の明細を選択してください'); return; }
    if (ratioSum !== 100) { setErrMsg('分担割合の合計が100%になっていません'); return; }
    setSubmitting(true);
    setErrMsg('');
    try {
      const res = await fetch('/api/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_ratios: splitRatios,
          items: selectedItems.map(i => ({ item_type: i.item_type, item_id: i.id })),
        }),
      });
      if (!res.ok) { setErrMsg(await readApiError(res)); return; }
      setDone(true);
    } catch (e) {
      console.error(e);
      setErrMsg('精算の確定に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <Link href="/" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← ホームに戻る</Link>
        <div className="mt-16 text-center">
          <p className="text-2xl font-bold text-green-400 mb-4">精算が完了しました</p>
          <div className="flex justify-center gap-4">
            <Link href="/settlement/history" className="rounded bg-blue-700 px-6 py-2 hover:bg-blue-800">履歴を確認</Link>
            <Link href="/" className="rounded border border-gray-500 px-6 py-2 hover:bg-gray-800">ホームへ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Link href="/" className="inline-block mb-4 text-sm text-gray-400 hover:text-white">← ホームに戻る</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">精算</h1>
        <Link href="/settlement/history" className="text-sm text-gray-400 hover:text-white">履歴 →</Link>
      </div>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : errMsg && pendingItems.length === 0 ? (
        <p className="text-red-400">{errMsg}</p>
      ) : (
        <div className="space-y-8">

          {/* ── 未精算明細 ── */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-200">精算対象の明細</h2>
            {pendingItems.length === 0 ? (
              <p className="text-gray-400">未精算の共有明細がありません。</p>
            ) : (
              <ul className="space-y-2">
                {pendingItems.map(item => {
                  const key = `${item.item_type}-${item.id}`;
                  const member = members.find(m => m.user_id === item.user_id);
                  const date = item.entry_date ? new Date(item.entry_date).toLocaleDateString() : '—';
                  return (
                    <li key={key}
                      className={`flex items-center gap-3 rounded p-3 cursor-pointer transition-colors ${
                        selectedIds.has(key) ? 'bg-gray-800' : 'bg-gray-800 opacity-40'
                      }`}
                      onClick={() => toggleItem(key)}
                    >
                      <input type="checkbox" readOnly checked={selectedIds.has(key)}
                        className="h-4 w-4 accent-blue-600 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.source}</p>
                        <p className="text-xs text-gray-400">{member?.display_name ?? '—'} · {date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs rounded-full px-2 py-0.5 mr-2 ${
                          item.item_type === 'expense' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
                        }`}>
                          {item.item_type === 'expense' ? '支出' : '収入'}
                        </span>
                        <span className="font-semibold">{item.amount.toLocaleString()}円</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-sm text-gray-400">
              選択: {selectedItems.length} 件 / 合計（支出-収入）: {totalAmount.toLocaleString()} 円
            </p>
          </section>

          {/* ── 分担割合 ── */}
          {members.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-200">分担割合</h2>
              <div className="space-y-3">
                {splitRatios.map(r => (
                  <div key={r.user_id} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-gray-300 truncate">{r.display_name}</span>
                    <input
                      type="range" min={0} max={100} value={r.ratio}
                      onChange={e => handleRatioChange(r.user_id, Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      type="number" min={0} max={100} value={r.ratio}
                      onChange={e => handleRatioChange(r.user_id, Number(e.target.value))}
                      className="w-16 rounded border border-gray-600 bg-gray-800 p-1 text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                ))}
                <p className={`text-sm ${ratioSum === 100 ? 'text-gray-400' : 'text-red-400'}`}>
                  合計: {ratioSum}%{ratioSum !== 100 && '（100%になるよう調整してください）'}
                </p>
              </div>
            </section>
          )}

          {/* ── 各自の負担額 ── */}
          {totalAmount > 0 && splitRatios.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-200">各自の負担額</h2>
              <ul className="space-y-2">
                {splitRatios.map(r => {
                  const netPaid = calcItems
                    .filter(i => i.user_id === r.user_id)
                    .reduce((s, i) => i.item_type === 'expense' ? s + i.amount : s - i.amount, 0);
                  const fairShare = Math.round(totalAmount * r.ratio / 100);
                  const balance = netPaid - fairShare;
                  return (
                    <li key={r.user_id} className="bg-gray-800 rounded p-3 flex justify-between items-center">
                      <span className="text-sm text-gray-300">{r.display_name}</span>
                      <div className="text-right text-sm space-y-0.5">
                        <p className="text-gray-400">立替: {netPaid.toLocaleString()}円 / 負担: {fairShare.toLocaleString()}円</p>
                        <p className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {balance >= 0 ? `+${balance.toLocaleString()}円（受取）` : `${balance.toLocaleString()}円（支払）`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ── 精算結果 ── */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-200">精算結果</h2>
            {payments.length === 0 ? (
              <p className="text-gray-400">精算不要です（全員の負担が均等です）。</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p, i) => (
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

          {errMsg && <p className="text-red-400">{errMsg}</p>}

          <button
            onClick={handleConfirm}
            disabled={submitting || selectedItems.length === 0 || ratioSum !== 100}
            className="w-full rounded bg-green-700 px-4 py-3 font-bold text-white hover:bg-green-600 disabled:opacity-40"
          >
            {submitting ? '精算中...' : '精算を確定する'}
          </button>
        </div>
      )}
    </div>
  );
}
