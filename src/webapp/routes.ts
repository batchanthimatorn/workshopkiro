// Web App routes + server functions (Ref: C2, api-spec.md A/B, US-004/005/010/013/015)
import { monitoringService } from '../services/MonitoringService';
import { healthService } from '../services/HealthService';
import { authService } from '../security/AuthService';
import { config } from '../core/config';
import { promptService } from '../services/PromptService';
import { automationService } from '../services/AutomationService';
import { summaryService } from '../services/SummaryService';
import { draftService } from '../services/DraftService';
import { ConfigRepository } from '../data/repositories';
import { ApiResult, ConfigItem, PromptTemplate, Frequency, Destination, JobStatus } from '../types';
import { genRequestId } from '../core/logger';
import { AppError, toUserMessage } from '../core/errors';

const configRepo = new ConfigRepository();

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data, requestId: genRequestId() };
}

function guard<T>(fn: () => T): ApiResult<T> {
  try {
    return ok(fn());
  } catch (err) {
    const code = err instanceof AppError ? err.code : 'INTERNAL';
    return { ok: false, error: { code, message: toUserMessage(err) }, requestId: genRequestId() };
  }
}

// ---- doGet: serve single-page app ----
export function webAppGet(_e: unknown): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('app')
    .setTitle('AI Workspace Automation (APP-03)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---- Server functions (เรียกผ่าน google.script.run) ----
export function getDashboardData(): ApiResult<unknown> {
  return guard(() => {
    authService.assertDomain();
    return monitoringService.getDashboardData();
  });
}

export function getHealthStatus(): ApiResult<unknown> {
  return guard(() => {
    authService.assertDomain();
    return healthService.getHealthStatus();
  });
}

export function listConfig(): ApiResult<ConfigItem[]> {
  return guard(() => {
    authService.assertRole('admin');
    return configRepo.readAll();
  });
}

export function saveConfig(item: ConfigItem): ApiResult<ConfigItem> {
  return guard(() => {
    authService.assertRole('admin');
    if (!item || !item.key) throw new AppError('VALIDATION', 'key ห้ามว่าง');
    const withMeta: ConfigItem = {
      ...item,
      category: item.category || 'general',
      updatedBy: authService.getCurrentEmail(),
    };
    configRepo.upsert(withMeta);
    config.invalidate();
    return withMeta;
  });
}

export function listPrompts(): ApiResult<PromptTemplate[]> {
  return guard(() => {
    authService.assertDomain();
    return promptService.listTemplates(true);
  });
}

export function savePrompt(t: PromptTemplate): ApiResult<PromptTemplate> {
  return guard(() => {
    authService.assertRole('automation_owner');
    if (!t || !t.name || !t.promptText) throw new AppError('VALIDATION', 'name/promptText ห้ามว่าง');
    return promptService.saveTemplate(t);
  });
}

export function listJobs(): ApiResult<unknown> {
  return guard(() => {
    authService.assertDomain();
    return automationService.listJobs();
  });
}

export function createJob(input: {
  templateId: string;
  frequency: Frequency;
  destination: Destination;
  destinationId?: string;
}): ApiResult<unknown> {
  return guard(() => {
    authService.assertRole('automation_owner');
    return automationService.createJob({
      ownerEmail: authService.getCurrentEmail(),
      templateId: input.templateId,
      frequency: input.frequency,
      destination: input.destination,
      destinationId: input.destinationId,
    });
  });
}

export function updateJob(input: { jobId: string; status: JobStatus }): ApiResult<unknown> {
  return guard(() => {
    authService.assertRole('automation_owner');
    return automationService.updateStatus(input.jobId, input.status);
  });
}

export function deleteJob(input: { jobId: string }): ApiResult<{ deleted: boolean }> {
  return guard(() => {
    authService.assertRole('automation_owner');
    automationService.deleteJob(input.jobId);
    return { deleted: true };
  });
}

/** สรุปอีเมล 20 ฉบับล่าสุด (เรียกจาก Web App) */
export function summarizeInbox(_input?: unknown): ApiResult<{ summary: string; model: string; count: number }> {
  return guard(() => {
    authService.assertDomain();
    const threads = GmailApp.getInboxThreads(0, 5);
    const subjects: string[] = [];
    for (const t of threads) {
      const msg = t.getMessages()[0];
      const from = msg.getFrom();
      const subj = t.getFirstMessageSubject();
      const snippet = msg.getPlainBody().slice(0, 200);
      subjects.push(`- จาก: ${from} | เรื่อง: ${subj} | เนื้อหาย่อ: ${snippet}`);
    }
    const content = `อีเมล ${subjects.length} ฉบับล่าสุดใน inbox:\n\n${subjects.join('\n')}`;
    const email = authService.getCurrentEmail();
    const res = summaryService.summarize({ content, lang: 'th', userEmail: email, bypassFilter: true });
    return { summary: res.result, model: res.model, count: subjects.length };
  });
}
export function testAI(input: {
  content: string;
  task: 'summarize' | 'draft';
  lang: 'th' | 'en';
  tone?: string;
}): ApiResult<{ result: string; model: string; tokens?: number }> {
  return guard(() => {
    authService.assertDomain();
    const email = authService.getCurrentEmail();
    if (input.task === 'draft') {
      const res = draftService.draftReply({
        content: input.content,
        tone: (input.tone as 'formal' | 'concise' | 'friendly') || 'friendly',
        lang: input.lang as 'th' | 'en',
        userEmail: email,
        bypassFilter: false,
      });
      return { result: res.text, model: res.model, tokens: undefined };
    }
    const res = summaryService.summarize({ content: input.content, lang: input.lang as 'th' | 'en', userEmail: email });
    return { result: res.result, model: res.model, tokens: res.tokens };
  });
}
