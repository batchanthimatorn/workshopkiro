// Add-on event handlers (Ref: components.md C1, api-spec.md C, US-001/002/008/010)
import { summaryService } from '../services/SummaryService';
import { draftService } from '../services/DraftService';
import { homepageCard, contextualCard, resultCard, confirmCard, pushCard, notify } from './cards';
import { authService } from '../security/AuthService';
import { securityFilter } from '../security/SecurityFilter';
import { AppError, toUserMessage } from '../core/errors';
import { logger } from '../core/logger';
import { Language, Tone } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type GasEvent = Record<string, any>;
type Card = GoogleAppsScript.Card_Service.Card;
type ActionResponse = GoogleAppsScript.Card_Service.ActionResponse;

interface PendingRequest {
  task: 'summarize' | 'draft';
  content: string;
  lang: Language;
  tone?: Tone;
  messageId?: string;
}

function readInput(e: GasEvent, field: string, fallback: string): string {
  const value = e?.commonEventObject?.formInputs?.[field]?.stringInputs?.value?.[0];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readParam(e: GasEvent, field: string): string {
  return e?.commonEventObject?.parameters?.[field] ?? e?.parameters?.[field] ?? '';
}

function extractGmailContent(e: GasEvent): { content: string; messageId?: string } {
  const gmail = e?.gmail;
  if (gmail?.accessToken) GmailApp.setCurrentMessageAccessToken(gmail.accessToken);
  const messageId: string | undefined = gmail?.messageId;
  if (messageId) {
    return { content: GmailApp.getMessageById(messageId).getPlainBody(), messageId };
  }
  return { content: '' };
}

function extractDocsContent(): string {
  const doc = DocumentApp.getActiveDocument();
  return doc ? doc.getBody().getText() : '';
}

// เก็บคำขอที่รอการยืนยัน (HITL) ไว้ใน cache ชั่วคราว แทนการส่ง content ผ่าน action parameter
function storePending(p: PendingRequest): string {
  const token = Utilities.getUuid();
  const cache = CacheService.getUserCache() ?? CacheService.getScriptCache();
  if (cache) cache.put(`pending_${token}`, JSON.stringify(p), 300);
  return token;
}

function getPending(token: string): PendingRequest | null {
  const cache = CacheService.getUserCache() ?? CacheService.getScriptCache();
  const raw = cache ? cache.get(`pending_${token}`) : null;
  return raw ? (JSON.parse(raw) as PendingRequest) : null;
}

export function handleHomepage(_e: GasEvent): Card {
  return homepageCard();
}

export function handleGmailOpen(_e: GasEvent): Card {
  return contextualCard('gmail');
}

export function handleDocsOpen(_e: GasEvent): Card {
  return contextualCard('docs');
}

export function handleSummarize(e: GasEvent): ActionResponse {
  try {
    const email = authService.assertDomain(); // US-008: จำกัดโดเมน
    const lang = readInput(e, 'lang', 'th') as Language;
    const gmail = extractGmailContent(e);
    const content = gmail.content || extractDocsContent();
    if (!content) return notify('ไม่พบเนื้อหาให้สรุป (เปิดอีเมลหรือเอกสารก่อน)');

    const res = summaryService.summarize({ content, lang, userEmail: email });
    return pushCard(resultCard('ผลสรุป', res.result));
  } catch (err) {
    if (err instanceof AppError && err.code === 'BLOCKED_SENSITIVE') {
      const lang = readInput(e, 'lang', 'th') as Language;
      const gmail = extractGmailContent(e);
      const content = gmail.content || extractDocsContent();
      const token = storePending({ task: 'summarize', content, lang });
      return pushCard(confirmCard(token, 'summarize'));
    }
    logger.error('summarize handler failed', {});
    return notify(toUserMessage(err));
  }
}

export function handleDraft(e: GasEvent): ActionResponse {
  try {
    const email = authService.assertDomain();
    const lang = readInput(e, 'lang', 'th') as Language;
    const tone = readInput(e, 'tone', 'friendly') as Tone;
    const gmail = extractGmailContent(e);
    if (!gmail.content) return notify('เปิดอีเมลเพื่อร่างข้อความตอบกลับ');

    const res = draftService.draftReply({
      content: gmail.content,
      messageId: gmail.messageId,
      tone,
      lang,
      userEmail: email,
    });
    return pushCard(resultCard('ร่างข้อความ (บันทึกเป็น Gmail Draft แล้ว)', res.text));
  } catch (err) {
    if (err instanceof AppError && err.code === 'BLOCKED_SENSITIVE') {
      const lang = readInput(e, 'lang', 'th') as Language;
      const tone = readInput(e, 'tone', 'friendly') as Tone;
      const gmail = extractGmailContent(e);
      const token = storePending({ task: 'draft', content: gmail.content, lang, tone, messageId: gmail.messageId });
      return pushCard(confirmCard(token, 'draft'));
    }
    logger.error('draft handler failed', {});
    return notify(toUserMessage(err));
  }
}

// HITL: ผู้ใช้ยืนยันหลังพบข้อมูลต้องห้าม -> บันทึกการยืนยัน + ดำเนินการต่อ (bypass filter)
export function handleConfirmSensitive(e: GasEvent): ActionResponse {
  try {
    const email = authService.getCurrentEmail();
    const token = readParam(e, 'token');
    const pending = getPending(token);
    if (!pending) return notify('เซสชันหมดอายุ กรุณาลองใหม่');

    securityFilter.recordConfirmation(email, pending.task, token);

    if (pending.task === 'draft') {
      const res = draftService.draftReply({
        content: pending.content,
        messageId: pending.messageId,
        tone: pending.tone ?? 'friendly',
        lang: pending.lang,
        userEmail: email,
        bypassFilter: true,
      });
      return pushCard(resultCard('ร่างข้อความ (ยืนยันแล้ว)', res.text));
    }

    const res = summaryService.summarize({
      content: pending.content,
      lang: pending.lang,
      userEmail: email,
      bypassFilter: true,
    });
    return pushCard(resultCard('ผลสรุป (ยืนยันแล้ว)', res.result));
  } catch (err) {
    logger.error('confirm handler failed', {});
    return notify(toUserMessage(err));
  }
}
