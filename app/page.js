import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <h1 className="text-4xl font-bold text-center mb-2">household hub</h1>
        <p className="text-gray-400 text-center mb-12">家計の収入と支出を管理する</p>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/income"
            className="bg-gray-800 rounded-xl p-6 flex flex-col gap-3 hover:bg-gray-700 transition-colors"
          >
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-lg font-semibold">収入</p>
              <p className="text-sm text-gray-400">給与・副業などを記録</p>
            </div>
          </Link>

          <Link
            href="/expense"
            className="bg-gray-800 rounded-xl p-6 flex flex-col gap-3 hover:bg-gray-700 transition-colors"
          >
            <span className="text-3xl">🧾</span>
            <div>
              <p className="text-lg font-semibold">支出</p>
              <p className="text-sm text-gray-400">日々の出費を記録</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
