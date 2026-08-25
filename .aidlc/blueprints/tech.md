# Tech

## Summary
- **Stack**: TypeScript → Google Apps Script (clasp) / Google Sheets + Properties Service / Gemini API (UrlFetchApp)
- **Architecture**: Serverless / Low-code บน Google Workspace — Add-on (CardService) + HTML Service + Web App (doGet/doPost)
- **Infra**: Google Cloud Project + GitHub + GitHub Actions (clasp push/deploy)

## Stack
- **Languages**: TypeScript (คอมไพล์เป็น GAS ผ่าน clasp)
- **Frameworks**: Google Apps Script (CardService, HTML Service, GmailApp/DriveApp/SpreadsheetApp/CalendarApp), Bootstrap (HTML UI)
- **Build system**: esbuild (bundle src → dist/Code.gs) + clasp push จาก dist/ + npm scripts (Add-on 2026-08-25: เพิ่ม esbuild เพื่อรองรับ Jest/fast-check)
- **Package manager**: npm
- **Testing**: Jest + ts-jest (mock GAS globals) + fast-check (property test) + ESLint (D3-10/11)

## Architecture
- **Pattern**: Layered serverless — entry (Add-on CardService / WebApp doGet-doPost / time-driven Triggers) → service → integration (AIProvider/Google services) → data (Repository over Sheets) + cross-cutting (Auth/SecurityFilter/AuditLogger/ErrorHandler)
- **API style**: Web App HTTP (doGet/doPost) + `google.script.run` server functions + CardService callbacks; AI ผ่าน internal JSON contract (D3-6) via UrlFetchApp

## Infrastructure
- **Cloud provider**: Google Cloud Platform (Apps Script API, OAuth Consent Screen) + Gemini API / Vertex AI
- **AI Provider (Add-on 2026-08-25)**: provider abstraction — `AIProvider` interface + `GeminiProvider` (default, key ใน Script Properties) และ `VertexAIProvider` (service account `sa-bct-ai-2026.json`, JWT ผ่าน apps-script-oauth2, optional/future ไม่อยู่ MVP). ไฟล์ SA ต้อง gitignore/claspignore, credential ใน Script Properties เท่านั้น. NFR-01 (OAuth ผู้ใช้) คงเดิม
- **Compute**: Google Apps Script runtime (V8) — serverless
- **Database**: Google Sheets (Data Store) + Properties Service (Config/Secret) + Cache Service
- **IaC tool**: Config as Code ผ่าน `appsscript.json` (manifest: runtime V8, OAuth scopes least-privilege, add-on config) + `.clasp.json` (scriptId)

## Patterns & Conventions
- **Architecture pattern**: Layered serverless (entry → service → integration → data + cross-cutting); ไม่มี cyclic dependency; global functions bind ใน main.ts
- **Data access**: typed Repository/DAO ครอบ SpreadsheetApp (header-based mapping) — LogRepository/ConfigRepository/PromptRepository/DashboardRepository/JobRepository/DeploymentRepository (D3-4)
- **API response format**: Card (CardService) / envelope `{ok,data?,error?,requestId}` (Web App/server functions); AI = JSON contract
- **Error handling**: try/catch ทุก async operation, ไม่แสดง stack trace ต่อผู้ใช้, บันทึก Error Log, retry exponential backoff สูงสุด 3 ครั้ง (EX-01), throw AppError พร้อมข้อความเข้าใจง่าย (steering: code-conventions)
- **Authentication**: Google OAuth 2.0 ของ Apps Script (Session.getActiveUser), จำกัดเฉพาะโดเมนองค์กร, OAuth Scope least privilege ใน appsscript.json (NFR-01)
- **Validation**: Input validation + keyword filter สำหรับข้อมูลต้องห้ามก่อนส่ง AI (BR-02) — Will be defined during design
- **Logging**: Log Sheet + Cloud Logging, บันทึกผู้ใช้/เวลา/ประเภทงาน โดยไม่เก็บเนื้อหาส่วนบุคคล (NFR-02/NFR-04)
- **Code style**: TypeScript + ESLint (steering: code-conventions)
- **Naming conventions**: camelCase (ตัวแปร/ฟังก์ชัน), PascalCase (class/component), UPPER_SNAKE_CASE (constants), prefix `_` สำหรับ private (steering: code-conventions)
- **Branch strategy**: PR-based, merge เข้า main trigger deploy (FR-04) — Pending D3

## Environment Configuration
- **Config approach**: Script Properties (runtime config/secret) + `appsscript.json` (manifest/scope) + Config Sheet (business config เช่น รายการข้อมูลต้องห้าม)
- **Environments**: dev / prod (แยก Apps Script deployment / GCP project) — Pending D3
- **Secrets management**: Script Properties เท่านั้น (ห้าม hardcode/commit), ป้องกันด้วย `.gitignore` + `.claspignore` (NFR-02)

## CI/CD Pipeline
- **Tool**: GitHub Actions
- **Stages**: lint → test → clasp push → clasp deploy (เมื่อ merge main) — Pending D3
- **Deploy target**: Apps Script Project (Add-on + Web App), เก็บ Deployment ID + Release Note ทุกเวอร์ชัน, rollback ได้ (FR-04/EX-02)

## Dependency Management
- **Lockfile**: package-lock.json (npm)
- **Version strategy**: pin exact versions (steering: security)
- **Monorepo tooling**: N/A (single project)

## Known Technical Debt
N/A — greenfield project
