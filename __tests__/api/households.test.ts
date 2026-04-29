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

// vi.mock はホイストされるためファクトリ内では vi.fn() のみ使用
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

import { GET, POST, DELETE } from '../../app/api/households/route';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TEST_USER = { id: 'user-123', email: 'owner@example.com' };
const HOUSEHOLD_ID = 'hh-uuid-001';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 認証チェック ────────────────────────────────────────────────────────────

describe('認証チェック', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('GET: 未認証は401を返す', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST: 未認証は401を返す', async () => {
    const req = new Request('http://localhost/api/households', {
      method: 'POST',
      body: JSON.stringify({ name: '田中家' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('DELETE: 未認証は401を返す', async () => {
    const res = await DELETE();
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/households ─────────────────────────────────────────────────────

describe('GET /api/households', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('世帯未所属の場合 household: null を返す', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: null, error: null })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ household: null });
  });

  it('世帯所属中はメンバー付きの世帯情報を返す', async () => {
    const membership = { household_id: HOUSEHOLD_ID, role: 'owner', joined_at: '2026-04-26T00:00:00Z' };
    const household = { id: HOUSEHOLD_ID, name: '田中家', created_by: TEST_USER.id, created_at: '2026-04-26T00:00:00Z' };
    const members = [{ user_id: TEST_USER.id, role: 'owner', joined_at: '2026-04-26T00:00:00Z' }];

    mockFrom
      .mockImplementationOnce(() => makeQueryMock({ data: membership, error: null }))
      .mockImplementationOnce(() => makeQueryMock({ data: household, error: null }))
      .mockImplementationOnce(() => makeQueryMock({ data: members, error: null }));

    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue(
      { data: { user: { email: TEST_USER.email } } } as never
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.household).toMatchObject({ id: HOUSEHOLD_ID, name: '田中家', role: 'owner' });
    expect(body.household.members).toHaveLength(1);
    expect(body.household.members[0]).toMatchObject({ email: TEST_USER.email, role: 'owner' });
  });
});

// ─── POST /api/households ────────────────────────────────────────────────────

describe('POST /api/households', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('世帯名なしはバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/households', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('すでに世帯所属中は409を返す', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null })
    );

    const req = new Request('http://localhost/api/households', {
      method: 'POST',
      body: JSON.stringify({ name: '田中家' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'すでに世帯に所属しています' });
  });

  it('正常に世帯を作成できる', async () => {
    const createdHousehold = { id: HOUSEHOLD_ID, name: '田中家', created_by: TEST_USER.id };
    // 既存チェック: server client
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: null, error: null }));
    // INSERT households + INSERT household_members: admin client
    vi.mocked(supabaseAdmin.from)
      .mockImplementationOnce(() => makeQueryMock({ data: createdHousehold, error: null }) as never)
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: null }) as never);

    const req = new Request('http://localhost/api/households', {
      method: 'POST',
      body: JSON.stringify({ name: '田中家' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ household: { name: '田中家' } });
  });
});

// ─── DELETE /api/households ──────────────────────────────────────────────────

describe('DELETE /api/households', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('世帯未所属の場合404を返す', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: null, error: null })
    );

    const res = await DELETE();
    expect(res.status).toBe(404);
  });

  it('メンバーがオーナー権限なしで解散しようとすると403', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'member' }, error: null })
    );

    const res = await DELETE();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'オーナーのみ解散できます' });
  });

  it('オーナーは世帯を解散できる', async () => {
    mockFrom
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'owner' }, error: null })
      )
      .mockImplementationOnce(() => makeQueryMock({ error: null }));

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '世帯を解散しました' });
  });
});
