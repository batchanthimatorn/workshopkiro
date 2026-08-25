# Design Document: AI Workspace Automation (APP-03)

## Summary
<!-- 10-line max digest for downstream phases. -->
- **Architecture**: Layered serverless บน Google Apps Script — entry (Add-on/WebApp/Trigger) → service → integration → data + cross-cutting
- **Stack**: CardService + HtmlService(Bootstrap) / Google Apps Script (TypeScript ผ่าน clasp) / Google Sheets + Properties + Cache / Gemini API (UrlFetchApp)
- **Components**: 18 — AddonUI, WebApp, Triggers, Summary/Draft/Automation/Prompt/Monitoring/Health services, AIProvider, Auth, SecretManager, SecurityFilter, AuditLogger, ErrorHandler, Notifier, Repositories, DevOps scaffold
- **Entities**: 6 sheets — Logs, Config, Prompts, Dashboard, Deployments, Jobs
- **Endpoints**: Web App doGet/doPost + server functions + CardService callbacks + internal AI JSON contract
- **Integrations**: Gemini (default) / Vertex AI (future/SA), Gmail, Docs, Sheets, Chat(opt), GitHub Actions
- **Testing**: PBT Yes (filter/backoff/masking) — NFR Yes
- **Key Decisions**: AIProvider abstraction (Gemini default, mock-first) · typed Repository over Sheets · Standard observability + GCP Error Reporting

## Architecture

### System Context Diagram
```
        ┌───────────────────────── Google Workspace ─────────────────────────┐
        │  Gmail / Docs (End User)         Browser (Admin/Dev/Owner)          │
        │        │ open add-on                    │ https                      │
        │        ▼                                 ▼                            │
        │   [C1 AddonUI-CardService]        [C2 WebApp-HtmlService]            │
        │        │                                 │        ▲ time-driven      │
        │        └──────────────┬──────────────────┘   [C3 Triggers]          │
        │                       ▼                                              │
        │     [C9 Auth] → Service layer (C4 Summary/C5 Draft/C6 Automation/    │
        │                 C7 Prompt/C14 Monitor/C16 Health)                    │
        │                 │             │              │                        │
        │        [C11 SecurityFilter]  [C8 AIProvider] [C12 Error/Retry]       │
        │                 │             │  (Gemini/Mock/Vertex)                 │
        │                 ▼             ▼                                        │
        │        [C17 Repositories] [C10 SecretManager] [CacheService]         │
        │                 │                                                      │
        │                 ▼                                                      │
        │        [Google Sheets: Logs/Config/Prompts/Dashboard/Jobs/Deploy]    │
        └──────────┬──────────────────────────────────┬───────────────────────┘
                   │ UrlFetch (HTTPS)                  │ console → Cloud Logging
                   ▼                                   ▼
            [Gemini API / Vertex AI]        [GCP Error Reporting]
                   ▲ (CI/CD)                         
            [GitHub Actions → clasp deploy]     [Email / Chat alerts]
```

### Technology Stack
- **Frontend**: CardService (Add-on) + HtmlService templated HTML + Bootstrap (Web App/Dashboard)
- **Backend**: Google Apps Script (V8) เขียนด้วย TypeScript ผ่าน clasp
- **Database**: Google Sheets (data store) + Properties Service (config/secret) + Cache Service
- **Infrastructure**: Google Cloud Project (Apps Script API, OAuth) + GitHub Actions (CI/CD) + Gemini/Vertex
- **Key Libraries**: @types/google-apps-script, Jest+ts-jest, fast-check, ESLint, apps-script-oauth2 (future)

### Key Design Decisions
1. **AIProvider abstraction** (Gemini default + Vertex/SA future + MockProvider): สลับ provider ได้, mock-first ตามนโยบาย (D1-3 Add-on, D1-5, D3-5/6)
2. **Typed Repository ครอบ SpreadsheetApp**: แยก data access ออกจาก logic → mock/test ง่าย (D3-4)
3. **Security-by-design**: OAuth ผู้ใช้ + secret ใน Properties + sensitive filter + HITL + audit ไม่เก็บ PII (NFR-01/02, BR-01/02)
4. **Standard observability + Cloud-native error tracking**: Log Sheet + Cloud Logging + Dashboard metrics + GCP Error Reporting (D3-12/13, NFR-04)
5. **จัดการ 6-นาที limit ด้วย batch/continuation** แทน graceful shutdown (serverless) (NFR-03)

## Traceability

| Requirement | Component(s) | API/Action | Data Entity | Design File | Status |
|---|---|---|---|---|---|
| US-001 สรุป | C1, C4, C8, C11, C12 | onSummarize, AI contract | Logs, Prompts | components/api-spec/integration | ✅ Covered |
| US-002 ร่าง | C1, C5, C8, C11 | onDraft, AI contract | Logs, Prompts | components/api-spec | ✅ Covered |
| US-003 ตั้งงานอัตโนมัติ | C3, C6, C7 | createJob | Jobs, Prompts | components/data-model | ✅ Covered |
| US-004 ควบคุมงาน | C3, C6, C14 | updateJob/deleteJob/listJobs | Jobs, Logs | components/api-spec | ✅ Covered |
| US-005 Prompt registry | C7, C17 | listPrompts/savePrompt | Prompts | components/data-model | ✅ Covered |
| US-006 clasp code-first | C18 | — (scaffold) | — | implementation | ✅ Covered |
| US-007 CI/CD + rollback | C18, C14 | GitHub Actions | Deployments | integration/nfr | ✅ Covered |
| US-008 OAuth+domain+RBAC | C9 | auth guard (ทุก endpoint) | Config | components/nfr | ✅ Covered |
| US-009 Secret mgmt | C10 | — | (Script Properties) | implementation/operations | ✅ Covered |
| US-010 Filter + HITL | C11, C1 | onConfirmSensitive | Config, Logs | components/correctness | ✅ Covered |
| US-011 Audit log | C12 | — | Logs | data-model/operations | ✅ Covered |
| US-012 error/timeout/quota | C13, C8 | (backoff) | Logs | correctness/operations | ✅ Covered |
| US-013 Dashboard | C2, C14 | getDashboardData | Dashboard, Deployments | api-spec/operations | ✅ Covered |
| US-014 error alerts | C15 | notifyFailure | Config | components/operations | ✅ Covered |
| US-015 Health check | C2, C16 | getHealthStatus | Config | api-spec/operations | ✅ Covered |

### Coverage Summary
- **Requirements covered**: 15 / 15
- **Gaps**: ไม่มี
- **Components without requirement**: C17 Repositories, C10 SecretManager, C12/C13 cross-cutting = infra/scaffold รองรับหลาย story (justified)

## Open Questions & Risks

| # | Question/Risk | Impact | Status |
|---|---|---|---|
| 1 | โครง sheet/tab จริงใน spreadsheet เป้าหมายอาจไม่ตรง schema — ต้อง init/align ตอน setup | Medium | Open (setup phase จะ init header) |
| 2 | Gemini model id/endpoint ที่ใช้ได้จริง (ชื่อรุ่นเปลี่ยนตามเวลา) | Medium | Open (ยืนยันตอน implement, mock-first ก่อน) |
| 3 | โควต้า Apps Script (UrlFetch/Email/Trigger) อาจจำกัดการใช้งานจริง | Medium | Mitigated (cache + monitor + alert) |
| 4 | Vertex AI + SA (JWT) ยังไม่ implement | Low | Open (optional/future) |
| 5 | ตัวกรองข้อมูลต้องห้ามแบบ keyword อาจไม่ครอบคลุมทุกเคส PII | Medium | Mitigated (property test + HITL เป็นด่านสุดท้าย) |

## Detailed Specifications
- [Components](design/components.md)
- [Data Model](design/data-model.md)
- [API Specification](design/api-spec.md)
- [Integration](design/integration.md)
- [Implementation](design/implementation.md)
- [Operations](design/operations.md)
- [Testing Strategy](design/testing-strategy.md)
- [Correctness Properties](design/correctness.md)
- [Non-Functional Requirements](design/nfr.md)

## External References
| Source | Type | Used in |
|---|---|---|
| `initial-requirements/.../Usecase 2 - clasp + gas + ai.md` | SRS | ทุกไฟล์ (FR/NFR/EX/BR) |
| github.com/google/clasp (releases) | version | implementation.md (clasp 3.3) |
| npmjs/typescriptlang (TS 7.0 release info) | version | implementation.md (เลือก TS 5.8 เพื่อ toolchain stability) |
