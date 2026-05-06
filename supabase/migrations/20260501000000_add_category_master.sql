-- ─── categories テーブル ─────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('income', 'expense')),
  user_id    uuid references auth.users(id) on delete cascade, -- NULL = マスタ
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── subcategories テーブル ──────────────────────────────────────────────────
create table if not exists public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name        text not null,
  user_id     uuid references auth.users(id) on delete cascade, -- NULL = マスタ
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_categories_type    on public.categories (type);
create index if not exists idx_categories_user_id on public.categories (user_id);
create index if not exists idx_subcategories_category_id on public.subcategories (category_id);

-- ─── RLS: categories ─────────────────────────────────────────────────────────
alter table public.categories enable row level security;

create policy categories_select on public.categories for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy categories_insert on public.categories for insert to authenticated
  with check (user_id = auth.uid());

create policy categories_update on public.categories for update to authenticated
  using (user_id = auth.uid());

create policy categories_delete on public.categories for delete to authenticated
  using (user_id = auth.uid());

-- ─── RLS: subcategories ──────────────────────────────────────────────────────
alter table public.subcategories enable row level security;

create policy subcategories_select on public.subcategories for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy subcategories_insert on public.subcategories for insert to authenticated
  with check (user_id = auth.uid());

create policy subcategories_update on public.subcategories for update to authenticated
  using (user_id = auth.uid());

create policy subcategories_delete on public.subcategories for delete to authenticated
  using (user_id = auth.uid());

-- ─── マスタデータ投入（MoneyForward ME 準拠） ────────────────────────────────

-- 支出カテゴリ
with ins as (
  insert into public.categories (name, type, sort_order) values
    ('食費',         'expense',  1),
    ('日用品',       'expense',  2),
    ('交通費',       'expense',  3),
    ('趣味・娯楽',   'expense',  4),
    ('衣服・美容',   'expense',  5),
    ('健康・医療',   'expense',  6),
    ('通信費',       'expense',  7),
    ('教養・教育',   'expense',  8),
    ('住宅',         'expense',  9),
    ('水道・光熱費', 'expense', 10),
    ('自動車',       'expense', 11),
    ('保険',         'expense', 12),
    ('税・社会保障', 'expense', 13),
    ('特別な支出',   'expense', 14),
    ('交際費',       'expense', 15),
    ('現金・カード', 'expense', 16),
    ('その他',       'expense', 17)
  returning id, name
)
insert into public.subcategories (category_id, name, sort_order)
select c.id, s.name, s.sort_order from (
  values
    ('食費',         '食料品',           1),
    ('食費',         '外食',             2),
    ('食費',         'カフェ・喫茶',     3),
    ('食費',         'アルコール',       4),
    ('日用品',       '日用品',           1),
    ('日用品',       'ドラッグストア',   2),
    ('日用品',       'ペット',           3),
    ('日用品',       'タバコ',           4),
    ('交通費',       '電車・バス',       1),
    ('交通費',       'タクシー',         2),
    ('交通費',       '飛行機',           3),
    ('交通費',       '高速道路',         4),
    ('交通費',       '駐車場',           5),
    ('趣味・娯楽',   'アウトドア',       1),
    ('趣味・娯楽',   'スポーツ',         2),
    ('趣味・娯楽',   '映画・音楽・ゲーム', 3),
    ('趣味・娯楽',   '本・雑誌',         4),
    ('趣味・娯楽',   '旅行',             5),
    ('趣味・娯楽',   'その他趣味',       6),
    ('衣服・美容',   '衣類',             1),
    ('衣服・美容',   'アクセサリー',     2),
    ('衣服・美容',   '美容院',           3),
    ('衣服・美容',   '化粧品',           4),
    ('健康・医療',   '病院',             1),
    ('健康・医療',   '薬',               2),
    ('健康・医療',   'フィットネス',     3),
    ('通信費',       '携帯電話',         1),
    ('通信費',       'インターネット',   2),
    ('通信費',       '放送視聴料',       3),
    ('教養・教育',   '書籍',             1),
    ('教養・教育',   '学費',             2),
    ('教養・教育',   '塾・習い事',       3),
    ('住宅',         '家賃',             1),
    ('住宅',         '住宅ローン',       2),
    ('住宅',         '管理費・修繕積立', 3),
    ('住宅',         '地代',             4),
    ('水道・光熱費', '電気代',           1),
    ('水道・光熱費', 'ガス代',           2),
    ('水道・光熱費', '水道代',           3),
    ('自動車',       'ガソリン',         1),
    ('自動車',       '自動車ローン',     2),
    ('自動車',       '駐車場',           3),
    ('自動車',       '高速道路',         4),
    ('自動車',       '車検・整備',       5),
    ('自動車',       '自動車税',         6),
    ('保険',         '生命保険',         1),
    ('保険',         '医療保険',         2),
    ('保険',         '火災保険',         3),
    ('保険',         '自動車保険',       4),
    ('保険',         '学資保険',         5),
    ('税・社会保障', '所得税',           1),
    ('税・社会保障', '住民税',           2),
    ('税・社会保障', '社会保険料',       3),
    ('税・社会保障', '固定資産税',       4),
    ('税・社会保障', 'ふるさと納税',     5),
    ('特別な支出',   '冠婚葬祭',         1),
    ('特別な支出',   'プレゼント',       2),
    ('特別な支出',   '家電・家具',       3),
    ('交際費',       '交際費',           1),
    ('現金・カード', 'ATM引出し',        1),
    ('現金・カード', 'クレジット引き落とし', 2),
    ('その他',       'その他',           1)
) as s(cat_name, name, sort_order)
join ins as c on c.name = s.cat_name;

-- 収入カテゴリ
with ins as (
  insert into public.categories (name, type, sort_order) values
    ('給与・賞与',   'income', 1),
    ('事業・副業',   'income', 2),
    ('年金・補助',   'income', 3),
    ('贈与・祝い',   'income', 4),
    ('不労所得',     'income', 5),
    ('その他収入',   'income', 6)
  returning id, name
)
insert into public.subcategories (category_id, name, sort_order)
select c.id, s.name, s.sort_order from (
  values
    ('給与・賞与', '給与',     1),
    ('給与・賞与', '賞与',     2),
    ('事業・副業', '事業収入', 1),
    ('事業・副業', '副業収入', 2),
    ('年金・補助', '年金',     1),
    ('年金・補助', '保険受取', 2),
    ('年金・補助', '補助金',   3),
    ('贈与・祝い', '贈与',     1),
    ('贈与・祝い', 'お祝い',   2),
    ('不労所得',   '配当',     1),
    ('不労所得',   '利子',     2),
    ('不労所得',   '家賃収入', 3),
    ('その他収入', 'その他',   1)
) as s(cat_name, name, sort_order)
join ins as c on c.name = s.cat_name;

-- ─── income / expense に subcategory_id を追加 ───────────────────────────────
alter table public.income  add column if not exists subcategory_id uuid references public.subcategories(id);
alter table public.expense add column if not exists subcategory_id uuid references public.subcategories(id);

create index if not exists idx_income_subcategory_id  on public.income  (subcategory_id);
create index if not exists idx_expense_subcategory_id on public.expense (subcategory_id);

-- ─── 既存データの移行（フリーテキスト → subcategory_id） ──────────────────────
-- 収入
update public.income i set subcategory_id = s.id
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.type = 'income' and (
  (i.category = '給与'   and c.name = '給与・賞与' and s.name = '給与') or
  (i.category = '賞与'   and c.name = '給与・賞与' and s.name = '賞与') or
  (i.category = '副業'   and c.name = '事業・副業' and s.name = '副業収入') or
  (i.category = 'その他' and c.name = 'その他収入' and s.name = 'その他')
);
-- 未マッチ行は「その他収入 / その他」にフォールバック
update public.income set subcategory_id = (
  select s.id from public.subcategories s
  join public.categories c on c.id = s.category_id
  where c.name = 'その他収入' and s.name = 'その他' and c.user_id is null
  limit 1
) where subcategory_id is null;

-- 支出
update public.expense e set subcategory_id = s.id
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.type = 'expense' and (
  (e.category = '食費'   and c.name = '食費'         and s.name = '食料品') or
  (e.category = '外食費' and c.name = '食費'         and s.name = '外食') or
  (e.category = '住居費' and c.name = '住宅'         and s.name = '家賃') or
  (e.category = '光熱費' and c.name = '水道・光熱費' and s.name = '電気代') or
  (e.category = '交通費' and c.name = '交通費'       and s.name = '電車・バス') or
  (e.category = '通信費' and c.name = '通信費'       and s.name = '携帯電話') or
  (e.category = '娯楽費' and c.name = '趣味・娯楽'   and s.name = 'その他趣味') or
  (e.category = '衣服費' and c.name = '衣服・美容'   and s.name = '衣類') or
  (e.category = '医療費' and c.name = '健康・医療'   and s.name = '病院')
);
-- 未マッチ行は「その他 / その他」にフォールバック
update public.expense set subcategory_id = (
  select s.id from public.subcategories s
  join public.categories c on c.id = s.category_id
  where c.name = 'その他' and s.name = 'その他' and c.type = 'expense' and c.user_id is null
  limit 1
) where subcategory_id is null;

-- ─── 旧 category カラムを削除 ────────────────────────────────────────────────
alter table public.income  drop column if exists category;
alter table public.expense drop column if exists category;

-- ─── income/expense の RLS も subcategory_id を考慮（参照のみ、既存ポリシーは変更なし） ──
