// SecurityFilter — กรองข้อมูลต้องห้ามก่อนส่ง AI + HITL (Ref: C11, US-010, BR-01/BR-02, correctness P1/P2)
import { config } from '../core/config';
import { auditLogger } from '../core/audit';
import { JobType } from '../types';

export interface FilterResult {
  blocked: boolean;
  matchedCount: number;
}

export class SecurityFilter {
  /**
   * ตรวจ content กับ banned keywords (case-insensitive).
   * Property P1: มี banned keyword -> blocked=true เสมอ.
   * Property P2: ไม่มี banned keyword -> blocked=false.
   */
  scan(content: string, bannedOverride?: string[]): FilterResult {
    const banned = bannedOverride ?? config.getList('banned_keywords');
    if (banned.length === 0) return { blocked: false, matchedCount: 0 };

    const lower = content.toLowerCase();
    let matched = 0;
    for (const kw of banned) {
      if (kw && lower.includes(kw.toLowerCase())) matched++;
    }
    return { blocked: matched > 0, matchedCount: matched };
  }

  /** บันทึกการยืนยันของผู้ใช้ (HITL) — ผู้ยืนยัน + เวลา (BR-01) */
  recordConfirmation(userEmail: string, jobType: JobType, requestId: string): void {
    auditLogger.logConfirmation(userEmail, jobType, requestId);
  }
}

export const securityFilter = new SecurityFilter();
