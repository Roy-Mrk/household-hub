import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeQueryMock } from '../helpers/queryMock';

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: mockAdminFrom },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

import { POST } from '../../app/api/recurring/apply/route';

const TEST_USER = { id: 'user-123', email: 'test@example.com' };
const MISC_CAT_ID = 'cat-misc-uuid';
const MISC_SUB_ID = 'sub-misc-uuid';

// 今日を固定
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
  vi.resetAllMocks(); // mockImplementationOnce の残留を防ぐ
});

afterEach(() => {
  vi.useRealTimers();
});

/** 未分類ID取得（supabaseAdmin）のモックを設定 */
function setupAdminMiscMocks() {
  const catMock = makeQueryMock({ data: { id: MISC_CAT_ID }, error: null });
  const subMock = makeQueryMock({ data: { id: MISC_SUB_ID }, error: null });
  // income用 categories → subcategories、expense用 categories → subcategories
  mockAdminFrom
    .mockImplementationOnce(() => catMock)
    .mockImplementationOnce(() => subMock)
    .mockImplementationOnce(() => catMock)
    .mockImplementationOnce(() => subMock);
}

const BASE_ENTRY = {
  id: 1,
  user_id: TEST_USER.id,
  type: 'expense',
  source: '家賃',
  amount: 80000,
  subcategory_id: null,
  owner: 'self',
  needs_settlement: false,
  frequency: 'monthly',
  day_of_month: 1,
  month_of_year: null,
  next_apply_date: '2026-05-01', // 今日より前なのでdue
  is_active: true,
  household_id: null,
};

// ─── 認証チェック ─────────────────────────────────────────────────────────────

describe('認証チェック', () => {
  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/recurring/apply ────────────────────────────────────────────────

describe('POST /api/recurring/apply', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('期限切れエントリがない場合は applied: 0 を返す', async () => {
    const duesQ = makeQueryMock({ data: [], error: null });
    mockFrom.mockReturnValue(duesQ);

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: 0 });
  });

  it('期限切れエントリを1件適用し applied: 1 を返す', async () => {
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: null, error: null });
    const claimQ = makeQueryMock({ data: [{ id: 1 }], error: null });
    const insertQ = makeQueryMock({ data: [{ id: 100 }], error: null });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: 1 });
  });

  it('クレーム成功時に income/expense テーブルへ insert する', async () => {
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: null, error: null });
    const claimQ = makeQueryMock({ data: [{ id: 1 }], error: null });
    const insertQ = makeQueryMock({ data: [{ id: 100 }], error: null });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    await POST();

    expect(insertQ.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source: '家賃',
          amount: 80000,
          entry_date: '2026-05-01',
          user_id: TEST_USER.id,
        }),
      ])
    );
  });

  it('クレームに失敗（0件返却）した場合は insert しない（二重適用防止）', async () => {
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: null, error: null });
    // 別リクエストがすでに next_apply_date を更新済み → 0件返却
    const claimQ = makeQueryMock({ data: [], error: null });
    const insertQ = makeQueryMock({ data: [{ id: 100 }], error: null });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: 0 });
    expect(insertQ.insert).not.toHaveBeenCalled();
  });

  it('insert 失敗は applied にカウントしない', async () => {
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: null, error: null });
    const claimQ = makeQueryMock({ data: [{ id: 1 }], error: null });
    const insertQ = makeQueryMock({ data: null, error: new Error('DB error') });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: 0 });
  });

  it('next_apply_date の更新に使用する日付が正しい（毎月1日 → 6月1日）', async () => {
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: null, error: null });
    const claimQ = makeQueryMock({ data: [{ id: 1 }], error: null });
    const insertQ = makeQueryMock({ data: [{ id: 100 }], error: null });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    await POST();

    expect(claimQ.update).toHaveBeenCalledWith(
      expect.objectContaining({ next_apply_date: '2026-06-01' })
    );
  });

  it('世帯所属中は household_id が insert に含まれる', async () => {
    const HOUSEHOLD_ID = 'hh-uuid-456';
    const duesQ = makeQueryMock({ data: [BASE_ENTRY], error: null });
    const membershipQ = makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null });
    const claimQ = makeQueryMock({ data: [{ id: 1 }], error: null });
    const insertQ = makeQueryMock({ data: [{ id: 100 }], error: null });

    mockFrom
      .mockImplementationOnce(() => duesQ)
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => claimQ)
      .mockImplementationOnce(() => insertQ);

    setupAdminMiscMocks();

    await POST();

    expect(insertQ.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ household_id: HOUSEHOLD_ID }),
      ])
    );
  });
});
