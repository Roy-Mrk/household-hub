-- RLS 動作検証スクリプト（ROLLBACK で副作用なし）
-- 実行: supabase/tests/rls_check.sh

BEGIN;

-- ─── テストデータ挿入（postgres 権限） ──────────────────────────────────────
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'rls_owner@test.com'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'rls_member@test.com'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'rls_outsider@test.com');

INSERT INTO public.households (id, name, created_by)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'RLSテスト家',
        '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO public.household_members (household_id, user_id, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
   '11111111-1111-1111-1111-111111111111'::uuid, 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
   '22222222-2222-2222-2222-222222222222'::uuid, 'member');

-- authenticated ロールに切り替え（ここから RLS が有効になる）
SET LOCAL ROLE authenticated;

-- ─── オーナーとして検証 ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

DO $$
DECLARE cnt int;
BEGIN
  -- 無限再帰しないこと
  SELECT count(*) INTO cnt FROM public.household_members;
  ASSERT cnt = 2, format('[FAIL] オーナーが household_members を参照: 期待 2, 実際 %s', cnt);
  RAISE NOTICE '[PASS] household_members が再帰エラーなく参照できる（%件）', cnt;

  SELECT count(*) INTO cnt FROM public.households;
  ASSERT cnt = 1, format('[FAIL] オーナーが households を参照: 期待 1, 実際 %s', cnt);
  RAISE NOTICE '[PASS] オーナーは自世帯を参照できる（%件）', cnt;

  -- get_my_household_id が正しい値を返すこと
  ASSERT public.get_my_household_id() = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '[FAIL] get_my_household_id がオーナーの世帯IDを返さない';
  RAISE NOTICE '[PASS] get_my_household_id() がオーナーの世帯IDを返す';
END;
$$;

-- ─── 部外者として検証 ────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.household_members;
  ASSERT cnt = 0, format('[FAIL] 部外者が household_members を参照できてしまう: %s件', cnt);
  RAISE NOTICE '[PASS] 部外者は household_members を参照できない（%件）', cnt;

  SELECT count(*) INTO cnt FROM public.households;
  ASSERT cnt = 0, format('[FAIL] 部外者が households を参照できてしまう: %s件', cnt);
  RAISE NOTICE '[PASS] 部外者は households を参照できない（%件）', cnt;

  -- get_my_household_id が NULL を返すこと
  ASSERT public.get_my_household_id() IS NULL,
    format('[FAIL] 部外者の get_my_household_id() が NULL でない: %s',
           public.get_my_household_id());
  RAISE NOTICE '[PASS] 部外者の get_my_household_id() は NULL';

  -- household_id=null での income 登録は許可される
  INSERT INTO public.income (source, amount, category, entry_date, user_id, household_id)
  VALUES ('テスト収入', 1000, '給与', '2026-04-01',
          '33333333-3333-3333-3333-333333333333'::uuid, NULL);
  RAISE NOTICE '[PASS] household_id=NULL で自分の income を登録できる';

  -- 別世帯の household_id での登録は拒否される
  BEGIN
    INSERT INTO public.income (source, amount, category, entry_date, user_id, household_id)
    VALUES ('不正登録', 1000, '給与', '2026-04-01',
            '33333333-3333-3333-3333-333333333333'::uuid,
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
    ASSERT false, '[FAIL] RLS が別世帯の household_id での income 登録を許可してしまった';
  EXCEPTION WHEN others THEN
    RAISE NOTICE '[PASS] 別世帯の household_id での income 登録は拒否された';
  END;
END;
$$;

-- ─── メンバーとして検証 ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

DO $$
DECLARE cnt int;
BEGIN
  -- 同じ世帯のメンバーも参照できる
  SELECT count(*) INTO cnt FROM public.household_members;
  ASSERT cnt = 2, format('[FAIL] メンバーが household_members を参照: 期待 2, 実際 %s', cnt);
  RAISE NOTICE '[PASS] メンバーは同世帯の全員を参照できる（%件）', cnt;

  -- 自分の世帯の income を household_id 付きで登録できる
  INSERT INTO public.income (source, amount, category, entry_date, user_id, household_id)
  VALUES ('世帯収入', 200000, '給与', '2026-04-01',
          '22222222-2222-2222-2222-222222222222'::uuid,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  RAISE NOTICE '[PASS] メンバーは自世帯の household_id で income を登録できる';
END;
$$;

-- ─── profiles RLS 検証 ───────────────────────────────────────────────────────

-- プロフィールデータを postgres 権限で挿入（RESET ROLE は DO ブロック外で実行）
RESET ROLE;

-- handle_new_user トリガーが auth.users INSERT 時に自動生成するため UPDATE で上書き
UPDATE public.profiles SET display_name = 'オーナー太郎'
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;
UPDATE public.profiles SET display_name = 'メンバー花子'
WHERE user_id = '22222222-2222-2222-2222-222222222222'::uuid;

SET LOCAL ROLE authenticated;

DO $$
DECLARE cnt int;
BEGIN
  -- handle_new_user トリガーが3ユーザー全員のプロフィールを自動作成済み
  -- 認証済みユーザーは全プロフィールを参照できる（世帯メンバー表示用）
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

  -- テストユーザー3件が参照できることを確認（既存ユーザーの行は除外）
  SELECT count(*) INTO cnt FROM public.profiles
  WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
  );
  ASSERT cnt = 3, format('[FAIL] 認証済みユーザーのプロフィール参照: 期待 3, 実際 %s', cnt);
  RAISE NOTICE '[PASS] 認証済みユーザーはテストユーザーのプロフィールを参照できる（%件）', cnt;

  -- 自分のプロフィールは更新できる（トリガーで作成済みなので UPDATE）
  UPDATE public.profiles SET display_name = '部外者次郎'
  WHERE user_id = '33333333-3333-3333-3333-333333333333'::uuid;
  SELECT count(*) INTO cnt FROM public.profiles
  WHERE user_id = '33333333-3333-3333-3333-333333333333'::uuid
    AND display_name = '部外者次郎';
  ASSERT cnt = 1, '[FAIL] 自分のプロフィール更新ができなかった';
  RAISE NOTICE '[PASS] 自分のプロフィールを更新できる';

  -- 他人のプロフィールは更新できない（RLS は 0件更新で弾く）
  UPDATE public.profiles SET display_name = '書き換え'
  WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;
  SELECT count(*) INTO cnt FROM public.profiles
  WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND display_name = '書き換え';
  ASSERT cnt = 0, '[FAIL] 他人のプロフィールが書き換えられてしまった';
  RAISE NOTICE '[PASS] 他人のプロフィールは更新できない（0件更新）';

  -- オーナーも自分のプロフィールを更新できる
  PERFORM set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  UPDATE public.profiles SET display_name = 'オーナー更新'
  WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;
  SELECT count(*) INTO cnt FROM public.profiles
  WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND display_name = 'オーナー更新';
  ASSERT cnt = 1, format('[FAIL] オーナーのプロフィール更新失敗: %s件', cnt);
  RAISE NOTICE '[PASS] オーナーも自分のプロフィールを更新できる';
END;
$$;

ROLLBACK;
