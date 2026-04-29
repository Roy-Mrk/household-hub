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

import { POST } from '../../app/api/households/leave/route';

const TEST_USER = { id: 'user-456', email: 'member@example.com' };
const HOUSEHOLD_ID = 'hh-uuid-001';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
});

describe('POST /api/households/leave', () => {
  it('未認証は401を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('世帯未所属の場合404を返す', async () => {
    mockFrom.mockImplementationOnce(() => makeQueryMock({ data: null, error: null }));

    const res = await POST();
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: '世帯に所属していません' });
  });

  it('オーナーは退出できない（403）', async () => {
    mockFrom.mockImplementationOnce(() =>
      makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'owner' }, error: null })
    );

    const res = await POST();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('オーナーは退出できません') });
  });

  it('メンバーは世帯から退出できる', async () => {
    mockFrom
      .mockImplementationOnce(() =>
        makeQueryMock({ data: { household_id: HOUSEHOLD_ID, role: 'member' }, error: null })
      )
      .mockImplementationOnce(() => makeQueryMock({ error: null }));

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: '世帯から退出しました' });
  });
});
