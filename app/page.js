import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import MonthNav from "@/components/MonthNav";
import CategoryPieChart from "@/components/CategoryPieChart";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import { parseMonth, monthToRange } from "@/lib/monthUtils";

function formatAmount(amount) {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function Home({ searchParams }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const month = parseMonth(params?.month);
  const { from: fromDate, to: toDate } = monthToRange(month);
  const nextMonth = new Date(toDate).getTime() + 86400000; // toDate の翌日
  const nextMonthStr = new Date(nextMonth).toISOString().slice(0, 10);
  const [year, monthNum] = month.split('-').map(Number);

  const [incomeRes, expenseRes, recentIncomeRes, recentExpenseRes, incomeCatRes, expenseCatRes] = await Promise.all([
    supabase.from('income').select('amount').gte('entry_date', fromDate).lt('entry_date', nextMonthStr),
    supabase.from('expense').select('amount').gte('entry_date', fromDate).lt('entry_date', nextMonthStr),
    supabase.from('income').select('id, source, amount, entry_date').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('expense').select('id, source, amount, entry_date').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('income').select('amount, subcategory:subcategory_id(name, category:category_id(name))').gte('entry_date', fromDate).lt('entry_date', nextMonthStr),
    supabase.from('expense').select('amount, subcategory:subcategory_id(name, category:category_id(name))').gte('entry_date', fromDate).lt('entry_date', nextMonthStr),
  ]);

  const totalIncome = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = (expenseRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = totalIncome - totalExpense;

  const recentIncome = recentIncomeRes.data ?? [];
  const recentExpense = recentExpenseRes.data ?? [];

  // カテゴリ別集計（メインカテゴリ単位で集計）
  const aggregateByCategory = (rows) => {
    const map = {};
    for (const r of rows ?? []) {
      const cat = r.subcategory?.category?.name ?? '未分類';
      map[cat] = (map[cat] ?? 0) + Number(r.amount);
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  const incomeByCategory = aggregateByCategory(incomeCatRes.data);
  const expenseByCategory = aggregateByCategory(expenseCatRes.data);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">household hub</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Suspense fallback={<div className="h-8" />}>
          <MonthNav month={month} />
        </Suspense>
      </div>

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
        <Link
          href="/household"
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">🏠</span>
          <div>
            <p className="font-semibold">世帯管理</p>
            <p className="text-xs text-gray-400">家族・パートナーと家計を共有</p>
          </div>
        </Link>
        <Link
          href="/settlement"
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">🤝</span>
          <div>
            <p className="font-semibold">精算</p>
            <p className="text-xs text-gray-400">家族間の立替を精算</p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">⚙️</span>
          <div>
            <p className="font-semibold">設定</p>
            <p className="text-xs text-gray-400">表示名を変更</p>
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

      {/* カテゴリ別円グラフ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <CategoryPieChart data={expenseByCategory} title="支出カテゴリ別" />
        <CategoryPieChart data={incomeByCategory} title="収入カテゴリ別" />
      </div>

      {/* 収支推移グラフ */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">収支推移（過去12ヶ月）</h2>
        <div className="bg-gray-800 rounded-xl p-4">
          <MonthlyBarChart months={12} />
        </div>
      </div>
    </div>
  );
}
