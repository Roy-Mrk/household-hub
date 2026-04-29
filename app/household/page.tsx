'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Member = {
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  joined_at: string;
};

type Household = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  created_at: string;
  members: Member[];
};

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchHousehold = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/households');
    const json = await res.json();
    setHousehold(json.household);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHousehold(); }, [fetchHousehold]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(''); setInfoMsg(''); setProcessing(true);
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '作成に失敗しました'); return; }
      setInfoMsg('世帯を作成しました');
      setNewName('');
      fetchHousehold();
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateInvite = async () => {
    setErrMsg(''); setInviteLink(''); setProcessing(true);
    try {
      const res = await fetch('/api/households/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_hours: 72 }),
      });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '招待リンクの作成に失敗しました'); return; }
      setInviteLink(`${window.location.origin}/invite/${json.token}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setInfoMsg('リンクをコピーしました');
  };

  const handleLeave = async () => {
    if (!confirm('世帯から退出しますか？')) return;
    setErrMsg(''); setProcessing(true);
    try {
      const res = await fetch('/api/households/leave', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '退出に失敗しました'); return; }
      setInfoMsg('世帯から退出しました');
      setInviteLink('');
      fetchHousehold();
    } finally {
      setProcessing(false);
    }
  };

  const handleDissolve = async () => {
    if (!confirm('世帯を解散しますか？この操作は取り消せません。')) return;
    setErrMsg(''); setProcessing(true);
    try {
      const res = await fetch('/api/households', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '解散に失敗しました'); return; }
      setInfoMsg('世帯を解散しました');
      setInviteLink('');
      fetchHousehold();
    } finally {
      setProcessing(false);
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
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← ホームへ</Link>
          <h1 className="text-2xl font-bold">世帯管理</h1>
        </div>

        {errMsg && <p className="text-red-400 text-sm mb-4">{errMsg}</p>}
        {infoMsg && <p className="text-green-400 text-sm mb-4">{infoMsg}</p>}

        {!household ? (
          // ─── 世帯未所属: 新規作成フォーム ───────────────────────────
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-2">世帯を作成する</h2>
            <p className="text-gray-400 text-sm mb-6">
              世帯を作成して家族やパートナーを招待すると、家計データを共有できます。
            </p>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="世帯名（例: 田中家）"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={processing}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {processing ? '作成中...' : '世帯を作成'}
              </button>
            </form>
          </div>
        ) : (
          // ─── 世帯所属: 管理画面 ──────────────────────────────────────
          <div className="flex flex-col gap-6">
            {/* 世帯情報 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{household.name}</h2>
                <span className="text-xs bg-blue-700 text-white px-2 py-1 rounded-full">
                  {household.role === 'owner' ? 'オーナー' : 'メンバー'}
                </span>
              </div>

              {/* メンバー一覧 */}
              <h3 className="text-sm text-gray-400 mb-3">メンバー ({household.members.length}人)</h3>
              <ul className="flex flex-col gap-2">
                {household.members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
                    <span className="text-sm">{m.display_name}</span>
                    <span className="text-xs text-gray-400">
                      {m.role === 'owner' ? 'オーナー' : 'メンバー'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 招待リンク（オーナーのみ） */}
            {household.role === 'owner' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-2">招待リンクを発行</h2>
                <p className="text-gray-400 text-sm mb-4">有効期限72時間・1回限り有効のリンクを発行します。</p>
                <button
                  onClick={handleGenerateInvite}
                  disabled={processing}
                  className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors mb-4"
                >
                  {processing ? '生成中...' : 'リンクを生成'}
                </button>

                {inviteLink && (
                  <div className="flex flex-col gap-2">
                    <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 break-all">
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="self-start text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      コピー
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 退出 / 解散 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                {household.role === 'owner' ? '世帯を解散' : '世帯から退出'}
              </h2>
              {household.role === 'owner' ? (
                <button
                  onClick={handleDissolve}
                  disabled={processing}
                  className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  世帯を解散する
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={processing}
                  className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  世帯から退出する
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
