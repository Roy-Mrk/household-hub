import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calcNextApplyDate, calcInitialNextApplyDate } from '../../src/lib/recurringUtils';

// 今日 = 2026-05-21 に固定
const TODAY = new Date('2026-05-21T00:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── calcNextApplyDate ────────────────────────────────────────────────────────

describe('calcNextApplyDate', () => {
  describe('毎月', () => {
    it('翌月の同日を返す', () => {
      expect(calcNextApplyDate('2026-05-21', 'monthly', 21)).toBe('2026-06-21');
    });

    it('月をまたぐ場合に年が繰り上がる', () => {
      // 2025-12-01 から毎月1日を進める: 2026-01→02→03→04→05→06-01(>今日5/21)
      expect(calcNextApplyDate('2025-12-01', 'monthly', 1)).toBe('2026-06-01');
    });

    it('存在しない日は末日にクランプする（毎月31日 → 今日以降の最初の31日相当）', () => {
      // 2026-01-31 から毎月31日: Feb→28, Mar→31, Apr→30, May→31(>今日5/21) で停止
      expect(calcNextApplyDate('2026-01-31', 'monthly', 31)).toBe('2026-05-31');
    });

    it('複数期間前でも未来の日付まで正しく進める', () => {
      // 3ヶ月前のエントリ → 6月21日が次回
      const result = calcNextApplyDate('2026-02-21', 'monthly', 21);
      const resultDate = new Date(result);
      expect(resultDate > TODAY).toBe(true);
      expect(result).toBe('2026-06-21');
    });
  });

  describe('毎年', () => {
    it('翌年の同日を返す', () => {
      expect(calcNextApplyDate('2026-05-21', 'yearly', 21)).toBe('2027-05-21');
    });

    it('複数年前でも未来の日付まで正しく進める', () => {
      const result = calcNextApplyDate('2024-03-01', 'yearly', 1);
      const resultDate = new Date(result);
      expect(resultDate > TODAY).toBe(true);
      expect(result).toBe('2027-03-01');
    });

    it('うるう年の2月29日は平年には2月28日にクランプする', () => {
      // 今日は2026-05-21。2024/2025/2026の2月はすでに過ぎているので2027-02-28
      expect(calcNextApplyDate('2024-02-29', 'yearly', 29)).toBe('2027-02-28');
    });
  });
});

// ─── calcInitialNextApplyDate ─────────────────────────────────────────────────

describe('calcInitialNextApplyDate', () => {
  describe('毎月', () => {
    it('指定日が今日より後なら今月の日付を返す', () => {
      // 今日は21日、22日なら今月
      expect(calcInitialNextApplyDate('monthly', 22, null)).toBe('2026-05-22');
    });

    it('指定日が今日と同じなら翌月を返す', () => {
      // 今日は21日、21日なら翌月
      expect(calcInitialNextApplyDate('monthly', 21, null)).toBe('2026-06-21');
    });

    it('指定日が今日より前なら翌月を返す', () => {
      // 今日は21日、10日なら翌月
      expect(calcInitialNextApplyDate('monthly', 10, null)).toBe('2026-06-10');
    });

    it('今月に存在する日は今月を返す', () => {
      // 今日は5月21日。31日はまだ先(21 < 31) → 今月の5月31日
      expect(calcInitialNextApplyDate('monthly', 31, null)).toBe('2026-05-31');
    });
  });

  describe('毎年', () => {
    it('今年の指定日がまだ来ていない場合は今年を返す', () => {
      // 今日は5月21日、6月1日はまだ先
      expect(calcInitialNextApplyDate('yearly', 1, 6)).toBe('2026-06-01');
    });

    it('今年の指定日が今日と同じ場合は来年を返す', () => {
      expect(calcInitialNextApplyDate('yearly', 21, 5)).toBe('2027-05-21');
    });

    it('今年の指定日がすでに過ぎた場合は来年を返す', () => {
      // 今日は5月21日、3月1日はすでに過ぎている
      expect(calcInitialNextApplyDate('yearly', 1, 3)).toBe('2027-03-01');
    });

    it('month_of_yearがnullの場合は1月として扱う', () => {
      // 今日は5月21日、1月はすでに過ぎているので来年1月
      expect(calcInitialNextApplyDate('yearly', 15, null)).toBe('2027-01-15');
    });
  });
});
