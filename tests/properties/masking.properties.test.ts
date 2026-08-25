// P5 — email masking (Ref: design/correctness.md, NFR-02)
import fc from 'fast-check';
import { maskEmail } from '../../src/core/logger';

describe('masking property', () => {
  it('P5: idempotent, contains ***, no full local when local length >= 4', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const local = email.split('@')[0];
        const once = maskEmail(email);
        // ตรวจเฉพาะส่วน local ที่ mask แล้ว (domain อาจมี substring เดียวกันได้ตามธรรมชาติ)
        const maskedLocal = once.slice(0, once.indexOf('@'));
        return (
          maskEmail(once) === once &&
          once.includes('***') &&
          (local.length < 4 || !maskedLocal.includes(local))
        );
      }),
    );
  });
});
