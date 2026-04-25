-- user_id カラム追加（nullable: 既存行を壊さないため）
alter table public.income
  add column if not exists user_id uuid references auth.users(id);
alter table public.expense
  add column if not exists user_id uuid references auth.users(id);

-- インデックス
create index if not exists idx_income_user_id on public.income (user_id);
create index if not exists idx_expense_user_id on public.expense (user_id);

-- income: 旧ポリシー削除 → user_id ベースに差し替え
drop policy if exists income_select_anon       on public.income;
drop policy if exists income_cud_authenticated on public.income;

create policy income_select_own on public.income for select to authenticated
  using (auth.uid() = user_id);
create policy income_insert_own on public.income for insert to authenticated
  with check (auth.uid() = user_id);
create policy income_update_own on public.income for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy income_delete_own on public.income for delete to authenticated
  using (auth.uid() = user_id);

-- expense: 旧ポリシー削除 → user_id ベースに差し替え
drop policy if exists expense_select_anon       on public.expense;
drop policy if exists expense_cud_authenticated on public.expense;

create policy expense_select_own on public.expense for select to authenticated
  using (auth.uid() = user_id);
create policy expense_insert_own on public.expense for insert to authenticated
  with check (auth.uid() = user_id);
create policy expense_update_own on public.expense for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy expense_delete_own on public.expense for delete to authenticated
  using (auth.uid() = user_id);
