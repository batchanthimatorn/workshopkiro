// SummaryService — สรุปเนื้อหา (Ref: design/components.md C4, US-001, FR-01)
import { getAIProvider } from '../ai/AIProvider';
import { promptService } from './PromptService';
import { auditLogger } from '../core/audit';
import { Language, AIResponse } from '../types';
import { genRequestId } from '../core/logger';
import { AppError } from '../core/errors';
import { securityFilter } from '../security/SecurityFilter';

export interface SummarizeInput {
  content: string;
  lang: Language;
  userEmail: string;
  bypassFilter?: boolean;
}

export class SummaryService {
  summarize(input: SummarizeInput): AIResponse {
    const requestId = genRequestId();
    const start = Date.now();

    if (!input.content || input.content.trim().length === 0) {
      throw new AppError('VALIDATION', 'ไม่มีเนื้อหาให้สรุป');
    }

    // กรองข้อมูลต้องห้ามก่อนส่ง AI (BR-02) — ยกเว้นเมื่อผู้ใช้ยืนยันแล้ว (HITL)
    if (!input.bypassFilter && securityFilter.scan(input.content).blocked) {
      throw new AppError('BLOCKED_SENSITIVE');
    }

    const template = promptService.getDefaultFor('summarize');
    const prompt = promptService.render(template, { content: input.content, lang: input.lang });

    try {
      const res = getAIProvider().generate({
        task: 'summarize',
        content: input.content,
        prompt,
        lang: input.lang,
      });
      auditLogger.logUsage({
        userEmail: input.userEmail,
        role: 'end_user',
        jobType: 'summarize',
        model: res.model,
        status: 'success',
        tokens: res.tokens,
        durationMs: Date.now() - start,
        requestId,
      });
      return res;
    } catch (err) {
      const status = err instanceof AppError && err.code === 'AI_TIMEOUT' ? 'timeout' : 'error';
      auditLogger.logUsage({
        userEmail: input.userEmail,
        role: 'end_user',
        jobType: 'summarize',
        model: 'unknown',
        status,
        durationMs: Date.now() - start,
        requestId,
      });
      throw err;
    }
  }
}

export const summaryService = new SummaryService();
