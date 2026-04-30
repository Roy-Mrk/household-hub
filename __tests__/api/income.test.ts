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

import { GET, POST, PATCH, DELETE } from '../../app/api/income/route';

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 認証チェック ────────────────────────────────────────────────────────────

describe('認証チェック', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('GET: 未認証は401を返す', async () => {
    const req = new NextRequest('http://localhost/api/income');
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: '認証が必要です' });
  });

  it('POST: 未認証は401を返す', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: '給与', amount: 300000, category: '給与', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('PATCH: 未認証は401を返す', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, amount: 350000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('DELETE: 未認証は401を返す', async () => {
    const req = new NextRequest('http://localhost/api/income?id=1');
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/income', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('認証済みユーザーはデータを取得できる', async () => {
    const rows = [{ id: 1, source: '給与', amount: 300000, entry_date: '2026-04-01', user_id: TEST_USER.id }];
    mockFrom.mockReturnValue(makeQueryMock({ data: rows, count: 1, error: null }));

    const req = new NextRequest('http://localhost/api/income');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(rows);
  });

  it('DBエラー時は500を返す', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ data: null, count: null, error: new Error('DB error') }));

    const req = new NextRequest('http://localhost/api/income');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ─── POST ────────────────────────────────────────────────────────────────────

describe('POST /api/income', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('世帯未所属の場合 household_id: null で収入を作成できる', async () => {
    const newRow = { id: 1, source: '給与', amount: 300000, category: '給与', entry_date: '2026-04-01', user_id: TEST_USER.id, household_id: null };
    const membershipQ = makeQueryMock({ data: null, error: null });
    const insertQ = makeQueryMock({ data: [newRow], error: null });
    mockFrom
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => insertQ);

    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: '給与', amount: 300000, category: '給与', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '作成OK' });
    expect(insertQ.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ user_id: TEST_USER.id, household_id: null })])
    );
  });

  it('世帯所属中は household_id が自動付与される', async () => {
    const HOUSEHOLD_ID = 'hh-uuid-123';
    const newRow = { id: 1, source: '給与', amount: 300000, category: '給与', entry_date: '2026-04-01', user_id: TEST_USER.id, household_id: HOUSEHOLD_ID };
    const membershipQ = makeQueryMock({ data: { household_id: HOUSEHOLD_ID }, error: null });
    const insertQ = makeQueryMock({ data: [newRow], error: null });
    mockFrom
      .mockImplementationOnce(() => membershipQ)
      .mockImplementationOnce(() => insertQ);

    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: '給与', amount: 300000, category: '給与', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insertQ.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ household_id: HOUSEHOLD_ID })])
    );
  });

  it('sourceが空の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: '', amount: 300000, category: '給与', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('amountが負の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: '給与', amount: -1, category: '給与', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('必須フィールド欠損はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 300000 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH ───────────────────────────────────────────────────────────────────

describe('PATCH /api/income', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('有効なidとフィールドで更新できる', async () => {
    const updated = [{ id: 1, amount: 350000 }];
    mockFrom.mockReturnValue(makeQueryMock({ data: updated, error: null }));

    const req = new Request('http://localhost/api/income', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, amount: 350000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '更新OK' });
  });

  it('idが欠損の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/income', {
      method: 'PATCH',
      body: JSON.stringify({ amount: 350000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/income', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('有効なidで削除できる', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ error: null }));

    const req = new NextRequest('http://localhost/api/income?id=1');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '削除OK' });
  });

  it('idが未指定の場合は400', async () => {
    const req = new NextRequest('http://localhost/api/income');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'id が必要です' });
  });

  it('idが数値でない場合は400', async () => {
    const req = new NextRequest('http://localhost/api/income?id=abc');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
