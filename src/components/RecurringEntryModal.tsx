'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import CategorySelect from './CategorySelect';

export type RecurringEntry = {
  id?: number;
  type: 'income' | 'expense';
  source: string;
  amount: number | string;
  subcategory_id?: string | null;
  owner?: 'self' | 'shared';
  needs_settlement?: boolean;
  frequency: 'monthly' | 'yearly';
  day_of_month: number;
  month_of_year?: number | null;
  is_active?: boolean;
};

type SavePayload = Omit<RecurringEntry, 'amount'> & { amount: number };

type Props = {
  open: boolean;
  title?: string;
  initial: RecurringEntry | null;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  error?: string;
  setError?: (msg: string) => void;
};

export default function RecurringEntryModal({ open, title, initial, onClose, onSave, error, setError }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [owner, setOwner] = useState<'self' | 'shared'>('self');
  const [needsSettlement, setNeedsSettlement] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [monthOfYear, setMonthOfYear] = useState(1);

  useEffect(() => {
    if (initial) {
      setType(initial.type);
      setSource(initial.source ?? '');
      setAmount(String(initial.amount ?? ''));
      setSubcategoryId(initial.subcategory_id ?? '');
      setOwner(initial.owner ?? 'self');
      setNeedsSettlement(initial.needs_settlement ?? false);
      setFrequency(initial.frequency ?? 'monthly');
      setDayOfMonth(initial.day_of_month ?? 1);
      setMonthOfYear(initial.month_of_year ?? 1);
    } else {
      setType('expense');
      setSource('');
      setAmount('');
      setSubcategoryId('');
      setOwner('self');
      setNeedsSettlement(false);
      setFrequency('monthly');
      setDayOfMonth(1);
      setMonthOfYear(1);
    }
  }, [initial, open]);

  const handleOwnerChange = (v: 'self' | 'shared') => {
    setOwner(v);
    if (v === 'self') setNeedsSettlement(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError?.('');
    const n = Number(amount);
    if (!source.trim()) { setError?.('内容は必須です'); return; }
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setError?.('金額は0以上の整数で入力してください'); return;
    }
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setError?.('日は1〜31の範囲で入力してください'); return;
    }
    if (frequency === 'yearly' && (monthOfYear < 1 || monthOfYear > 12)) {
      setError?.('月は1〜12の範囲で入力してください'); return;
    }

    await onSave({
      id: initial?.id,
      type,
      source: source.trim(),
      amount: n,
      subcategory_id: subcategoryId || null,
      owner,
      needs_settlement: owner === 'shared' ? needsSettlement : false,
      frequency,
      day_of_month: dayOfMonth,
      month_of_year: frequency === 'yearly' ? monthOfYear : null,
    });
  };

  const settlementDisabled = owner === 'self';

  return (
    <Modal open={open} onClose={onClose} title={title ?? '繰り返しエントリを編集'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 種別 */}
        {!initial?.id && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">種別</label>
            <div className="flex gap-3">
              {(['income', 'expense'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                    type === v ? 'bg-blue-700 text-white' : 'border border-gray-500 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {v === 'income' ? '収入' : '支出'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 内容 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">内容</label>
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
            placeholder="例：家賃、給与" />
        </div>

        {/* 金額 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">金額</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
            placeholder="金額（円）" />
        </div>

        {/* カテゴリ */}
        <CategorySelect type={type} value={subcategoryId} onChange={setSubcategoryId} />

        {/* 繰り返し頻度 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">繰り返し</label>
          <div className="flex gap-3">
            {(['monthly', 'yearly'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setFrequency(v)}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  frequency === v ? 'bg-blue-700 text-white' : 'border border-gray-500 text-gray-300 hover:bg-gray-700'
                }`}>
                {v === 'monthly' ? '毎月' : '毎年'}
              </button>
            ))}
          </div>
        </div>

        {/* 日付指定 */}
        <div className="flex gap-3">
          {frequency === 'yearly' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">月</label>
              <input type="number" min={1} max={12} value={monthOfYear}
                onChange={(e) => setMonthOfYear(Number(e.target.value))}
                className="w-20 rounded border border-gray-600 bg-gray-800 p-2 text-white" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">日</label>
            <input type="number" min={1} max={31} value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-20 rounded border border-gray-600 bg-gray-800 p-2 text-white" />
          </div>
          <div className="flex items-end pb-2 text-sm text-gray-400">
            {frequency === 'yearly' ? `毎年 ${monthOfYear}月 ${dayOfMonth}日` : `毎月 ${dayOfMonth}日`}
          </div>
        </div>

        {/* 帰属 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">帰属</label>
          <div className="flex gap-3">
            {(['self', 'shared'] as const).map((v) => (
              <button key={v} type="button" onClick={() => handleOwnerChange(v)}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  owner === v ? 'bg-blue-700 text-white' : 'border border-gray-500 text-gray-300 hover:bg-gray-700'
                }`}>
                {v === 'self' ? '自分' : '家族共有'}
              </button>
            ))}
          </div>
        </div>

        {/* 精算待ち */}
        <div className="flex flex-col gap-1">
          <label className={`flex items-center gap-2 text-sm ${settlementDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={settlementDisabled ? false : needsSettlement}
              onChange={(e) => setNeedsSettlement(e.target.checked)}
              disabled={settlementDisabled}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-blue-600" />
            <span className="text-gray-300">精算待ち</span>
            {settlementDisabled && <span className="text-xs text-gray-500">（家族共有のみ対象）</span>}
          </label>
        </div>

        {error && <p className="whitespace-pre-line text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded border border-gray-500 px-4 py-2 hover:bg-gray-800">
            キャンセル
          </button>
          <button type="submit"
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
