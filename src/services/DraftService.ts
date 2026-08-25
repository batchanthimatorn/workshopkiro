// DraftService — ร่างข้อความตอบกลับเป็น Gmail Draft เท่านั้น (Ref: C5, US-002, FR-02, BR-01)
import { getAIProvider } from '../ai/AIProvider';
import { promptService } from './PromptService';
import { auditLogger } from '../core/audit';
import { Language, Tone } from '../types';
import { genRequestId } from '../core/logger';
import { AppError } from '../core/errors';
import { securityFilter } from '../security/SecurityFilter';

export interface DraftInput {
  content: string;
  messageId?: string;
  tone: Tone;
  lang: Language;
  userEmail: string;
  bypassFilter?: boolean;
}

export interface DraftResult {
  text: string;
  draftId?: string;
  model: string;
}

export class DraftService {
  draftReply(input: DraftInput): DraftResult {
    const requestId = genRequestId();
    const start = Date.now();

    if (!input.content || input.content.trim().length === 0) {
      throw new AppError('VALIDATION', 'ไม่มีเนื้อหาต้นทางให้ร่าง');
    }

    // กรองข้อมูลต้องห้ามก่อนส่ง AI (BR-02) — ยกเว้นเมื่อผู้ใช้ยืนยันแล้ว (HITL)
    if (!input.bypassFilter && securityFilter.scan(input.content).blocked) {
      throw new AppError('BLOCKED_SENSITIVE');
    }

    const template = promptService.getDefaultFor('draft');
    const prompt = promptService.render(template, {
      content: input.content,
      lang: input.lang,
      tone: input.tone,
    });

    const res = getAIProvider().generate({
      task: 'draft',
      content: input.content,
      prompt,
      lang: input.lang,
      tone: input.tone,
    });

    // สร้าง Gmail Draft เท่านั้น — ระบบไม่ส่งออกเองทุกกรณี (BR-01)
    let draftId: string | undefined;
    if (input.messageId) {
      const message = GmailApp.getMessageById(input.messageId);
      const draft = message.createDraftReply(res.result);
      draftId = draft.getId();
    }

    auditLogger.logUsage({
      userEmail: input.userEmail,
      role: 'end_user',
      jobType: 'draft',
      model: res.model,
      status: 'success',
      tokens: res.tokens,
      durationMs: Date.now() - start,
      requestId,
    });

    return { text: res.result, draftId, model: res.model };
  }
}

export const draftService = new DraftService();
