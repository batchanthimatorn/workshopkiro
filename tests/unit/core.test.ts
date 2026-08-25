import { AppError, toUserMessage } from '../../src/core/errors';
import { computeDelay, shouldContinue } from '../../src/core/retry';
import { maskEmail } from '../../src/core/logger';

describe('AppError', () => {
  it('marks retriable codes', () => {
    expect(new AppError('AI_TIMEOUT').retriable).toBe(true);
    expect(new AppError('QUOTA_EXCEEDED').retriable).toBe(true);
    expect(new AppError('VALIDATION').retriable).toBe(false);
  });

  it('toUserMessage returns safe text (no stack)', () => {
    expect(toUserMessage(new AppError('BLOCKED_SENSITIVE'))).toContain('ตรวจสอบ');
    expect(toUserMessage(new Error('internal boom'))).not.toContain('boom');
  });
});

describe('retry helpers', () => {
  it('computeDelay grows exponentially and caps at 4000', () => {
    expect(computeDelay(1)).toBe(250);
    expect(computeDelay(2)).toBe(500);
    expect(computeDelay(3)).toBe(1000);
    expect(computeDelay(20)).toBeLessThanOrEqual(4000);
  });

  it('shouldContinue triggers near the 6-min limit', () => {
    expect(shouldContinue(Date.now(), Date.now())).toBe(false);
    expect(shouldContinue(0, 6 * 60 * 1000)).toBe(true);
  });
});

describe('maskEmail', () => {
  it('masks local part, keeps domain', () => {
    expect(maskEmail('someone@example.com')).toBe('som***@example.com');
    expect(maskEmail('notanemail')).toBe('***');
  });
});
