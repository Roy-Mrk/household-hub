-- household_members の SELECT ポリシーが自分自身を参照して無限再帰するため、
-- security definer 関数経由に切り替えて再帰を断ち切る。

-- ─── 1. security definer 関数（RLS をバイパスして自分の世帯情報を取得） ────────
create or replace function public.get_my_household_id()
returns uuid
security definer
stable
set search_path = public
language sql as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.get_my_household_role()
returns text
security definer
stable
set search_path = public
language sql as $$
  select role from public.household_members where user_id = auth.uid() limit 1;
$$;

-- ─── 2. household_members: 再帰なし版に差し替え ────────────────────────────────
drop policy if exists household_members_select on public.household_members;

create policy household_members_select on public.household_members for select to authenticated
  using (household_id = public.get_my_household_id());

-- ─── 3. households: 関数版に差し替え ────────────────────────────────────────────
drop policy if exists households_select on public.households;

create policy households_select on public.households for select to authenticated
  using (id = public.get_my_household_id());

-- ─── 4. household_invitations: オーナー確認を関数経由に ─────────────────────────
drop policy if exists household_invitations_insert on public.household_invitations;

create policy household_invitations_insert on public.household_invitations for insert to authenticated
  with check (
    created_by = auth.uid()
    and household_id = public.get_my_household_id()
    and public.get_my_household_role() = 'owner'
  );

-- ─── 5. income: サブクエリを関数呼び出しに差し替え ──────────────────────────────
drop policy if exists income_select_own on public.income;
drop policy if exists income_insert_own on public.income;

create policy income_select_own on public.income for select to authenticated
  using (
    user_id = auth.uid()
    or (household_id is not null and household_id = public.get_my_household_id())
  );

create policy income_insert_own on public.income for insert to authenticated
  with check (
    user_id = auth.uid()
    and (household_id is null or household_id = public.get_my_household_id())
  );

-- ─── 6. expense: 同様に差し替え ─────────────────────────────────────────────────
drop policy if exists expense_select_own on public.expense;
drop policy if exists expense_insert_own on public.expense;

create policy expense_select_own on public.expense for select to authenticated
  using (
    user_id = auth.uid()
    or (household_id is not null and household_id = public.get_my_household_id())
  );

create policy expense_insert_own on public.expense for insert to authenticated
  with check (
    user_id = auth.uid()
    and (household_id is null or household_id = public.get_my_household_id())
  );
