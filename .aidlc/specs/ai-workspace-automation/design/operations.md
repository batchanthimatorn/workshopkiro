# Operations Design

## Summary
- **Observability Level**: Standard (D3-12) — logging + usage/quota metrics + health + Cloud Logging
- **Error Tracking**: Cloud-native (D3-13) — Google Cloud Error Reporting + Cloud Logging
- **Lifecycle Management**: Basic health check (D3-14) — GAS เป็น serverless ไม่มี container/graceful shutdown
- **Logging Format**: Structured (object → JSON) ผ่าน `console.log`/`console.error` (เข้า Cloud Logging) + LogSheet
- **Logging Library**: Apps Script native `console` (Stackdriver/Cloud Logging) + AuditLogger wrapper

---

## Logging

### Strategy
- **Format**: structured — log object `{level, timestamp, requestId, op, ...}` แล้ว `console.log(JSON.stringify(...))` เข้า Cloud Logging
- **Levels**: error, warn, info, debug
- **Correlation**: สร้าง `requestId` (`Utilities.getUuid()`) ต่อ 1 การเรียก ส่งผ่านทุก log
- **Dual sink**: (1) LogSheet สำหรับ audit/usage ที่ query ได้ในชีต (2) `console` → Cloud Logging สำหรับ debug/error

### Per-Component Logging
| Component | Key Log Events | Level | Context Fields |
|---|---|---|---|
| C1 AddonUI | เปิด card, กดสรุป/ร่าง, timeout | info/warn | requestId, op, role |
| C2 WebApp | เปิดหน้า, save config/prompt, สร้าง job | info | requestId, op, role |
| C3 TriggerHandlers | เริ่ม/จบงาน, continuation | info/error | requestId, jobId, durationMs |
| C4 SummaryService / C5 DraftService | เรียก AI, สำเร็จ/ล้มเหลว | info/error | requestId, jobType, model, tokens, durationMs |
| C8 AIProvider | request, retry, timeout, quota | warn/error | requestId, model, attempt, status |
| C9 AuthService | domain/role ถูกปฏิเสธ | warn | userMasked, role |
| C11 SecurityFilter | ตรวจพบคำต้องห้าม, block/confirm | warn | requestId, matchedRuleCount (ไม่ log คำจริง) |
| C12 ErrorHandler | error ทุกชนิด | error | requestId, code, op |
| C6 AutomationService | สร้าง/ลบ/รัน job | info/error | jobId, ownerMasked |

### Sensitive Data Rules
- **Never log**: `GEMINI_API_KEY`, SA private key, content/prompt เต็ม, ข้อมูล PII
- **Mask**: email (3 ตัวแรก + โดเมน), ไม่ log คำต้องห้ามที่ตรวจพบ (log แค่จำนวน)
- **Always include**: requestId, timestamp, op, role, durationMs

---

## Health & Readiness

### Endpoints
| Endpoint | Purpose | Auth | Response |
|---|---|---|---|
| `GET /?page=health&format=json` | health/readiness — config/secret/sheets พร้อมใช้ | admin | `200 {status:"ready",checks:{...}}` หรือ `status:"not_ready",failures:[...]` |

> GAS ไม่มี process liveness แยก — health เป็นการตรวจ dependency (US-015) ไม่ใช่ liveness probe

### Readiness Checks (C16 HealthService)
| Dependency | Check Method | On Failure |
|---|---|---|
| Gemini API key | มี `GEMINI_API_KEY` ใน Script Properties | not_ready + failure "apiKey" (ถ้าไม่ใช่ mock_mode) |
| Allowed domains | Config `allowed_domains` ไม่ว่าง | not_ready + "allowedDomains" |
| Sheets/tabs | เปิด spreadsheet + แท็บที่จำเป็นครบ | not_ready + "sheets" (เสนอ init) |
| AI provider | mock: ok เสมอ; real: ping เบา (optional) | degraded |

### Response Schema
```json
{ "ok": true, "requestId": "uuid",
  "data": { "status": "ready", "version": "1.0.0",
    "checks": { "apiKey": {"status":"ok"}, "sheets": {"status":"ok"},
                "allowedDomains": {"status":"ok"}, "provider": "mock" } } }
```

---

## Graceful Shutdown
**N/A — Apps Script เป็น serverless** (execution สั้น, ไม่มี long-lived process/connection pool). แทนที่ด้วยการจัดการ **6-นาที execution limit**:
```
ก่อนเกิน 6 นาที (ErrorHandler.shouldContinue):
  1. หยุด batch ปัจจุบันอย่างปลอดภัย บันทึก progress ลง Sheet/Properties
  2. สร้าง one-time continuation trigger (runContinuation)
  3. จบ execution ปกติ → trigger ถัดไปทำงานต่อ
```
| Setting | Default | Source |
|---|---|---|
| Execution budget | ~5 นาที (buffer ก่อน 6) | const |
| Batch size | ปรับตามงาน | Config |

---

## Metrics (Standard)

### Key Metrics (เก็บใน DashboardSheet — E4)
| Metric | Type | Labels | Purpose |
|---|---|---|---|
| aiCalls | counter (รายเดือน) | jobType | ปริมาณการเรียก AI |
| tokensUsed | counter | model | ต้นทุน/โควต้า token |
| failures | counter | code | อัตราล้มเหลว |
| durationMs | aggregate (avg/p95 คำนวณจาก Log) | jobType | latency |
| urlFetchCount | counter | — | เฝ้าระวังโควต้า UrlFetch/วัน |

### Instrumentation Points
| Component | Measure | Note |
|---|---|---|
| AIProvider | call count, duration, tokens, status | เขียน Log → aggregate |
| TriggerHandlers | job run count, success/fail | |
| MonitoringService | refresh aggregate → DashboardSheet | รันตอนเปิด dashboard / daily trigger |

- **Exposition**: DashboardSheet + หน้า Web App dashboard (ไม่ใช่ Prometheus /metrics — ไม่เหมาะกับ GAS)
- **Refresh**: on-demand (เปิด dashboard) + daily trigger

---

## Error Handling & Reporting

### Error Classification
| Category | Code | Level | Alert? | Retry? | Example |
|---|---|---|---|---|---|
| Client/validation | VALIDATION, NOT_FOUND, DOMAIN_FORBIDDEN, UNAUTHORIZED | warn | No | No | input ผิด, ไม่มีสิทธิ์ |
| Governance block | BLOCKED_SENSITIVE | warn | No | No | ตรวจพบข้อมูลต้องห้าม (BR-02) |
| Operational (retriable) | AI_TIMEOUT, QUOTA_EXCEEDED (429/5xx) | error | ถ้าเกิน threshold | Yes (≤3) | Gemini timeout/limit |
| Programming | INTERNAL | error | ทันที | No | bug/unhandled |

### Error Log Structure
```json
{ "level":"error","timestamp":"ISO8601","requestId":"uuid",
  "error":{"name":"AppError","message":"...","code":"AI_TIMEOUT"},
  "context":{"op":"SummaryService.summarize","role":"end_user","durationMs":15000} }
```
- ไป Cloud Logging ผ่าน `console.error(JSON.stringify(...))` → **Google Cloud Error Reporting** จับอัตโนมัติ (D3-13)
- ผู้ใช้เห็นเฉพาะ `toUserMessage(err)` (ไม่มี stack trace) (EX-01)

### Error Tracking (Cloud-native)
- **Service**: Google Cloud Error Reporting + Cloud Logging ของ GCP project ที่ผูก Apps Script
- **Capture**: `console.error` ทั้งหมด + unhandled
- **Alert**: Notifier ส่ง Email/Chat เมื่อ failures เกิน `alert_threshold` (Config) (US-014)

---

## Configuration Management

### Required (Script Properties — secret/config)
| Variable | Required | Default | Sensitive | Description |
|---|---|---|---|---|
| `GEMINI_API_KEY` | ตามโหมด | — | Yes | key Gemini (ไม่ต้องถ้า mock_mode) |
| `SPREADSHEET_ID` | Yes | — | No | data store |
| `MOCK_MODE` | No | true | No | เริ่ม mock-first |
| `ALERT_EMAIL` | No | — | No | ปลายทางแจ้งเตือน |
| `CHAT_WEBHOOK_URL` | No | — | Yes(ish) | optional Chat alert |
| `VERTEX_SA_KEY` | No (future) | — | Yes | SA private key |

### Startup Validation (HealthService / lazy check)
1. ตรวจ Script Properties ที่จำเป็นตามโหมด (mock/real)
2. ตรวจ spreadsheet + แท็บครบ (เสนอ init ถ้าไม่ครบ)
3. ถ้า config critical ขาด → health = not_ready + ข้อความชี้จุดแก้ (ไม่ crash ทั้งระบบ)

---

## Traceability
| Operations Concern | Related Design |
|---|---|
| Per-component logging | design/components.md |
| Readiness checks | design/integration.md, data-model.md |
| Error classification | design/api-spec.md (error format) |
| Config variables | design/implementation.md (Script Properties) |
| Metrics | data-model.md (DashboardSheet), components.md (MonitoringService) |
