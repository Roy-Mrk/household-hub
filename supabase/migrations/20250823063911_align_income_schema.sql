-- 1) テーブル本体が無ければ作成
create table if not exists public.income (
  id          bigserial primary key,
  source      text,
  amount      bigint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) 不足カラムを追加（あればスキップ）
alter table public.income
  add column if not exists source     text,
  add column if not exists amount     bigint,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 3) 型/制約を揃える（例：amountがnumeric/textならbigintへ変換）
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'income'
      and column_name = 'amount'
      and data_type <> 'bigint'
  ) then
    execute 'alter table public.income alter column amount type bigint using (round((amount)::numeric))';
  end if;
end
$$;

-- 必須制約（null禁止）
alter table public.income
  alter column source set not null,
  alter column amount set not null;

-- 4) updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_income_updated_at on public.income;
create trigger trg_income_updated_at
before update on public.income
for each row
execute function public.set_updated_at();

-- 5) RLS 有効化（すでに有効ならOK）
alter table public.income enable row level security;

-- 6) ポリシー（存在すれば削除して再作成）
drop policy if exists income_select_anon on public.income;
create policy income_select_anon
  on public.income
  for select
  to anon
  using (true);

-- 認証ユーザーのCUD許可（必要に応じて調整）
drop policy if exists income_cud_authenticated on public.income;
create policy income_cud_authenticated
  on public.income
  for all
  to authenticated
  using (true)
  with check (true);

-- 7) インデックス
create index if not exists idx_income_created_at_desc on public.income (created_at desc);
create index if not exists idx_income_source on public.income (source);