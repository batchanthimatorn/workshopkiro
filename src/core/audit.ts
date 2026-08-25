// AuditLogger — เขียน usage/audit ลง LogSheet (ไม่เก็บ PII/content) — Ref: NFR-02, US-011
import { LogRepository } from '../data/repositories';
import { logger, maskEmail, genRequestId } from './logger';
import { LogEntry, Role, JobType, LogStatus } from '../types';

export interface UsageInput {
  userEmail: string;
  role: Role;
  jobType: JobType;
  model: string;
  status: LogStatus;
  tokens?: number;
  durationMs?: number;
  requestId?: string;
}

export class AuditLogger {
  private repo = new LogRepository();

  logUsage(input: UsageInput): void {
    const entry: LogEntry = {
      logId: genRequestId(),
      timestamp: new Date().toISOString(),
      userEmailMasked: maskEmail(input.userEmail),
      role: input.role,
      jobType: input.jobType,
      model: input.model,
      status: input.status,
      tokens: input.tokens,
      durationMs: input.durationMs,
      requestId: input.requestId ?? genRequestId(),
    };
    try {
      this.repo.append(entry);
    } catch {
      logger.error('audit append failed', { requestId: entry.requestId });
    }
    logger.info('usage', {
      requestId: entry.requestId,
      jobType: input.jobType,
      status: input.status,
      model: input.model,
    });
  }

  logConfirmation(userEmail: string, jobType: JobType, requestId: string): void {
    const now = new Date().toISOString();
    const entry: LogEntry = {
      logId: genRequestId(),
      timestamp: now,
      userEmailMasked: maskEmail(userEmail),
      role: 'end_user',
      jobType,
      model: '-',
      status: 'success',
      requestId,
      confirmedBy: maskEmail(userEmail),
      confirmedAt: now,
    };
    try {
      this.repo.append(entry);
    } catch {
      logger.error('audit confirmation append failed', { requestId });
    }
  }
}

export const auditLogger = new AuditLogger();
