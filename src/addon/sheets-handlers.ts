// Sheets Add-on handlers — ผู้ช่วย AI บน Google Sheets
import { getAIProvider } from '../ai/AIProvider';
import { auditLogger } from '../core/audit';
import { toUserMessage } from '../core/errors';
import { logger, genRequestId } from '../core/logger';
import { resultCard, pushCard, notify } from './cards';

/* eslint-disable @typescript-eslint/no-explicit-any */
type GasEvent = Record<string, any>;
type Card = GoogleAppsScript.Card_Service.Card;
type ActionResponse = GoogleAppsScript.Card_Service.ActionResponse;

function currentEmail(): string {
  try { return Session.getActiveUser().getEmail() || 'unknown'; } catch { return 'unknown'; }
}

function getSelectedRange(): string {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const range = sheet.getActiveRange();
  if (!range) return '';
  const values = range.getValues();
  return values.map((row: unknown[]) => row.join('\t')).join('\n');
}

function callAI(_task: string, content: string, prompt: string): string {
  const requestId = genRequestId();
  const start = Date.now();
  const res = getAIProvider().generate({ task: 'summarize', content, prompt, lang: 'th' });
  auditLogger.logUsage({
    userEmail: currentEmail(), role: 'end_user', jobType: 'other',
    model: res.model, status: 'success', tokens: res.tokens,
    durationMs: Date.now() - start, requestId,
  });
  return res.result;
}

// ---- Homepage card (เมื่อเปิด Add-on ใน Sheets) ----
export function handleSheetsHome(_e: GasEvent): Card {
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'AI Assistant สำหรับ Google Sheets\n\nเลือก cells ที่ต้องการ แล้วกดปุ่มด้านล่าง:',
    ))
    .addWidget(CardService.newTextButton().setText('วิเคราะห์ข้อมูล').setOnClickAction(CardService.newAction().setFunctionName('onSheetAnalyze')))
    .addWidget(CardService.newTextButton().setText('สร้างสูตร').setOnClickAction(CardService.newAction().setFunctionName('onSheetFormula')))
    .addWidget(CardService.newTextButton().setText('แปลภาษา').setOnClickAction(CardService.newAction().setFunctionName('onSheetTranslate')))
    .addWidget(CardService.newTextButton().setText('สร้าง Report').setOnClickAction(CardService.newAction().setFunctionName('onSheetReport')))
    .addWidget(CardService.newTextButton().setText('ตรวจข้อมูล').setOnClickAction(CardService.newAction().setFunctionName('onSheetCheck')))
    .addWidget(CardService.newDivider())
    .addWidget(CardService.newTextButton().setText('แก้สูตรอัตโนมัติ').setOnClickAction(CardService.newAction().setFunctionName('onSheetFixFormula')))
    .addWidget(CardService.newTextButton().setText('สร้าง Report + กราฟ').setOnClickAction(CardService.newAction().setFunctionName('onSheetReportChart')));
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('AI Sheets Assistant'))
    .addSection(section)
    .build();
}

// ---- วิเคราะห์ข้อมูล ----
export function handleSheetAnalyze(_e: GasEvent): ActionResponse {
  try {
    const data = getSelectedRange();
    if (!data) return notify('กรุณาเลือก cells ก่อน');
    const result = callAI('analyze', data, `วิเคราะห์ข้อมูลต่อไปนี้ให้สรุปแนวโน้ม จุดเด่น ข้อสังเกต เป็นภาษาไทย:\n\n${data}`);
    return pushCard(resultCard('ผลวิเคราะห์', result));
  } catch (err) { logger.error('sheet analyze failed', {}); return notify(toUserMessage(err)); }
}

// ---- สร้างสูตร ----
export function handleSheetFormula(_e: GasEvent): ActionResponse {
  try {
    const data = getSelectedRange();
    const context = data ? `ข้อมูลตัวอย่างที่เลือก:\n${data}\n\n` : '';
    const result = callAI('formula', context, `${context}สร้างสูตร Google Sheets ที่เหมาะสมสำหรับข้อมูลนี้ อธิบายสั้น ๆ ว่าสูตรทำอะไร (ตอบเป็นภาษาไทย):`);
    return pushCard(resultCard('สูตรที่แนะนำ', result));
  } catch (err) { logger.error('sheet formula failed', {}); return notify(toUserMessage(err)); }
}

// ---- แปลภาษา ----
export function handleSheetTranslate(_e: GasEvent): ActionResponse {
  try {
    const data = getSelectedRange();
    if (!data) return notify('กรุณาเลือก cells ที่ต้องการแปลก่อน');
    const result = callAI('translate', data, `แปลข้อมูลต่อไปนี้เป็นภาษาอังกฤษ (ถ้าเป็นอังกฤษอยู่แล้วให้แปลเป็นไทย) รักษา format ตาราง:\n\n${data}`);
    return pushCard(resultCard('ผลแปลภาษา', result));
  } catch (err) { logger.error('sheet translate failed', {}); return notify(toUserMessage(err)); }
}

// ---- สร้าง Report ----
export function handleSheetReport(_e: GasEvent): ActionResponse {
  try {
    const data = getSelectedRange();
    if (!data) return notify('กรุณาเลือก cells ก่อน');
    const result = callAI('report', data, `สร้างรายงานสรุปจากข้อมูลต่อไปนี้ เป็นภาษาไทย มีหัวข้อ สรุปผล และข้อเสนอแนะ:\n\n${data}`);
    return pushCard(resultCard('รายงานสรุป', result));
  } catch (err) { logger.error('sheet report failed', {}); return notify(toUserMessage(err)); }
}

// ---- ตรวจข้อมูล ----
export function handleSheetCheck(_e: GasEvent): ActionResponse {
  try {
    const data = getSelectedRange();
    if (!data) return notify('กรุณาเลือก cells ก่อน');
    const result = callAI('check', data, `ตรวจสอบข้อมูลต่อไปนี้ หาข้อมูลที่ผิดปกติ ซ้ำ ว่าง หรือไม่สอดคล้อง แจ้งเป็นรายการ (ภาษาไทย):\n\n${data}`);
    return pushCard(resultCard('ผลตรวจข้อมูล', result));
  } catch (err) { logger.error('sheet check failed', {}); return notify(toUserMessage(err)); }
}


// ---- แก้สูตรอัตโนมัติ (ตรวจ → AI แก้ → เขียนกลับ cell) ----
export function handleSheetFixFormula(_e: GasEvent): ActionResponse {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const range = sheet.getActiveRange();
    if (!range) return notify('กรุณาเลือก cells ที่มีสูตรพังก่อน');

    const formulas = range.getFormulas();
    const values = range.getValues();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    // หา cells ที่มีสูตร + ค่าเป็น error (#NAME?, #REF!, #VALUE!, #ERROR!)
    const broken: Array<{ row: number; col: number; formula: string; error: string }> = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const f = formulas[r][c];
        const v = String(values[r][c]);
        if (f && (v.startsWith('#') || v === '')) {
          broken.push({ row: r, col: c, formula: f, error: v });
        }
      }
    }

    if (broken.length === 0) return notify('ไม่พบสูตรที่มี error ใน cells ที่เลือก');

    // ส่งให้ AI แก้
    const prompt = `แก้สูตร Google Sheets ต่อไปนี้ที่มี error ตอบเฉพาะสูตรที่แก้แล้ว (บรรทัดละ 1 สูตร ตามลำดับ ไม่ต้องมีคำอธิบาย):\n\n` +
      broken.map((b, i) => `${i + 1}. ${b.formula} → error: ${b.error}`).join('\n');

    const res = getAIProvider().generate({ task: 'summarize', content: prompt, prompt, lang: 'th' });

    // parse ผลจาก AI (แต่ละบรรทัดเป็นสูตรที่แก้แล้ว)
    const lines = res.result.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.startsWith('='));

    let fixed = 0;
    for (let i = 0; i < Math.min(broken.length, lines.length); i++) {
      const b = broken[i];
      const newFormula = lines[i];
      if (newFormula && newFormula !== b.formula) {
        range.getCell(b.row + 1, b.col + 1).setFormula(newFormula);
        fixed++;
      }
    }

    auditLogger.logUsage({
      userEmail: currentEmail(), role: 'end_user', jobType: 'other',
      model: res.model, status: 'success', tokens: res.tokens,
      durationMs: 0, requestId: genRequestId(),
    });

    return pushCard(resultCard(
      `แก้สูตรสำเร็จ (${fixed}/${broken.length})`,
      `สูตรที่พบ error: ${broken.length}\nแก้ไขแล้ว: ${fixed}\n\n` +
      broken.map((b, i) => `${b.formula} → ${lines[i] || '(ไม่ได้แก้)'}`).join('\n') +
      `\n\n[model: ${res.model}]`
    ));
  } catch (err) {
    logger.error('sheet fix formula failed', {});
    return notify(toUserMessage(err));
  }
}


// ---- สร้าง Report + กราฟ (สร้าง chart จริงใน Sheet) ----
export function handleSheetReportChart(_e: GasEvent): ActionResponse {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const range = ss.getActiveRange();
    if (!range) return notify('กรุณาเลือก cells ข้อมูลก่อน');

    const sheetName = range.getSheet().getName();
    const a1 = range.getA1Notation();

    // สร้าง chart (bar chart) จากข้อมูลที่เลือก
    const chart = range.getSheet().newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(range)
      .setPosition(range.getRow() + range.getNumRows() + 2, range.getColumn(), 0, 0)
      .setOption('title', 'AI Report Chart')
      .setOption('legend', { position: 'bottom' })
      .setOption('width', 600)
      .setOption('height', 350)
      .build();
    range.getSheet().insertChart(chart);

    // AI สรุปข้อมูลด้วย
    const data = range.getValues().map((row: unknown[]) => row.join('\t')).join('\n');
    const summary = callAI('report', data, `สรุปข้อมูลต่อไปนี้เป็นรายงานสั้น ๆ (ไทย) พร้อมข้อสังเกตสำคัญ:\n\n${data}`);

    return pushCard(resultCard(
      'สร้าง Report + กราฟสำเร็จ',
      `สร้าง chart แล้วที่ Sheet "${sheetName}" (ใต้ข้อมูล ${a1})\n\n--- AI Summary ---\n${summary}`
    ));
  } catch (err) {
    logger.error('sheet report+chart failed', {});
    return notify(toUserMessage(err));
  }
}
