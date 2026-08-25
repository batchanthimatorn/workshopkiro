// Structured logger + masking (Ref: design/operations.md Logging, NFR-02, correctness P5)

/**
 * mask email: แสดง 3 ตัวแรกของ local + *** + domain (PDPA).
 * Property P5: idempotent; local length >= 4 -> ไม่มี local เต็มในผลลัพธ์.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return '***';
  // ตัด '*' ทั้งหมดออกจาก local ก่อน -> prefix ที่โชว์ไม่มี '*' -> mask idempotent เสมอ
  const local = email.slice(0, at).replace(/\*/g, '');
  const domain = email.slice(at);
  const shown = local.slice(0, 3);
  return `${shown}***${domain}`;
}

export function genRequestId(): string {
  return Utilities.getUuid();
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, ctx: LogContext = {}): void {
  const line = JSON.stringify({ level, timestamp: new Date().toISOString(), message, ...ctx });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, ctx?: LogContext): void => emit('debug', message, ctx),
  info: (message: string, ctx?: LogContext): void => emit('info', message, ctx),
  warn: (message: string, ctx?: LogContext): void => emit('warn', message, ctx),
  error: (message: string, ctx?: LogContext): void => emit('error', message, ctx),
};
