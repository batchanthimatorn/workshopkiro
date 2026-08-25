# Integration

## Overview
ระบบเชื่อมต่อบริการภายนอกผ่าน 2 กลุ่ม: (1) **AI provider** (Gemini/Vertex ผ่าน `UrlFetchApp`) ภายใต้ abstraction, (2) **Google built-in services** (Gmail/Docs/Sheets/Drive/Chat) ผ่าน Apps Script Built-in Services. ทุก integration ต้องมี error handling (retry/timeout/fallback) ห้าม fail เงียบ

---

## External Integrations

### I1. AI Provider — Gemini API (default)
- **Purpose**: สรุป/ร่าง/automation (FR-01, FR-02, FR-03)
- **Type**: REST ผ่าน `UrlFetchApp.fetch` (`muteHttpExceptions: true`)
- **Auth**: API key จาก **Script Properties** (`GEMINI_API_KEY`) — ต่อท้าย query `?key=` ฝั่ง server เท่านั้น, ไม่ log
- **Manifest requirement (fix 2026-08-25)**: Workspace Add-on ที่ใช้ UrlFetchApp ต้องประกาศ `urlFetchWhitelist` ใน `appsscript.json` = `["https://generativelanguage.googleapis.com/"]` (prefix ต้องเป็น HTTPS + ลงท้าย `/`) มิฉะนั้น deploy ไม่ผ่าน — เพิ่ม host ของ Chat webhook/Vertex เมื่อเปิดใช้
- **Key endpoint**: `POST .../v1beta/models/{model}:generateContent`
- **Error handling**:
  - timeout: ใช้ผลลัพธ์ภายในเวลาที่คุม; ถ้าเกิน → `AI_TIMEOUT`
  - retry: exponential backoff ≤3 (250ms → 500ms → 1000ms + jitter) เฉพาะ error ที่ retriable (429/5xx)
  - quota (429): `QUOTA_EXCEEDED` → หยุด retry เกินเกณฑ์ แจ้งผู้ใช้
  - fallback: คืนข้อความ error ที่ปลอดภัย + ปุ่มลองใหม่; บันทึก Error Log
- **Mock mode (D1-5)**: เมื่อ Config `mock_mode=true` → `MockProvider` อ่านผลจำลองจาก `mocks/*.json` ไม่มี network call

### I2. AI Provider — Vertex AI (optional / future)
- **Purpose**: ทางเลือก enterprise ด้วย service account (`sa-bct-ai-2026.json`)
- **Type**: REST + OAuth token (JWT เซ็นด้วย private key)
- **Auth**: service account flow ผ่าน `apps-script-oauth2` library; **private key เก็บใน Script Properties เท่านั้น** (ไม่ commit, ไม่ bundle)
- **Status**: ไม่อยู่ MVP — implement `VertexAIProvider` เมื่อเปิดใช้; interface เดียวกับ Gemini
- **Security note**: ไฟล์ SA ต้องอยู่ใน `.gitignore`/`.claspignore`

### I3. Gmail (Built-in)
- **Purpose**: อ่าน thread (สรุป), สร้าง Draft (ร่าง — ไม่ส่ง), แจ้งเตือน (MailApp)
- **Type**: Apps Script `GmailApp` / `MailApp`
- **Auth**: OAuth scope ใน appsscript.json (least privilege)
- **Error handling**: try/catch, map เป็น AppError; ห้ามส่งอัตโนมัติ (BR-01)

### I4. Google Docs / Drive (Built-in)
- **Purpose**: อ่านเนื้อหาเอกสาร (สรุป), แทรกผลกลับ, เขียนผล automation
- **Type**: `DocumentApp` / `DriveApp`
- **Scope**: least privilege (เฉพาะ current doc / ไฟล์ที่ระบุ)

### I5. Google Sheets (Built-in) — Data Store
- **Purpose**: data store ทั้งหมด (Log/Config/Prompt/Dashboard/Job/Deployment)
- **Type**: `SpreadsheetApp` (spreadsheetId จาก Script Property)
- **Error handling**: init sheet/header ถ้าไม่พบ; ใช้ `LockService` เมื่อเขียนแข่งกัน

### I6. Google Chat (optional) — Alerts
- **Purpose**: แจ้งเตือน error (US-014)
- **Type**: Incoming webhook (`UrlFetchApp`) — webhook URL ใน Script Properties
- **Status**: optional (D1-6 หลักคือ Email; Chat เปิดได้ผ่าน config)

### I7. GitHub Actions — CI/CD (US-007, ท้าย/optional)
- **Purpose**: lint + test + `clasp push`/`deploy` เมื่อ merge main; rollback
- **Type**: GitHub Actions workflow
- **Auth**: `CLASPRC` / clasp credentials เก็บใน **GitHub Secrets** (ไม่ commit)
- **Error handling**: หยุด pipeline เมื่อ lint/test/deploy fail; คง deployment ล่าสุด (EX-02)

---

## Inter-unit Communication
ไม่มี (single unit / GAS app ก้อนเดียว ตามนโยบาย hands-on — ข้าม decomposition) การสื่อสารระหว่าง component เป็น in-process function call

---

## Integration Testing
- **Strategy**: unit-test logic โดย **mock Google globals** (GmailApp/SpreadsheetApp/UrlFetchApp/PropertiesService/CacheService) — Jest (D3-10)
- **AI provider**: ทดสอบผ่าน `MockProvider` + mock `UrlFetchApp` (จำลอง 200/429/5xx/timeout เพื่อทดสอบ backoff)
- **Contract test**: ยืนยัน request/response ตรง JSON contract (D3-6)
- **บน GAS จริง**: ทดสอบ manual/สมอกใน dev deployment (แยก scriptId dev) — ระบุใน run-book
- **Guardrail**: ห้ามยิง AI endpoint จริงระหว่าง test — ใช้ mock/dry-run (สอดคล้องนโยบาย)
