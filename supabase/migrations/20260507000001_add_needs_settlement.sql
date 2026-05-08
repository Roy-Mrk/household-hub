-- income / expense テーブルに精算待ちフラグを追加
-- shared（家族共有）の明細のみ対象。self の明細は常に false。

ALTER TABLE income
  ADD COLUMN IF NOT EXISTS needs_settlement boolean NOT NULL DEFAULT true;

ALTER TABLE expense
  ADD COLUMN IF NOT EXISTS needs_settlement boolean NOT NULL DEFAULT true;
