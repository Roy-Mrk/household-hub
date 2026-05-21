-- 繰り返しエントリテーブル
CREATE TABLE recurring_entries (
  id              serial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id    uuid REFERENCES households(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('income', 'expense')),
  source          text NOT NULL,
  amount          bigint NOT NULL CHECK (amount >= 0),
  subcategory_id  uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  owner           text NOT NULL DEFAULT 'self' CHECK (owner IN ('self', 'shared')),
  needs_settlement boolean NOT NULL DEFAULT false,
  frequency       text NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  day_of_month    integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  month_of_year   integer CHECK (month_of_year BETWEEN 1 AND 12),
  next_apply_date date NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分の繰り返しエントリを参照できる"
  ON recurring_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ユーザーは自分の繰り返しエントリを作成できる"
  ON recurring_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ユーザーは自分の繰り返しエントリを更新できる"
  ON recurring_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "ユーザーは自分の繰り返しエントリを削除できる"
  ON recurring_entries FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER trg_recurring_entries_updated_at
  BEFORE UPDATE ON recurring_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
