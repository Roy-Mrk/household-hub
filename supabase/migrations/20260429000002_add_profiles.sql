-- profiles テーブル（ユーザーの表示名を管理）
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 自動更新トリガー
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- 認証済みユーザーは全プロフィールを参照可（世帯メンバー表示用）
create policy profiles_select on public.profiles for select to authenticated
  using (true);

-- 自分のプロフィールのみ作成・更新可
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- サインアップ時に自動でプロフィールを作成するトリガー関数
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),  -- Google OAuth
      nullif(trim(new.raw_user_meta_data->>'name'), ''),       -- その他 OAuth
      split_part(new.email, '@', 1)                            -- メールのローカル部
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
