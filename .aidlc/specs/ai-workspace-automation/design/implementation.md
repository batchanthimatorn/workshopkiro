# Implementation

Engineer's reference สำหรับ scaffold และการพัฒนาประจำวัน

## Code Organization

- **Architecture pattern**: Layered serverless (entry → service → integration → data + cross-cutting)
- **Repository type**: Single repo (code-first ด้วย clasp)
- **Build (Add-on 2026-08-25)**: **esbuild** bundle `src/**` (เขียน TS ปกติ มี import/export) → `dist/Code.gs` ไฟล์เดียว + copy `appsscript.json` + `*.html` ไป `dist/`; `clasp push` จาก `dist/`. entry ต้อง expose global functions (esbuild `globalName`/banner หรือ assign เข้า `globalThis`) เพื่อให้ Apps Script เรียก onSummarize/doGet/runScheduledJob ได้

### Directory Structure
```
/ (repo root)
├── src/
│   ├── addon/                # C1 AddonUI (CardService)
│   │   ├── cards/            # การ์ด UI
│   │   └── handlers.ts       # onHomepage, onSummarize, onDraft, onInsert, onConfirmSensitive
│   ├── webapp/               # C2 WebApp
│   │   ├── routes.ts         # doGet/doPost + server functions
│   │   └── views/            # *.html (Bootstrap templates: dashboard, admin, health)
│   ├── triggers/             # C3 TriggerHandlers (runScheduledJob, runContinuation)
│   ├── services/             # C4-C7,C14-C16 (summary, draft, automation, prompt, monitoring, health)
│   ├── ai/                   # C8 AIProvider
│   │   ├── AIProvider.ts     # interface + factory
│   │   ├── GeminiProvider.ts
│   │   ├── VertexAIProvider.ts   # optional/future (stub)
│   │   └── MockProvider.ts   # mock-first (D1-5)
│   ├── security/             # C9 AuthService, C11 SecurityFilter
│   ├── data/                 # C17 repositories (SheetRepository base + Log/Config/Prompt/Dashboard/Job/Deployment)
│   ├── core/                 # C10 SecretManager, C12 ErrorHandler/RetryUtil, C13 Logger/AuditLogger, C15 Notifier, Config
│   ├── types/                # shared types/interfaces (AIRequest, AIResponse, entities)
│   └── main.ts               # global entry bindings (Apps Script global functions)
├── tests/
│   ├── unit/                 # Jest unit tests (mocked GAS globals)
│   ├── properties/           # fast-check property tests (sensitive-filter, backoff)
│   └── mocks/                # GAS globals mocks + AI response fixtures (*.json)
├── mocks/                    # ผลจำลอง AI สำหรับ mock_mode runtime
├── dist/                     # esbuild output (Code.gs + appsscript.json + *.html) = clasp rootDir (gitignored)
├── appsscript.json           # manifest: runtime V8, OAuth scopes (least privilege), add-on config (copy ไป dist ตอน build)
├── build.mjs                 # esbuild bundle script (Add-on: src -> dist/Code.gs + copy manifest/html)
├── .clasp.json               # scriptId + rootDir:"dist"
├── .claspignore              # (dist context) กันไฟล์ที่ไม่ใช่ code/manifest
├── .gitignore                # กัน node_modules/, dist/, .env, sa-bct-ai-2026.json, .clasprc.json
├── tsconfig.json
├── eslint.config.js          # ESLint 9 flat config
├── package.json
└── .github/workflows/deploy.yml   # CI/CD (US-007, ท้าย/optional)
```

- **Module boundaries**: entry ไม่เรียก data layer ตรง ๆ (ผ่าน service); cross-cutting (Logger/Error/Config) เรียกได้จากทุกชั้นทางเดียว; ไม่มี cyclic dependency
- **Naming conventions** (ตาม steering code-conventions): camelCase (var/func), PascalCase (class/interface), UPPER_SNAKE_CASE (const), `_` นำหน้า private
- **Global functions**: Apps Script ต้องมี global function (onSummarize, doGet, runScheduledJob ฯลฯ) — export/bind ใน `main.ts`

## Technology Stack (versions)

| Tool | Version | Note |
|---|---|---|
| Node.js | 20 LTS | ต้องใช้กับ clasp 3.x (dev/CI เท่านั้น) |
| @google/clasp | ^3.4.0 | push/pull/deploy (installed 3.4.0) |
| esbuild | ^0.23.x | bundle src -> dist/Code.gs (Add-on 2026-08-25) |
| TypeScript | ~5.8.x | เลือก 5.8 เพื่อความเข้ากันกับ ts-jest/@types/google-apps-script (TS 7.0 ใหม่มาก ก.ค. 2026 → เลี่ยงในชั้น toolchain GAS) |
| @types/google-apps-script | ^1.0.x | typings ของ GAS |
| Jest | ^29.x | unit test + ts-jest ^29 |
| ts-jest | ^29.x | รัน TS ใน Jest |
| fast-check | ^3.x | property-based test (D3-11 เสริม) |
| ESLint | ^9.x | + @typescript-eslint |
| apps-script-oauth2 | (GAS library) | สำหรับ Vertex AI SA flow (optional/future) |

> ⚠️ เวอร์ชัน Jest/ts-jest/ESLint/fast-check อ้างอิง training knowledge (unverified ณ 2026) — ยืนยันด้วย `npm info` ตอน setup; clasp/TypeScript web-verified

## Development Setup

**Prerequisites**: Node.js 20+, npm, บัญชี Google Workspace, สิทธิ์เข้าถึง target Apps Script project + spreadsheet

**Setup commands**:
```bash
npm install
npm install -g @google/clasp     # หรือใช้ npx
clasp login                       # OAuth (credential เก็บ local, .clasprc.json — gitignored)
# .clasp.json ผูก scriptId เป้าหมายไว้แล้ว
npm run lint
npm test
npm run build                     # esbuild: src -> dist/
npm run push                      # build + clasp push (จาก dist/) ขึ้น Apps Script (dev)
```

**Environment / Script Properties** (ตั้งใน Apps Script > Project Settings > Script Properties — ไม่อยู่ในโค้ด):

| Variable | Description | Example (placeholder) |
|---|---|---|
| `GEMINI_API_KEY` | API key ของ Gemini (secret) | `AIza...` (ห้าม commit) |
| `SPREADSHEET_ID` | data store spreadsheet | `10ca8f2t...AsRcU` |
| `MOCK_MODE` | เริ่มด้วย mock (`true`/`false`) | `true` |
| `ALERT_EMAIL` | อีเมลรับแจ้งเตือน | `admin@example.com` |
| `CHAT_WEBHOOK_URL` | (optional) Google Chat webhook | `https://chat.googleapis.com/...` |
| `VERTEX_SA_KEY` | (future) private key ของ SA (secret) | `-----BEGIN PRIVATE KEY-----...` |

> ค่า `SPREADSHEET_ID`/`MOCK_MODE` อาจอยู่ใน Config Sheet ได้เช่นกัน แต่ secret อยู่ใน Script Properties เท่านั้น

## Testing

| Type | Framework | Run command |
|---|---|---|
| Unit | Jest + ts-jest (mocked GAS globals) | `npm test` |
| Property-based | fast-check (sensitive-filter, backoff) | `npm run test:pbt` (`jest tests/properties`) |
| Lint | ESLint | `npm run lint` |
| Integration (GAS) | manual/dev deployment | `clasp push` → ทดสอบใน dev scriptId |

- **Coverage target**: logic layer (services/core/security/data mapping) ≥ 70% (workshop-level); ตัวกรองข้อมูลต้องห้าม + backoff คลุมด้วย property test
- **Guardrail**: test ห้ามยิง AI endpoint จริง — mock/dry-run เท่านั้น
