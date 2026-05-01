-- ============================================================
-- ローカル開発用デモデータ
-- デモユーザー: demo@example.com / パスワード: demo1234
-- ============================================================

-- デモユーザーを auth.users に挿入
-- handle_new_user トリガーが profiles も自動作成する
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, aud, role,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  'demo@example.com',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  'authenticated', 'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"デモユーザー"}'
) ON CONFLICT (id) DO NOTHING;

-- ─── 収入データ（3ヶ月分） ────────────────────────────────────────────────────
INSERT INTO public.income (source, amount, category, entry_date, user_id) VALUES
  -- 2026年3月
  ('月給（3月分）',    320000, '給与',   '2026-03-25', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('フリーランス案件', 85000,  '副業',   '2026-03-15', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('メルカリ売上',     12000,  'その他', '2026-03-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  -- 2026年4月
  ('月給（4月分）',    320000, '給与',   '2026-04-25', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('フリーランス案件', 120000, '副業',   '2026-04-18', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('春季賞与',         180000, '賞与',   '2026-04-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('メルカリ売上',     8500,   'その他', '2026-04-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  -- 2026年5月
  ('月給（5月分）',    320000, '給与',   '2026-05-25', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('フリーランス案件', 95000,  '副業',   '2026-05-12', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

-- ─── 支出データ（3ヶ月分） ────────────────────────────────────────────────────
INSERT INTO public.expense (source, amount, category, entry_date, user_id) VALUES
  -- 2026年3月
  ('家賃',           95000, '住居費',  '2026-03-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週1）', 6800,  '食費',   '2026-03-03', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週2）', 7200,  '食費',   '2026-03-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週3）', 6500,  '食費',   '2026-03-17', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週4）', 7800,  '食費',   '2026-03-24', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ランチ代',        4500,  '外食費', '2026-03-12', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('飲み会',          8000,  '外食費', '2026-03-20', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('電気代',          8200,  '光熱費', '2026-03-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ガス代',          3800,  '光熱費', '2026-03-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('交通費（定期）',  12000, '交通費', '2026-03-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スマホ代',        5500,  '通信費', '2026-03-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('映画・配信',      3200,  '娯楽費', '2026-03-15', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('病院',            2800,  '医療費', '2026-03-22', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  -- 2026年4月
  ('家賃',           95000, '住居費',  '2026-04-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週1）', 7100,  '食費',   '2026-04-07', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週2）', 6900,  '食費',   '2026-04-14', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週3）', 8200,  '食費',   '2026-04-21', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週4）', 6600,  '食費',   '2026-04-28', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('花見',           15000, '外食費',  '2026-04-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ランチ代',        5200,  '外食費', '2026-04-18', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('電気代',          7500,  '光熱費', '2026-04-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ガス代',          3200,  '光熱費', '2026-04-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('交通費（定期）',  12000, '交通費', '2026-04-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スマホ代',        5500,  '通信費', '2026-04-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('春服',           22000, '衣服費',  '2026-04-12', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('映画・配信',      3200,  '娯楽費', '2026-04-15', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ジム入会',        8000,  '娯楽費', '2026-04-20', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  -- 2026年5月
  ('家賃',           95000, '住居費',  '2026-05-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週1）', 6700,  '食費',   '2026-05-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週2）', 7300,  '食費',   '2026-05-12', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週3）', 6900,  '食費',   '2026-05-19', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スーパー（週4）', 7500,  '食費',   '2026-05-26', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('GW旅行',         45000, '娯楽費',  '2026-05-03', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ランチ代',        4800,  '外食費', '2026-05-14', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('電気代',          6800,  '光熱費', '2026-05-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('ガス代',          2900,  '光熱費', '2026-05-05', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('交通費（定期）',  12000, '交通費', '2026-05-01', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('スマホ代',        5500,  '通信費', '2026-05-10', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  ('映画・配信',      3200,  '娯楽費', '2026-05-15', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
