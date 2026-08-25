// Exponential backoff + retry + 6-min budget (Ref: design/correctness.md P3/P4, NFR-03, EX-01)
import { AppError } from './errors';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 250;
const DEFAULT_MAX_DELAY = 4000;

/**
 * Deterministic exponential backoff (monotonic non-decreasing, capped).
 * Property P3: computeDelay(n) >= computeDelay(n-1) and <= maxDelay.
 */
export function computeDelay(attempt: number, opts: RetryOptions = {}): number {
  const base = opts.baseDelayMs ?? DEFAULT_BASE_DELAY;
  const max = opts.maxDelayMs ?? DEFAULT_MAX_DELAY;
  const safeAttempt = Math.max(1, attempt);
  const exp = base * Math.pow(2, safeAttempt - 1);
  return Math.min(max, exp);
}

/**
 * Retry เฉพาะ AppError ที่ retriable (AI_TIMEOUT/QUOTA_EXCEEDED), สูงสุด maxRetries ครั้ง.
 * Property P4: retriable -> called <= maxRetries+1; non-retriable -> called once.
 */
export function withRetry<T>(fn: () => T, opts: RetryOptions = {}): T {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const base = opts.baseDelayMs ?? DEFAULT_BASE_DELAY;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      const retriable = err instanceof AppError ? err.retriable : false;
      if (!retriable || attempt > maxRetries) break;
      const jitter = Math.floor(Math.random() * base);
      Utilities.sleep(Math.round(computeDelay(attempt, opts)) + jitter);
    }
  }
  throw lastErr;
}

// buffer ก่อนชน 6-นาที limit ของ Apps Script -> ให้แตก batch/continuation
const EXECUTION_BUDGET_MS = 5 * 60 * 1000;

export function shouldContinue(startTimeMs: number, now: number = Date.now()): boolean {
  return now - startTimeMs >= EXECUTION_BUDGET_MS;
}
