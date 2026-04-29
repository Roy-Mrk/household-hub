import { vi } from 'vitest';

/**
 * Supabase クエリビルダーのモック。
 * チェーン可能かつ thenable（await 可能）。
 * - range() / maybeSingle() / single() は Promise を返す（終端）
 * - select/insert/update/delete/order/eq 等はすべてチェーンを返す
 */
export function makeQueryMock(result: object) {
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
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.single = vi.fn(() => Promise.resolve(result));
  return q;
}
