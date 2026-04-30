'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type InviteInfo = {
  household_name: string;
  expires_at: string | null;
  is_valid: boolean;
  is_expired: boolean;
  is_used: boolean;
};

export default function InvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [unauthed, setUnauthed] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/households/invite?token=${token}`);
      if (res.status === 401) { setUnauthed(true); setLoading(false); return; }
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const json = await res.json();
      setInfo(json.invitation);
      setLoading(false);
    })();
  }, [token]);

  const handleJoin = async () => {
    setErrMsg(''); setJoining(true);
    try {
      const res = await fetch('/api/households/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) { setErrMsg(json.error ?? '参加に失敗しました'); return; }
      router.push('/household');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (unauthed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-4">世帯への招待</h1>
          <p className="text-gray-400 mb-6">参加するにはログインが必要です。</p>
          <Link
            href={`/login?redirect=/invite/${token}`}
            className="block bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            ログインして参加する
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-4">招待が見つかりません</h1>
          <p className="text-gray-400 mb-6">このリンクは無効か、すでに削除されています。</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">ホームへ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center mb-8">世帯への招待</h1>

        <div className="bg-gray-800 rounded-xl p-6 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-2">招待された世帯</p>
          <p className="text-xl font-semibold">{info.household_name}</p>
          {info.expires_at && (
            <p className="text-gray-500 text-xs mt-2">
              有効期限: {new Date(info.expires_at).toLocaleString('ja-JP')}
            </p>
          )}
        </div>

        {errMsg && <p className="text-red-400 text-sm mb-4 text-center">{errMsg}</p>}

        {info.is_used && (
          <p className="text-yellow-400 text-sm text-center mb-4">この招待はすでに使用済みです。</p>
        )}
        {info.is_expired && (
          <p className="text-yellow-400 text-sm text-center mb-4">この招待の有効期限が切れています。</p>
        )}

        {info.is_valid && (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {joining ? '参加中...' : 'この世帯に参加する'}
          </button>
        )}

        <div className="text-center mt-4">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">ホームへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
