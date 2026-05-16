import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from '../../app/api/report/monthly/route';

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

// テストで "今" を固定: 2026-05-16（月曜）
const FIXED_NOW = new Date('2026-05-16T00:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── 認証チェック ─────────────────────────────────────────────────────────────

describe('認証チェック', () => {
  it('未認証は 401 を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest('http://localhost/api/report/monthly');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ─── 正常系 ───────────────────────────────────────────────────────────────────

describe('GET /api/report/monthly', () => {
  function makeIncomeExpenseMocks(
    incomeData: object[],
    expenseData: object[]
  ) {
    // from('income') → income mock, from('expense') → expense mock
    mockFrom
      .mockImplementationOnce(() => makeQueryMock({ data: incomeData, error: null }))
      .mockImplementationOnce(() => makeQueryMock({ data: expenseData, error: null }));
  }

  it('デフォルトで 12 ヶ月分のデータを返す', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(12);
  });

  it('months パラメータで件数を指定できる', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=6');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toHaveLength(6);
  });

  it('months の上限は 24', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=999');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toHaveLength(24);
  });

  it('months の下限は 1', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=0');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('months に非数値が渡された場合はデフォルト 12 を使う', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=abc');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(12);
  });

  it('最新月が現在月（2026-05）である', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=3');
    const res = await GET(req);
    const body = await res.json();
    const months = body.data.map((d: { month: string }) => d.month);
    expect(months).toEqual(['2026-03', '2026-04', '2026-05']);
  });

  it('収入・支出がない月は income=0, expense=0 で返る', async () => {
    makeIncomeExpenseMocks([], []);
    const req = new NextRequest('http://localhost/api/report/monthly?months=1');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0]).toMatchObject({ income: 0, expense: 0, balance: 0 });
  });

  it('収入を正しく集計する', async () => {
    makeIncomeExpenseMocks(
      [
        { amount: 200000, entry_date: '2026-05-01' },
        { amount: 50000,  entry_date: '2026-05-15' },
      ],
      []
    );
    const req = new NextRequest('http://localhost/api/report/monthly?months=1');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0]).toMatchObject({ month: '2026-05', income: 250000, expense: 0, balance: 250000 });
  });

  it('支出を正しく集計する', async () => {
    makeIncomeExpenseMocks(
      [],
      [
        { amount: 30000, entry_date: '2026-05-10' },
        { amount: 15000, entry_date: '2026-05-20' },
      ]
    );
    const req = new NextRequest('http://localhost/api/report/monthly?months=1');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0]).toMatchObject({ month: '2026-05', income: 0, expense: 45000, balance: -45000 });
  });

  it('balance = income - expense', async () => {
    makeIncomeExpenseMocks(
      [{ amount: 300000, entry_date: '2026-05-01' }],
      [{ amount: 120000, entry_date: '2026-05-05' }]
    );
    const req = new NextRequest('http://localhost/api/report/monthly?months=1');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0].balance).toBe(180000);
  });

  it('複数月にまたがるデータをそれぞれの月に振り分ける', async () => {
    makeIncomeExpenseMocks(
      [
        { amount: 100000, entry_date: '2026-04-01' },
        { amount: 200000, entry_date: '2026-05-01' },
      ],
      []
    );
    const req = new NextRequest('http://localhost/api/report/monthly?months=2');
    const res = await GET(req);
    const body = await res.json();
    const apr = body.data.find((d: { month: string }) => d.month === '2026-04');
    const may = body.data.find((d: { month: string }) => d.month === '2026-05');
    expect(apr.income).toBe(100000);
    expect(may.income).toBe(200000);
  });

  it('対象期間外のデータは無視される', async () => {
    // months=1 なので 2026-04 以前は対象外
    makeIncomeExpenseMocks(
      [
        { amount: 999999, entry_date: '2026-04-30' }, // 対象外
        { amount: 100000, entry_date: '2026-05-01' }, // 対象内
      ],
      []
    );
    const req = new NextRequest('http://localhost/api/report/monthly?months=1');
    const res = await GET(req);
    const body = await res.json();
    // 対象外の月のデータは monthMap に存在しないためスキップされる
    expect(body.data[0].income).toBe(100000);
  });

  it('DB エラー時は 500 を返す', async () => {
    mockFrom
      .mockImplementationOnce(() => makeQueryMock({ data: null, error: new Error('DB error') }))
      .mockImplementationOnce(() => makeQueryMock({ data: [], error: null }));
    const req = new NextRequest('http://localhost/api/report/monthly');
    const res = await GET(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: 'データ取得に失敗しました' });
  });
});
