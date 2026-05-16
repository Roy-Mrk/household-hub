import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted で vi.mock ファクトリから参照できる値を事前定義
const { mockExistsSync, mockMkdirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(() => true),
  mockMkdirSync: vi.fn(),
}));

const { MockConsoleTransport, MockFileTransport, mockCreateLogger } = vi.hoisted(() => {
  const MockConsoleTransport = vi.fn((opts: unknown) => ({ _type: 'Console', opts }));
  const MockFileTransport   = vi.fn((opts: unknown) => ({ _type: 'File',    opts }));
  const mockCreateLogger    = vi.fn((cfg: { level: string; transports: unknown[] }) => ({
    level: cfg.level,
    transports: cfg.transports,
  }));
  return { MockConsoleTransport, MockFileTransport, mockCreateLogger };
});

vi.mock('fs', () => ({
  default: { existsSync: mockExistsSync, mkdirSync: mockMkdirSync },
  existsSync: mockExistsSync,
  mkdirSync:  mockMkdirSync,
}));

vi.mock('winston', () => {
  // winston.format は関数かつメソッド群を持つオブジェクト
  // errorSerializer = winston.format(fn) のような呼び出しに対応するため callable にする
  const fmt = Object.assign(
    (_fn: unknown) => () => ({}),  // winston.format(fn)() → formatInstance
    {
      combine:   vi.fn((...fmts: unknown[]) => fmts),
      timestamp: vi.fn(() => ({})),
      colorize:  vi.fn(() => ({})),
      printf:    vi.fn(() => ({})),
      json:      vi.fn(() => ({})),
    }
  );
  const shared = {
    transports: { Console: MockConsoleTransport, File: MockFileTransport },
    format: fmt,
    createLogger: mockCreateLogger,
  };
  return { default: shared, ...shared };
});

// ─── テスト ───────────────────────────────────────────────────────────────────

describe('logger (src/lib/logger.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockExistsSync.mockReturnValue(true);
  });

  const importLogger = () => import('@/lib/logger');

  // ─── 開発環境 ─────────────────────────────────────────────────────────────

  describe('開発環境（NODE_ENV=development, 非Vercel）', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('ConsoleTransport と FileTransport の両方が設定される', async () => {
      await importLogger();
      expect(MockConsoleTransport).toHaveBeenCalledOnce();
      expect(MockFileTransport).toHaveBeenCalledOnce();
    });

    it('createLogger に 2 つのトランスポートが渡される', async () => {
      await importLogger();
      const cfg = mockCreateLogger.mock.calls[0][0] as { transports: unknown[] };
      expect(cfg.transports).toHaveLength(2);
    });

    it('FileTransport のファイル名が logs/app.log', async () => {
      await importLogger();
      const opts = MockFileTransport.mock.calls[0][0] as Record<string, unknown>;
      expect(opts.filename).toMatch(/logs[/\\]app\.log$/);
    });

    it('FileTransport のローテーション閾値が 5 MB', async () => {
      await importLogger();
      const opts = MockFileTransport.mock.calls[0][0] as Record<string, unknown>;
      expect(opts.maxsize).toBe(5 * 1024 * 1024);
    });

    it('FileTransport の保持ファイル数が 5', async () => {
      await importLogger();
      const opts = MockFileTransport.mock.calls[0][0] as Record<string, unknown>;
      expect(opts.maxFiles).toBe(5);
    });

    it('logs/ ディレクトリが存在しない場合は mkdirSync で作成する', async () => {
      mockExistsSync.mockReturnValue(false);
      await importLogger();
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    it('logs/ ディレクトリが既存の場合は mkdirSync を呼ばない', async () => {
      mockExistsSync.mockReturnValue(true);
      await importLogger();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  // ─── テスト環境 ───────────────────────────────────────────────────────────

  describe('テスト環境（NODE_ENV=test）', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test');
    });

    it('FileTransport は使用されない', async () => {
      await importLogger();
      expect(MockFileTransport).not.toHaveBeenCalled();
    });

    it('ファイルシステムにアクセスしない', async () => {
      await importLogger();
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  // ─── Vercel 環境 ──────────────────────────────────────────────────────────

  describe('Vercel 環境（VERCEL=1）', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('VERCEL', '1');
    });

    it('FileTransport は使用されない', async () => {
      await importLogger();
      expect(MockFileTransport).not.toHaveBeenCalled();
    });

    it('createLogger に渡されるトランスポートは 1 つのみ', async () => {
      await importLogger();
      const cfg = mockCreateLogger.mock.calls[0][0] as { transports: unknown[] };
      expect(cfg.transports).toHaveLength(1);
    });

    it('ファイルシステムにアクセスしない', async () => {
      await importLogger();
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  // ─── 本番環境 ─────────────────────────────────────────────────────────────

  describe('本番環境（NODE_ENV=production）', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('FileTransport は使用されない', async () => {
      await importLogger();
      expect(MockFileTransport).not.toHaveBeenCalled();
    });

    it('createLogger に渡されるトランスポートは 1 つのみ', async () => {
      await importLogger();
      const cfg = mockCreateLogger.mock.calls[0][0] as { transports: unknown[] };
      expect(cfg.transports).toHaveLength(1);
    });

    it('ファイルシステムにアクセスしない', async () => {
      await importLogger();
      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  // ─── ログレベル ───────────────────────────────────────────────────────────

  describe('ログレベル設定', () => {
    it('createLogger に level: info が設定される', async () => {
      await importLogger();
      const cfg = mockCreateLogger.mock.calls[0][0] as { level: string };
      expect(cfg.level).toBe('info');
    });
  });
});
