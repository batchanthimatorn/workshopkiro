# Components

## Overview
สถาปัตยกรรมเป็น **Layered serverless บน Google Apps Script** แบ่ง 4 ชั้น + cross-cutting:

- **Entry layer**: Add-on (CardService), Web App (doGet/doPost + HtmlService), Trigger handlers (time-driven)
- **Service layer**: business logic แต่ละ domain (สรุป/ร่าง/automation/prompt/monitoring/health)
- **Integration layer**: `AIProvider` abstraction (Gemini/Vertex) + UrlFetch wrapper
- **Data layer**: typed Repository ครอบ SpreadsheetApp + PropertiesService + CacheService
- **Cross-cutting**: Auth, SecurityFilter, AuditLogger, ErrorHandler/Retry, Logger, Config

การไหลหลัก: Entry → (Auth + SecurityFilter) → Service → AIProvider/Repository → ตอบกลับ Entry พร้อม AuditLogger บันทึกทุกครั้ง

---

## Components

### C1. AddonUI (CardService)
- **Purpose**: UI การ์ดผู้ช่วย AI ใน Gmail/Docs (homepage + contextual)
- **Technology**: Apps Script CardService (Google Workspace Add-on)
- **Responsibilities**: แสดงปุ่มสรุป/ร่าง, รับ input (โทน/ภาษา), เรียก Service, แสดงผล/คัดลอก/แทรก, แสดง state (loading/timeout/error)
- **Exposes**: `onHomepage()`, `onGmailMessageOpen()`, `onDocsOpen()`, action callbacks `onSummarize()`, `onDraft()`, `onInsert()`
- **Consumes**: SummaryService, DraftService, AuthService, PromptService
- **Internal structure**: `src/addon/` (cards/, handlers/)
- **Key decisions**: 1) Workspace Add-on เดียวครอบ Gmail+Docs (D3-2) 2) ไม่มีปุ่ม "ส่ง" อัตโนมัติ — draft เท่านั้น (BR-01)
- **Error handling**: แสดง notification การ์ดที่เข้าใจง่าย ไม่โชว์ stack trace; ปุ่มลองใหม่เมื่อ timeout
- **Stories**: US-001, US-002

### C2. WebApp (doGet/doPost + HtmlService)
- **Purpose**: Web App สำหรับ Dashboard, health check, และหน้าจัดการ (config/prompt/automation)
- **Technology**: Apps Script Web App + HtmlService templated HTML + Bootstrap (D3-3)
- **Responsibilities**: route ตาม `?page=`, render dashboard/admin, รับ POST actions ผ่าน `google.script.run`
- **Exposes**: `doGet(e)`, `doPost(e)`, server functions: `getDashboardData()`, `getHealthStatus()`, `saveConfig()`, `savePrompt()`, `createJob()`, `updateJob()`
- **Consumes**: MonitoringService, HealthService, ConfigRepository, PromptService, AutomationService, AuthService
- **Internal structure**: `src/webapp/` (routes.ts, views/*.html)
- **Key decisions**: server-rendered HtmlService + client เรียก `google.script.run`
- **Error handling**: คืน error object มาตรฐาน (code/message) ให้ client แสดง
- **Stories**: US-013, US-015 (+ UI ของ US-004, US-005, US-010 config)

### C3. TriggerHandlers (Automation runtime)
- **Purpose**: จุดรับ time-driven trigger เพื่อรันงานอัตโนมัติ
- **Technology**: Apps Script installable time-driven triggers
- **Responsibilities**: entry `runScheduledJob(e)`, ระบุ job จาก trigger, เรียก AutomationService, จัดการ continuation เมื่อใกล้ 6 นาที
- **Exposes**: `runScheduledJob(e)`, `runContinuation()`
- **Consumes**: AutomationService, AuditLogger, ErrorHandler
- **Stories**: US-003, US-004

### C4. SummaryService
- **Purpose**: logic สรุปเนื้อหา (FR-01)
- **Responsibilities**: ดึงเนื้อหา (Gmail thread/Docs), ประกอบ prompt จาก template, เรียก AIProvider, คืนผลสรุป, สั่ง AuditLogger
- **Exposes**: `summarize(input: SummarizeRequest): SummarizeResult`
- **Consumes**: AIProvider, PromptService, SecurityFilter, CacheService, AuditLogger
- **Stories**: US-001

### C5. DraftService
- **Purpose**: logic ร่างข้อความตอบกลับ (FR-02) — สร้าง Gmail Draft เท่านั้น
- **Responsibilities**: รับโทน/ภาษา, ประกอบ prompt, เรียก AIProvider, สร้าง Gmail Draft ผ่าน GmailApp, บันทึก Log
- **Exposes**: `draftReply(input: DraftRequest): DraftResult`
- **Consumes**: AIProvider, PromptService, SecurityFilter, GmailApp, AuditLogger
- **Key decisions**: ผลลัพธ์เป็น `GmailApp.createDraft`/`message.createDraftReply` เท่านั้น ไม่มี send (BR-01)
- **Stories**: US-002

### C6. AutomationService (+ TriggerManager)
- **Purpose**: สร้าง/จัดการงานอัตโนมัติ + รันงาน (FR-03)
- **Responsibilities**: CRUD job (เก็บใน Config/JobSheet), สร้าง/ลบ ScriptApp trigger, ตรวจโควต้า trigger, รันงานแล้วส่งผลไป Sheets/Docs
- **Exposes**: `createJob()`, `updateJobStatus()`, `deleteJob()`, `listJobs()`, `executeJob(jobId)`
- **Consumes**: TriggerManager (ScriptApp), SummaryService, PromptService, DriveApp/SpreadsheetApp (output), AuditLogger
- **Stories**: US-003, US-004

### C7. PromptService (Prompt Template Registry)
- **Purpose**: จัดการแม่แบบ prompt (NFR-05)
- **Responsibilities**: อ่าน/เขียน template จาก PromptTemplateSheet, ประกอบ prompt สุดท้าย (template + content + lang/tone)
- **Exposes**: `getTemplate(id)`, `listTemplates()`, `saveTemplate()`, `renderPrompt(templateId, vars)`
- **Consumes**: PromptRepository
- **Stories**: US-005

### C8. AIProvider (abstraction) — GeminiProvider / VertexAIProvider
- **Purpose**: ชั้นเรียก AI แบบสลับ provider ได้ (Add-on decision)
- **Technology**: `UrlFetchApp` (Gemini REST); Vertex AI + SA (JWT) optional/future
- **Responsibilities**: รับ `AIRequest` (JSON contract D3-6) → คืน `AIResponse`; จัดการ retry/backoff, timeout, cache lookup; รองรับ mock mode (D1-5)
- **Exposes**: `interface AIProvider { generate(req: AIRequest): AIResponse }`, `GeminiProvider`, `VertexAIProvider (future)`, `MockProvider`
- **Consumes**: SecretManager (API key/SA), CacheService, RetryUtil, Logger
- **Key decisions**: 1) interface เดียว 2 impl 2) MockProvider สำหรับ mock-first (D1-5) 3) Gemini Flash default (D3-5)
- **Stories**: US-001, US-002, US-003 (AI calls)

### C9. AuthService (OAuth + domain + RBAC)
- **Purpose**: ยืนยันผู้ใช้ + จำกัดโดเมน + สิทธิ์ตามบทบาท (NFR-01)
- **Responsibilities**: `Session.getActiveUser()`, ตรวจ allowed domain (Config), map role (End User/Owner/Developer/Admin), guard การเข้าถึง action
- **Exposes**: `getCurrentUser()`, `assertDomain()`, `assertRole(role)`, `getRole(email)`
- **Consumes**: ConfigRepository (allowedDomains, roleMap), Session
- **Stories**: US-008

### C10. SecretManager
- **Purpose**: จัดการ secret/config กลาง (NFR-02, D3-9)
- **Responsibilities**: อ่าน/เขียน Script Properties, ตรวจว่ามี key ที่จำเป็น, ไม่ log ค่า secret
- **Exposes**: `get(key)`, `require(key)`, `set(key, value)`
- **Consumes**: PropertiesService (ScriptProperties)
- **Stories**: US-009

### C11. SecurityFilter (sensitive-data + HITL)
- **Purpose**: กรองข้อมูลต้องห้ามก่อนส่ง AI + บังคับ HITL (BR-01, BR-02, US-010)
- **Responsibilities**: ตรวจ content กับ banned keywords/patterns (Config), คืนสถานะ block/warn, บันทึกการยืนยันผู้ใช้
- **Exposes**: `scan(content): FilterResult`, `recordConfirmation(userEmail, action)`
- **Consumes**: ConfigRepository (bannedKeywords), AuditLogger
- **Stories**: US-010
- **Correctness**: property-based tested (design/correctness.md)

### C12. AuditLogger
- **Purpose**: บันทึก audit/usage log (NFR-02, NFR-04, US-011)
- **Responsibilities**: เขียน log entry ลง LogSheet (ไม่เก็บ PII/เนื้อหาเต็ม), ส่ง `console.log`/`console.error` → Cloud Logging, mask ข้อมูล
- **Exposes**: `logUsage(entry)`, `logError(err, ctx)`, `logConfirmation(...)`
- **Consumes**: LogRepository, console (Cloud Logging)
- **Stories**: US-011

### C13. ErrorHandler + RetryUtil
- **Purpose**: จัดการ error/timeout + backoff (EX-01, NFR-03, US-012)
- **Responsibilities**: `AppError` class, แปลง error → ข้อความผู้ใช้ที่ปลอดภัย, exponential backoff (≤3), จับ timeout, batch/continuation เมื่อใกล้ 6 นาที
- **Exposes**: `AppError`, `withRetry(fn, opts)`, `toUserMessage(err)`, `shouldContinue(startTime)`
- **Consumes**: Logger
- **Stories**: US-012
- **Correctness**: backoff property-tested

### C14. MonitoringService
- **Purpose**: รวมสถิติการใช้งาน/โควต้า/Token + Deployment log → Dashboard (NFR-04, US-013)
- **Responsibilities**: aggregate จาก LogSheet, เขียน DashboardSheet, อ่านข้อมูลให้ Web App
- **Exposes**: `getDashboardData()`, `refreshMetrics()`, `recordDeployment(info)`
- **Consumes**: LogRepository, DashboardRepository
- **Stories**: US-013

### C15. Notifier
- **Purpose**: แจ้งเตือน error ผ่าน Email/Google Chat (NFR-04, US-014)
- **Responsibilities**: ส่งแจ้งเตือนเมื่อ job/AI ล้มเหลวเกินเกณฑ์ (ไม่เปิดเผย PII)
- **Exposes**: `notifyFailure(summary)`
- **Consumes**: MailApp (หรือ GmailApp), Chat webhook (optional), ConfigRepository (threshold/channel)
- **Stories**: US-014

### C16. HealthService
- **Purpose**: ตรวจสถานะ config/secret/sheets พร้อมใช้ (US-015, D3-14)
- **Responsibilities**: ตรวจว่ามี API key, allowed domain, sheets ที่จำเป็น, provider ping (mock/real)
- **Exposes**: `getHealthStatus(): HealthReport`
- **Consumes**: SecretManager, ConfigRepository, AIProvider
- **Stories**: US-015

### C17. Data Layer — Repositories
- **Purpose**: typed access ครอบ SpreadsheetApp (D3-4)
- **Components**: `LogRepository`, `ConfigRepository`, `PromptRepository`, `DashboardRepository`, `JobRepository` (+ base `SheetRepository`)
- **Responsibilities**: อ่าน/เขียน row แบบ typed, map row ↔ object, ใช้ header-based column mapping
- **Consumes**: SpreadsheetApp (spreadsheetId จาก Config/Property)
- **Stories**: cross-cutting (รองรับ US-001..015)

### C18. DevOps Scaffold (clasp + CI)
- **Purpose**: โครง code-first + CI/CD (FR-04, US-006, US-007)
- **Artifacts**: `.clasp.json`, `appsscript.json`, `tsconfig.json`, `.eslintrc`, `.gitignore`, `.claspignore`, GitHub Actions workflow
- **Note**: ไม่ใช่ runtime component — เป็น scaffold/infra
- **Stories**: US-006, US-007

---

## Interactions

```
[Gmail/Docs] --open--> C1 AddonUI ----+
[Browser]    --http--> C2 WebApp -----+--> C9 AuthService (domain/role)
[Time]       --fire--> C3 Triggers ---+          |
                                                  v
                          +--------- Service layer ---------+
                          | C4 Summary  C5 Draft  C6 Automation
                          | C7 Prompt   C14 Monitor  C16 Health
                          +----+-----------+------------+----+
                               |           |            |
                     C11 SecurityFilter    |       C12 ErrorHandler/Retry
                               |           v            |
                               |     C8 AIProvider (Gemini/Vertex/Mock)
                               |           |
                               v           v
                    C17 Repositories   C10 SecretManager   CacheService
                          |  (LogRepository etc.)
                          v
                 [Google Sheets: Log/Config/Prompt/Dashboard/Job]

C12/C15 -> Notifier -> [Email/Chat]     ทุก service -> C12 AuditLogger -> LogSheet + Cloud Logging
```

**Data flow (สรุปเนื้อหา US-001)**: AddonUI.onSummarize → AuthService.assert → SummaryService.summarize → SecurityFilter.scan → (Cache lookup) → AIProvider.generate → AuditLogger.logUsage → คืนผลการ์ด

**Dependency check**: ไม่มี cycle — Entry → Service → Integration/Data → Cross-cutting (Logger/Error ถูกเรียกทางเดียว)
