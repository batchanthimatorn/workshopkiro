// P3, P4 — backoff + retry (Ref: design/correctness.md)
import fc from 'fast-check';
import { computeDelay, withRetry } from '../../src/core/retry';
import { AppError, ErrorCode } from '../../src/core/errors';
import { installGasMocks } from '../mocks/gas-globals';

beforeEach(() => installGasMocks());

describe('retry properties', () => {
  it('P3: computeDelay is monotonic non-decreasing and capped', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (attempt) => {
        const d = computeDelay(attempt);
        const dPrev = attempt > 1 ? computeDelay(attempt - 1) : 0;
        return d >= dPrev && d <= 4000;
      }),
    );
  });

  it('P4: retriable errors retried <= maxRetries+1; non-retriable called once', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ErrorCode>('AI_TIMEOUT', 'QUOTA_EXCEEDED', 'VALIDATION', 'UNAUTHORIZED'),
        (code) => {
          let calls = 0;
          try {
            withRetry(
              () => {
                calls++;
                throw new AppError(code);
              },
              { maxRetries: 3 },
            );
          } catch {
            /* expected to throw */
          }
          const retriable = code === 'AI_TIMEOUT' || code === 'QUOTA_EXCEEDED';
          return retriable ? calls <= 4 : calls === 1;
        },
      ),
    );
  });
});
