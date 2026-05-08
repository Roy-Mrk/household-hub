export type SplitRatio = {
  user_id: string;
  display_name: string;
  ratio: number; // 0〜100の整数、合計100
};

export type Payment = {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
};

export type SettlementItem = {
  item_type: 'income' | 'expense';
  item_id: number;
  user_id: string;
  amount: number;
};

/**
 * 精算額を計算して支払いリストを返す。
 * 各メンバーの net_paid（支出合計 - 収入合計）と負担割合から差額を算出し、
 * 最小回数の送金で精算できるよう貪欲法で計算する。
 */
export function calcPayments(
  items: SettlementItem[],
  splitRatios: SplitRatio[],
): { totalAmount: number; payments: Payment[] } {
  // メンバーごとの net_paid 集計
  const netPaid = new Map<string, number>();
  for (const r of splitRatios) netPaid.set(r.user_id, 0);

  for (const item of items) {
    const cur = netPaid.get(item.user_id) ?? 0;
    if (item.item_type === 'expense') {
      netPaid.set(item.user_id, cur + item.amount);
    } else {
      // 収入は立替額を減らす（家族財布への入金として相殺）
      netPaid.set(item.user_id, cur - item.amount);
    }
  }

  const totalAmount = Array.from(netPaid.values()).reduce((a, b) => a + b, 0);

  // 各メンバーの残高 = net_paid - 負担額
  const balances = splitRatios.map(r => ({
    user_id: r.user_id,
    display_name: r.display_name,
    balance: Math.round((netPaid.get(r.user_id) ?? 0) - totalAmount * r.ratio / 100),
  }));

  // 貪欲法: 最大債権者と最大債務者を繰り返しマッチング
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors   = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

  const payments: Payment[] = [];
  let ci = 0, di = 0;
  const cBalances = creditors.map(c => ({ ...c }));
  const dBalances = debtors.map(d => ({ ...d }));

  while (ci < cBalances.length && di < dBalances.length) {
    const amount = Math.min(cBalances[ci].balance, -dBalances[di].balance);
    if (amount > 0) {
      payments.push({
        from_user_id: dBalances[di].user_id,
        from_name: dBalances[di].display_name,
        to_user_id: cBalances[ci].user_id,
        to_name: cBalances[ci].display_name,
        amount,
      });
    }
    cBalances[ci].balance -= amount;
    dBalances[di].balance += amount;
    if (cBalances[ci].balance === 0) ci++;
    if (dBalances[di].balance === 0) di++;
  }

  return { totalAmount, payments };
}
