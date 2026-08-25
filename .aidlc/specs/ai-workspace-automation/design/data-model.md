# Data Model

## Overview
- **Database**: Google Sheets (Data Store) — 1 spreadsheet (`spreadsheetId` เก็บใน Script Property) หลายแท็บ (tab = entity)
- **Access**: typed Repository ครอบ SpreadsheetApp (D3-4), map แบบ header-based (แถวแรก = header)
- **Config/Secret**: Properties Service (แยกจาก Sheet ตาม D3-9) — ดู implementation.md
- **หมายเหตุ**: ไม่ใช่ relational DB — ไม่มี FK จริง ใช้ id อ้างอิงกันแบบ soft reference; ทุก id เป็น string (UUID-like จาก `Utilities.getUuid()`)

Target spreadsheet: `10ca8f2tjo2TJ0Skm8KvkwpL8iMzfFgpCH-L6EpAsRcU`

---

## Entities (Sheet Tabs)

### E1. LogSheet (`Logs`) — Audit / Usage Log
- **Purpose**: บันทึกการเรียก AI ทุกครั้ง (audit + usage) โดยไม่เก็บเนื้อหาส่วนบุคคล (NFR-02, US-011)

| Field | Type | Required | Constraints |
|---|---|---|---|
| logId | string (uuid) | yes | PK |
| timestamp | ISO datetime | yes | เวลาที่เรียก |
| userEmailMasked | string | yes | mask เช่น `abc***@domain.com` (ไม่เก็บอีเมลเต็มถ้าเป็น PII policy) |
| role | enum | yes | end_user / automation_owner / developer / admin |
| jobType | enum | yes | summarize / draft / automation / other |
| model | string | yes | เช่น gemini-flash / mock |
| status | enum | yes | success / timeout / error / blocked |
| tokens | number | no | token ที่ใช้ (ถ้ามีจาก response) |
| durationMs | number | no | เวลาประมวลผล |
| requestId | string | yes | correlation id |
| confirmedBy | string | no | ผู้ยืนยัน HITL (ถ้ามี) |
| confirmedAt | ISO datetime | no | เวลายืนยัน |

- **Business rules**: ห้ามเก็บ content/prompt เต็ม; mask email ตาม PDPA; retention กำหนดใน Config (default 90 วัน)
- **Indexes (access)**: query by timestamp range, by jobType, by status (Sheet ไม่มี index จริง → ใช้ filter/aggregate ใน MonitoringService)

### E2. ConfigSheet (`Config`) — Business Config
- **Purpose**: business rule/config ที่ Admin แก้ได้ (allowed domain, banned keywords, thresholds) (D3-9, US-008, US-010)

| Field | Type | Required | Constraints |
|---|---|---|---|
| key | string | yes | PK เช่น `allowed_domains`, `banned_keywords`, `alert_threshold`, `log_retention_days`, `mock_mode` |
| value | string | yes | ค่า (list ใช้ comma/JSON) |
| category | enum | yes | security / automation / monitoring / general |
| updatedBy | string | no | อีเมล admin |
| updatedAt | ISO datetime | no | |

- **Business rules**: `banned_keywords` = list คำ/regex ต้องห้ามส่ง AI; `allowed_domains` = โดเมนที่ใช้งานได้; **ไม่เก็บ secret ที่นี่** (secret อยู่ใน Script Properties)
- **Seed rows**: allowed_domains, banned_keywords, alert_threshold=3, log_retention_days=90, mock_mode=true (เริ่ม mock-first)

### E3. PromptTemplateSheet (`Prompts`) — Prompt Template Registry
- **Purpose**: แม่แบบ prompt ใช้ซ้ำ (NFR-05, US-005)

| Field | Type | Required | Constraints |
|---|---|---|---|
| templateId | string (uuid) | yes | PK |
| name | string | yes | ชื่อแสดงผล |
| taskType | enum | yes | summarize / draft / automation |
| language | enum | yes | th / en / auto |
| tone | enum | no | formal / concise / friendly (สำหรับ draft) |
| promptText | string | yes | แม่แบบ มี placeholder เช่น `{{content}}`, `{{lang}}`, `{{tone}}` |
| model | string | no | override model (ว่าง = default) |
| active | boolean | yes | เปิด/ปิดใช้งาน |
| updatedAt | ISO datetime | no | |

- **Business rules**: ต้องมี placeholder `{{content}}`; อย่างน้อย 1 active template ต่อ taskType

### E4. DashboardSheet (`Dashboard`) — Usage/Quota Metrics
- **Purpose**: สรุปการใช้งานรายเดือน + โควต้า (NFR-04, US-013)

| Field | Type | Required | Constraints |
|---|---|---|---|
| period | string (YYYY-MM) | yes | PK รายเดือน |
| aiCalls | number | yes | จำนวนเรียก AI |
| tokensUsed | number | yes | รวม token |
| failures | number | yes | จำนวนล้มเหลว |
| urlFetchCount | number | no | ใช้ track โควต้า UrlFetch |
| updatedAt | ISO datetime | yes | |

### E5. DeploymentSheet (`Deployments`) — Deployment Log
- **Purpose**: บันทึกเวอร์ชัน deploy + release note (FR-04, US-013)

| Field | Type | Required | Constraints |
|---|---|---|---|
| deploymentId | string | yes | PK (จาก clasp) |
| version | string | yes | เวอร์ชัน |
| releaseNote | string | no | |
| deployedBy | string | no | |
| deployedAt | ISO datetime | yes | |
| status | enum | yes | active / rolled_back |

### E6. JobSheet (`Jobs`) — Automation Jobs
- **Purpose**: เก็บการตั้งค่างานอัตโนมัติ (FR-03, US-003, US-004)

| Field | Type | Required | Constraints |
|---|---|---|---|
| jobId | string (uuid) | yes | PK |
| ownerEmail | string | yes | เจ้าของงาน |
| templateId | string | yes | soft ref → E3.templateId |
| frequency | enum | yes | hourly / daily |
| destination | enum | yes | sheets / docs |
| destinationId | string | no | id ปลายทาง (sheet/doc) |
| triggerId | string | no | id ของ ScriptApp trigger |
| status | enum | yes | active / paused |
| lastRunAt | ISO datetime | no | |
| lastRunStatus | enum | no | success / error |

- **Business rules**: จำนวน job active ต่อผู้ใช้ ≤ โควต้า trigger ของ Apps Script

---

## ER Diagram (soft references)

```
  Prompts (E3) 1 ────< Jobs (E6)        [Jobs.templateId → Prompts.templateId]
     │                    │
     │                    └──run──> Logs (E1)   [แต่ละครั้งที่รันเขียน log]
     │
  AddonUI/Services ──use──> Prompts
                              
  Logs (E1) ──aggregate──> Dashboard (E4)   [MonitoringService สรุป]
  Deployments (E5) ──shown-in──> Dashboard view
  Config (E2) ──governs──> Auth / SecurityFilter / Automation / Monitoring
```

## Access Patterns

| Pattern | Used by | Frequency | Approach |
|---|---|---|---|
| append log entry | AuditLogger | ทุกการเรียก AI | `sheet.appendRow()` |
| read config by key | Auth/SecurityFilter | ทุก request | อ่านทั้งแท็บ + cache ใน CacheService |
| aggregate logs → metrics | MonitoringService | เมื่อเปิด dashboard / daily | อ่าน range + reduce |
| CRUD job | AutomationService | ตามผู้ใช้ | find row by jobId |
| list active prompts | PromptService | ตอนสรุป/ร่าง | อ่านทั้งแท็บ + cache |

## Business Rules (data-level)
- ทุกการเขียนใช้ header-based mapping — ถ้า header ไม่ครบ ให้ init sheet + header อัตโนมัติ (setup)
- Config `mock_mode=true` → AIProvider ใช้ MockProvider (D1-5)
- Log ไม่เก็บ content/prompt เต็ม (PDPA); email ผ่าน mask ก่อนเขียน
- Concurrency: Apps Script single-threaded ต่อ execution; ใช้ `LockService` เมื่อเขียน job/config ที่แข่งกัน
