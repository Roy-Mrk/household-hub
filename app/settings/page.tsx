'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const { profile } = await res.json();
        if (profile?.display_name) setDisplayName(profile.display_name);
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(''); setInfoMsg(''); setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '更新に失敗しました'); return; }
      setInfoMsg('表示名を更新しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← ホームへ</Link>
          <h1 className="text-2xl font-bold">設定</h1>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">表示名</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名（50文字以内）"
              maxLength={50}
              required
              className="p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}
            {infoMsg && <p className="text-green-400 text-sm">{infoMsg}</p>}
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
