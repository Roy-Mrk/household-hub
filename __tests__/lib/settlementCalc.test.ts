import { describe, it, expect } from 'vitest';
import { calcPayments } from '@/lib/settlementCalc';
import type { SplitRatio, SettlementItem } from '@/lib/settlementCalc';

const memberA: SplitRatio = { user_id: 'a', display_name: 'Aさん', ratio: 50 };
const memberB: SplitRatio = { user_id: 'b', display_name: 'Bさん', ratio: 50 };

describe('calcPayments', () => {
  it('支出のみ・50/50: Aが全額立替 → B が半額を A に支払う', () => {
    const items: SettlementItem[] = [
      { item_type: 'expense', item_id: 1, user_id: 'a', amount: 10000 },
    ];
    const { totalAmount, payments } = calcPayments(items, [memberA, memberB]);
    expect(totalAmount).toBe(10000);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ from_user_id: 'b', to_user_id: 'a', amount: 5000 });
  });

  it('支出のみ・50/50: 両者が同額立替 → 精算なし', () => {
    const items: SettlementItem[] = [
      { item_type: 'expense', item_id: 1, user_id: 'a', amount: 5000 },
      { item_type: 'expense', item_id: 2, user_id: 'b', amount: 5000 },
    ];
    const { totalAmount, payments } = calcPayments(items, [memberA, memberB]);
    expect(totalAmount).toBe(10000);
    expect(payments).toHaveLength(0);
  });

  it('収入が相殺される: A が支出10000・B が収入2000 → 合計8000を50/50で精算', () => {
    const items: SettlementItem[] = [
      { item_type: 'expense', item_id: 1, user_id: 'a', amount: 10000 },
      { item_type: 'income',  item_id: 2, user_id: 'b', amount: 2000 },
    ];
    const { totalAmount, payments } = calcPayments(items, [memberA, memberB]);
    // A の net_paid = 10000, B の net_paid = -2000, total = 8000
    // A の負担 = 4000, B の負担 = 4000
    // A の残高 = 10000 - 4000 = +6000（受取）
    // B の残高 = -2000 - 4000 = -6000（支払）
    expect(totalAmount).toBe(8000);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ from_user_id: 'b', to_user_id: 'a', amount: 6000 });
  });

  it('60/40 の割合: A が10000立替 → B が4000を A に支払う', () => {
    const ratioA: SplitRatio = { ...memberA, ratio: 60 };
    const ratioB: SplitRatio = { ...memberB, ratio: 40 };
    const items: SettlementItem[] = [
      { item_type: 'expense', item_id: 1, user_id: 'a', amount: 10000 },
    ];
    const { totalAmount, payments } = calcPayments(items, [ratioA, ratioB]);
    expect(totalAmount).toBe(10000);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ from_user_id: 'b', to_user_id: 'a', amount: 4000 });
  });

  it('明細なしの場合: totalAmount=0, payments=[]', () => {
    const { totalAmount, payments } = calcPayments([], [memberA, memberB]);
    expect(totalAmount).toBe(0);
    expect(payments).toHaveLength(0);
  });

  it('3人・50/30/20: 最小回数の送金で精算できる', () => {
    const memberC: SplitRatio = { user_id: 'c', display_name: 'Cさん', ratio: 20 };
    const items: SettlementItem[] = [
      { item_type: 'expense', item_id: 1, user_id: 'a', amount: 9000 },
    ];
    const ratios: SplitRatio[] = [
      { ...memberA, ratio: 50 },
      { ...memberB, ratio: 30 },
      memberC,
    ];
    const { totalAmount, payments } = calcPayments(items, ratios);
    expect(totalAmount).toBe(9000);
    // A: net_paid=9000, 負担=4500 → +4500
    // B: net_paid=0,    負担=2700 → -2700
    // C: net_paid=0,    負担=1800 → -1800
    const fromB = payments.find(p => p.from_user_id === 'b');
    const fromC = payments.find(p => p.from_user_id === 'c');
    expect(fromB).toMatchObject({ to_user_id: 'a', amount: 2700 });
    expect(fromC).toMatchObject({ to_user_id: 'a', amount: 1800 });
  });
});
