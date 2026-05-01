'use client';

import { useEffect, useState } from 'react';

type Subcategory = { id: string; name: string; user_id: string | null };
type Category = { id: string; name: string; user_id: string | null; subcategories: Subcategory[] };

type Props = {
  type: 'income' | 'expense';
  value: string;           // subcategory_id
  onChange: (subcategoryId: string) => void;
};

const INPUT_CLS = 'rounded border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500';
const BTN_CLS   = 'text-xs text-blue-400 hover:text-blue-300 mt-1';

export default function CategorySelect({ type, value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [loading, setLoading] = useState(true);

  // 新規カテゴリ入力
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  // 新規サブカテゴリ入力
  const [newSubName, setNewSubName] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    fetch(`/api/categories?type=${type}`)
      .then(r => r.json())
      .then(({ categories: cats }) => { setCategories(cats ?? []); })
      .finally(() => setLoading(false));
  }, [type]);

  // value が外から変わった時の同期
  useEffect(() => {
    if (!value) { setSelectedCatId(''); return; }
    const cat = categories.find(c => c.subcategories.some(s => s.id === value));
    if (cat) setSelectedCatId(cat.id);
  }, [value, categories]);

  const selectedCat = categories.find(c => c.id === selectedCatId);
  const subcategories = selectedCat?.subcategories ?? [];

  const handleCatChange = (catId: string) => {
    setSelectedCatId(catId);
    onChange(''); // サブを未選択に
    setAddingCat(false);
    setAddingSub(false);
  };

  const handleSubChange = (subId: string) => {
    onChange(subId);
    setAddingSub(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), type }),
      });
      const { category } = await res.json();
      setCategories(prev => [...prev, { ...category, subcategories: [] }]);
      setSelectedCatId(category.id);
      setNewCatName('');
      setAddingCat(false);
      onChange('');
    } finally {
      setSavingCat(false);
    }
  };

  const handleAddSubcategory = async () => {
    if (!newSubName.trim() || !selectedCatId) return;
    setSavingSub(true);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: selectedCatId, name: newSubName.trim() }),
      });
      const { subcategory } = await res.json();
      setCategories(prev => prev.map(c =>
        c.id === selectedCatId
          ? { ...c, subcategories: [...c.subcategories, subcategory] }
          : c
      ));
      onChange(subcategory.id);
      setNewSubName('');
      setAddingSub(false);
    } finally {
      setSavingSub(false);
    }
  };

  if (loading) return <p className="text-xs text-gray-400">読み込み中...</p>;

  return (
    <div className="flex flex-col gap-2">
      {/* メインカテゴリ */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">カテゴリ</label>
        {addingCat ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="新しいカテゴリ名"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className={`${INPUT_CLS} flex-1`}
            />
            <button type="button" onClick={handleAddCategory} disabled={savingCat}
              className="rounded bg-blue-700 px-3 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50">
              {savingCat ? '...' : '追加'}
            </button>
            <button type="button" onClick={() => setAddingCat(false)}
              className="text-xs text-gray-400 hover:text-white">✕</button>
          </div>
        ) : (
          <>
            <select value={selectedCatId} onChange={e => handleCatChange(e.target.value)}
              className={INPUT_CLS}>
              <option value="">選択してください</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.user_id ? ' ★' : ''}</option>
              ))}
            </select>
            <button type="button" onClick={() => setAddingCat(true)} className={BTN_CLS}>
              ＋ カテゴリを新規作成
            </button>
          </>
        )}
      </div>

      {/* サブカテゴリ（メインカテゴリ選択後に表示） */}
      {selectedCatId && !addingCat && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">サブカテゴリ</label>
          {addingSub ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="新しいサブカテゴリ名"
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubcategory()}
                className={`${INPUT_CLS} flex-1`}
              />
              <button type="button" onClick={handleAddSubcategory} disabled={savingSub}
                className="rounded bg-blue-700 px-3 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50">
                {savingSub ? '...' : '追加'}
              </button>
              <button type="button" onClick={() => setAddingSub(false)}
                className="text-xs text-gray-400 hover:text-white">✕</button>
            </div>
          ) : (
            <>
              <select value={value} onChange={e => handleSubChange(e.target.value)}
                className={INPUT_CLS}>
                <option value="">選択してください</option>
                {subcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.user_id ? ' ★' : ''}</option>
                ))}
              </select>
              <button type="button" onClick={() => setAddingSub(true)} className={BTN_CLS}>
                ＋ サブカテゴリを新規作成
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
