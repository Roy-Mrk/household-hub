import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

function formatAmount(amount) {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const fromDate = `${year}-${month}-01`;
  const toDate = now.getMonth() === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

  const [incomeRes, expenseRes, recentIncomeRes, recentExpenseRes] = await Promise.all([
    supabase.from('income').select('amount').gte('entry_date', fromDate).lt('entry_date', toDate),
    supabase.from('expense').select('amount').gte('entry_date', fromDate).lt('entry_date', toDate),
    supabase.from('income').select('id, source, amount, entry_date').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('expense').select('id, source, amount, entry_date').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
  ]);

  const totalIncome = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = (expenseRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = totalIncome - totalExpense;

  const recentIncome = recentIncomeRes.data ?? [];
  const recentExpense = recentExpenseRes.data ?? [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">household hub</h1>
      <p className="text-gray-400 text-sm mb-6">{year}年{Number(month)}月の収支</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">収入</p>
          <p className="text-xl font-bold text-green-400">¥{formatAmount(totalIncome)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">支出</p>
          <p className="text-xl font-bold text-red-400">¥{formatAmount(totalExpense)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">収支</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            ¥{formatAmount(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/income"
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold">収入管理</p>
            <p className="text-xs text-gray-400">給与・副業を記録</p>
          </div>
        </Link>
        <Link
          href="/expense"
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">🧾</span>
          <div>
            <p className="font-semibold">支出管理</p>
            <p className="text-xs text-gray-400">日々の出費を記録</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">最近の収入</h2>
          {recentIncome.length === 0 ? (
            <p className="text-xs text-gray-500">データなし</p>
          ) : (
            <div className="space-y-2">
              {recentIncome.map(item => (
                <div key={item.id} className="bg-gray-800 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{item.source}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.entry_date)}</p>
                  </div>
                  <p className="text-sm text-green-400 font-medium whitespace-nowrap">+¥{formatAmount(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">最近の支出</h2>
          {recentExpense.length === 0 ? (
            <p className="text-xs text-gray-500">データなし</p>
          ) : (
            <div className="space-y-2">
              {recentExpense.map(item => (
                <div key={item.id} className="bg-gray-800 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{item.source}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.entry_date)}</p>
                  </div>
                  <p className="text-sm text-red-400 font-medium whitespace-nowrap">-¥{formatAmount(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
