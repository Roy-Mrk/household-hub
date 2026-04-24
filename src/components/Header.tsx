'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

export default function Header({ initialUser }: { initialUser: User | null }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // ログアウト時にユーザー状態をリセットするため監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    setSuccessMsg('');
    if (newPassword !== confirmPassword) {
      setErrMsg('パスワードが一致しません');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setErrMsg('パスワード変更に失敗しました');
      return;
    }
    setSuccessMsg('パスワードを変更しました');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <div className="fixed top-4 right-4 z-50" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="block w-10 h-10 rounded-full border-2 border-gray-600 hover:border-blue-500 transition-colors overflow-hidden"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="アバター" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setModalOpen(true); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
              >
                パスワード変更
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      {/* パスワード変更モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-white mb-4">パスワード変更</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <input
                type="password"
                placeholder="新しいパスワード（6文字以上）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="確認（もう一度入力）"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}
              {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  変更する
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setErrMsg(''); setSuccessMsg(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="flex-1 border border-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
