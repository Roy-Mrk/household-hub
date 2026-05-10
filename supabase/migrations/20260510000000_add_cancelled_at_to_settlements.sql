-- 精算キャンセル用カラム追加
-- null: 有効な精算, 非null: キャンセル済み

ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT NULL;
