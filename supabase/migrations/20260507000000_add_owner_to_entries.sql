-- income / expense テーブルに帰属（owner）カラムを追加
-- self: 自分, shared: 家族共有

ALTER TABLE income
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'self'
  CHECK (owner IN ('self', 'shared'));

ALTER TABLE expense
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'self'
  CHECK (owner IN ('self', 'shared'));
