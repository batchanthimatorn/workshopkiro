# Design Decisions (D3)

## Context Summary
- **Stack (fixed)**: TypeScript → Google Apps Script (clasp) / Google Sheets + Properties Service / Gemini API — ตัวเลือกจึงถูกกรองให้อยู่ในระบบนิเวศ GAS เท่านั้น
- **Requirements**: 15 stories, 5 areas (AI Assistant, Automation, DevOps, Security, Monitoring); 9 High/5 Medium/1 Low
- **D1 ที่ล็อกไว้**: AI provider abstraction (Gemini default + Vertex/SA optional), Add-on Gmail+Docs, mock-first, output Sheets+Docs, 4 sheets, security stories ครบ, CI/CD ท้ายสุด, ไทย+อังกฤษ
- **Target resources**: scriptId `18KyGuenQ6Yp...UcuLvf7wI`, spreadsheetId `10ca8f2tjo2...EpAsRcU`
- **Team**: Solo · **Complexity**: Medium · **Design doc**: modular (15 stories > 10)

---

## Decision Questions

### D3-1: การ build TypeScript ขึ้น Apps Script
**Answer**: 1 (clasp transpile TypeScript ตรง ๆ ไม่ bundle — เรียบง่ายสุด)

### D3-2: ชนิดของ Add-on (manifest)
**Answer**: 1 (Google Workspace Add-on ตัวเดียว ครอบ Gmail+Docs)

### D3-3: การ render Web App / Dashboard
**Answer**: 1 (HtmlService templated HTML + Bootstrap, server-rendered)

### D3-4: รูปแบบการเข้าถึงข้อมูล Google Sheets
**Answer**: 1 (Repository/DAO wrapper แบบ typed ครอบ SpreadsheetApp)

### D3-5: โมเดล Gemini ที่ใช้
**Answer**: 1 (Gemini Flash รุ่นล่าสุด เป็น default ผ่าน GeminiProvider — ภายใต้ AIProvider abstraction, Vertex AI optional)

### D3-6: รูปแบบสัญญา request/response กับ AI (Prompt Contract)
**Answer**: 1 (JSON contract แบบมีโครงสร้าง req: task/prompt/content/lang/tone → res: result/tokens/model)

### D3-7: กลยุทธ์ Cache
**Answer**: 1 (CacheService, key = hash ของ content+prompt+lang/tone, มี TTL)

### D3-8: การจัดการ error + retry
**Answer**: 1 (try/catch + custom AppError + exponential backoff util retry ≤3, ไม่โชว์ stack trace)

### D3-9: โครงสร้าง Config & Secret
**Answer**: 1 (Script Properties สำหรับ secret/config กลาง + Config Sheet สำหรับ business rule)

### D3-10: Test framework
**Answer**: 1 (Jest + mock ของ Google globals, ทดสอบ pure logic)

### D3-11: Correctness & Property-Based Testing
**Answer**: 1 (Example-based unit tests เป็นหลัก — เหมาะ solo/workshop; แนะนำเสริม property-based เฉพาะ sensitive-data filter)

### D3-12: Observability Strategy
**Answer**: 2 (Standard — logging + usage/quota metrics (Dashboard) + health + Cloud Logging, ตรง NFR-04)

### D3-13: Error Tracking
**Answer**: 3 (Cloud-native — Google Cloud Error Reporting + Cloud Logging, ตรง NFR-04)

### D3-14: Health & Lifecycle Management
**Answer**: 1 (Health check endpoint พื้นฐาน — ตรวจ config/secret/sheets พร้อมใช้)

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D3-1 TS Build: **esbuild bundle → dist/Code.gs** แล้ว clasp push จาก dist/ [ปรับใน Add-on — เพื่อให้ Jest/fast-check ทำงานได้]
- D3-2 Add-on Type: Google Workspace Add-on ตัวเดียว (Gmail + Docs)
- D3-3 Web App Render: HtmlService templated HTML + Bootstrap (server-rendered)
- D3-4 Sheets Data Access: Repository/DAO wrapper แบบ typed ครอบ SpreadsheetApp
- D3-5 Gemini Model: Gemini Flash (default) ผ่าน GeminiProvider ภายใต้ AIProvider abstraction
- D3-6 AI Contract: JSON structured (req: task/prompt/content/lang/tone → res: result/tokens/model)
- D3-7 Cache: CacheService, key=hash(content+prompt+lang/tone), TTL
- D3-8 Error/Retry: try/catch + AppError + exponential backoff (≤3), ไม่โชว์ stack trace
- D3-9 Config/Secret: Script Properties (secret/config) + Config Sheet (business rules)
- D3-10 Test Framework: Jest + mocked Google globals (pure logic)
- D3-11 Correctness Testing: Example-based (หลัก) + property-based เฉพาะ sensitive-data filter (เสริม)
- D3-12 Observability: Standard (logging + metrics/Dashboard + health + Cloud Logging)
- D3-13 Error Tracking: Cloud-native (GCP Error Reporting + Cloud Logging)
- D3-14 Health/Lifecycle: Basic health check endpoint (ตรวจ config/secret/sheets)

---

## Validation Notes (D3)
- ✅ Technology compatibility: ทุกตัวเลือกอยู่ในระบบนิเวศ GAS/TS สอดคล้องกัน (clasp + SpreadsheetApp + CacheService + PropertiesService + Jest)
- ✅ Observability=Standard + Error tracking=Cloud-native: สอดคล้อง NFR-04 (ไม่ over/under-engineer); ไม่ trigger "Full observability for solo" (เลือก Standard ไม่ใช่ Full)
- ✅ Health=Basic (option 1) เหมาะกับ serverless GAS (ไม่มี container/K8s) — ไม่ trigger "Full lifecycle without container"
- ✅ Security: OAuth ผู้ใช้ (NFR-01) + secret ใน Script Properties + sensitive-data filter สอดคล้องกัน ไม่มี conflict
- ไม่พบ conflict ที่ต้อง resolve


---

## Add-on

### [2026-08-25] เปลี่ยน D3-1 build approach: no-bundle → esbuild (implement phase)
- **บริบท/เหตุผล**: D3-1 เดิม "clasp transpile ตรง ๆ ไม่ bundle" ทำให้ต้องเขียนโค้ดแบบ global/namespace (ไม่มี import/export) ซึ่งขัดกับ D3-10/11 (Jest + fast-check) ที่ต้องใช้ import โมดูล — ทดสอบ logic ได้ยาก/เปราะ
- **การเปลี่ยนแปลง (ผู้ใช้อนุมัติ "ตกลง")**: ใช้ **esbuild** bundle `src/**` (เขียน TS ปกติ มี import/export) → `dist/Code.gs` ไฟล์เดียว + คัดลอก `appsscript.json` และ `.html` ไป `dist/`; `clasp push` จาก `dist/`
- **ยังเป็น code-first ด้วย clasp** — เพิ่มแค่ build step (`npm run build`) ก่อน push/deploy
- **ผลกระทบ**: `.clasp.json` rootDir = `dist`; npm scripts เพิ่ม `build`/`push`(build+push)/`deploy`; `implementation.md` เพิ่ม esbuild ใน deps + build flow; Jest ทดสอบ src โดยตรง (ts-jest) ไม่ผ่าน bundle
- **decision อื่นไม่เปลี่ยน**: provider abstraction, Sheets repository, testing framework, observability คงเดิม
- **ไฟล์ที่ปรับ**: `decisions-design.md` (D3-1), `blueprints/tech.md`, `design/implementation.md`, manifest `decisions.design.tsBuild` + `versions`
