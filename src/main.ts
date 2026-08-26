/**
 * main.ts — Global entry bindings for Google Apps Script.
 *
 * โค้ดถูก bundle ด้วย esbuild เป็น dist/Code.gs (IIFE) แล้ว push ด้วย clasp
 * ฟังก์ชัน entry ต้องถูก assign เข้า globalThis เพื่อให้ Apps Script runtime
 * เรียกได้ตามชื่อ (manifest triggers / time-driven / google.script.run)
 *
 * NOTE: handler UI/AI ยังเป็น skeleton (Phase 1). Phase ถัดไปจะแทนด้วย service จริง
 */
import { initSpreadsheet, seedConfig, seedPrompts } from './data/repositories';
import { automationService } from './services/AutomationService';
import {
  handleHomepage,
  handleGmailOpen,
  handleDocsOpen,
  handleSummarize,
  handleDraft,
  handleConfirmSensitive,
  handleSummarizeInbox,
} from './addon/handlers';
import {
  webAppGet,
  getDashboardData,
  getHealthStatus,
  listConfig,
  saveConfig,
  listPrompts,
  savePrompt,
  listJobs,
  createJob,
  updateJob,
  deleteJob,
  testAI,
  summarizeInbox,
} from './webapp/routes';function onHomepage(e: unknown): GoogleAppsScript.Card_Service.Card {
  return handleHomepage(e as Record<string, unknown>);
}

function onGmailMessageOpen(e: unknown): GoogleAppsScript.Card_Service.Card {
  return handleGmailOpen(e as Record<string, unknown>);
}

function onDocsOpen(e: unknown): GoogleAppsScript.Card_Service.Card {
  return handleDocsOpen(e as Record<string, unknown>);
}

function onSummarize(e: unknown): GoogleAppsScript.Card_Service.ActionResponse {
  return handleSummarize(e as Record<string, unknown>);
}

function onDraft(e: unknown): GoogleAppsScript.Card_Service.ActionResponse {
  return handleDraft(e as Record<string, unknown>);
}

function onConfirmSensitive(e: unknown): GoogleAppsScript.Card_Service.ActionResponse {
  return handleConfirmSensitive(e as Record<string, unknown>);
}

function onSummarizeInbox(e: unknown): GoogleAppsScript.Card_Service.ActionResponse {
  return handleSummarizeInbox(e as Record<string, unknown>);
}

function doGet(e: unknown): GoogleAppsScript.HTML.HtmlOutput {
  return webAppGet(e);
}

function doPost(_e: unknown): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: 'skeleton', requestId: Utilities.getUuid() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function runScheduledJob(e: unknown): void {
  const triggerUid = (e as { triggerUid?: string } | undefined)?.triggerUid;
  if (!triggerUid) {
    console.warn('runScheduledJob called without triggerUid');
    return;
  }
  automationService.executeByTrigger(triggerUid);
}

/**
 * setup() — รันครั้งเดียวใน Apps Script เพื่อสร้างแท็บ Google Sheets + seed config
 * ต้องตั้ง Script Property `SPREADSHEET_ID` ก่อน (ดู README/run-book)
 */
function setup(): void {
  initSpreadsheet();
  seedConfig();
  seedPrompts();
  console.log('setup complete: sheets initialized + config + prompts seeded');
}

// export ทั้งหมดให้ esbuild (globalName: AppBundle) เปิดออกมา
// build.mjs จะเติม footer ประกาศ global function จริง เพื่อให้ Apps Script
// และ google.script.run มองเห็น (การ assign globalThis ไม่พอสำหรับ google.script.run)
export {
  onHomepage,
  onGmailMessageOpen,
  onDocsOpen,
  onSummarize,
  onDraft,
  onConfirmSensitive,
  onSummarizeInbox,
  doGet,
  doPost,
  runScheduledJob,
  setup,
  getDashboardData,
  getHealthStatus,
  listConfig,
  saveConfig,
  listPrompts,
  savePrompt,
  listJobs,
  createJob,
  updateJob,
  deleteJob,
  testAI,
  summarizeInbox,
};
