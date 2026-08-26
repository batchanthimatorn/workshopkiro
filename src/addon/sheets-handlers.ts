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
  // กลุ่ม 1: วิเคราะห์
  const analyzeSection = CardService.newCardSection()
    .setHeader('วิเคราะห์และสรุป')
    .addWidget(CardService.newTextParagraph().setText('เลือก cells แล้วกดปุ่ม:'))
    .addWidget(CardService.newTextButton().setText('วิเคราะห์ข้อมูล').setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('onSheetAnalyze')))
    .addWidget(CardService.newTextButton().setText('สร้าง Report + กราฟ').setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('onSheetReportChart')));

  // กลุ่ม 2: สูตร
  const formulaSection = CardService.newCardSection()
    .setHeader('สูตร')
    .addWidget(CardService.newTextButton().setText('สร้างสูตร').setOnClickAction(CardService.newAction().setFunctionName('onSheetFormula')))
    .addWidget(CardService.newTextButton().setText('แก้สูตรอัตโนมัติ').setTextButtonStyle(CardService.TextButtonStyle.FILLED).setOnClickAction(CardService.newAction().setFunctionName('onSheetFixFormula')));

  // กลุ่ม 3: เครื่องมือ
  const toolsSection = CardService.newCardSection()
    .setHeader('เครื่องมือ')
    .addWidget(CardService.newTextButton().setText('แปลภาษา').setOnClickAction(CardService.newAction().setFunctionName('onSheetTranslate')))
    .addWidget(CardService.newTextButton().setText('ตรวจข้อมูล').setOnClickAction(CardService.newAction().setFunctionName('onSheetCheck')));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('AI Sheets Assistant').setSubtitle('ผู้ช่วย AI สำหรับ Google Sheets'))
    .addSection(analyzeSection)
    .addSection(formulaSection)
    .addSection(toolsSection)
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

    const broken: Array<{ row: number; col: number; formula: string; error: string; cell: string }> = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const f = formulas[r][c];
        const v = String(values[r][c]);
        if (f && v.startsWith('#')) {
          const cell = range.getCell(r + 1, c + 1).getA1Notation();
          broken.push({ row: r, col: c, formula: f, error: v, cell });
        }
      }
    }

    if (broken.length === 0) return notify('ไม่พบสูตรที่มี error ใน cells ที่เลือก');

    // ส่งให้ AI วิเคราะห์ + แนะนำสูตรที่แก้
    const prompt = `ตรวจสูตร Google Sheets ต่อไปนี้ที่มี error แต่ละข้อให้ตอบ 3 บรรทัด:
1. สาเหตุ: (อธิบายสั้นๆ)
2. แก้เป็น: (สูตรที่ถูก)
3. ---

สูตรที่ต้องตรวจ:
` + broken.map((b, i) => `${i + 1}. cell ${b.cell}: ${b.formula} → error: ${b.error}`).join('\n');

    const res = getAIProvider().generate({ task: 'summarize', content: prompt, prompt, lang: 'th' });

    // แสดงผลวิเคราะห์ + ปุ่มยืนยัน
    const analysisText = broken.map((b) => `Cell ${b.cell}\n  สูตรเดิม: ${b.formula}\n  Error: ${b.error}`).join('\n\n');

    // เก็บข้อมูลสำหรับขั้นยืนยัน (ใน cache)
    const fixData = { sheetName: range.getSheet().getName(), rangeA1: range.getA1Notation(), broken, aiResult: res.result };
    const cache = CacheService.getUserCache() ?? CacheService.getScriptCache();
    const token = Utilities.getUuid();
    if (cache) cache.put(`fix_${token}`, JSON.stringify(fixData), 300);

    const section = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(`พบสูตร error ${broken.length} จุด:\n\n${analysisText}`))
      .addWidget(CardService.newDivider())
      .addWidget(CardService.newTextParagraph().setText(`AI วิเคราะห์:\n${res.result}`))
      .addWidget(CardService.newDivider())
      .addWidget(
        CardService.newTextButton()
          .setText('ยืนยันแก้ไขสูตร')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction().setFunctionName('onSheetConfirmFix').setParameters({ token })),
      );

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        CardService.newCardBuilder()
          .setHeader(CardService.newCardHeader().setTitle('วิเคราะห์สูตร').setSubtitle(`พบ error ${broken.length} จุด`))
          .addSection(section)
          .build()
      ))
      .build();
  } catch (err) {
    logger.error('sheet fix formula failed', {});
    return notify(toUserMessage(err));
  }
}

// ---- ยืนยันแก้ไขสูตร (เขียนกลับ cell จริง) ----
export function handleSheetConfirmFix(e: GasEvent): ActionResponse {
  try {
    const token = e?.commonEventObject?.parameters?.token || e?.parameters?.token || '';
    const cache = CacheService.getUserCache() ?? CacheService.getScriptCache();
    const raw = cache ? cache.get(`fix_${token}`) : null;
    if (!raw) return notify('เซสชันหมดอายุ กรุณากดแก้สูตรอีกครั้ง');

    const fixData = JSON.parse(raw) as { sheetName: string; broken: Array<{ row: number; col: number; formula: string }>; aiResult: string };
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(fixData.sheetName);
    if (!sh) return notify('ไม่พบ sheet');

    const range = sh.getActiveRange();
    if (!range) return notify('ไม่พบ range');

    // parse สูตรที่แก้แล้วจาก AI result (หาบรรทัดที่ขึ้นต้น = )
    const lines = fixData.aiResult.split('\n');
    const fixedFormulas: string[] = [];
    for (const line of lines) {
      const match = line.match(/แก้เป็น:\s*(=.+)/i) || line.match(/^(=.+)/);
      if (match) fixedFormulas.push(match[1].trim());
    }

    let fixed = 0;
    for (let i = 0; i < Math.min(fixData.broken.length, fixedFormulas.length); i++) {
      const b = fixData.broken[i];
      const newFormula = fixedFormulas[i];
      if (newFormula && newFormula !== b.formula) {
        range.getCell(b.row + 1, b.col + 1).setFormula(newFormula);
        fixed++;
      }
    }

    return pushCard(resultCard(
      `แก้ไขสำเร็จ (${fixed}/${fixData.broken.length})`,
      fixData.broken.map((b, i) => `${b.formula} → ${fixedFormulas[i] || '(ไม่ได้แก้)'}`).join('\n')
    ));
  } catch (err) {
    logger.error('sheet confirm fix failed', {});
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
