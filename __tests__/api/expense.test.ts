import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { GET, POST, PATCH, DELETE } from '../../app/api/expense/route';

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

function makeQueryMock(result: object) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q['then'] = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  q.select = vi.fn(chain);
  q.insert = vi.fn(chain);
  q.update = vi.fn(chain);
  q.delete = vi.fn(chain);
  q.ilike = vi.fn(chain);
  q.gte = vi.fn(chain);
  q.lte = vi.fn(chain);
  q.order = vi.fn(chain);
  q.range = vi.fn(() => Promise.resolve(result));
  q.eq = vi.fn(chain);
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 認証チェック ────────────────────────────────────────────────────────────

describe('認証チェック', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('GET: 未認証は401を返す', async () => {
    const req = new NextRequest('http://localhost/api/expense');
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: '認証が必要です' });
  });

  it('POST: 未認証は401を返す', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'POST',
      body: JSON.stringify({ source: '食費', amount: 5000, category: '食費', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('PATCH: 未認証は401を返す', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, amount: 6000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('DELETE: 未認証は401を返す', async () => {
    const req = new NextRequest('http://localhost/api/expense?id=1');
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/expense', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('認証済みユーザーはデータを取得できる', async () => {
    const rows = [{ id: 1, source: '食費', amount: 5000, entry_date: '2026-04-01', user_id: TEST_USER.id }];
    mockFrom.mockReturnValue(makeQueryMock({ data: rows, count: 1, error: null }));

    const req = new NextRequest('http://localhost/api/expense');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(rows);
  });

  it('DBエラー時は500を返す', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ data: null, count: null, error: new Error('DB error') }));

    const req = new NextRequest('http://localhost/api/expense');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ─── POST ────────────────────────────────────────────────────────────────────

describe('POST /api/expense', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('有効なデータで支出を作成できる', async () => {
    const newRow = { id: 1, source: '食費', amount: 5000, category: '食費', entry_date: '2026-04-01', user_id: TEST_USER.id };
    mockFrom.mockReturnValue(makeQueryMock({ data: [newRow], error: null }));

    const req = new Request('http://localhost/api/expense', {
      method: 'POST',
      body: JSON.stringify({ source: '食費', amount: 5000, category: '食費', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '作成OK' });
  });

  it('sourceが空の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'POST',
      body: JSON.stringify({ source: '', amount: 5000, category: '食費', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('amountが負の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'POST',
      body: JSON.stringify({ source: '食費', amount: -1, category: '食費', entry_date: '2026-04-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('必須フィールド欠損はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'POST',
      body: JSON.stringify({ amount: 5000 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH ───────────────────────────────────────────────────────────────────

describe('PATCH /api/expense', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('有効なidとフィールドで更新できる', async () => {
    const updated = [{ id: 1, amount: 6000 }];
    mockFrom.mockReturnValue(makeQueryMock({ data: updated, error: null }));

    const req = new Request('http://localhost/api/expense', {
      method: 'PATCH',
      body: JSON.stringify({ id: 1, amount: 6000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '更新OK' });
  });

  it('idが欠損の場合はバリデーションエラー400', async () => {
    const req = new Request('http://localhost/api/expense', {
      method: 'PATCH',
      body: JSON.stringify({ amount: 6000 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/expense', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it('有効なidで削除できる', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ error: null }));

    const req = new NextRequest('http://localhost/api/expense?id=1');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '削除OK' });
  });

  it('idが未指定の場合は400', async () => {
    const req = new NextRequest('http://localhost/api/expense');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'id が必要です' });
  });

  it('idが数値でない場合は400', async () => {
    const req = new NextRequest('http://localhost/api/expense?id=abc');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
