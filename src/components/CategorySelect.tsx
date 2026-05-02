'use client';

import { useEffect, useRef, useState } from 'react';

type Subcategory = { id: string; name: string; user_id: string | null };
type Category    = { id: string; name: string; user_id: string | null; subcategories: Subcategory[] };

type Props = {
  type: 'income' | 'expense';
  value: string;                        // subcategory_id (空文字 = 未分類)
  onChange: (subcategoryId: string) => void;
};

export default function CategorySelect({ type, value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/categories?type=${type}`)
      .then(r => r.json())
      .then(({ categories: cats }) => {
        setCategories(cats ?? []);
        if (cats?.length) setHoveredCatId(cats[0].id);
      })
      .finally(() => setLoading(false));
  }, [type]);

  // value が変わったらホバーカテゴリを同期
  useEffect(() => {
    if (!value || !categories.length) return;
    const cat = categories.find(c => c.subcategories.some(s => s.id === value));
    if (cat) setHoveredCatId(cat.id);
  }, [value, categories]);

  // パネル外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSubs = categories.flatMap(c => c.subcategories);
  const selectedSub = allSubs.find(s => s.id === value);
  const selectedCat = selectedSub
    ? categories.find(c => c.subcategories.some(s => s.id === value))
    : null;

  const displayText = selectedSub
    ? `${selectedCat?.name} › ${selectedSub.name}`
    : '未分類';

  const hoveredCat = categories.find(c => c.id === hoveredCatId) ?? categories[0];

  const handleSelect = (subId: string) => {
    onChange(subId);
    setOpen(false);
    setNewSubName('');
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const handleAddSub = async () => {
    if (!newSubName.trim() || !hoveredCat) return;
    setSaving(true);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: hoveredCat.id, name: newSubName.trim() }),
      });
      if (!res.ok) return;
      const { subcategory } = await res.json();
      setCategories(prev => prev.map(c =>
        c.id === hoveredCat.id
          ? { ...c, subcategories: [...c.subcategories, subcategory] }
          : c
      ));
      handleSelect(subcategory.id);
      setNewSubName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => {
          if (!hoveredCatId && categories.length) setHoveredCatId(categories[0].id);
          setOpen(v => !v);
        }}
        className="w-full flex items-center justify-between rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 transition-colors"
      >
        <span className={selectedSub ? 'text-white' : 'text-gray-400'}>
          {loading ? '読み込み中...' : displayText}
        </span>
        <span className="text-gray-400 ml-2 text-xs">{open ? '▴' : '▾'}</span>
      </button>

      {/* フライアウトパネル */}
      {open && !loading && (
        <div className="absolute z-50 top-full left-0 mt-1 flex rounded-lg border border-gray-600 bg-gray-800 shadow-2xl overflow-hidden">

          {/* 左列: メインカテゴリ */}
          <div className="w-44 overflow-y-auto max-h-72 border-r border-gray-700 py-1">
            {/* 未分類クリア */}
            <button
              type="button"
              onClick={handleClear}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                !value ? 'text-blue-400 bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              未分類（なし）
            </button>
            <div className="border-t border-gray-700 my-1" />
            {categories.map(cat => (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredCatId(cat.id)}
                onClick={() => setHoveredCatId(cat.id)}
                className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  hoveredCatId === cat.id ? 'bg-gray-700' : 'hover:bg-gray-750'
                } ${selectedCat?.id === cat.id ? 'text-blue-400' : 'text-white'}`}
              >
                <span>{cat.name}{cat.user_id ? ' ★' : ''}</span>
                <span className="text-gray-500 text-xs">›</span>
              </div>
            ))}
          </div>

          {/* 右列: サブカテゴリ + インライン追加 */}
          {hoveredCat && (
            <div className="w-48 flex flex-col">
              <div className="overflow-y-auto max-h-60 py-1 flex-1">
                {hoveredCat.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelect(sub.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      value === sub.id
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    {sub.name}{sub.user_id ? ' ★' : ''}
                  </button>
                ))}
              </div>
              {/* サブカテゴリのインライン新規追加 */}
              <div className="border-t border-gray-700 px-2 py-2 flex gap-1 items-center">
                <input
                  type="text"
                  placeholder="項目を追加"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSub())}
                  className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSub}
                  disabled={saving || !newSubName.trim()}
                  title="追加して選択"
                  className="text-gray-400 hover:text-white disabled:opacity-40 px-1 text-base leading-none"
                >
                  {saving ? '…' : '＋'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
