# Structure

## Summary
- **Repo type**: Single repository (code-first Apps Script ด้วย clasp + Git)
- **Key source directories**: `src/` (โค้ด TypeScript), `tests/`, root config (`appsscript.json`, `.clasp.json`)
- **Main entry points**: Add-on (CardService homepage/contextual), Web App (doGet/doPost), Time-driven Triggers

## Repository
- **Type**: Single — Pending D3 confirmation
- **Root**: โปรเจกต์ Apps Script แบบ code-first — TypeScript ใน `src/`, clasp push แปลงเป็น .gs

## Key Directories (resolved in design)
| Directory | Purpose | Key Contents |
|---|---|---|
| `src/addon/` | Add-on UI (CardService) | cards/, handlers.ts |
| `src/webapp/` | Web App | routes.ts, views/*.html (Bootstrap) |
| `src/triggers/` | time-driven handlers | runScheduledJob, runContinuation |
| `src/services/` | business logic | summary, draft, automation, prompt, monitoring, health |
| `src/ai/` | AIProvider abstraction | AIProvider.ts, GeminiProvider, VertexAIProvider(future), MockProvider |
| `src/security/` | auth + filter | AuthService, SecurityFilter |
| `src/data/` | repositories | SheetRepository + Log/Config/Prompt/Dashboard/Job/Deployment |
| `src/core/` | cross-cutting | SecretManager, ErrorHandler/RetryUtil, Logger/AuditLogger, Notifier, Config |
| `src/types/` | shared types | AIRequest/AIResponse, entities |
| `tests/` | Jest unit + fast-check properties + mocks | unit/, properties/, mocks/ |
| `mocks/` | runtime AI mock fixtures | *.json (mock_mode) |
| (root) | config | `appsscript.json`, `.clasp.json`, `.claspignore`, `.gitignore`, `package.json`, `tsconfig.json`, `.eslintrc.json`, `.github/workflows/` |

> โครงเต็มดู `.aidlc/specs/ai-workspace-automation/design/implementation.md`

## Key Files
| File | Purpose | Notes |
|---|---|---|
| `appsscript.json` | Apps Script manifest | OAuth Scope (least privilege), runtime V8, Add-on config |
| `.clasp.json` | clasp config | scriptId, rootDir — ไม่ commit ค่า sensitive |
| `.claspignore` / `.gitignore` | ป้องกันไฟล์ secret หลุด | ตาม NFR-02 |
| `package.json` / `tsconfig.json` / `.eslintrc` | TypeScript toolchain + lint | ตาม NFR-05 |
| GitHub Actions workflow (`.github/workflows/`) | CI/CD | lint + test + clasp push/deploy |

## Entry Points
| Entry | Type | Description |
|---|---|---|
| Add-on homepage / contextual triggers | CardService | ผู้ช่วย AI ใน Gmail/Docs/Sheets (สรุป/ร่าง) |
| Web App `doGet`/`doPost` | HTTP endpoint | Dashboard / จุดเชื่อมต่อเพิ่มเติม — Pending D3 |
| Time-driven Trigger handlers | Trigger | งานอัตโนมัติตามเวลา (FR-03) |

## Module Dependencies
N/A — greenfield project (จะกำหนด import graph ใน design phase)

## Data Flow
N/A — greenfield project (จะกำหนด request lifecycle ใน design phase)

Google Sheets ที่วางแผนไว้ (data stores) — จะยืนยันใน design/data model:
- Log Sheet (Audit/Usage log)
- Config Sheet (business config เช่น รายการข้อมูลต้องห้าม, allowed domain)
- Prompt Template Registry
- Dashboard Sheet (สรุปการใช้งาน/โควต้า/Token)

## Key Abstractions
N/A — greenfield project (จะกำหนดใน design phase)

## Test Organization
N/A — greenfield project (จะกำหนดใน design phase — ESLint + Unit Test ก่อน push ตาม NFR-05)

## Build & Deploy
- **Build**: TypeScript → clasp push แปลงเป็น Apps Script (.gs/.html)
- **Container**: N/A (serverless Apps Script)
- **Deploy target**: Apps Script Project (Add-on + Web App) ผ่าน `clasp deploy` + GitHub Actions
