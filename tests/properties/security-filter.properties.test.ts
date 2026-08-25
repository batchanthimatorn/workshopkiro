// P1, P2 — SecurityFilter (Ref: design/correctness.md)
import fc from 'fast-check';
import { SecurityFilter } from '../../src/security/SecurityFilter';

const filter = new SecurityFilter();
const BANNED = ['secret', 'password', 'ห้าม', 'confidential'];

describe('SecurityFilter properties', () => {
  it('P1: content containing a banned keyword is always blocked', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(...BANNED), fc.string(), (pre, banned, post) => {
        return filter.scan(`${pre}${banned}${post}`, BANNED).blocked === true;
      }),
    );
  });

  it('P2: content without any banned keyword is not blocked', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => BANNED.every((b) => !s.toLowerCase().includes(b.toLowerCase()))),
        (clean) => filter.scan(clean, BANNED).blocked === false,
      ),
    );
  });
});
