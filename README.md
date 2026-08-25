# AI Workspace Automation (APP-03)

ผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI — สรุป/ร่างข้อความใน Gmail/Docs, ตั้งงานอัตโนมัติ, Dashboard/Health บน Web App พัฒนาแบบ code-first (TypeScript + esbuild + clasp)

## สถาปัตยกรรมโดยย่อ
- **Runtime**: Google Apps Script (V8) — Add-on (CardService) + Web App (HtmlService) + Time-driven Triggers
- **ภาษา/บิลด์**: TypeScript → `esbuild` bundle เป็น `dist/Code.gs` → `clasp push`
- **Data store**: Google Sheets (แท็บ Logs/Config/Prompts/Dashboard/Deployments/Jobs)
- **AI**: `AIProvider` abstraction — `MockProvider` (default, mock-first) / `GeminiProvider` (Gemini API) / Vertex AI (future)
- **Config/Secret**: Script Properties (secret) + Config sheet (business rules)
- รายละเอียดออกแบบ: `.aidlc/specs/ai-workspace-automation/design/`

## Prerequisites
- Node.js 20+, npm
- `clasp` (มากับ devDependency; หรือ `npm i -g @google/clasp`)
- บัญชี Google ที่มีสิทธิ์ edit ต่อ Apps Script project เป้าหมาย + เปิด Apps Script API ที่ https://script.google.com/home/usersettings

## Setup
```bash
npm install
npx clasp login          # ครั้งเดียว (สร้าง ~/.clasprc.json)
```
ตั้งค่า **Script Properties** ใน Apps Script (Project Settings → Script Properties):
| Property | จำเป็น | คำอธิบาย |
|---|---|---|
| `SPREADSHEET_ID` | ใช่ | ID ของ Google Sheet ที่เป็น data store |
| `GEMINI_API_KEY` | เมื่อ `mock_mode=false` | API key ของ Gemini (secret) |
| `MOCK_MODE` | ไม่ | (ทางเลือก) override โหมด mock |

> data store สร้างแท็บ/seed อัตโนมัติได้ด้วยการรันฟังก์ชัน `setup()` จาก Apps Script editor (หลังตั้ง `SPREADSHEET_ID`)

## Scripts
| คำสั่ง | ทำอะไร |
|---|---|
| `npm run typecheck` | ตรวจชนิด TypeScript |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:pbt` | unit tests / property tests |
| `npm run test:coverage` | รายงาน coverage |
| `npm run verify` | typecheck + lint + test |
| `npm run build` | esbuild → `dist/` |
| `npm run push` | build + `clasp push` (dev) |
| `npm run deploy` | build + `clasp deploy` (เวอร์ชันใหม่) |

## Config (แท็บ Config)
`allowed_domains`, `admin_emails`, `developer_emails`, `owner_emails`, `banned_keywords`, `alert_threshold`, `alert_email`, `chat_webhook_url`, `log_retention_days`, `mock_mode`, `gemini_model`
- RBAC เป็น **dev-open** เมื่อยังไม่ตั้ง `*_emails` (ผู้ใช้ที่ deploy = admin) — ตั้งค่าเพื่อบังคับสิทธิ์จริง
- `banned_keywords` = คำต้องห้ามส่ง AI (คั่นด้วย comma) — เปิด HITL confirm

## สลับไป Gemini จริง
1. ใส่ `GEMINI_API_KEY` ใน Script Properties
2. แก้ Config `mock_mode` = `false` (แท็บ Config)
> `appsscript.json` มี `urlFetchWhitelist` = `https://generativelanguage.googleapis.com/` แล้ว (จำเป็นสำหรับ Workspace Add-on ที่ใช้ UrlFetchApp)

## Deploy & Rollback
- **Deploy**: `npm run deploy` หรือ CI (merge main) — สร้าง versioned deployment (เก็บ Deployment ID)
- **Rollback**: `npx clasp deployments` (ดูรายการ) → ผูก Web App เข้ากับ deployment เวอร์ชันก่อนหน้าใน Apps Script → Deploy → Manage deployments → เลือก version เดิม
- ห้ามแก้โค้ดผ่าน Apps Script Web Editor โดยตรง (code-first เท่านั้น)

## CI/CD (GitHub Actions)
`.github/workflows/deploy.yml` — PR → lint/test/build; push `main` → build + `clasp push`/`deploy`
- ต้องตั้ง GitHub Secret **`CLASPRC_JSON`** = เนื้อหาไฟล์ `~/.clasprc.json` (ห้าม commit)

## Security & Privacy
- Secret อยู่ใน Script Properties เท่านั้น — ไม่ hardcode/commit (`.gitignore` + `.claspignore` กัน `sa-*.json`, `.clasprc.json`)
- Human-in-the-loop: ร่างเป็น Gmail Draft เท่านั้น ระบบไม่ส่งเอง (BR-01)
- ตัวกรองข้อมูลต้องห้ามก่อนส่ง AI (BR-02) + audit log ไม่เก็บ PII (mask email)
