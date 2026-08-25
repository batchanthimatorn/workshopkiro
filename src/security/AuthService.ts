// AuthService — OAuth + domain restriction + RBAC (Ref: components.md C9, US-008, NFR-01)
import { config } from '../core/config';
import { Role } from '../types';
import { AppError } from '../core/errors';

export class AuthService {
  getCurrentEmail(): string {
    try {
      return Session.getActiveUser().getEmail() || '';
    } catch {
      return '';
    }
  }

  /** จำกัดเฉพาะโดเมนที่อนุญาต (ถ้า allowed_domains ว่าง = ไม่จำกัด สำหรับ dev/workshop) */
  assertDomain(): string {
    const email = this.getCurrentEmail();
    const domains = config.getList('allowed_domains');
    if (domains.length === 0) return email;
    const domain = email.split('@')[1] ?? '';
    if (!domains.includes(domain)) {
      throw new AppError('DOMAIN_FORBIDDEN', `Domain not allowed: ${domain}`);
    }
    return email;
  }

  getRole(email?: string): Role {
    const e = email ?? this.getCurrentEmail();
    const admins = config.getList('admin_emails');
    const devs = config.getList('developer_emails');
    const owners = config.getList('owner_emails');
    // dev/open mode: ยังไม่ตั้ง RBAC เลย -> ให้ผู้ใช้ (ซึ่งเป็นเจ้าของ deploy) เป็น admin
    // (web app access = MYSELF อยู่แล้ว จึงปลอดภัยในบริบท dev)
    if (admins.length === 0 && devs.length === 0 && owners.length === 0) return 'admin';
    if (admins.includes(e)) return 'admin';
    if (devs.includes(e)) return 'developer';
    if (owners.includes(e)) return 'automation_owner';
    return 'end_user';
  }

  assertRole(required: Role): void {
    const role = this.getRole();
    if (!this.satisfies(role, required)) {
      throw new AppError('UNAUTHORIZED', `Requires role: ${required}`);
    }
  }

  private satisfies(actual: Role, required: Role): boolean {
    if (actual === 'admin') return true; // admin ครอบทุกสิทธิ์
    if (required === 'end_user') return true; // ทุก role ใช้ฟีเจอร์ end-user ได้
    return actual === required;
  }
}

export const authService = new AuthService();
