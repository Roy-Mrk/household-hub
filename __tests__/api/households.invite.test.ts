import { NextRequest } from 'next/server';
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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

import { GET, POST } from '../../app/api/households/invite/route';

const TEST_USER = { id: 'user-123', email: 'owner@example.com' };
const HOUSEHOLD_ID = 'hh-uuid-001';
const TOKEN = 'inv-uuid-001';
const FUTURE = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/households/invite ───────────────────────────────────────────────

describe('GET /api/households/invite', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest(`http://localhost/api/households/invite?token=${TOKEN}`);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('token パラメータなしは400を返す', async () => {
    const req = new NextRequest('http://localhost/api/households/invite');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('存在しない token は404を返す', async () => {
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: null, error: null }));

    const req = new NextRequest(`http://localhost/api/households/invite?token=${TOKEN}`);
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('有効な招待は is_valid: true を返す', async () => {
    const invitation = {
      id: TOKEN,
      household_id: HOUSEHOLD_ID,
      expires_at: FUTURE,
      used_at: null,
      households: { name: '田中家' },
    };
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: invitation, error: null }));

    const req = new NextRequest(`http://localhost/api/households/invite?token=${TOKEN}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation).toMatchObject({
      household_name: '田中家',
      is_valid: true,
      is_expired: false,
      is_used: false,
    });
  });

  it('期限切れの招待は is_expired: true を返す', async () => {
    const invitation = {
      id: TOKEN,
      household_id: HOUSEHOLD_ID,
      expires_at: PAST,
      used_at: null,
      households: { name: '田中家' },
    };
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: invitation, error: null }));

    const req = new NextRequest(`http://localhost/api/households/invite?token=${TOKEN}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation).toMatchObject({ is_valid: false, is_expired: true });
  });

  it('使用済みの招待は is_used: true を返す', async () => {
    const invitation = {
      id: TOKEN,
      household_id: HOUSEHOLD_ID,
      expires_at: FUTURE,
      used_at: '2026-04-27T00:00:00Z',
      households: { name: '田中家' },
    };
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: invitation, error: null }));

    const req = new NextRequest(`http://localhost/api/households/invite?token=${TOKEN}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation).toMatchObject({ is_valid: false, is_used: true });
  });
});

// ─── POST /api/households/invite ─────────────────────────────────────────────

describe('POST /api/households/invite', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new Request('http://localhost/api/households/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('世帯未所属の場合404を返す', async () => {
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: null, error: null }));

    const req = new Request('http://localhost/api/households/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('メンバー（非オーナー）は403を返す', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'member' }, error: null })
    );

    const req = new Request('http://localhost/api/households/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'オーナーのみ招待できます' });
  });

  it('オーナーはトークンを発行できる', async () => {
    mockFrom
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'owner' }, error: null })
      )
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { id: TOKEN }, error: null })
      );

    const req = new Request('http://localhost/api/households/invite', {
      method: 'POST',
      body: JSON.stringify({ expires_in_hours: 72 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ token: TOKEN });
  });
});
