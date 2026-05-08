'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import CategorySelect from './CategorySelect';

const OWNER_STORAGE_KEY = 'lastSelectedOwner';

export type Owner = 'self' | 'shared';

export type EditEntry = {
  id: number;
  source: string | null;
  amount: number | string;
  subcategory_id?: string | null;
  entry_date?: string | null;
  owner?: Owner | null;
  needs_settlement?: boolean | null;
};

type Props = {
  open: boolean;
  title?: string;
  type: 'income' | 'expense';
  initial: EditEntry | null;
  onClose: () => void;
  onSave: (payload: { id?: number; source: string; amount: number; subcategory_id: string; entry_date: string; owner: Owner; needs_settlement: boolean }) => Promise<void>;
  error?: string;
  setError?: (msg: string) => void;
};

function getStoredOwner(): Owner {
  try {
    const v = localStorage.getItem(OWNER_STORAGE_KEY);
    if (v === 'self' || v === 'shared') return v;
  } catch {}
  return 'self';
}

export default function EditEntryModal({
  open, title, type, initial, onClose, onSave, error, setError,
}: Props) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [owner, setOwner] = useState<Owner>('self');
  const [needsSettlement, setNeedsSettlement] = useState(true);

  useEffect(() => {
    if (initial) {
      setSource(initial.source ?? '');
      setAmount(String(initial.amount ?? ''));
      setSubcategoryId(initial.subcategory_id ?? '');
      setEntryDate(initial.entry_date ?? '');
      setOwner(initial.owner ?? 'self');
      setNeedsSettlement(initial.owner === 'shared' ? (initial.needs_settlement ?? true) : false);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setSource('');
      setAmount('');
      setSubcategoryId('');
      setEntryDate(`${yyyy}-${mm}-${dd}`);
      const storedOwner = getStoredOwner();
      setOwner(storedOwner);
      setNeedsSettlement(storedOwner === 'shared');
    }
  }, [initial]);

  const handleOwnerChange = (v: Owner) => {
    setOwner(v);
    // self に切り替えたら精算待ちを強制 false
    if (v === 'self') setNeedsSettlement(false);
    try { localStorage.setItem(OWNER_STORAGE_KEY, v); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError?.('');
    const n = Number(amount);
    if (!source.trim()) { setError?.('内容は必須です'); return; }
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setError?.('金額は0以上の整数で入力してください'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      setError?.('日付はYYYY-MM-DD形式で入力してください'); return;
    }
    const effectiveNeedsSettlement = owner === 'shared' ? needsSettlement : false;
    await onSave({ id: initial?.id, source: source.trim(), amount: n, subcategory_id: subcategoryId, entry_date: entryDate, owner, needs_settlement: effectiveNeedsSettlement });
  };

  const settlementDisabled = owner === 'self';

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
        <CategorySelect
          type={type}
          value={subcategoryId}
          onChange={setSubcategoryId}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">日付</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white placeholder-gray-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-300">帰属</label>
          <div className="flex gap-3">
            {(['self', 'shared'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleOwnerChange(v)}
                className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                  owner === v
                    ? 'bg-blue-700 text-white'
                    : 'border border-gray-500 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {v === 'self' ? '自分' : '家族共有'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`flex items-center gap-2 text-sm ${settlementDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={settlementDisabled ? false : needsSettlement}
              onChange={(e) => setNeedsSettlement(e.target.checked)}
              disabled={settlementDisabled}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-blue-600"
            />
            <span className="text-gray-300">精算待ち</span>
            {settlementDisabled && (
              <span className="text-xs text-gray-500">（家族共有のみ対象）</span>
            )}
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
