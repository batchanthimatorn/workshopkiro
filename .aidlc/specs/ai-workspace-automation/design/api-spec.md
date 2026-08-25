# API Specification

## Overview
- **API style**: Apps Script Web App (HTTP `doGet`/`doPost`) + client เรียก server function ผ่าน `google.script.run`; CardService action callbacks (event-driven, ไม่ใช่ HTTP); AI provider ใช้ internal JSON contract
- **Base URL**: Web App deployment URL (`https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`)
- **Auth**: Google OAuth 2.0 ของ Apps Script (Session.getActiveUser) + domain/role guard (NFR-01) — ไม่มี API key ฝั่ง client

## Conventions
- **Response envelope (server functions / Web App JSON)**: `{ ok: boolean, data?: T, error?: ErrorObject, requestId: string }`
- **Pagination**: dashboard/logs อ่านแบบ range (limit/offset) เมื่อข้อมูลมาก
- **Rate limit**: อยู่ภายใต้โควต้า Apps Script (UrlFetch/Email/Trigger ต่อวัน) — เฝ้าระวังใน MonitoringService
- **Versioning**: ผ่าน clasp Deployment (Deployment ID/version)

## Error Format
```json
{
  "ok": false,
  "requestId": "uuid",
  "error": {
    "code": "AI_TIMEOUT | QUOTA_EXCEEDED | UNAUTHORIZED | DOMAIN_FORBIDDEN | BLOCKED_SENSITIVE | VALIDATION | NOT_FOUND | INTERNAL",
    "message": "ข้อความเข้าใจง่าย (ไม่มี stack trace)"
  }
}
```
- Mapไป CardService: แสดงเป็น notification; ไป Web App: client render ตาม `error.code`

---

## A. Web App Routes (doGet / doPost)

### GET `/?page=dashboard`
- **Description**: หน้า Dashboard การใช้งาน/โควต้า + Deployment log (US-013)
- **Auth**: admin / developer
- **Response**: HtmlService page (render จาก `getDashboardData()`)

### GET `/?page=health`
- **Description**: หน้า/JSON health check (US-015)
- **Auth**: admin
- **Response** (JSON mode `?format=json`):
```json
{ "ok": true, "data": { "status": "ready",
  "checks": { "apiKey": "ok", "allowedDomains": "ok", "sheets": "ok", "provider": "mock" },
  "version": "1.0.0" }, "requestId": "uuid" }
```
- **Errors**: 200 with `status:"not_ready"` + `failures[]` เมื่อ config ขาด

### GET `/?page=admin`
- **Description**: หน้าจัดการ config, prompt, automation jobs (UI ของ US-004/005/010)
- **Auth**: admin / automation_owner (บาง section)

---

## B. Server Functions (google.script.run)

| Function | Purpose | Auth | Request | Response `data` |
|---|---|---|---|---|
| `getDashboardData()` | ดึงข้อมูล dashboard | admin/dev | — | `{ periods[], totals, deployments[] }` |
| `getHealthStatus()` | สถานะระบบ | admin | — | `HealthReport` |
| `listConfig()` / `saveConfig(item)` | อ่าน/บันทึก config | admin | `ConfigItem` | `ConfigItem` |
| `listPrompts()` / `savePrompt(t)` | จัดการ prompt (US-005) | owner/admin | `PromptTemplate` | `PromptTemplate` |
| `listJobs()` | ดูงานอัตโนมัติ | owner | — | `Job[]` |
| `createJob(job)` | สร้างงาน (US-003) | owner | `JobInput` | `Job` |
| `updateJob(jobId, patch)` | เริ่ม/หยุด/แก้ (US-004) | owner | `{jobId, patch}` | `Job` |
| `deleteJob(jobId)` | ลบงาน (US-004) | owner | `jobId` | `{deleted:true}` |

**createJob request example**:
```json
{ "templateId": "tmpl-123", "frequency": "daily", "destination": "sheets",
  "destinationId": "10ca8f2t...AsRcU" }
```
**Error**: `QUOTA_EXCEEDED` เมื่อ trigger เกินโควต้า

---

## C. CardService Action Callbacks (Add-on)

| Callback | Trigger | Auth | Input (params) | Result |
|---|---|---|---|---|
| `onHomepage(e)` | เปิด Add-on | end_user | — | Card หน้าแรก |
| `onGmailMessageOpen(e)` | เปิดอีเมล | end_user | messageId | Contextual card (ปุ่มสรุป/ร่าง) |
| `onDocsOpen(e)` | เปิด Docs | end_user | docId | Contextual card (ปุ่มสรุป) |
| `onSummarize(e)` | กดปุ่มสรุป (US-001) | end_user | `{source, lang}` | Card แสดงผลสรุป + ปุ่มคัดลอก/แทรก |
| `onDraft(e)` | กดปุ่มร่าง (US-002) | end_user | `{messageId, tone, lang}` | Card + ลิงก์ Gmail Draft |
| `onInsert(e)` | แทรกผลกลับ Docs | end_user | `{text}` | update doc + confirm card |
| `onConfirmSensitive(e)` | ยืนยันหลัง filter เตือน (US-010) | end_user | `{token}` | ดำเนินการต่อ + log confirmation |

**onSummarize behavior (EARS mapping)**: ตรวจ auth → SecurityFilter.scan → ถ้า block แสดง card เตือน (BLOCKED_SENSITIVE) → ถ้าผ่าน เรียก SummaryService → แสดงผล ≤15s หรือ card timeout + ปุ่มลองใหม่

---

## D. Internal AI Contract (AIProvider) — JSON (D3-6)

**Request**:
```json
{ "task": "summarize | draft | automation",
  "content": "<เนื้อหาที่ผ่าน filter แล้ว>",
  "prompt": "<rendered prompt จาก template>",
  "lang": "th | en | auto",
  "tone": "formal | concise | friendly | null",
  "model": "gemini-flash | null" }
```
**Response**:
```json
{ "result": "<ข้อความผลลัพธ์>",
  "model": "gemini-flash",
  "tokens": 512,
  "finishReason": "stop | length | safety",
  "cached": false }
```
**Error (จาก provider)** → แปลงเป็น `AppError` code: `AI_TIMEOUT`, `QUOTA_EXCEEDED`, `INTERNAL`; retry ≤3 (backoff) ก่อน throw

**Gemini REST mapping** (ภายใน GeminiProvider): `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}` — body map จาก contract; ตัด key ออกจาก log

---

## Traceability (endpoint/action → story)
| Story | Endpoint/Action |
|---|---|
| US-001 | `onSummarize`, AI contract |
| US-002 | `onDraft`, AI contract |
| US-003 | `createJob` |
| US-004 | `updateJob`, `deleteJob`, `listJobs` |
| US-005 | `listPrompts`, `savePrompt` |
| US-008 | auth guard ทุก endpoint |
| US-010 | `onConfirmSensitive`, SecurityFilter ใน onSummarize/onDraft |
| US-013 | `getDashboardData`, GET `/?page=dashboard` |
| US-015 | `getHealthStatus`, GET `/?page=health` |
