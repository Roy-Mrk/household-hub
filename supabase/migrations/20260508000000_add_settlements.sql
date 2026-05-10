-- 精算ヘッダー
CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  settled_at timestamptz NOT NULL DEFAULT now(),
  -- [{ "user_id": "...", "display_name": "...", "ratio": 50 }, ...]
  split_ratios jsonb NOT NULL,
  -- 精算対象合計（支出合計 - 収入合計）
  total_amount bigint NOT NULL,
  -- [{ "from_user_id": "...", "from_name": "...", "to_user_id": "...", "to_name": "...", "amount": 数値 }, ...]
  payments jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 精算対象明細（中間テーブル）
CREATE TABLE settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('income', 'expense')),
  item_id integer NOT NULL
);

-- RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_select" ON settlements
  FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "settlements_insert" ON settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "settlement_items_select" ON settlement_items
  FOR SELECT TO authenticated
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      JOIN household_members hm ON hm.household_id = s.household_id
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "settlement_items_insert" ON settlement_items
  FOR INSERT TO authenticated
  WITH CHECK (
    settlement_id IN (
      SELECT s.id FROM settlements s
      JOIN household_members hm ON hm.household_id = s.household_id
      WHERE hm.user_id = auth.uid()
    )
  );
