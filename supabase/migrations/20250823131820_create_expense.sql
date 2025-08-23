-- expense テーブル本体
create table if not exists public.expense (
  id          bigserial primary key,
  source      text not null,             -- 支出の内容（incomeに合わせてsourceに統一）
  amount      bigint not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_expense_updated_at on public.expense;
create trigger trg_expense_updated_at
before update on public.expense
for each row execute function public.set_updated_at();

-- RLS 有効化
alter table public.expense enable row level security;

-- ポリシー（存在すれば削除→再作成）
drop policy if exists expense_select_anon on public.expense;
create policy expense_select_anon
  on public.expense
  for select
  to anon
  using (true);

drop policy if exists expense_cud_authenticated on public.expense;
create policy expense_cud_authenticated
  on public.expense
  for all
  to authenticated
  using (true)
  with check (true);

-- インデックス
create index if not exists idx_expense_created_at_desc on public.expense (created_at desc);
create index if not exists idx_expense_category on public.expense (category);