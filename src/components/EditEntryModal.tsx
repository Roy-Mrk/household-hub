'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

export type EditEntry = {
  id: number;
  source: string | null;
  amount: number | string;
  category?: string | null;
  entry_date?: string | null; // YYYY-MM-DD
};

type Props = {
  open: boolean;
  title?: string;
  initial: EditEntry | null;
  onClose: () => void;
  onSave: (payload: { id?: number; source: string; amount: number; category: string; entry_date: string }) => Promise<void>;
  error?: string;
  setError?: (msg: string) => void;
};

export default function EditEntryModal({
  open,
  title,
  initial,
  onClose,
  onSave,
  error,
  setError,
}: Props) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [entryDate, setEntryDate] = useState('');

  useEffect(() => {
    if (initial) {
      setSource(initial.source ?? '');
      setAmount(String(initial.amount ?? ''));
      setCategory(initial.category ?? '');
      setEntryDate(initial.entry_date ?? '');
    } else {
      // 新規のときはデフォルト値をセット（entryDateは当日）
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setSource('');
      setAmount('');
      setCategory('');
      setEntryDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError?.('');
    const n = Number(amount);
    if (!source.trim()) {
      setError?.('内容は必須です');
      return;
    }
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setError?.('金額は0以上の整数で入力してください');
      return;
    }
    if (!category.trim()) {
      setError?.('カテゴリは必須です');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      setError?.('日付はYYYY-MM-DD形式で入力してください');
      return;
    }
    await onSave({ id: initial?.id, source: source.trim(), amount: n, category: category.trim(), entry_date: entryDate });
  };

  return (
    <Modal open={open} onClose={onClose} title={title ?? '明細を編集'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">内容</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
            placeholder="内容"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">金額</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
            placeholder="金額（円）"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">カテゴリ</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
            placeholder="カテゴリ"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">日付</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
          />
        </div>
        {error && <p className="whitespace-pre-line text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-500 px-4 py-2 hover:bg-gray-800"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}