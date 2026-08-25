# Implementation Tasks — AI Workspace Automation (APP-03)

## Summary
- **Total Tasks**: 34 across 10 phases
- **Execution Waves**: 10 (sequential — solo, ทำทีละ task ตาม D4-6)
- **Coverage**: 18 components, 6 entities, Web App/Add-on/AI-contract endpoints, 5 integrations
- **Testing**: unit (test-after) + 5 property tests (filter/backoff/masking) — Jest + fast-check
- **Strategy (D4)**: Setup → FE+mock → ต่อจริง → security/monitoring → test/verify → CI/CD/deploy (last)
- **Derived from**: `design.md` + `design/*`, `requirements.md`, decisions D1–D4

## Overview
- **Strategy rationale**: ตามนโยบาย hands-on — สร้างให้ **รันได้จริงเร็วที่สุดด้วย mock (AI)** ก่อน แล้วค่อยต่อ Gemini จริง; ทีม solo รัน sequential
- **Legend**: `- [ ] N. Phase` / `  - [ ] N.M Task`; `**Deps**` = task ที่ต้องเสร็จก่อน; `**Ref**` = ที่มาใน design
- **Mock boundary**: AI = MockProvider (D1-5); Google Sheets = ใช้จริง (เป็น data store ของแอป, clasp login แล้ว)

---

## Task Phases

- [x] 1. Setup & Project Scaffold
  - [x] 1.1 Git init + ignore files
    - **Deps**: — · **Ref**: implementation.md (Directory Structure)
    - `git init -b main` ที่ root; สร้าง `.gitignore` (node_modules/, .clasprc.json, .env, **sa-bct-ai-2026.json**, dist/) และ `.claspignore` (tests/, node_modules/, *.md, mocks/ dev)
    - ยืนยันว่า service account/secret จะไม่ถูก commit/push
  - [x] 1.2 npm project + toolchain + dependencies
    - **Deps**: 1.1 · **Ref**: implementation.md (Technology Stack)
    - `package.json`, `tsconfig.json`, `.eslintrc.json`, jest config; ติดตั้ง devDeps: `@google/clasp`, `@types/google-apps-script`, `typescript@~5.8`, `jest@29`, `ts-jest@29`, `fast-check@3`, `eslint@9`
    - เพิ่ม npm scripts: `lint`, `test`, `test:pbt`, `test:coverage`, `verify`, `push`, `deploy`
  - [x] 1.3 clasp + Apps Script manifest + verify access
    - **Deps**: 1.2 · **Ref**: implementation.md, integration.md (I7), nfr.md (OAuth scope)
    - `.clasp.json` (scriptId `18KyGuenQ6Yp...`, rootDir `src`); `appsscript.json` (runtime V8, OAuth scopes least-privilege, Workspace Add-on config)
    - `clasp status` / `clasp pull` เพื่อยืนยันสิทธิ์เข้าถึง project (บัญชี login แล้ว)
  - [x] 1.4 src/ skeleton + global bindings
    - **Deps**: 1.2 · **Ref**: components.md (Interactions), implementation.md
    - สร้างโฟลเดอร์ `src/{addon,webapp,triggers,services,ai,security,data,core,types}`, `tests/`, `mocks/`
    - `src/main.ts` bind global functions (stub): onHomepage, onGmailMessageOpen, onDocsOpen, doGet, doPost, runScheduledJob

- [x] 2. Core Foundation (cross-cutting + data layer)
  - [x] 2.1 Shared types
    - **Deps**: 1.4 · **Ref**: api-spec.md (AI contract), data-model.md
    - `types/`: AIRequest/AIResponse, entity types (LogEntry, ConfigItem, PromptTemplate, Job, DashboardMetric, Deployment), enums, ErrorCode
  - [x] 2.2 Config + SecretManager
    - **Deps**: 2.1 · **Ref**: operations.md (Config), components.md (C10) · **US-009**
    - `core/SecretManager` (PropertiesService wrapper: get/require/set, ไม่ log ค่า), `core/Config` (อ่าน Config + cache)
  - [x] 2.3 ErrorHandler + RetryUtil
    - **Deps**: 2.1 · **Ref**: correctness.md (P3/P4), operations.md (Error), components.md (C13) · **US-012**
    - `AppError` (code→user message), `withRetry` (exponential backoff ≤3 + jitter), `shouldContinue(startTime)` สำหรับ 6-min limit
  - [x] 2.4 Logger + AuditLogger
    - **Deps**: 2.1, 2.5 · **Ref**: operations.md (Logging), components.md (C12) · **US-011**
    - structured log → console (Cloud Logging), `logUsage/logError/logConfirmation` → LogSheet; mask email; ไม่เก็บ content/PII
  - [x] 2.5 Repositories + Sheet init/seed
    - **Deps**: 2.1, 2.2 · **Ref**: data-model.md (E1–E6), components.md (C17)
    - `data/SheetRepository` base (header-based mapping, LockService) + Log/Config/Prompt/Dashboard/Job/Deployment repos
    - init sheet/tab + header ถ้าไม่พบ; seed Config (allowed_domains, banned_keywords, alert_threshold=3, log_retention_days=90, mock_mode=true)

- [x] 3. AI Abstraction (mock-first)
  - [x] 3.1 AIProvider interface + factory
    - **Deps**: 2.2, 2.3 · **Ref**: components.md (C8), integration.md (I1/I2), api-spec.md (D) · **US-001/002/003**
    - `ai/AIProvider` interface (`generate(req):res`), factory เลือก provider ตาม `mock_mode`/config
  - [x] 3.2 MockProvider + fixtures
    - **Deps**: 3.1 · **Ref**: integration.md (mock mode), testing-strategy.md
    - `ai/MockProvider` อ่านผลจำลองจาก `mocks/*.json`; ไม่มี network call (guardrail)
  - [x] 3.3 GeminiProvider (real, config-gated)
    - **Deps**: 3.1, 2.3 · **Ref**: integration.md (I1), operations.md, nfr.md (cache) · **US-012**
    - `ai/GeminiProvider` (UrlFetchApp + backoff + CacheService key=hash); ตัด key ออกจาก log; ยังไม่เปิดใช้จนกว่าจะตั้ง key (Phase 8)
  - [x] 3.4 PromptService + registry
    - **Deps**: 2.5 · **Ref**: components.md (C7), data-model.md (E3) · **US-005**
    - render prompt (template + content + lang/tone), CRUD template ผ่าน PromptRepository, seed template เริ่มต้น (summarize/draft)

- [x] 4. Add-on UI + Core AI features (mock — runnable milestone)  [FE+mock]
  - [x] 4.1 Add-on CardService UI
    - **Deps**: 1.3, 1.4 · **Ref**: components.md (C1), api-spec.md (C) · **US-001/002**
    - homepage + contextual cards (Gmail message / Docs), ปุ่มสรุป/ร่าง, เลือกภาษา/โทน; ไม่มีปุ่มส่งอัตโนมัติ (BR-01)
  - [x] 4.2 SummaryService + onSummarize
    - **Deps**: 3.1, 3.4, 4.1 · **Ref**: components.md (C4), api-spec.md · **US-001**
    - ดึงเนื้อหา Gmail/Docs → prompt → AIProvider(mock) → แสดงการ์ด + คัดลอก/แทรก; log usage; timeout/ปุ่มลองใหม่
  - [x] 4.3 DraftService + onDraft
    - **Deps**: 3.1, 3.4, 4.1 · **Ref**: components.md (C5) · **US-002**
    - เลือกโทน/ภาษา → AIProvider(mock) → สร้าง Gmail Draft เท่านั้น (ไม่ส่ง) → ลิงก์ draft; log
  - [x] 4.4 Verify runnable (mock) in Gmail/Docs
    - **Deps**: 4.2, 4.3 · **Ref**: testing-strategy.md (critical paths)
    - `clasp push` → ทดสอบ Add-on จริงใน Gmail/Docs ด้วย mock; ยืนยันว่าเปิด/กด/เห็นผลได้จริง

- [x] 5. Security & Governance
  - [x] 5.1 AuthService (OAuth + domain + RBAC)
    - **Deps**: 2.2, 2.5 · **Ref**: components.md (C9), nfr.md (roles) · **US-008**
    - `Session.getActiveUser`, ตรวจ allowed domain, map role, `assertRole`; guard endpoints/actions
  - [x] 5.2 SecurityFilter + HITL
    - **Deps**: 2.5, 4.2, 4.3 · **Ref**: components.md (C11), correctness.md (P1/P2) · **US-010, BR-01/02**
    - `scan(content)` กับ banned keywords (Config); block/warn + `onConfirmSensitive`; บันทึกผู้ยืนยัน+เวลา
  - [x] 5.3 Wire auth + filter เข้าทุก flow
    - **Deps**: 5.1, 5.2 · **Ref**: api-spec.md (auth), components.md
    - ใส่ auth guard + filter ก่อนส่ง AI ในทุก entry (summary/draft/automation/webapp)

- [x] 6. Automation (งานอัตโนมัติ)
  - [x] 6.1 AutomationService + JobRepository
    - **Deps**: 3.4, 5.1 · **Ref**: components.md (C6), data-model.md (E6) · **US-003/004**
    - CRUD job, list/updateStatus/delete; ตรวจโควต้า trigger
  - [x] 6.2 TriggerHandlers + TriggerManager
    - **Deps**: 6.1, 2.3 · **Ref**: components.md (C3), operations.md (6-min) · **US-003/004**
    - `runScheduledJob`, continuation trigger; create/delete ScriptApp time-driven trigger
  - [x] 6.3 Automation output → Sheets/Docs
    - **Deps**: 6.2 · **Ref**: integration.md (I4/I5), decisions D1-6 · **US-003**
    - รัน job → AIProvider → เขียนผลไป Google Sheets/Docs; log สถานะการรัน

- [x] 7. Web App, Monitoring, Health, Alerts
  - [x] 7.1 Web App shell (doGet/doPost + views)
    - **Deps**: 1.3, 5.1 · **Ref**: components.md (C2), api-spec.md (A/B) · **US-013/015**
    - routes ตาม `?page=`, HtmlService templated + Bootstrap (dashboard/admin/health), `google.script.run` server fns
  - [x] 7.2 MonitoringService + Dashboard
    - **Deps**: 2.5, 7.1 · **Ref**: components.md (C14), data-model.md (E4/E5), operations.md (Metrics) · **US-013**
    - aggregate Log → DashboardSheet (aiCalls/tokens/failures/urlFetch), แสดง Deployment log
  - [x] 7.3 Notifier (alerts)
    - **Deps**: 2.4, 6.2 · **Ref**: components.md (C15), operations.md (Alerting) · **US-014**
    - แจ้งเตือน email/chat เมื่อ failures เกิน threshold (ไม่เปิดเผย PII)
  - [x] 7.4 HealthService + health route
    - **Deps**: 2.2, 2.5, 3.1 · **Ref**: components.md (C16), operations.md (Health) · **US-015**
    - ตรวจ apiKey/allowed domains/sheets/provider → HealthReport (ไม่โชว์ secret)
  - [x] 7.5 Admin UI wiring (config / prompt / jobs)
    - **Deps**: 7.1, 3.4, 5.2, 6.1 · **Ref**: api-spec.md (B) · **US-004/005/010**
    - หน้า admin: จัดการ config, prompt template, automation jobs

- [ ] 8. Real Integration Switch  [FE+backend/real]
  - [ ] 8.1 Enable real Gemini (config toggle)
    - **Deps**: 3.3, 7.4 · **Ref**: integration.md (I1), decisions D1-5 · **US-001/002/012**
    - ตั้ง `GEMINI_API_KEY` (Script Properties) + `mock_mode=false`; ยืนยัน contract + backoff กับ 429/timeout จริง
    - **Guardrail**: ทำเมื่อผู้ใช้พร้อม key จริงเท่านั้น; ก่อนหน้านั้นคงใช้ mock
  - [x] 8.2 Align real spreadsheet schema
    - **Deps**: 2.5 · **Ref**: data-model.md · **US-011/013**
    - ชี้ `SPREADSHEET_ID` = `10ca8f2t...AsRcU`; init/align header ของทุกแท็บ; seed config จริง
  - [ ] 8.3 End-to-end manual verify (real)
    - **Deps**: 8.1, 8.2 · **Ref**: testing-strategy.md (critical paths)
    - ทดสอบ summarize/draft/automation/dashboard บนข้อมูล/AI จริง

- [x] 9. Testing & Verification
  - [x] 9.1 Test harness (mock GAS globals)
    - **Deps**: 1.2 · **Ref**: testing-strategy.md (Mock Strategy)
    - `tests/mocks/gas-globals.ts` (SpreadsheetApp/GmailApp/UrlFetchApp/PropertiesService/CacheService/Session/ScriptApp), fixtures
  - [x] 9.2 Unit tests (per component)
    - **Deps**: 9.1 · **Ref**: testing-strategy.md (Coverage Mapping)
    - unit test: services, repos (mapping), core, auth; mock UrlFetch success/429/5xx/timeout สำหรับ GeminiProvider
  - [x] 9.3 Property tests (P1–P5)
    - **Deps**: 9.1, 5.2, 2.3, 2.4 · **Ref**: correctness.md
    - fast-check: SecurityFilter (P1/P2), RetryUtil (P3/P4), maskEmail (P5)
  - [x] 9.4 Verify: lint + test + coverage + build
    - **Deps**: 9.2, 9.3 · **Ref**: testing-strategy.md (Run Commands), Definition of Done
    - `npm run verify` (lint+test) ผ่าน; coverage logic ≥70%; `clasp push` dev ไม่มี error

- [x] 10. CI/CD & Deploy (last / optional)
  - [x] 10.1 GitHub Actions pipeline
    - **Deps**: 9.4 · **Ref**: integration.md (I7), nfr.md (CI/CD) · **US-007**
    - workflow: PR → lint+test; merge main → `clasp push`/`deploy`; clasp creds ใน GitHub Secrets
  - [x] 10.2 Deploy versioning + rollback
    - **Deps**: 10.1 · **Ref**: nfr.md, requirements EX-02 · **US-007/013**
    - `clasp deploy` เก็บ Deployment ID + Release Note → DeploymentSheet; runbook rollback
  - [x] 10.3 Run-book + README
    - **Deps**: 10.2 · **Ref**: NFR-05 · **US-006**
    - เอกสาร setup/login/push/deploy/rollback + Prompt Template registry usage

---

## Task Summary

| Task | Title | Deps | Status |
|---|---|---|---|
| 1.1–1.4 | Setup & scaffold | — | [ ] |
| 2.1–2.5 | Core foundation + data layer | 1.x | [ ] |
| 3.1–3.4 | AI abstraction (mock-first) | 2.x | [ ] |
| 4.1–4.4 | Add-on UI + summarize/draft (mock) | 3.x | [ ] |
| 5.1–5.3 | Security & governance | 2.5,4.x | [ ] |
| 6.1–6.3 | Automation | 3.4,5.1 | [ ] |
| 7.1–7.5 | Web App/Monitoring/Health/Alerts | 5.1,6.x | [ ] |
| 8.1–8.3 | Real integration switch | 3.3,7.4 | [ ] |
| 9.1–9.4 | Testing & verification | 1.2,5.2 | [ ] |
| 10.1–10.3 | CI/CD & deploy (optional) | 9.4 | [ ] |

## Requirements Coverage
| US | Tasks |
|---|---|
| US-001 สรุป | 3.1,3.2,3.4,4.1,4.2,8.1 |
| US-002 ร่าง | 3.1,3.4,4.1,4.3,8.1 |
| US-003 ตั้งงานอัตโนมัติ | 3.4,6.1,6.2,6.3 |
| US-004 ควบคุมงาน | 6.1,7.5 |
| US-005 Prompt registry | 3.4,7.5 |
| US-006 clasp code-first | 1.1,1.2,1.3,10.3 |
| US-007 CI/CD + rollback | 10.1,10.2 |
| US-008 OAuth+domain+RBAC | 5.1,5.3 |
| US-009 Secret mgmt | 1.1,2.2 |
| US-010 Filter + HITL | 5.2,5.3,7.5 |
| US-011 Audit log | 2.4,2.5,8.2 |
| US-012 error/timeout/quota | 2.3,3.3,8.1 |
| US-013 Dashboard | 7.1,7.2,8.2 |
| US-014 error alerts | 7.3 |
| US-015 Health check | 7.1,7.4 |

## Design Coverage
| Component | Tasks |
|---|---|
| C1 AddonUI | 4.1 |
| C2 WebApp | 7.1 |
| C3 TriggerHandlers | 6.2 |
| C4 SummaryService | 4.2 |
| C5 DraftService | 4.3 |
| C6 AutomationService | 6.1 |
| C7 PromptService | 3.4 |
| C8 AIProvider (Gemini/Mock/Vertex) | 3.1,3.2,3.3 |
| C9 AuthService | 5.1 |
| C10 SecretManager | 2.2 |
| C11 SecurityFilter | 5.2 |
| C12 AuditLogger | 2.4 |
| C13 ErrorHandler/Retry | 2.3 |
| C14 MonitoringService | 7.2 |
| C15 Notifier | 7.3 |
| C16 HealthService | 7.4 |
| C17 Repositories | 2.5 |
| C18 DevOps scaffold | 1.1,1.2,1.3,10.1 |
| Entities E1–E6 | 2.5,8.2 |

## Testing Coverage
- **unit_test_tasks**: 9.2 (services, repos, core, auth, GeminiProvider w/ mock UrlFetch)
- **integration_test_tasks**: 9.2 (contract test AI) + 4.4/8.3 (manual on GAS)
- **e2e_test_tasks**: none (ไม่มี E2E framework ใน D3 — critical paths ทดสอบ manual 4.4/8.3)
- **load_test_tasks**: none (ไม่มี load tool ใน D3)
- **pbt_tasks**: 9.3 (P1–P5)
- **coverage_summary**: ทุก component มี unit test (9.2); logic วิกฤต (filter/backoff/masking) มี property test (9.3)

## Definition of Done
- [ ] โค้ด compile ผ่าน (tsc/clasp push ไม่ error)
- [ ] ฟังก์ชันตาม scope ทำงานจริง (รันบน GAS จริงได้ — mock อย่างน้อย, real เมื่อพร้อม key)
- [ ] unit + property test ที่เกี่ยวข้องผ่าน (`npm run verify`)
- [ ] ไม่มี secret หลุด (gitignore/claspignore ตรวจแล้ว)
- [ ] acceptance criteria (EARS) ของ US ที่เกี่ยวข้องครบ
- [ ] audit/log ทำงาน ไม่เก็บ PII

## Execution Waves (sequential — solo)
| Wave | Phase | Resolved deps | File Ownership |
|---|---|---|---|
| 1 | Phase 1 Setup | — | root config, `.clasp.json`, `appsscript.json`, `src/` skeleton |
| 2 | Phase 2 Core | 1 | `src/types/`, `src/core/`, `src/data/` |
| 3 | Phase 3 AI | 2 | `src/ai/`, `mocks/`, `src/services/PromptService` |
| 4 | Phase 4 Add-on+features | 3 | `src/addon/`, `src/services/{Summary,Draft}` |
| 5 | Phase 5 Security | 2,4 | `src/security/` |
| 6 | Phase 6 Automation | 3,5 | `src/services/Automation`, `src/triggers/` |
| 7 | Phase 7 WebApp/Monitor | 5,6 | `src/webapp/`, `src/services/{Monitoring,Health}`, `src/core/Notifier` |
| 8 | Phase 8 Real switch | 3,7 | config (Script Properties), no new files |
| 9 | Phase 9 Testing | 1,5 | `tests/` |
| 10 | Phase 10 CI/CD | 9 | `.github/workflows/`, `README.md`, run-book |

> execution เป็น **sequential** ทีละ task (D4-6) — wave = ลำดับ dependency ไม่มี parallel; file ownership ระบุไว้เผื่ออนาคต

## Notes
- **Task count 34 > 30**: ยอมรับได้เพราะ scope ถูก fix โดย requirement (ต้องครบทุก FR) + รันแบบ sequential ทีละ task + บริบท workshop; ไม่ลด scope ตามนโยบาย
- **Technical debt / future**: VertexAIProvider (SA/JWT), Google Chat alerts (ถ้าเปิด), property test เพิ่มเติม, E2E automation
- **Runnable milestone**: จบ Phase 4 = Add-on ใช้งานได้จริงใน Gmail/Docs (mock); จบ Phase 8 = ทำงานกับ AI/data จริง
