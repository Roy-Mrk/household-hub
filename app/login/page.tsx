'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setErrMsg('');
    setInfoMsg('');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrMsg('メールアドレスまたはパスワードが正しくありません');
          return;
        }
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setErrMsg(error.message);
          return;
        }
        setInfoMsg('確認メールを送信しました。メールを確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">household hub</h1>

        {/* タブ */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-8 mt-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === 'signup' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            新規登録
          </button>
        </div>

        {/* Googleログイン */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors mb-4"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.05 29.53 1 24 1 14.82 1 7.07 6.48 3.76 14.18l7.1 5.52C12.55 13.67 17.83 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.67c-.55 2.96-2.2 5.47-4.67 7.16l7.18 5.57C43.36 37.27 46.52 31.34 46.52 24.5z"/>
            <path fill="#FBBC05" d="M10.86 28.3A14.6 14.6 0 0 1 9.5 24c0-1.49.26-2.93.72-4.3l-7.1-5.52A23.93 23.93 0 0 0 0 24c0 3.86.92 7.51 2.54 10.74l8.32-6.44z"/>
            <path fill="#34A853" d="M24 47c5.53 0 10.17-1.83 13.56-4.97l-7.18-5.57C28.6 37.88 26.42 38.5 24 38.5c-6.17 0-11.45-4.17-13.14-9.8l-8.32 6.44C5.92 42.7 14.28 47 24 47z"/>
          </svg>
          Googleでログイン
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 border-t border-gray-700" />
          <span className="text-gray-500 text-sm">または</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}
          {infoMsg && <p className="text-green-400 text-sm">{infoMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {loading
              ? mode === 'login' ? 'ログイン中...' : '登録中...'
              : mode === 'login' ? 'ログイン' : '新規登録'}
          </button>
        </form>
      </div>
    </div>
  );
}
