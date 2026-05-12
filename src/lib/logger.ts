import winston from 'winston';
import path from 'path';
import fs from 'fs';

const isVercel = Boolean(process.env.VERCEL);
const isDev = process.env.NODE_ENV === 'development';

// { error: Error } を JSON シリアライズ可能な形式に変換する
const errorSerializer = winston.format((info) => {
  const err = info['error'];
  if (err instanceof Error) {
    info['error'] = { message: err.message, name: err.name, stack: err.stack };
  }
  return info;
});

const jsonFormat = winston.format.combine(
  errorSerializer(),
  winston.format.timestamp(),
  winston.format.json()
);

const prettyFormat = winston.format.combine(
  errorSerializer(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, error, ...meta } = info as {
      timestamp: string; level: string; message: string;
      error?: unknown; [key: string]: unknown;
    };
    const errStr  = error ? ` error=${JSON.stringify(error)}` : '';
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${message}${errStr}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isDev ? prettyFormat : jsonFormat,
  }),
];

// ファイル出力: ローカル開発時のみ（Vercel ではファイル書き込み不可）
if (isDev && !isVercel) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5 * 1024 * 1024, // 5MB でローテーション
      maxFiles: 5,
      format: jsonFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: 'info',
  transports,
});
