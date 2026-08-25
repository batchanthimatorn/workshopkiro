import { installGasMocks, seedSheet } from '../mocks/gas-globals';
import { SecurityFilter } from '../../src/security/SecurityFilter';
import { AuthService } from '../../src/security/AuthService';

const CONFIG_HEADER = ['key', 'value', 'category', 'updatedBy', 'updatedAt'];

beforeEach(() => installGasMocks({ props: { SPREADSHEET_ID: 'test' } }));

describe('SecurityFilter.scan', () => {
  it('blocks banned, passes clean, empty list = pass', () => {
    const f = new SecurityFilter();
    expect(f.scan('this has secret', ['secret']).blocked).toBe(true);
    expect(f.scan('all clean here', ['secret']).blocked).toBe(false);
    expect(f.scan('anything', []).blocked).toBe(false);
  });
});

describe('AuthService.getRole', () => {
  it('dev-open mode: everyone is admin when no RBAC configured', () => {
    seedSheet('Config', [CONFIG_HEADER]);
    expect(new AuthService().getRole('x@y.com')).toBe('admin');
  });

  it('resolves admin from admin_emails, others end_user', () => {
    seedSheet('Config', [CONFIG_HEADER, ['admin_emails', 'boss@corp.com', 'security', '', '']]);
    const a = new AuthService();
    expect(a.getRole('boss@corp.com')).toBe('admin');
    expect(a.getRole('other@corp.com')).toBe('end_user');
  });
});

describe('AuthService.assertDomain', () => {
  it('allows any when allowed_domains empty (dev)', () => {
    seedSheet('Config', [CONFIG_HEADER]);
    expect(() => new AuthService().assertDomain()).not.toThrow();
  });

  it('rejects domain not in allowed list', () => {
    seedSheet('Config', [CONFIG_HEADER, ['allowed_domains', 'corp.com', 'security', '', '']]);
    // Session mock returns tester@example.com -> not in corp.com
    expect(() => new AuthService().assertDomain()).toThrow();
  });
});
