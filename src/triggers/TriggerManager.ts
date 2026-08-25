// TriggerManager — สร้าง/ลบ time-driven trigger + quota check (Ref: C3/C6, US-003, FR-03)
import { Frequency } from '../types';
import { AppError } from '../core/errors';
import { config } from '../core/config';

const HANDLER = 'runScheduledJob';
const DEFAULT_MAX_TRIGGERS = 18; // buffer ใต้โควต้า Apps Script (~20/script/user)

export class TriggerManager {
  /** โยน QUOTA_EXCEEDED ถ้าจำนวน trigger ถึงเพดาน */
  assertQuota(): void {
    const count = ScriptApp.getProjectTriggers().length;
    const max = Number(config.get('max_triggers', String(DEFAULT_MAX_TRIGGERS))) || DEFAULT_MAX_TRIGGERS;
    if (count >= max) {
      throw new AppError('QUOTA_EXCEEDED', 'ถึงโควต้าจำนวน trigger ของ Apps Script แล้ว');
    }
  }

  createForJob(frequency: Frequency): string {
    const base = ScriptApp.newTrigger(HANDLER).timeBased();
    const trigger =
      frequency === 'hourly'
        ? base.everyHours(1).create()
        : base.everyDays(1).atHour(8).create();
    return trigger.getUniqueId();
  }

  deleteTrigger(triggerId: string): void {
    for (const t of ScriptApp.getProjectTriggers()) {
      if (t.getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(t);
        return;
      }
    }
  }
}

export const triggerManager = new TriggerManager();
