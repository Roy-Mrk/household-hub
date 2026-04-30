import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeQueryMock } from '../helpers/queryMock';

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
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

import { GET, PATCH } from '../../app/api/profile/route';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TEST_USER = { id: 'user-123', email: 'test@example.com' };
const HOUSEHOLD_ID = 'hh-uuid-001';
const OTHER_USER_ID = 'user-456';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/profile ────────────────────────────────────────────────────────

describe('GET /api/profile', () => {
  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('プロフィールが存在する場合は display_name を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { display_name: '田中太郎' }, error: null })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profile: { display_name: '田中太郎' } });
  });

  it('プロフィール未設定の場合は null を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: null, error: null })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profile: null });
  });
});

// ─── PATCH /api/profile ───────────────────────────────────────────────────────

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '太郎' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('display_name が空文字はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('display_name が51文字はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: 'あ'.repeat(51) }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('世帯未所属の場合は重複チェックなしで更新できる', async () => {
    // 1. household_members lookup → null（未所属）
    // 2. profiles upsert
    mockFrom
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: null }))
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { display_name: '田中太郎' }, error: null })
      );

    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '田中太郎' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profile: { display_name: '田中太郎' } });
  });

  it('世帯所属・他メンバーなしの場合は重複チェックなしで更新できる', async () => {
    // 1. household_members lookup → 所属あり
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null })
    );
    // 2. admin: 他メンバー取得 → 0件
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: [], error: null }) as never
    );
    // 3. profiles upsert
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { display_name: '田中太郎' }, error: null })
    );

    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '田中太郎' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profile: { display_name: '田中太郎' } });
  });

  it('同じ世帯の別メンバーと表示名が重複する場合は409を返す', async () => {
    // 1. household_members lookup → 所属あり
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null })
    );
    // 2. admin: 他メンバー取得 → 1件あり
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: [{ user_id: OTHER_USER_ID }], error: null }) as never
    );
    // 3. profiles: 重複チェック → 一致あり
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { display_name: '田中太郎' }, error: null })
    );

    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '田中太郎' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      error: 'この表示名はすでに同じ世帯のメンバーが使用しています',
    });
  });

  it('世帯内で重複がなければ更新できる', async () => {
    // 1. household_members lookup → 所属あり
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null })
    );
    // 2. admin: 他メンバー取得 → 1件あり
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: [{ user_id: OTHER_USER_ID }], error: null }) as never
    );
    // 3. profiles: 重複チェック → 一致なし
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: null, error: null })
    );
    // 4. profiles upsert
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { display_name: '新しい名前' }, error: null })
    );

    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: '新しい名前' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profile: { display_name: '新しい名前' } });
  });
});
