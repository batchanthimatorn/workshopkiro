# Non-Functional Requirements & Infrastructure

## Performance (NFR-03)
- **Response time**: Add-on ปกติตอบ ≤ 15 วินาที (สรุป/ร่าง) หรือแจ้ง timeout + ปุ่มลองใหม่
- **Long jobs**: งานที่ยาว > ~5 นาที ต้องแบ่ง batch + continuation trigger (ไม่ชน 6-นาที limit ของ Apps Script)
- **Cache**: CacheService (key=hash(content+prompt+lang/tone), TTL) ลดการเรียก AI ซ้ำ
- **Concurrency**: single-threaded ต่อ execution; ใช้ `LockService` เมื่อเขียน Sheet ที่แข่งกัน

## Scalability
- **Compute**: Apps Script serverless — Google จัดการ scale เอง (ไม่มี instance ให้ตั้ง)
- **ข้อจำกัดจริงคือโควต้า**: UrlFetch/Email/Trigger ต่อวัน — เฝ้าระวังใน Dashboard, แจ้งเตือนเมื่อใกล้เกิน
- **Data growth**: LogSheet โตตามการใช้งาน → มี retention (default 90 วัน, ตั้งใน Config) + archive/ลบแถวเก่า

## Security (NFR-01, NFR-02, BR-01, BR-02)
- **Authentication**: Google OAuth 2.0 ของ Apps Script (`Session.getActiveUser`) — service account ไม่ใช้แทนการล็อกอินผู้ใช้
- **Authorization**: role-based (least privilege) ตาม 4 บทบาท
- **Encryption**: in transit = HTTPS (UrlFetchApp/HtmlService บังคับ TLS); at rest = Google-managed (Sheets/Properties)
- **Secret**: API key/SA ใน Script Properties เท่านั้น; `.gitignore`/`.claspignore` กันหลุด; ไม่ log ค่า secret
- **OAuth scope**: least privilege ใน `appsscript.json` (เฉพาะ gmail.addons/current message, documents.currentonly, spreadsheets เฉพาะ data store, script.external_request, userinfo.email) — ทบทวนทุก deploy
- **Data governance**: HITL ก่อนส่งทุกครั้ง (BR-01); sensitive-data filter ก่อนส่ง AI (BR-02); audit log ไม่เก็บ PII/content เต็ม (PDPA)

**Roles & Permissions**:
| Role | Permissions |
|---|---|
| End User | ใช้ Add-on สรุป/ร่าง (ของตนเอง), ยืนยัน HITL |
| Automation Owner | + สร้าง/จัดการ automation job + prompt template |
| Developer | + push/deploy (clasp), ดู deployment log/dashboard |
| Admin | + จัดการ config/secret, allowed domain, banned keywords, ดู audit log, health |

## Availability & Reliability
- **Uptime**: อิงความพร้อมของ Google Apps Script/Workspace (managed) — ไม่มี SLA ที่เราคุมเอง
- **Reliability**: retry backoff (≤3) สำหรับ AI, continuation สำหรับงานยาว, LockService กัน race
- **Backup/Recovery**: data อยู่ใน Google Sheets (มี version history ของ Google); code อยู่ใน Git; deploy rollback ผ่าน clasp deployment (FR-04/EX-02)
- **Health check**: Web App `/?page=health` (US-015)

## Infrastructure
### Compute
| Component | Service | Configuration |
|---|---|---|
| Add-on/WebApp/Trigger | Google Apps Script (V8) | serverless, deploy ผ่าน clasp |

### Storage
| Data | Service | Configuration |
|---|---|---|
| Data store (Log/Config/Prompt/Dashboard/Job/Deployment) | Google Sheets | spreadsheetId ใน Script Property |
| Secret/Config | Properties Service (Script) | key-value |
| Cache | Cache Service | TTL-based |

### External
| Component | Service | Configuration |
|---|---|---|
| AI | Gemini API (default) / Vertex AI (future) | UrlFetchApp; key/SA ใน Properties |
| Alerts | Gmail/MailApp (+ Chat webhook optional) | ปลายทางใน Config/Property |

## Caching
| Data | Technology | TTL | Invalidation |
|---|---|---|---|
| ผล AI (สรุป/ร่างเดิม) | CacheService | ~1 ชม. (ตั้งได้) | โดย TTL / key เปลี่ยนตาม content |
| Config/Prompt (อ่านบ่อย) | CacheService | ~5-10 นาที | เมื่อ saveConfig/savePrompt ล้าง key |

## Data Management
- **Retention**: LogSheet default 90 วัน (Config `log_retention_days`)
- **Archival/Deletion**: ลบ/ย้ายแถวเก่าเกิน retention (job ประจำ หรือ manual)
- **PDPA**: ไม่เก็บ content/PII เต็ม, mask email

## Observability
| Concern | Tool | Configuration |
|---|---|---|
| Logging | Cloud Logging (`console`) + LogSheet | structured, requestId |
| Metrics | DashboardSheet + Web App dashboard | aiCalls/tokens/failures/urlFetch รายเดือน |
| Error tracking | Google Cloud Error Reporting | จับจาก console.error |
| Alerting | Email (MailApp) / Chat webhook | threshold ใน Config (US-014) |

## CI/CD & Deployment (FR-04, ท้าย/optional)
- **Deploy strategy**: clasp `push` → `deploy` (สร้างเวอร์ชันใหม่) เมื่อ merge main; เก็บ Deployment ID + Release Note
- **Rollback**: กลับ deployment เวอร์ชันก่อนหน้าที่ผ่านทดสอบ (EX-02)
- **Guardrail**: ห้ามแก้ผ่าน Apps Script Web Editor; secret (clasp credentials) ใน GitHub Secrets

| Environment | Trigger | Target |
|---|---|---|
| Development | `clasp push` (local) | dev scriptId |
| Production | merge main → GitHub Actions `clasp deploy` | prod scriptId `18KyGuenQ6Yp...UcuLvf7wI` |
