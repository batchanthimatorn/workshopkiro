// AutomationService — จัดการ + รันงานอัตโนมัติ (Ref: C6, US-003/004, FR-03)
import { JobRepository } from '../data/repositories';
import { Job, JobStatus, Frequency, Destination } from '../types';
import { genRequestId, logger } from '../core/logger';
import { AppError } from '../core/errors';
import { getAIProvider } from '../ai/AIProvider';
import { promptService } from './PromptService';
import { auditLogger } from '../core/audit';
import { notifier } from '../core/Notifier';
import { triggerManager } from '../triggers/TriggerManager';

export interface CreateJobInput {
  ownerEmail: string;
  templateId: string;
  frequency: Frequency;
  destination: Destination;
  destinationId?: string;
}

export class AutomationService {
  private repo = new JobRepository();

  listJobs(ownerEmail?: string): Job[] {
    const all = this.repo.readAll();
    return ownerEmail ? all.filter((j) => j.ownerEmail === ownerEmail) : all;
  }

  createJob(input: CreateJobInput): Job {
    // ตรวจ template มีอยู่จริง + quota trigger
    promptService.getTemplate(input.templateId);
    triggerManager.assertQuota();

    const job: Job = {
      jobId: genRequestId(),
      ownerEmail: input.ownerEmail,
      templateId: input.templateId,
      frequency: input.frequency,
      destination: input.destination,
      destinationId: input.destinationId,
      triggerId: triggerManager.createForJob(input.frequency),
      status: 'active',
    };
    this.repo.upsert(job);
    return job;
  }

  updateStatus(jobId: string, status: JobStatus): Job {
    const job = this.repo.findById(jobId);
    if (!job) throw new AppError('NOT_FOUND', 'ไม่พบงานอัตโนมัติ');

    if (status === 'paused' && job.triggerId) {
      triggerManager.deleteTrigger(job.triggerId);
      job.triggerId = undefined;
    } else if (status === 'active' && !job.triggerId) {
      triggerManager.assertQuota();
      job.triggerId = triggerManager.createForJob(job.frequency);
    }
    job.status = status;
    this.repo.upsert(job);
    return job;
  }

  deleteJob(jobId: string): void {
    const job = this.repo.findById(jobId);
    if (job?.triggerId) triggerManager.deleteTrigger(job.triggerId);
    this.repo.deleteById(jobId);
  }

  /** เรียกจาก trigger handler: หา job ที่ผูกกับ triggerUid แล้วรัน */
  executeByTrigger(triggerId: string): void {
    const job = this.repo.readAll().find((j) => j.triggerId === triggerId && j.status === 'active');
    if (job) this.runJob(job);
  }

  private runJob(job: Job): void {
    const requestId = genRequestId();
    const start = Date.now();
    try {
      const template = promptService.getTemplate(job.templateId);
      const prompt = promptService.render(template, { content: '(scheduled run)', lang: template.language });
      const res = getAIProvider().generate({
        task: 'automation',
        content: '(scheduled run)',
        prompt,
        lang: template.language,
      });
      this.writeOutput(job, res.result);
      job.lastRunAt = new Date().toISOString();
      job.lastRunStatus = 'success';
      this.repo.upsert(job);
      auditLogger.logUsage({
        userEmail: job.ownerEmail,
        role: 'automation_owner',
        jobType: 'automation',
        model: res.model,
        status: 'success',
        tokens: res.tokens,
        durationMs: Date.now() - start,
        requestId,
      });
    } catch {
      job.lastRunAt = new Date().toISOString();
      job.lastRunStatus = 'error';
      this.repo.upsert(job);
      auditLogger.logUsage({
        userEmail: job.ownerEmail,
        role: 'automation_owner',
        jobType: 'automation',
        model: 'unknown',
        status: 'error',
        durationMs: Date.now() - start,
        requestId,
      });
      logger.error('automation job failed', { jobId: job.jobId, requestId });
      notifier.notifyFailure(`Automation job ${job.jobId} ล้มเหลว (owner: ${job.ownerEmail}) เวลา ${job.lastRunAt}`);
    }
  }

  private writeOutput(job: Job, text: string): void {
    const stamp = new Date().toISOString();
    if (job.destination === 'docs' && job.destinationId) {
      DocumentApp.openById(job.destinationId).getBody().appendParagraph(`[${stamp}] ${text}`);
    } else if (job.destination === 'sheets' && job.destinationId) {
      SpreadsheetApp.openById(job.destinationId).getSheets()[0].appendRow([stamp, text]);
    } else {
      logger.info('automation output (no destination configured)', { jobId: job.jobId });
    }
  }
}

export const automationService = new AutomationService();
