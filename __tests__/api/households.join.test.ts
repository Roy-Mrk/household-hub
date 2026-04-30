import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeQueryMock } from '../helpers/queryMock';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: vi.fn() })
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

import { POST } from '../../app/api/households/join/route';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TEST_USER = { id: 'user-456', email: 'member@example.com' };
const HOUSEHOLD_ID = 'hh-uuid-001';
const TOKEN = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';
const FUTURE = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

const VALID_INVITATION = {
  id: TOKEN,
  household_id: HOUSEHOLD_ID,
  expires_at: FUTURE,
  used_at: null,
  households: { name: '田中家' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
});

describe('POST /api/households/join', () => {
  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('不正な UUID は400を返す', async () => {
    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: 'not-a-uuid' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('存在しないトークンは404を返す', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: null, error: null }) as never
    );

    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('使用済みトークンは409を返す', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: { ...VALID_INVITATION, used_at: '2026-04-27T00:00:00Z' }, error: null }) as never
    );

    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'この招待はすでに使用済みです' });
  });

  it('期限切れトークンは410を返す', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() =>
      makeQueryMock({ data: { ...VALID_INVITATION, expires_at: PAST }, error: null }) as never
    );

    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ error: '招待の有効期限が切れています' });
  });

  it('すでに世帯所属中は409を返す', async () => {
    vi.mocked(supabaseAdmin.from)
      .mockImplementationOnce(() => makeQueryMock({ data: VALID_INVITATION, error: null }) as never)
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { household_id: 'other-hh' }, error: null }) as never
      );

    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'すでに世帯に所属しています' });
  });

  it('有効なトークンで世帯に参加できる', async () => {
    vi.mocked(supabaseAdmin.from)
      .mockImplementationOnce(() => makeQueryMock({ data: VALID_INVITATION, error: null }) as never)
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: null }) as never)
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: null }) as never)
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: null }) as never);

    const req = new Request('http://localhost/api/households/join', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ message: '参加しました', household: { id: HOUSEHOLD_ID } });
  });
});
