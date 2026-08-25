# Testing Strategy

## Overview
- **Testing philosophy**: Test-After (workshop-pragmatic) + property test สำหรับ logic เสี่ยง — เน้นทดสอบ **pure logic ที่แยกจาก Google services**
- **Coverage target**: logic layer (services/core/security/data mapping) ≥ 70%; SecurityFilter + RetryUtil คลุมด้วย property test
- **Test pyramid**: unit (ส่วนใหญ่) → property (logic สำคัญ) → integration บน GAS จริง (manual, น้อย); ไม่มี E2E อัตโนมัติ (ข้อจำกัด GAS runtime)

## Frameworks
- **Unit**: Jest + ts-jest, mock ของ Google globals (D3-10)
- **Property-based**: fast-check (D3-11) — ดู design/correctness.md
- **Integration**: manual บน dev deployment (`clasp push` → scriptId dev)
- **E2E / Load**: none (ไม่เหมาะกับ Add-on/GAS ในบริบทนี้)
- **Lint**: ESLint (`npm run lint`)

## Test Architecture
```
tests/
├── unit/
│   ├── services/        # summary, draft, automation, prompt, monitoring, health
│   ├── ai/              # GeminiProvider (mock UrlFetch), MockProvider, factory
│   ├── security/        # AuthService, SecurityFilter (example cases)
│   ├── core/            # ErrorHandler, RetryUtil, SecretManager, AuditLogger, Notifier
│   └── data/            # repositories (row↔object mapping)
├── properties/          # fast-check (P1–P5)
└── mocks/
    ├── gas-globals.ts   # mock GmailApp/SpreadsheetApp/UrlFetchApp/PropertiesService/CacheService/Session/ScriptApp
    └── ai-fixtures/     # ผล AI จำลอง (*.json) สำหรับ MockProvider + tests
```
- **Naming**: `*.test.ts` (unit), `*.properties.test.ts` (pbt); test name: `describe(Component) > it(should ...)`
- **Shared utilities**: factory สร้าง entity ตัวอย่าง (Log/Config/Prompt/Job), `installGasMocks()` setup global mocks
- **Test data**: in-memory (mock sheet เป็น array 2 มิติ), reset ก่อนแต่ละ test (ไม่มี state ค้าง)

## Mock Strategy
- **Google globals**: mock ทั้งหมดใน `tests/mocks/gas-globals.ts` — `SpreadsheetApp` จำลองด้วย array, `UrlFetchApp.fetch` คืน fixture/HTTPResponse จำลอง (200/429/5xx/timeout)
- **AI provider**: ใช้ `MockProvider` (อ่าน fixture) + สำหรับทดสอบ GeminiProvider ให้ mock `UrlFetchApp`
- **Time-dependent**: inject clock/`Date.now` ผ่านพารามิเตอร์ (สำหรับ backoff/continuation) เพื่อ deterministic
- **Properties/Cache**: mock เป็น Map

## Environment
- **Test DB**: ไม่มี DB จริง — mock SpreadsheetApp (in-memory)
- **Env variables**: mock `PropertiesService.getScriptProperties()` คืนค่าทดสอบ (mock_mode=true, ไม่มี key จริง)
- **CI integration**: GitHub Actions รัน `npm run lint && npm test` ก่อน `clasp push`/`deploy` (US-007, ท้าย/optional)
- **Guardrail**: ไม่มี test ใดยิง AI/Google API จริง

## Coverage Mapping
| Component | Test type |
|---|---|
| SummaryService / DraftService (C4/C5) | unit (mock AIProvider + Gmail/Docs) |
| AutomationService (C6) | unit (mock ScriptApp/trigger, repos) |
| PromptService (C7) | unit (render placeholder) |
| AIProvider/Gemini (C8) | unit (mock UrlFetch: success/429/5xx/timeout) |
| AuthService (C9) | unit (domain/role cases) |
| SecurityFilter (C11) | unit + **property (P1,P2)** |
| ErrorHandler/RetryUtil (C13) | unit + **property (P3,P4)** |
| AuditLogger/masking (C12) | unit + **property (P5)** |
| Repositories (C17) | unit (row↔object, header mapping, init) |
| MonitoringService (C14) | unit (aggregate จาก log ตัวอย่าง) |
| HealthService (C16) | unit (config ครบ/ขาด) |

| Endpoint/Action | Test type |
|---|---|
| onSummarize / onDraft | unit (service-level; UI card ทดสอบ manual) |
| createJob/updateJob/deleteJob | unit (AutomationService) |
| getDashboardData / getHealthStatus | unit (service-level) |

**Critical paths (ทดสอบ manual บน GAS จริง)**: เปิด Add-on ใน Gmail/Docs → สรุป/ร่าง; ตั้ง trigger แล้วรันจริง; เปิด Web App dashboard

## Run Commands
| Purpose | Command |
|---|---|
| unit | `npm test` |
| property | `npm run test:pbt` |
| all + lint | `npm run verify` (`lint && test`) |
| coverage | `npm run test:coverage` |
