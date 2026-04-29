-- households テーブル
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- household_members テーブル（unique(user_id) で1ユーザー1世帯を強制）
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

-- household_invitations テーブル（id がそのままトークン）
create table if not exists public.household_invitations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  expires_at   timestamptz,
  used_at      timestamptz,
  used_by      uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- income/expense に household_id 追加
alter table public.income  add column if not exists household_id uuid references public.households(id);
alter table public.expense add column if not exists household_id uuid references public.households(id);

-- インデックス
create index if not exists idx_income_household_id              on public.income (household_id);
create index if not exists idx_expense_household_id             on public.expense (household_id);
create index if not exists idx_household_members_user_id        on public.household_members (user_id);
create index if not exists idx_household_invitations_household  on public.household_invitations (household_id);

-- ─── RLS: households ────────────────────────────────────────────────────────
alter table public.households enable row level security;

create policy households_select on public.households for select to authenticated
  using (id in (
    select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
  ));

create policy households_insert on public.households for insert to authenticated
  with check (created_by = auth.uid());

create policy households_delete on public.households for delete to authenticated
  using (created_by = auth.uid());

-- ─── RLS: household_members ─────────────────────────────────────────────────
alter table public.household_members enable row level security;

-- 同じ世帯のメンバー全員を参照可
create policy household_members_select on public.household_members for select to authenticated
  using (household_id in (
    select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
  ));

-- 自分自身のみ追加可
create policy household_members_insert on public.household_members for insert to authenticated
  with check (user_id = auth.uid());

-- 自分自身のみ削除可（世帯解散は households 削除のカスケードで対応）
create policy household_members_delete on public.household_members for delete to authenticated
  using (user_id = auth.uid());

-- ─── RLS: household_invitations ─────────────────────────────────────────────
alter table public.household_invitations enable row level security;

-- 認証済みユーザーはすべての招待を参照可（トークンで参加するため）
create policy household_invitations_select on public.household_invitations for select to authenticated
  using (true);

-- オーナーのみ招待作成可
create policy household_invitations_insert on public.household_invitations for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.household_members
      where household_id = household_invitations.household_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ─── RLS: income 更新（世帯ベース） ─────────────────────────────────────────
drop policy if exists income_select_own on public.income;
drop policy if exists income_insert_own on public.income;
drop policy if exists income_update_own on public.income;
drop policy if exists income_delete_own on public.income;

create policy income_select_own on public.income for select to authenticated
  using (
    user_id = auth.uid()
    or (
      household_id is not null
      and household_id in (
        select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
      )
    )
  );

create policy income_insert_own on public.income for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      household_id is null
      or household_id in (
        select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
      )
    )
  );

create policy income_update_own on public.income for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy income_delete_own on public.income for delete to authenticated
  using (user_id = auth.uid());

-- ─── RLS: expense 更新（世帯ベース） ────────────────────────────────────────
drop policy if exists expense_select_own on public.expense;
drop policy if exists expense_insert_own on public.expense;
drop policy if exists expense_update_own on public.expense;
drop policy if exists expense_delete_own on public.expense;

create policy expense_select_own on public.expense for select to authenticated
  using (
    user_id = auth.uid()
    or (
      household_id is not null
      and household_id in (
        select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
      )
    )
  );

create policy expense_insert_own on public.expense for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      household_id is null
      or household_id in (
        select hm.household_id from public.household_members hm where hm.user_id = auth.uid()
      )
    )
  );

create policy expense_update_own on public.expense for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy expense_delete_own on public.expense for delete to authenticated
  using (user_id = auth.uid());
